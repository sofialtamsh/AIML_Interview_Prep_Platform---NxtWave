import {
  type CheckItem,
  CheckResponse,
  type CheckResult,
  gradeItem,
  toStudentSection,
} from '@app/content';
import type {
  CheckAttemptBody,
  CheckAttemptDto,
  CompleteLessonResponse,
  FeedbackBody,
  LessonProgressBody,
  LessonProgressDto,
  LessonResponse,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import { isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import type { RoadmapService, StudentTrack } from '../roadmap/roadmap.service.ts';
import {
  minutesOf,
  publishedLesson,
  type ResolvedSection,
  requiredKeys,
  resolveFor,
} from './lesson-view.ts';

interface LessonRef {
  topicSlug: string;
  subtopicSlug: string;
}

/** Longest stretch one progress save may add (a tab left open overnight is not study time). */
const MAX_SECONDS_PER_SAVE = 30 * 60;

const lessonUpdated = () =>
  new AppError('CONFLICT', 'This lesson was just updated. Reload to continue.', { reload: true });

/**
 * The student lesson player. A student only ever reaches lessons on their own roadmap, sees
 * them at their target depth, and never receives an answer before they have tried.
 */
export class LessonService {
  constructor(
    private readonly ctx: AppContext,
    private readonly roadmaps: RoadmapService,
  ) {}

  private get db() {
    return this.ctx.db;
  }

  async get(studentId: string, ref: LessonRef): Promise<LessonResponse> {
    const { track, item, lesson, resolved } = await this.open(studentId, ref);
    const subtopic = await this.db.subtopic.findUniqueOrThrow({
      where: { id: item.subtopicId },
      include: { topic: true },
    });
    const [depth, progress, attempts, feedback, next] = await Promise.all([
      this.db.depthLevel.findUnique({ where: { rank: item.depthRank } }),
      this.db.moduleProgress.findUnique({
        where: { studentId_subtopicId: { studentId, subtopicId: item.subtopicId } },
      }),
      this.latestAttempts(studentId, resolved),
      this.db.feedback.findMany({
        where: {
          studentId,
          OR: [
            {
              targetType: 'SECTION',
              sectionRevisionId: { in: resolved.map((r) => r.revision.id) },
            },
            { targetType: 'LESSON', moduleVersionId: lesson.version.id },
          ],
        },
      }),
      this.nextAfter(studentId, track, item.subtopicId),
    ]);
    const objectives = (
      lesson.version.objectives as Array<{
        key: string;
        text: string;
        minDepthRank: number;
      }>
    )
      .filter((o) => o.minDepthRank <= item.depthRank)
      .map((o) => ({ key: o.key, text: o.text }));

    return {
      subtopic: {
        id: subtopic.id,
        slug: subtopic.slug,
        title: subtopic.title,
        topic: {
          slug: subtopic.topic.slug,
          title: subtopic.topic.title,
          iconKey: subtopic.topic.iconKey,
        },
      },
      depth: { rank: item.depthRank, name: depth?.name ?? '' },
      lesson: {
        moduleVersionId: lesson.version.id,
        versionNumber: lesson.version.versionNumber,
        title: lesson.version.title,
        subtitle: lesson.version.subtitle,
        publishedAt: (lesson.version.publishedAt ?? lesson.version.updatedAt).toISOString(),
        objectives,
        // Answers, explanations and solutions are stripped here (and again by the response schema).
        sections: resolved.map((r) =>
          toStudentSection(r.section, {
            revisionId: r.revision.id,
            estimatedMinutes: r.minutes,
            fastTrack: r.fastTrack,
          }),
        ),
        totalMinutes: minutesOf(resolved),
      },
      progress: progressDto(progress, lesson.version.id),
      attempts,
      feedback: {
        sections: Object.fromEntries(
          feedback
            .filter((f) => f.targetType === 'SECTION' && f.sectionKey && f.thumbs)
            .map((f) => [f.sectionKey as string, f.thumbs as 'UP' | 'DOWN']),
        ),
        lessonRating: feedback.find((f) => f.targetType === 'LESSON')?.rating ?? null,
      },
      next,
    };
  }

  /** Marks a step visited or done and adds study time. Idempotent per step. */
  async saveProgress(
    studentId: string,
    ref: LessonRef,
    body: LessonProgressBody,
  ): Promise<LessonProgressDto> {
    const { item, lesson, resolved } = await this.open(studentId, ref);
    if (!resolved.some((r) => r.section.key === body.sectionKey)) {
      throw new AppError('VALIDATION_ERROR', 'That step is not part of your lesson.');
    }
    const seconds = Math.min(body.timeSpentSec ?? 0, MAX_SECONDS_PER_SAVE);
    try {
      await this.db.moduleProgress.upsert({
        where: { studentId_subtopicId: { studentId, subtopicId: item.subtopicId } },
        create: {
          studentId,
          subtopicId: item.subtopicId,
          moduleVersionId: lesson.version.id,
          completedSectionKeys: [],
          startedAt: this.ctx.now(),
        },
        update: {},
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err; // a parallel first save created it
    }
    // One atomic statement, so parallel saves never lose a step or double-count time.
    await this.db.$executeRaw`
      UPDATE module_progress SET
        completed_section_keys = CASE
          WHEN ${body.completed} AND NOT (${body.sectionKey} = ANY(completed_section_keys))
          THEN array_append(completed_section_keys, ${body.sectionKey})
          ELSE completed_section_keys END,
        last_section_key = ${body.sectionKey},
        time_spent_sec = time_spent_sec + ${seconds},
        module_version_id = ${lesson.version.id}::uuid,
        updated_at = ${this.ctx.now()}
      WHERE student_id = ${studentId}::uuid AND subtopic_id = ${item.subtopicId}::uuid`;
    const row = await this.db.moduleProgress.findUniqueOrThrow({
      where: { studentId_subtopicId: { studentId, subtopicId: item.subtopicId } },
    });
    return progressDto(row, lesson.version.id);
  }

  /** Grades one check item on the server and only then reveals the answer. */
  async check(studentId: string, ref: LessonRef, body: CheckAttemptBody): Promise<CheckResult> {
    const { resolved } = await this.open(studentId, ref);
    const target = resolved.find((r) => r.revision.id === body.revisionId);
    if (!target) throw lessonUpdated();
    if (target.section.key !== body.sectionKey || target.section.kind !== 'KNOWLEDGE_CHECK') {
      throw notFound('That question');
    }
    const item = target.section.body.items.find((i) => i.key === body.itemKey);
    if (!item) throw notFound('That question');
    const result = gradeItem(item, body.response);
    if (!result) throw new AppError('VALIDATION_ERROR', 'That answer does not fit this question.');
    await this.db.knowledgeCheckAttempt.create({
      data: {
        studentId,
        sectionRevisionId: target.revision.id,
        itemKey: item.key,
        isCorrect: result.correct,
        response: body.response as Prisma.InputJsonValue,
      },
    });
    return result;
  }

  /** The playground solution, on request (the student chooses to look). */
  async solution(
    studentId: string,
    ref: LessonRef,
    body: { revisionId: string; sectionKey: string },
  ) {
    const { resolved } = await this.open(studentId, ref);
    const target = resolved.find((r) => r.revision.id === body.revisionId);
    if (!target) throw lessonUpdated();
    if (target.section.key !== body.sectionKey || target.section.kind !== 'PLAYGROUND') {
      throw notFound('That exercise');
    }
    return { solution: target.section.body.solution };
  }

  async complete(
    studentId: string,
    ref: LessonRef,
    body: { moduleVersionId: string },
  ): Promise<CompleteLessonResponse> {
    const { track, item, lesson, resolved } = await this.open(studentId, ref);
    if (body.moduleVersionId !== lesson.version.id) throw lessonUpdated();
    const where = { studentId_subtopicId: { studentId, subtopicId: item.subtopicId } };
    const progress = await this.db.moduleProgress.findUnique({ where });
    const done = new Set(progress?.completedSectionKeys ?? []);
    const missing = requiredKeys(resolved).filter((k) => !done.has(k));
    if (!progress || missing.length) {
      throw new AppError(
        'CONFLICT',
        missing.length === 1
          ? 'One step is still open. Finish it to complete the lesson.'
          : `${missing.length} steps are still open. Finish them to complete the lesson.`,
        { missing },
      );
    }
    const row = await this.db.moduleProgress.update({
      where,
      data: {
        status: 'COMPLETED',
        completedAt: progress.completedAt ?? this.ctx.now(),
        completedVersionId: lesson.version.id,
      },
    });
    return {
      progress: progressDto(row, lesson.version.id),
      next: await this.nextAfter(studentId, track, item.subtopicId),
    };
  }

  /** Thumbs on a step, the end-of-lesson rating, or general feedback on a page. */
  async feedback(studentId: string, body: FeedbackBody) {
    if (body.target === 'PAGE') {
      await this.db.feedback.create({
        data: {
          studentId,
          targetType: 'PAGE',
          page: body.page,
          tags: body.tags ?? [],
          text: body.text,
        },
      });
      return { ok: true as const };
    }

    // Only lessons the student can actually see, in a version that reached students.
    const version = await this.db.moduleVersion.findUnique({
      where: { id: body.moduleVersionId },
      include: { module: { select: { subtopicId: true } } },
    });
    const track = await this.roadmaps.track(studentId);
    if (
      !version ||
      !['PUBLISHED', 'SUPERSEDED'].includes(version.status) ||
      !track?.items.some((i) => i.subtopicId === version.module.subtopicId)
    ) {
      throw notFound('That lesson');
    }

    const text = body.text?.trim() || null;
    if (body.target === 'SECTION') {
      const pointer = await this.db.moduleVersionSection.findUnique({
        where: {
          moduleVersionId_sectionKey: { moduleVersionId: version.id, sectionKey: body.sectionKey },
        },
      });
      if (pointer?.sectionRevisionId !== body.revisionId) throw notFound('That step');
      const existing = await this.db.feedback.findFirst({
        where: { studentId, targetType: 'SECTION', sectionRevisionId: body.revisionId },
      });
      const data = { thumbs: body.thumbs, tags: body.tags ?? [], text };
      if (existing && !body.thumbs && !text && data.tags.length === 0) {
        await this.db.feedback.delete({ where: { id: existing.id } });
      } else if (existing) {
        await this.db.feedback.update({ where: { id: existing.id }, data });
      } else if (body.thumbs || text || data.tags.length) {
        await this.createOnce(() =>
          this.db.feedback.create({
            data: {
              ...data,
              studentId,
              targetType: 'SECTION',
              moduleVersionId: version.id,
              sectionKey: body.sectionKey,
              sectionRevisionId: body.revisionId,
            },
          }),
        );
      }
      return { ok: true as const };
    }

    const existing = await this.db.feedback.findFirst({
      where: { studentId, targetType: 'LESSON', moduleVersionId: version.id },
    });
    const data = { rating: body.rating, tags: body.tags ?? [], text };
    if (existing) await this.db.feedback.update({ where: { id: existing.id }, data });
    else {
      await this.createOnce(() =>
        this.db.feedback.create({
          data: { ...data, studentId, targetType: 'LESSON', moduleVersionId: version.id },
        }),
      );
    }
    return { ok: true as const };
  }

  // ───────────── Helpers ─────────────

  /** The lesson as this student may see it, or 404 when it is outside their track. */
  private async open(studentId: string, ref: LessonRef) {
    const track = await this.roadmaps.track(studentId);
    const item = track?.items.find(
      (i) => i.topicSlug === ref.topicSlug && i.subtopicSlug === ref.subtopicSlug,
    );
    // Outside the student's own track looks exactly like "does not exist".
    if (!track || !item) throw notFound('That lesson');
    const lesson = await publishedLesson(this.db, item.subtopicId);
    if (!lesson) {
      throw new AppError(
        'NOT_FOUND',
        "This lesson isn't ready yet. It's being written and reviewed.",
        {
          comingSoon: true,
        },
      );
    }
    const resolved = resolveFor(lesson.sections, {
      depth: item.depthRank,
      roleSlug: track.roleSlug,
      skillLevel: item.skillLevel,
    });
    return { track, item, lesson, resolved };
  }

  /** The latest try per check item, re-graded so the reveal always matches the content. */
  private async latestAttempts(
    studentId: string,
    resolved: ResolvedSection[],
  ): Promise<CheckAttemptDto[]> {
    const checks = resolved.filter((r) => r.section.kind === 'KNOWLEDGE_CHECK');
    if (checks.length === 0) return [];
    const rows = await this.db.knowledgeCheckAttempt.findMany({
      where: { studentId, sectionRevisionId: { in: checks.map((c) => c.revision.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const out: CheckAttemptDto[] = [];
    for (const row of rows) {
      const id = `${row.sectionRevisionId}#${row.itemKey}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const check = checks.find((c) => c.revision.id === row.sectionRevisionId);
      if (check?.section.kind !== 'KNOWLEDGE_CHECK') continue;
      const item: CheckItem | undefined = check.section.body.items.find(
        (i) => i.key === row.itemKey,
      );
      const response = CheckResponse.safeParse(row.response);
      if (!item || !response.success) continue;
      const result = gradeItem(item, response.data);
      if (result) {
        out.push({
          sectionKey: check.section.key,
          itemKey: row.itemKey,
          response: response.data,
          result,
        });
      }
    }
    return out;
  }

  /** The next subtopic on the student's roadmap that they have not finished. */
  private async nextAfter(studentId: string, track: StudentTrack, subtopicId: string) {
    const index = track.items.findIndex((i) => i.subtopicId === subtopicId);
    const later = track.items.slice(index + 1);
    if (later.length === 0) return null;
    const [done, published] = await Promise.all([
      this.db.moduleProgress.findMany({
        where: {
          studentId,
          status: 'COMPLETED',
          subtopicId: { in: later.map((i) => i.subtopicId) },
        },
        select: { subtopicId: true },
      }),
      this.db.moduleVersion.findMany({
        where: {
          status: 'PUBLISHED',
          module: { subtopicId: { in: later.map((i) => i.subtopicId) } },
        },
        select: { module: { select: { subtopicId: true } } },
      }),
    ]);
    const finished = new Set(done.map((d) => d.subtopicId));
    const ready = new Set(published.map((p) => p.module.subtopicId));
    const next = later.find((i) => !finished.has(i.subtopicId));
    return next
      ? {
          topicSlug: next.topicSlug,
          subtopicSlug: next.subtopicSlug,
          title: next.title,
          hasLesson: ready.has(next.subtopicId),
        }
      : null;
  }

  private async createOnce(create: () => Promise<unknown>) {
    try {
      await create();
    } catch (err) {
      // A double tap created it a moment ago; the first one wins.
      if (!isUniqueViolation(err)) throw err;
    }
  }
}

function progressDto(
  p: Prisma.ModuleProgressGetPayload<object> | null,
  currentVersionId: string,
): LessonProgressDto {
  if (!p) {
    return {
      status: 'NOT_STARTED',
      completedSectionKeys: [],
      lastSectionKey: null,
      timeSpentSec: 0,
      completedAt: null,
      updatedSinceCompletion: false,
    };
  }
  return {
    status: p.status,
    completedSectionKeys: p.completedSectionKeys,
    lastSectionKey: p.lastSectionKey,
    timeSpentSec: p.timeSpentSec,
    completedAt: p.completedAt?.toISOString() ?? null,
    updatedSinceCompletion:
      p.status === 'COMPLETED' &&
      p.completedVersionId !== null &&
      p.completedVersionId !== currentVersionId,
  };
}
