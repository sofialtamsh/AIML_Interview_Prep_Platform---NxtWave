import type {
  AdminPracticeQuestionDto,
  AdminPracticeResponse,
  PracticeFeedbackBody,
  PracticeImportBody,
  PracticeImportResponse,
  PracticeOpenResponse,
  PracticeQuestionBody,
  PracticeQuestionPatch,
  PracticeTag,
  StudentPracticeQuestion,
  StudentPracticeResponse,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Db, Prisma } from '../../db/prisma.ts';
import { isNotFound, isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';

interface Actor {
  id: string;
  ip: string | null;
}

const WITH_LINKS = {
  roles: true,
  topics: { include: { topic: true } },
  subtopics: { include: { subtopic: { include: { topic: true } } } },
} as const satisfies Prisma.PracticeQuestionInclude;
type Row = Prisma.PracticeQuestionGetPayload<{ include: typeof WITH_LINKS }>;
type Stats = Map<string, { students: number; total: number }>;
type Ratings = Map<string, { average: number | null; count: number }>;

const ORDER: Prisma.PracticeQuestionOrderByWithRelationInput[] = [
  { sortOrder: 'asc' },
  { createdAt: 'asc' },
];

function toAdminDto(q: Row, stats: Stats, ratings: Ratings): AdminPracticeQuestionDto {
  return {
    id: q.id,
    title: q.title,
    category: q.category,
    skill: q.skill,
    description: q.description,
    difficulty: q.difficulty,
    solveUrl: q.solveUrl,
    estimatedMinutes: q.estimatedMinutes,
    askedAt: q.askedAt,
    roleIds: q.roles.map((r) => r.roleId),
    topicIds: q.topics.map((t) => t.topicId),
    subtopicIds: q.subtopics.map((s) => s.subtopicId),
    published: q.published,
    sortOrder: q.sortOrder,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    opens: stats.get(q.id) ?? { students: 0, total: 0 },
    rating: ratings.get(q.id) ?? { average: null, count: 0 },
  };
}

/** Subtopic tags first (they are more specific), then topic tags not already covered. */
function tagsOf(q: Row): PracticeTag[] {
  const tags: PracticeTag[] = q.subtopics.map((s) => ({
    topicSlug: s.subtopic.topic.slug,
    topicTitle: s.subtopic.topic.title,
    subtopicSlug: s.subtopic.slug,
    subtopicTitle: s.subtopic.title,
  }));
  for (const t of q.topics) {
    if (!tags.some((x) => x.topicSlug === t.topic.slug)) {
      tags.push({
        topicSlug: t.topic.slug,
        topicTitle: t.topic.title,
        subtopicSlug: null,
        subtopicTitle: null,
      });
    }
  }
  return tags;
}

/** Categories in the order their first question appears. */
function categoriesOf(items: Array<{ category: string }>) {
  const counts = new Map<string, number>();
  for (const q of items) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}

const duplicateLink = () =>
  new AppError('CONFLICT', 'This link is already in the practice list.', {
    fields: { solveUrl: 'Already listed.' },
  });

/**
 * Published questions a student may see: their role's (or every role's), optionally only those
 * tagged with one topic (directly or through one of its subtopics). Used by the Practice tab and
 * by the topic pages.
 */
export async function practiceForStudent(
  db: Db,
  studentId: string,
  opts: { topicId?: string } = {},
): Promise<{ rows: Row[]; items: StudentPracticeQuestion[] }> {
  const goal = await db.studentGoal.findFirst({
    where: { studentId, isActive: true },
    select: { roleId: true },
  });
  const rows = await db.practiceQuestion.findMany({
    where: {
      published: true,
      AND: [
        {
          OR: [
            { roles: { none: {} } },
            ...(goal ? [{ roles: { some: { roleId: goal.roleId } } }] : []),
          ],
        },
        ...(opts.topicId
          ? [
              {
                OR: [
                  { topics: { some: { topicId: opts.topicId } } },
                  { subtopics: { some: { subtopic: { topicId: opts.topicId } } } },
                ],
              },
            ]
          : []),
      ],
    },
    include: WITH_LINKS,
    orderBy: ORDER,
  });
  const ids = rows.map((q) => q.id);
  const [opens, ratings] = await Promise.all([
    db.practiceOpen.findMany({
      where: { studentId, questionId: { in: ids } },
      select: { questionId: true, firstOpenedAt: true },
    }),
    db.feedback.findMany({
      where: { studentId, targetType: 'PRACTICE_QUESTION', practiceQuestionId: { in: ids } },
      select: { practiceQuestionId: true, rating: true },
    }),
  ]);
  const openedAt = new Map(opens.map((o) => [o.questionId, o.firstOpenedAt.toISOString()]));
  const rated = new Map(ratings.map((r) => [r.practiceQuestionId, r.rating]));
  return {
    rows,
    items: rows.map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      skill: q.skill,
      description: q.description,
      difficulty: q.difficulty,
      solveUrl: q.solveUrl,
      estimatedMinutes: q.estimatedMinutes,
      askedAt: q.askedAt,
      tags: tagsOf(q),
      openedAt: openedAt.get(q.id) ?? null,
      myRating: rated.get(q.id) ?? null,
    })),
  };
}

