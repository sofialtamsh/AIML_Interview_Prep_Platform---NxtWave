import { depthReport, LessonDocument, type Section } from '@app/content';
import type {
  ColorKey,
  CreateLessonVersionBody,
  EvaluationDto,
  LessonFeedbackResponse,
  LessonIndexResponse,
  LessonModuleResponse,
  LessonTargetDto,
  LessonVersionResponse,
  LessonVersionSummary,
  PublishLessonBody,
  ReviewBody,
  SaveDocumentBody,
  SaveSectionBody,
  StyleKey,
  SubmitForReviewBody,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import type { ContentOrigin, ModuleVersionStatus } from '../../generated/prisma/enums.ts';
import { isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { estimateMinutes } from '../roadmap/planner.engine.ts';
import {
  invalidContent,
  issuesOf,
  loadDocument,
  loadSections,
  parseDocument,
  parseSection,
  writeSections,
} from './lesson-store.ts';

type Tx = Prisma.TransactionClient;
interface Actor {
  id: string;
  ip: string | null;
}

/** A version still being worked on. At most one per lesson (SQL partial index). */
export const WORKING: ModuleVersionStatus[] = ['DRAFT', 'AI_GENERATED', 'UNDER_REVIEW', 'APPROVED'];
const EDITABLE: ModuleVersionStatus[] = ['DRAFT', 'AI_GENERATED'];

const STATUS_WORDS: Record<ModuleVersionStatus, string> = {
  DRAFT: 'a draft',
  AI_GENERATED: 'AI-generated and not yet reviewed',
  UNDER_REVIEW: 'under review',
  APPROVED: 'approved and waiting to be published',
  PUBLISHED: 'published',
  SUPERSEDED: 'replaced by a newer version',
  ARCHIVED: 'archived',
};

/**
 * The admin content workspace for lessons:
 *
 *   DRAFT / AI_GENERATED ──submit──► UNDER_REVIEW ──approve──► APPROVED ──publish──► PUBLISHED
 *          ▲                               │                                        │
 *          └──────── request changes ──────┘ reject → ARCHIVED     (previous) → SUPERSEDED
 *
 * Nothing reaches students until a person approves and publishes it. AI output (Phase 4B)
 * arrives as AI_GENERATED and goes through exactly the same review.
 */
export class ContentService {
  private readonly audit: AuditService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Reads ─────────────

  async index(): Promise<LessonIndexResponse> {
    const topics = await this.db.topic.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        subtopics: {
          where: { status: 'ACTIVE' },
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          include: {
            lesson: {
              include: {
                versions: {
                  where: { status: { in: [...WORKING, 'PUBLISHED'] } },
                  include: { _count: { select: { sections: true } } },
                },
              },
            },
          },
        },
      },
    });
    const targets = await this.targetsOf(topics.flatMap((t) => t.subtopics.map((s) => s.id)));
    const counts = { published: 0, inReview: 0, inProgress: 0, missing: 0 };
    const result = topics.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      iconKey: t.iconKey,
      subtopics: t.subtopics.map((s) => {
        const versions = s.lesson?.versions ?? [];
        const published = versions.find((v) => v.status === 'PUBLISHED');
        const working = versions.find((v) => WORKING.includes(v.status));
        if (published) counts.published++;
        if (working?.status === 'UNDER_REVIEW' || working?.status === 'APPROVED') counts.inReview++;
        else if (working) counts.inProgress++;
        if (!published && !working) counts.missing++;
        return {
          subtopicId: s.id,
          slug: s.slug,
          title: s.title,
          targets: targets.get(s.id) ?? [],
          published: published
            ? {
                versionNumber: published.versionNumber,
                publishedAt: (published.publishedAt ?? published.updatedAt).toISOString(),
                sections: published._count.sections,
              }
            : null,
          working: working
            ? {
                id: working.id,
                versionNumber: working.versionNumber,
                status: working.status,
                updatedAt: working.updatedAt.toISOString(),
              }
            : null,
        };
      }),
    }));
    return { topics: result.filter((t) => t.subtopics.length > 0), counts };
  }

  async module(subtopicId: string): Promise<LessonModuleResponse> {
    const subtopic = await this.db.subtopic.findUnique({
      where: { id: subtopicId },
      include: {
        topic: true,
        concepts: { orderBy: { sortOrder: 'asc' } },
        lesson: {
          include: {
            versions: {
              orderBy: { versionNumber: 'desc' },
              include: { _count: { select: { sections: true } } },
            },
          },
        },
      },
    });
    if (!subtopic) throw notFound('That subtopic');
    const [targets, roles, depthLevels] = await Promise.all([
      this.targetsOf([subtopicId]),
      this.db.careerRole.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.db.depthLevel.findMany({ orderBy: { rank: 'asc' } }),
    ]);
    const versions = subtopic.lesson?.versions ?? [];
    const names = await this.namesOf(
      versions.flatMap((v) => [v.createdById, v.publishedById]).filter(Boolean) as string[],
    );
    const numberOf = new Map(versions.map((v) => [v.id, v.versionNumber]));
    return {
      subtopic: {
        id: subtopic.id,
        slug: subtopic.slug,
        title: subtopic.title,
        summary: subtopic.summary,
        topic: {
          slug: subtopic.topic.slug,
          title: subtopic.topic.title,
          iconKey: subtopic.topic.iconKey,
        },
      },
      targets: targets.get(subtopicId) ?? [],
      versions: versions.map((v) => summaryOf(v, v._count.sections, names, numberOf)),
      publishedVersionId: versions.find((v) => v.status === 'PUBLISHED')?.id ?? null,
      workingVersionId: versions.find((v) => WORKING.includes(v.status))?.id ?? null,
      concepts: subtopic.concepts.map((c) => ({ key: c.key, name: c.name })),
      roles: roles.map((r) => ({ slug: r.slug, title: r.title })),
      depthLevels: depthLevels.map((d) => ({ rank: d.rank, name: d.name })),
    };
  }

  async version(id: string): Promise<LessonVersionResponse> {
    const loaded = await loadDocument(this.db, id);
    if (!loaded) throw notFound('That lesson version');
    const { version, document, sections } = loaded;
    const module = await this.db.learningModule.findUniqueOrThrow({
      where: { id: version.moduleId },
      include: { versions: { select: { id: true, versionNumber: true, status: true } } },
    });

    const published = module.versions.find((v) => v.status === 'PUBLISHED' && v.id !== id);
    const publishedSections = published ? await loadSections(this.db, published.id) : [];
    const before = new Map(publishedSections.map((s) => [s.section.key, s.revision.id]));
    const keys = new Set(sections.map((s) => s.section.key));

    const [reviews, targets] = await Promise.all([
      this.db.contentReview.findMany({
        where: { moduleVersionId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.targetsOf([module.subtopicId]),
    ]);
    const names = await this.namesOf([
      ...reviews.map((r) => r.reviewerId),
      ...([version.createdById, version.publishedById].filter(Boolean) as string[]),
    ]);
    const numberOf = new Map(module.versions.map((v) => [v.id, v.versionNumber]));
    const depths = [...new Set((targets.get(module.subtopicId) ?? []).map((t) => t.depth.rank))];

    return {
      version: {
        ...summaryOf(version, sections.length, names, numberOf),
        subtopicId: module.subtopicId,
        editSeq: version.editSeq,
        editable: EDITABLE.includes(version.status),
      },
      document,
      sections: sections.map(({ section, revision }) => ({
        key: section.key,
        revisionId: revision.id,
        origin: revision.origin,
        createdAt: revision.createdAt.toISOString(),
        change: !before.has(section.key)
          ? 'ADDED'
          : before.get(section.key) === revision.id
            ? 'UNCHANGED'
            : 'CHANGED',
      })),
      removedKeys: publishedSections.map((s) => s.section.key).filter((k) => !keys.has(k)),
      reviews: reviews.map((r) => ({
        id: r.id,
        decision: r.decision,
        notes: r.notes,
        sectionNotes: (r.sectionNotes ?? {}) as Record<string, string>,
        reviewer: names.get(r.reviewerId) ?? 'An admin',
        createdAt: r.createdAt.toISOString(),
      })),
      depthReports: (depths.length ? depths : [1, 2, 3, 4, 5])
        .sort((a, b) => a - b)
        .map((d) => depthReport(document, d)),
    };
  }

  /** What students said about this lesson, across its versions. No student identities. */
  async feedback(subtopicId: string): Promise<LessonFeedbackResponse> {
    const rows = await this.db.feedback.findMany({
      where: {
        targetType: { in: ['SECTION', 'LESSON'] },
        moduleVersion: { module: { subtopicId } },
      },
      orderBy: { updatedAt: 'desc' },
      include: { moduleVersion: { select: { versionNumber: true } } },
    });
    const ratings = rows.filter((r) => r.targetType === 'LESSON' && r.rating !== null);
    const sections = new Map<
      string,
      { sectionKey: string; up: number; down: number; tags: Record<string, number> }
    >();
    for (const r of rows) {
      if (r.targetType !== 'SECTION' || !r.sectionKey) continue;
      const s = sections.get(r.sectionKey) ?? {
        sectionKey: r.sectionKey,
        up: 0,
        down: 0,
        tags: {},
      };
      if (r.thumbs === 'UP') s.up++;
      if (r.thumbs === 'DOWN') s.down++;
      for (const t of r.tags) s.tags[t] = (s.tags[t] ?? 0) + 1;
      sections.set(r.sectionKey, s);
    }
    return {
      rating: {
        average: ratings.length
          ? Math.round((ratings.reduce((a, r) => a + (r.rating ?? 0), 0) / ratings.length) * 10) /
            10
          : null,
        count: ratings.length,
      },
      sections: [...sections.values()].sort((a, b) => b.down - a.down || b.up - a.up),
      comments: rows
        .filter((r) => r.text)
        .slice(0, 50)
        .map((r) => ({
          target: r.targetType as 'SECTION' | 'LESSON',
          sectionKey: r.sectionKey,
          versionNumber: r.moduleVersion?.versionNumber ?? 0,
          rating: r.rating,
          thumbs: r.thumbs,
          tags: r.tags,
          text: r.text ?? '',
          createdAt: r.updatedAt.toISOString(),
        })),
    };
  }

  // ───────────── Writes ─────────────

  /** Starts the working version: from an imported document, or as a copy of an earlier version. */
  async createVersion(subtopicId: string, body: CreateLessonVersionBody, actor: Actor) {
    const subtopic = await this.db.subtopic.findUnique({ where: { id: subtopicId } });
    if (!subtopic) throw notFound('That subtopic');

    const module =
      (await this.db.learningModule.findUnique({ where: { subtopicId } })) ??
      (await this.db.learningModule.create({ data: { subtopicId } }).catch(async (err: unknown) => {
        if (!isUniqueViolation(err)) throw err;
        return this.db.learningModule.findUniqueOrThrow({ where: { subtopicId } });
      }));

    let document: LessonDocument;
    let origin: ContentOrigin;
    let basedOnVersionId: string | null = null;
    if (body.source === 'IMPORT') {
      document = await parseDocument(this.db, body.document);
      origin = 'IMPORT';
    } else {
      const source = await loadDocument(this.db, body.versionId);
      if (!source || source.version.moduleId !== module.id) throw notFound('That lesson version');
      document = await parseDocument(this.db, source.document);
      origin = 'MANUAL';
      basedOnVersionId = source.version.id;
    }

    try {
      const id = await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM learning_module WHERE id = ${module.id}::uuid FOR UPDATE`;
        const working = await tx.moduleVersion.findFirst({
          where: { moduleId: module.id, status: { in: WORKING } },
        });
        if (working) throw workingExists(working);
        const last = await tx.moduleVersion.findFirst({
          where: { moduleId: module.id },
          orderBy: { versionNumber: 'desc' },
          select: { versionNumber: true },
        });
        const version = await tx.moduleVersion.create({
          data: {
            moduleId: module.id,
            versionNumber: (last?.versionNumber ?? 0) + 1,
            status: 'DRAFT',
            origin,
            title: document.title,
            subtitle: document.subtitle ?? null,
            objectives: document.objectives as Prisma.InputJsonValue,
            basedOnVersionId,
            changeNote: body.changeNote ?? null,
            createdById: actor.id,
            updatedById: actor.id,
          },
        });
        await writeSections(tx, {
          moduleId: module.id,
          versionId: version.id,
          sections: document.sections,
          origin,
          actorId: actor.id,
        });
        return version.id;
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'content.lesson.draft_created',
        entityType: 'module_version',
        entityId: id,
        after: {
          subtopicId,
          source: body.source,
          basedOnVersionId,
          sections: document.sections.length,
        },
        ip: actor.ip,
      });
      return { id };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'Someone else just started a draft of this lesson. Reload.');
      }
      throw err;
    }
  }

  /** Replaces the whole document (the JSON editor and re-imports). */
  async saveDocument(id: string, body: SaveDocumentBody, actor: Actor) {
    const document = await parseDocument(this.db, body.document);
    await this.editDraft(id, body.editSeq, actor, async (tx, version) => {
      await tx.moduleVersion.update({
        where: { id },
        data: {
          title: document.title,
          subtitle: document.subtitle ?? null,
          objectives: document.objectives as Prisma.InputJsonValue,
        },
      });
      await writeSections(tx, {
        moduleId: version.moduleId,
        versionId: id,
        sections: document.sections,
        origin: 'MANUAL',
        actorId: actor.id,
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.draft_saved',
      entityType: 'module_version',
      entityId: id,
      after: { sections: document.sections.length },
      ip: actor.ip,
    });
    return this.version(id);
  }

  /** Replaces one section. Every other section keeps its revision. */
  async saveSection(id: string, key: string, body: SaveSectionBody, actor: Actor) {
    await this.editDraft(id, body.editSeq, actor, async (tx, version) => {
      const current = await loadDocument(tx, id);
      if (!current) throw notFound('That lesson version');
      const index = current.document.sections.findIndex((s) => s.key === key);
      if (index < 0) throw notFound('That section');
      const section = await parseSection(tx, body.section, ['sections', index]);
      if (section.key !== key) {
        throw invalidContent([
          { path: `sections.${index}.key`, message: 'Rename sections in the document editor' },
        ]);
      }
      const sections = current.document.sections.map((s, i) => (i === index ? section : s));
      const whole = LessonDocument.safeParse({ ...current.document, sections });
      if (!whole.success) throw invalidContent(issuesOf(whole.error));
      await writeSections(tx, {
        moduleId: version.moduleId,
        versionId: id,
        sections,
        origin: 'MANUAL',
        actorId: actor.id,
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.section_saved',
      entityType: 'module_version',
      entityId: id,
      after: { sectionKey: key },
      ip: actor.ip,
    });
    return this.version(id);
  }

  async submit(id: string, body: SubmitForReviewBody, actor: Actor) {
    await this.transition(id, actor, async (tx, v) => {
      if (!EDITABLE.includes(v.status)) throw wrongStatus(v.status, 'submit it for review');
      if (v.editSeq !== body.editSeq) throw staleEdit();
      await tx.moduleVersion.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          submittedAt: this.ctx.now(),
          submittedById: actor.id,
          ...(body.note ? { changeNote: body.note } : {}),
        },
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.submitted',
      entityType: 'module_version',
      entityId: id,
      ip: actor.ip,
    });
    return this.version(id);
  }

  async review(id: string, body: ReviewBody, actor: Actor) {
    const sectionNotes = body.sectionNotes ?? {};
    await this.transition(id, actor, async (tx, v) => {
      if (v.status !== 'UNDER_REVIEW') throw wrongStatus(v.status, 'review it');
      const keys = new Set(
        (await tx.moduleVersionSection.findMany({ where: { moduleVersionId: id } })).map(
          (s) => s.sectionKey,
        ),
      );
      const unknown = Object.keys(sectionNotes).filter((k) => !keys.has(k));
      if (unknown.length) {
        throw new AppError('VALIDATION_ERROR', `Unknown section: ${unknown.join(', ')}`);
      }
      await tx.contentReview.create({
        data: {
          moduleVersionId: id,
          decision: body.decision,
          notes: body.notes ?? null,
          sectionNotes,
          reviewerId: actor.id,
        },
      });
      await tx.moduleVersion.update({
        where: { id },
        data: {
          status:
            body.decision === 'APPROVED'
              ? 'APPROVED'
              : body.decision === 'REJECTED'
                ? 'ARCHIVED'
                : 'DRAFT',
        },
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: `content.lesson.review.${body.decision.toLowerCase()}`,
      entityType: 'module_version',
      entityId: id,
      after: { notes: body.notes ?? null, sections: Object.keys(sectionNotes) },
      ip: actor.ip,
    });
    return this.version(id);
  }

  /** Makes an approved version the one students see. The previous one is kept as history. */
  async publish(id: string, body: PublishLessonBody, actor: Actor) {
    let replaced: number | null = null;
    await this.transition(id, actor, async (tx, v) => {
      if (v.status !== 'APPROVED') {
        throw wrongStatus(v.status, 'publish it', 'Only approved versions can be published.');
      }
      const previous = await tx.moduleVersion.findFirst({
        where: { moduleId: v.moduleId, status: 'PUBLISHED' },
      });
      if (previous) {
        replaced = previous.versionNumber;
        await tx.moduleVersion.update({
          where: { id: previous.id },
          data: { status: 'SUPERSEDED' },
        });
      }
      await tx.moduleVersion.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: this.ctx.now(),
          publishedById: actor.id,
          changeNote: body.changeNote,
        },
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.published',
      entityType: 'module_version',
      entityId: id,
      after: { changeNote: body.changeNote, replacedVersion: replaced },
      ip: actor.ip,
    });
    return this.version(id);
  }

  /** Takes a published lesson away from students (e.g. a serious error). History is kept. */
  async unpublish(id: string, actor: Actor) {
    await this.transition(id, actor, async (tx, v) => {
      if (v.status !== 'PUBLISHED') throw wrongStatus(v.status, 'unpublish it');
      await tx.moduleVersion.update({ where: { id }, data: { status: 'SUPERSEDED' } });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.unpublished',
      entityType: 'module_version',
      entityId: id,
      ip: actor.ip,
    });
    return this.version(id);
  }

  async discard(id: string, actor: Actor) {
    await this.transition(id, actor, async (tx, v) => {
      if (!WORKING.includes(v.status)) throw wrongStatus(v.status, 'discard it');
      await tx.moduleVersion.update({ where: { id }, data: { status: 'ARCHIVED' } });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'content.lesson.discarded',
      entityType: 'module_version',
      entityId: id,
      ip: actor.ip,
    });
    return this.version(id);
  }

  // ───────────── AI drafts and rewrites (written by the worker) ─────────────

  /** Fails early when a lesson already has a working version: an AI draft never replaces one. */
  async assertNoWorkingVersion(subtopicId: string) {
    const working = await this.db.moduleVersion.findFirst({
      where: { module: { subtopicId }, status: { in: WORKING } },
    });
    if (working) throw workingExists(working);
  }

  /** Saves an AI-written lesson as a new "AI draft". Never published without human review. */
  async saveAiDraft(
    subtopicId: string,
    document: LessonDocument,
    opts: {
      style: StyleKey;
      jobId: string;
      actorId: string | null;
      changeNote: string;
      meta: Record<string, Prisma.InputJsonValue>;
    },
  ): Promise<string> {
    const module =
      (await this.db.learningModule.findUnique({ where: { subtopicId } })) ??
      (await this.db.learningModule.create({ data: { subtopicId } }).catch(async (err: unknown) => {
        if (!isUniqueViolation(err)) throw err;
        return this.db.learningModule.findUniqueOrThrow({ where: { subtopicId } });
      }));
    const id = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM learning_module WHERE id = ${module.id}::uuid FOR UPDATE`;
      const working = await tx.moduleVersion.findFirst({
        where: { moduleId: module.id, status: { in: WORKING } },
      });
      if (working) throw workingExists(working);
      const last = await tx.moduleVersion.findFirst({
        where: { moduleId: module.id },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true },
      });
      const version = await tx.moduleVersion.create({
        data: {
          moduleId: module.id,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          status: 'AI_GENERATED',
          origin: 'AI',
          style: opts.style,
          title: document.title,
          subtitle: document.subtitle ?? null,
          objectives: document.objectives as Prisma.InputJsonValue,
          changeNote: opts.changeNote,
          createdById: opts.actorId,
          updatedById: opts.actorId,
        },
      });
      await writeSections(tx, {
        moduleId: module.id,
        versionId: version.id,
        sections: document.sections,
        origin: 'AI',
        actorId: opts.actorId,
        meta: opts.meta,
      });
      return version.id;
    });
    await this.audit.record({
      actorId: opts.actorId,
      action: 'content.lesson.ai_draft_created',
      entityType: 'module_version',
      entityId: id,
      after: {
        subtopicId,
        jobId: opts.jobId,
        style: opts.style,
        sections: document.sections.length,
      },
    });
    return id;
  }

  /** Puts an AI rewrite of one step into the draft, unless someone changed that step meanwhile. */
  async applyAiRewrite(
    versionId: string,
    section: Section,
    opts: { baseRevisionId: string; actorId: string; meta: Prisma.InputJsonValue },
  ): Promise<string> {
    let revisionId = '';
    await this.editDraftAt(versionId, opts.actorId, async (tx, version) => {
      const current = await loadDocument(tx, versionId);
      if (!current) throw notFound('That lesson version');
      const index = current.sections.findIndex((x) => x.section.key === section.key);
      if (index < 0) throw notFound('That step');
      if (current.sections[index]?.revision.id !== opts.baseRevisionId) {
        throw new AppError(
          'CONFLICT',
          'This step was edited after the rewrite was requested, so the rewrite was not applied.',
          { stale: true },
        );
      }
      const sections = current.document.sections.map((x, i) => (i === index ? section : x));
      const whole = LessonDocument.safeParse({ ...current.document, sections });
      if (!whole.success) throw invalidContent(issuesOf(whole.error));
      await writeSections(tx, {
        moduleId: version.moduleId,
        versionId,
        sections,
        origin: 'AI',
        actorId: opts.actorId,
        meta: { [section.key]: opts.meta },
      });
      const pointer = await tx.moduleVersionSection.findUniqueOrThrow({
        where: {
          moduleVersionId_sectionKey: { moduleVersionId: versionId, sectionKey: section.key },
        },
      });
      revisionId = pointer.sectionRevisionId;
    });
    await this.audit.record({
      actorId: opts.actorId,
      action: 'content.lesson.ai_section_rewritten',
      entityType: 'module_version',
      entityId: versionId,
      after: { sectionKey: section.key },
    });
    return revisionId;
  }

  async latestEvaluation(versionId: string): Promise<EvaluationDto | null> {
    const e = await this.db.contentEvaluation.findFirst({
      where: { moduleVersionId: versionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!e) return null;
    return {
      id: e.id,
      moduleVersionId: e.moduleVersionId,
      model: e.model,
      verdict: e.verdict,
      overall: e.overall,
      scores: e.scores as EvaluationDto['scores'],
      issues: e.issues as EvaluationDto['issues'],
      summary: e.summary,
      metrics: e.metrics as EvaluationDto['metrics'],
      createdAt: e.createdAt.toISOString(),
    };
  }

  // ───────────── Helpers ─────────────

  /** A draft edit made on an admin's behalf by the worker (no editor counter to compare). */
  private async editDraftAt(
    id: string,
    actorId: string,
    apply: (tx: Tx, v: Prisma.ModuleVersionGetPayload<object>) => Promise<void>,
  ) {
    await this.transition(id, { id: actorId, ip: null }, async (tx, v) => {
      if (!EDITABLE.includes(v.status)) {
        throw wrongStatus(
          v.status,
          'change it',
          'This version is no longer a draft, so the rewrite was not applied.',
        );
      }
      await apply(tx, v);
      await tx.moduleVersion.update({ where: { id }, data: { editSeq: { increment: 1 } } });
    });
  }

  /** Locks the version row so concurrent decisions apply one at a time. */
  private async transition(
    id: string,
    actor: Actor,
    apply: (tx: Tx, v: Prisma.ModuleVersionGetPayload<object>) => Promise<void>,
  ) {
    try {
      await this.db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM module_version WHERE id = ${id}::uuid FOR UPDATE`;
        const v = await tx.moduleVersion.findUnique({ where: { id } });
        if (!v) throw notFound('That lesson version');
        await apply(tx, v);
        await tx.moduleVersion.update({ where: { id }, data: { updatedById: actor.id } });
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'This lesson changed while you were working. Reload.');
      }
      throw err;
    }
  }

  /** Edits a draft if nobody else saved it since the editor loaded it. */
  private async editDraft(
    id: string,
    editSeq: number,
    actor: Actor,
    apply: (tx: Tx, v: Prisma.ModuleVersionGetPayload<object>) => Promise<void>,
  ) {
    await this.transition(id, actor, async (tx, v) => {
      if (!EDITABLE.includes(v.status)) {
        throw wrongStatus(
          v.status,
          'edit it',
          v.status === 'UNDER_REVIEW'
            ? 'This version is under review. A reviewer can send it back to draft for changes.'
            : 'Only drafts can be edited. Start a new draft to make changes.',
        );
      }
      if (v.editSeq !== editSeq) throw staleEdit();
      await apply(tx, v);
      await tx.moduleVersion.update({ where: { id }, data: { editSeq: { increment: 1 } } });
    });
  }

  /** Published curricula that include these subtopics, with the depth each one needs. */
  private async targetsOf(subtopicIds: string[]): Promise<Map<string, LessonTargetDto[]>> {
    if (subtopicIds.length === 0) return new Map();
    const items = await this.db.roleCurriculumItem.findMany({
      where: { subtopicId: { in: subtopicIds }, curriculum: { status: 'PUBLISHED' } },
      include: {
        depth: true,
        subtopic: { select: { complexity: true } },
        curriculum: { include: { role: true, bracket: true } },
      },
    });
    const out = new Map<string, LessonTargetDto[]>();
    for (const i of items.sort(
      (a, b) =>
        a.curriculum.role.sortOrder - b.curriculum.role.sortOrder ||
        a.curriculum.bracket.sortOrder - b.curriculum.bracket.sortOrder,
    )) {
      const list = out.get(i.subtopicId) ?? [];
      list.push({
        roleId: i.curriculum.roleId,
        roleSlug: i.curriculum.role.slug,
        roleTitle: i.curriculum.role.title,
        roleShortCode: i.curriculum.role.shortCode,
        colorKey: i.curriculum.role.colorKey as ColorKey,
        bracketId: i.curriculum.bracketId,
        bracketLabel: i.curriculum.bracket.label,
        depth: { rank: i.targetDepthRank, name: i.depth.name },
        plannedMinutes: estimateMinutes(
          {
            targetDepthRank: i.targetDepthRank,
            complexity: i.subtopic.complexity,
            estimateOverride: i.estimateMinutesOverride,
            skillLevel: 0,
          },
          0,
        ),
      });
      out.set(i.subtopicId, list);
    }
    return out;
  }

  private async namesOf(userIds: string[]) {
    const ids = [...new Set(userIds)];
    if (ids.length === 0) return new Map<string, string>();
    const users = await this.db.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, adminProfile: { select: { fullName: true } } },
    });
    return new Map(users.map((u) => [u.id, u.adminProfile?.fullName || u.email]));
  }
}

function summaryOf(
  v: Prisma.ModuleVersionGetPayload<object>,
  sectionCount: number,
  names: Map<string, string>,
  numberOf: Map<string, number>,
): LessonVersionSummary {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    status: v.status,
    origin: v.origin,
    style: v.style as StyleKey,
    title: v.title,
    changeNote: v.changeNote,
    sectionCount,
    basedOnVersionNumber: v.basedOnVersionId ? (numberOf.get(v.basedOnVersionId) ?? null) : null,
    createdAt: v.createdAt.toISOString(),
    createdBy: v.createdById ? (names.get(v.createdById) ?? null) : null,
    updatedAt: v.updatedAt.toISOString(),
    submittedAt: v.submittedAt?.toISOString() ?? null,
    publishedAt: v.publishedAt?.toISOString() ?? null,
    publishedBy: v.publishedById ? (names.get(v.publishedById) ?? null) : null,
  };
}

function workingExists(v: { id: string; versionNumber: number; status: ModuleVersionStatus }) {
  return new AppError(
    'CONFLICT',
    `Version ${v.versionNumber} is ${STATUS_WORDS[v.status]}. Finish or discard it before starting another.`,
    { versionId: v.id },
  );
}

function wrongStatus(status: ModuleVersionStatus, action: string, message?: string) {
  return new AppError(
    'CONFLICT',
    message ?? `This version is ${STATUS_WORDS[status]}, so you can't ${action}.`,
    { status },
  );
}

const staleEdit = () =>
  new AppError(
    'CONFLICT',
    'Someone else saved this draft after you opened it. Reload to see their changes.',
    { stale: true },
  );