/**
 * Practice questions that students solve on the NxtWave learning portal. Admins curate the
 * list; students see the published questions for their role in the Practice tab and, through
 * topic tags, on each topic page.
 */
export class PracticeService {
  private readonly audit: AuditService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Admin ─────────────

  async adminList(): Promise<AdminPracticeResponse> {
    const [items, stats, ratings] = await Promise.all([
      this.db.practiceQuestion.findMany({
        include: WITH_LINKS,
        orderBy: [{ category: 'asc' }, ...ORDER],
      }),
      this.openStats(),
      this.ratingStats(),
    ]);
    return {
      items: items.map((q) => toAdminDto(q, stats, ratings)),
      categories: [...new Set(items.map((q) => q.category))].sort((a, b) => a.localeCompare(b)),
    };
  }

  async create(body: PracticeQuestionBody, actor: Actor): Promise<AdminPracticeQuestionDto> {
    const { roleIds, topicIds, subtopicIds, ...fields } = body;
    await this.assertLinks({ roleIds, topicIds, subtopicIds });
    try {
      const q = await this.db.practiceQuestion.create({
        data: {
          ...fields,
          createdById: actor.id,
          updatedById: actor.id,
          roles: { create: unique(roleIds).map((roleId) => ({ roleId })) },
          topics: { create: unique(topicIds).map((topicId) => ({ topicId })) },
          subtopics: { create: unique(subtopicIds).map((subtopicId) => ({ subtopicId })) },
        },
        include: WITH_LINKS,
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'practice.question.created',
        entityType: 'practice_question',
        entityId: q.id,
        after: { title: q.title, solveUrl: q.solveUrl, published: q.published },
        ip: actor.ip,
      });
      return toAdminDto(q, new Map(), new Map());
    } catch (err) {
      if (isUniqueViolation(err)) throw duplicateLink();
      throw err;
    }
  }

  async update(
    id: string,
    patch: PracticeQuestionPatch,
    actor: Actor,
  ): Promise<AdminPracticeQuestionDto> {
    const before = await this.db.practiceQuestion.findUnique({ where: { id } });
    if (!before) throw notFound('That question');
    const { roleIds, topicIds, subtopicIds, ...fields } = patch;
    await this.assertLinks({ roleIds, topicIds, subtopicIds });
    try {
      const q = await this.db.$transaction(async (tx) => {
        if (roleIds) {
          await tx.practiceQuestionRole.deleteMany({ where: { questionId: id } });
          await tx.practiceQuestionRole.createMany({
            data: unique(roleIds).map((roleId) => ({ questionId: id, roleId })),
          });
        }
        if (topicIds) {
          await tx.practiceQuestionTopic.deleteMany({ where: { questionId: id } });
          await tx.practiceQuestionTopic.createMany({
            data: unique(topicIds).map((topicId) => ({ questionId: id, topicId })),
          });
        }
        if (subtopicIds) {
          await tx.practiceQuestionSubtopic.deleteMany({ where: { questionId: id } });
          await tx.practiceQuestionSubtopic.createMany({
            data: unique(subtopicIds).map((subtopicId) => ({ questionId: id, subtopicId })),
          });
        }
        return tx.practiceQuestion.update({
          where: { id },
          data: { ...fields, updatedById: actor.id },
          include: WITH_LINKS,
        });
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'practice.question.updated',
        entityType: 'practice_question',
        entityId: id,
        before: { title: before.title, solveUrl: before.solveUrl, published: before.published },
        after: { title: q.title, solveUrl: q.solveUrl, published: q.published },
        ip: actor.ip,
      });
      return toAdminDto(q, await this.openStats(id), await this.ratingStats(id));
    } catch (err) {
      if (isUniqueViolation(err)) throw duplicateLink();
      throw err;
    }
  }

  async remove(id: string, actor: Actor) {
    try {
      const q = await this.db.practiceQuestion.delete({ where: { id } });
      await this.audit.record({
        actorId: actor.id,
        action: 'practice.question.deleted',
        entityType: 'practice_question',
        entityId: id,
        before: { title: q.title, solveUrl: q.solveUrl },
        ip: actor.ip,
      });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That question');
      throw err;
    }
  }

  /**
   * Bulk import (rows pasted from the content sheet). Every row was validated by the schema;
   * a link that is already listed, or repeated in the paste, is skipped and reported.
   */
  async import(body: PracticeImportBody, actor: Actor): Promise<PracticeImportResponse> {
    await this.assertLinks({
      roleIds: body.roleIds,
      topicIds: body.rows.flatMap((r) => r.topicIds),
      subtopicIds: body.rows.flatMap((r) => r.subtopicIds),
    });
    const existing = new Set(
      (
        await this.db.practiceQuestion.findMany({
          where: { solveUrl: { in: body.rows.map((r) => r.solveUrl) } },
          select: { solveUrl: true },
        })
      ).map((q) => q.solveUrl),
    );
    const last = await this.db.practiceQuestion.aggregate({ _max: { sortOrder: true } });
    let sortOrder = (last._max.sortOrder ?? 0) + 10;

    const skipped: PracticeImportResponse['skipped'] = [];
    const fresh: typeof body.rows = [];
    const seen = new Set<string>();
    for (const [i, row] of body.rows.entries()) {
      if (existing.has(row.solveUrl)) {
        skipped.push({ row: i + 1, title: row.title, reason: 'Link already listed' });
      } else if (seen.has(row.solveUrl)) {
        skipped.push({ row: i + 1, title: row.title, reason: 'Same link earlier in the paste' });
      } else {
        seen.add(row.solveUrl);
        fresh.push(row);
      }
    }

    await this.db.$transaction(async (tx) => {
      for (const { topicIds, subtopicIds, ...row } of fresh) {
        await tx.practiceQuestion.create({
          data: {
            ...row,
            published: body.published,
            sortOrder,
            createdById: actor.id,
            updatedById: actor.id,
            roles: { create: unique(body.roleIds).map((roleId) => ({ roleId })) },
            topics: { create: unique(topicIds).map((topicId) => ({ topicId })) },
            subtopics: { create: unique(subtopicIds).map((subtopicId) => ({ subtopicId })) },
          },
        });
        sortOrder += 10;
      }
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'practice.question.imported',
      entityType: 'practice_question',
      after: { created: fresh.length, skipped: skipped.length, published: body.published },
      ip: actor.ip,
    });
    return { created: fresh.length, skipped };
  }

  // ───────────── Student ─────────────

  /** Published questions for the student's role (questions with no role are for everyone). */
  async studentList(studentId: string): Promise<StudentPracticeResponse> {
    const { rows, items } = await practiceForStudent(this.db, studentId);
    // Group by category, keeping the admin's order inside each group.
    const categories = categoriesOf(items);
    const rank = new Map(categories.map((c, i) => [c.name, i]));
    const order = new Map(items.map((q, i) => [q.id, i]));
    const sorted = [...items].sort(
      (a, b) =>
        (rank.get(a.category) ?? 0) - (rank.get(b.category) ?? 0) ||
        (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
    // Topics the questions practise, in roadmap (topic) order.
    const topics = new Map<
      string,
      { slug: string; title: string; sort: number; ids: Set<string> }
    >();
    for (const q of rows) {
      const touched = [
        ...q.topics.map((t) => t.topic),
        ...q.subtopics.map((s) => s.subtopic.topic),
      ];
      for (const t of touched) {
        const entry = topics.get(t.slug) ?? {
          slug: t.slug,
          title: t.title,
          sort: t.sortOrder,
          ids: new Set(),
        };
        entry.ids.add(q.id);
        topics.set(t.slug, entry);
      }
    }
    return {
      items: sorted,
      categories,
      topics: [...topics.values()]
        .sort((a, b) => a.sort - b.sort)
        .map((t) => ({ slug: t.slug, title: t.title, count: t.ids.size })),
    };
  }

  /** The student clicked "Solve": the question opens on the portal in a new tab. */
  async recordOpen(studentId: string, questionId: string): Promise<PracticeOpenResponse> {
    await this.assertVisible(studentId, questionId);
    const now = this.ctx.now();
    const open = await this.db.practiceOpen.upsert({
      where: { studentId_questionId: { studentId, questionId } },
      create: { studentId, questionId, firstOpenedAt: now, lastOpenedAt: now },
      update: { openCount: { increment: 1 }, lastOpenedAt: now },
    });
    return { openedAt: open.firstOpenedAt.toISOString() };
  }

  /** The 11★ loop for a question: one rating per student, updated if they rate again. */
  async feedback(studentId: string, questionId: string, body: PracticeFeedbackBody) {
    await this.assertVisible(studentId, questionId);
    const data = {
      rating: body.rating,
      tags: [...new Set(body.tags ?? [])],
      text: body.text?.trim() || null,
    };
    const where = {
      studentId,
      targetType: 'PRACTICE_QUESTION' as const,
      practiceQuestionId: questionId,
    };
    // One row per student and question (a partial unique index); a double submit updates it.
    const updated = await this.db.feedback.updateMany({ where, data });
    if (updated.count === 0) {
      try {
        await this.db.feedback.create({ data: { ...where, ...data } });
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        await this.db.feedback.updateMany({ where, data });
      }
    }
    return { rating: body.rating };
  }

  // ───────────── helpers ─────────────

  private async assertVisible(studentId: string, questionId: string) {
    const { rows } = await practiceForStudent(this.db, studentId);
    if (!rows.some((q) => q.id === questionId)) throw notFound('That question');
  }

  private async openStats(questionId?: string): Promise<Stats> {
    const rows = await this.db.practiceOpen.groupBy({
      by: ['questionId'],
      ...(questionId ? { where: { questionId } } : {}),
      _count: { _all: true },
      _sum: { openCount: true },
    });
    return new Map(
      rows.map((r) => [r.questionId, { students: r._count._all, total: r._sum.openCount ?? 0 }]),
    );
  }

  private async ratingStats(questionId?: string): Promise<Ratings> {
    const rows = await this.db.feedback.groupBy({
      by: ['practiceQuestionId'],
      where: {
        targetType: 'PRACTICE_QUESTION',
        ...(questionId
          ? { practiceQuestionId: questionId }
          : { practiceQuestionId: { not: null } }),
      },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return new Map(
      rows.flatMap((r) =>
        r.practiceQuestionId
          ? [
              [
                r.practiceQuestionId,
                {
                  average: r._avg.rating === null ? null : Math.round(r._avg.rating * 10) / 10,
                  count: r._count._all,
                },
              ] as const,
            ]
          : [],
      ),
    );
  }

  private async assertLinks(links: {
    roleIds?: string[];
    topicIds?: string[];
    subtopicIds?: string[];
  }) {
    const check = async (
      ids: string[] | undefined,
      count: (ids: string[]) => Promise<number>,
      field: string,
      what: string,
    ) => {
      if (!ids || ids.length === 0) return;
      const wanted = unique(ids);
      if ((await count(wanted)) !== wanted.length) {
        throw new AppError('VALIDATION_ERROR', `One of the selected ${what} does not exist.`, {
          fields: { [field]: `Pick ${what} from the list.` },
        });
      }
    };
    await check(
      links.roleIds,
      (ids) => this.db.careerRole.count({ where: { id: { in: ids } } }),
      'roleIds',
      'roles',
    );
    await check(
      links.topicIds,
      (ids) => this.db.topic.count({ where: { id: { in: ids } } }),
      'topicIds',
      'topics',
    );
    await check(
      links.subtopicIds,
      (ids) => this.db.subtopic.count({ where: { id: { in: ids } } }),
      'subtopicIds',
      'subtopics',
    );
  }
}

const unique = (ids: string[]) => [...new Set(ids)];
