import type {
  ConceptBody,
  CurriculaIndex,
  CurriculumDto,
  CurriculumOverview,
  SaveDraftBody,
  SubtopicBody,
  TaxonomyResponse,
  TopicBody,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import { isForeignKeyViolation, isNotFound, isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { CurriculumCycleError, orderItems } from '../roadmap/planner.engine.ts';
import { RoadmapService } from '../roadmap/roadmap.service.ts';

interface Actor {
  id: string;
  ip: string | null;
}

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

type CurriculumRow = Prisma.RoleCurriculumGetPayload<{ include: { items: true } }>;

export function toCurriculumDto(c: CurriculumRow): CurriculumDto {
  return {
    id: c.id,
    roleId: c.roleId,
    bracketId: c.bracketId,
    version: c.version,
    status: c.status,
    changeNote: c.changeNote,
    publishedAt: c.publishedAt?.toISOString() ?? null,
    updatedAt: c.updatedAt.toISOString(),
    items: c.items.map((i) => ({
      id: i.id,
      subtopicId: i.subtopicId,
      priority: i.priority,
      targetDepthRank: i.targetDepthRank,
      isOptional: i.isOptional,
      learningObjectives: strings(i.learningObjectives),
      implementationExpectation: i.implementationExpectation,
      estimateMinutesOverride: i.estimateMinutesOverride,
      rationale: i.rationale,
      origin: i.origin,
    })),
  };
}

/** Rejects a prerequisite graph with a cycle (A needs B needs A). */
function assertAcyclic(nodes: string[], edges: Array<[string, string]>, what: string) {
  try {
    orderItems({
      items: nodes.map((id, i) => ({
        subtopicId: id,
        topicId: 'x',
        topicSort: 0,
        subtopicSort: i,
        priority: 'MEDIUM',
        targetDepthRank: 3,
        isOptional: false,
        complexity: 3,
        estimateOverride: null,
        skillLevel: 0,
      })),
      subtopicPrereqs: edges,
      topicPrereqs: [],
    });
  } catch (err) {
    if (err instanceof CurriculumCycleError) {
      throw new AppError('VALIDATION_ERROR', `These ${what} prerequisites would create a loop.`, {
        fields: { prerequisiteIds: 'This creates a loop of prerequisites.' },
      });
    }
    throw err;
  }
}

/** Topics, subtopics, concepts, prerequisites, and the role × package curricula (draft → published). */
export class CurriculumService {
  private readonly audit: AuditService;
  private readonly roadmaps: RoadmapService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
    this.roadmaps = new RoadmapService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Taxonomy ─────────────

  async taxonomy(): Promise<TaxonomyResponse> {
    const topics = await this.db.topic.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      include: {
        prerequisites: true,
        subtopics: {
          orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
          include: { prerequisites: true, concepts: { orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
    return {
      topics: topics.map((t) => ({
        id: t.id,
        slug: t.slug,
        title: t.title,
        summary: t.summary,
        iconKey: t.iconKey,
        skillAreaId: t.skillAreaId,
        sortOrder: t.sortOrder,
        status: t.status,
        prerequisiteIds: t.prerequisites.map((p) => p.prerequisiteId),
        subtopics: t.subtopics.map((s) => ({
          id: s.id,
          topicId: s.topicId,
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          sortOrder: s.sortOrder,
          complexity: s.complexity,
          status: s.status,
          prerequisiteIds: s.prerequisites.map((p) => p.prerequisiteId),
          concepts: s.concepts.map((c) => ({
            id: c.id,
            subtopicId: c.subtopicId,
            key: c.key,
            name: c.name,
            description: c.description,
            sortOrder: c.sortOrder,
          })),
        })),
      })),
    };
  }

  private async checkTopicGraph(topicId: string | null, prerequisiteIds: string[]) {
    const all = await this.db.topic.findMany({ select: { id: true } });
    const ids = new Set(all.map((t) => t.id));
    if (prerequisiteIds.some((p) => !ids.has(p) || p === topicId)) {
      throw new AppError('VALIDATION_ERROR', 'Pick prerequisites from other existing topics.', {
        fields: { prerequisiteIds: 'Unknown topic or the topic itself.' },
      });
    }
    if (!topicId) return;
    const edges = (await this.db.topicPrerequisite.findMany()).filter((e) => e.topicId !== topicId);
    assertAcyclic(
      [...ids],
      [
        ...edges.map((e) => [e.topicId, e.prerequisiteId] as [string, string]),
        ...prerequisiteIds.map((p) => [topicId, p] as [string, string]),
      ],
      'topic',
    );
  }

  private async checkSubtopicGraph(subtopicId: string | null, prerequisiteIds: string[]) {
    const all = await this.db.subtopic.findMany({ select: { id: true } });
    const ids = new Set(all.map((s) => s.id));
    if (prerequisiteIds.some((p) => !ids.has(p) || p === subtopicId)) {
      throw new AppError('VALIDATION_ERROR', 'Pick prerequisites from other existing subtopics.', {
        fields: { prerequisiteIds: 'Unknown subtopic or the subtopic itself.' },
      });
    }
    if (!subtopicId) return;
    const edges = (await this.db.subtopicPrerequisite.findMany()).filter(
      (e) => e.subtopicId !== subtopicId,
    );
    assertAcyclic(
      [...ids],
      [
        ...edges.map((e) => [e.subtopicId, e.prerequisiteId] as [string, string]),
        ...prerequisiteIds.map((p) => [subtopicId, p] as [string, string]),
      ],
      'subtopic',
    );
  }

  async createTopic(body: TopicBody, actor: Actor) {
    await this.checkTopicGraph(null, body.prerequisiteIds);
    const { prerequisiteIds, ...data } = body;
    try {
      const t = await this.db.topic.create({
        data: {
          ...data,
          prerequisites: { create: prerequisiteIds.map((prerequisiteId) => ({ prerequisiteId })) },
        },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'curriculum.topic.created',
        entityType: 'topic',
        entityId: t.id,
        after: body,
        ip: actor.ip,
      });
      return t.id;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'A topic with this slug exists.', {
          fields: { slug: 'Already used.' },
        });
      throw err;
    }
  }

  async updateTopic(id: string, patch: Partial<TopicBody>, actor: Actor) {
    if (!(await this.db.topic.findUnique({ where: { id } }))) throw notFound('That topic');
    if (patch.prerequisiteIds) await this.checkTopicGraph(id, patch.prerequisiteIds);
    const { prerequisiteIds, ...data } = patch;
    try {
      await this.db.$transaction(async (tx) => {
        await tx.topic.update({ where: { id }, data });
        if (prerequisiteIds) {
          await tx.topicPrerequisite.deleteMany({ where: { topicId: id } });
          await tx.topicPrerequisite.createMany({
            data: prerequisiteIds.map((prerequisiteId) => ({ topicId: id, prerequisiteId })),
          });
        }
      });
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'A topic with this slug exists.', {
          fields: { slug: 'Already used.' },
        });
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.topic.updated',
      entityType: 'topic',
      entityId: id,
      after: patch,
      ip: actor.ip,
    });
  }

  async createSubtopic(body: SubtopicBody, actor: Actor) {
    if (!(await this.db.topic.findUnique({ where: { id: body.topicId } })))
      throw notFound('That topic');
    await this.checkSubtopicGraph(null, body.prerequisiteIds);
    const { prerequisiteIds, ...data } = body;
    try {
      const s = await this.db.subtopic.create({
        data: {
          ...data,
          prerequisites: { create: prerequisiteIds.map((prerequisiteId) => ({ prerequisiteId })) },
        },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'curriculum.subtopic.created',
        entityType: 'subtopic',
        entityId: s.id,
        after: body,
        ip: actor.ip,
      });
      return s.id;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'This topic already has a subtopic with that slug.', {
          fields: { slug: 'Already used in this topic.' },
        });
      throw err;
    }
  }

  async updateSubtopic(id: string, patch: Partial<SubtopicBody>, actor: Actor) {
    if (!(await this.db.subtopic.findUnique({ where: { id } }))) throw notFound('That subtopic');
    if (patch.prerequisiteIds) await this.checkSubtopicGraph(id, patch.prerequisiteIds);
    const { prerequisiteIds, ...data } = patch;
    try {
      await this.db.$transaction(async (tx) => {
        await tx.subtopic.update({ where: { id }, data });
        if (prerequisiteIds) {
          await tx.subtopicPrerequisite.deleteMany({ where: { subtopicId: id } });
          await tx.subtopicPrerequisite.createMany({
            data: prerequisiteIds.map((prerequisiteId) => ({ subtopicId: id, prerequisiteId })),
          });
        }
      });
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'This topic already has a subtopic with that slug.', {
          fields: { slug: 'Already used in this topic.' },
        });
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.subtopic.updated',
      entityType: 'subtopic',
      entityId: id,
      after: patch,
      ip: actor.ip,
    });
  }

  async createConcept(body: ConceptBody, actor: Actor) {
    if (!(await this.db.subtopic.findUnique({ where: { id: body.subtopicId } })))
      throw notFound('That subtopic');
    try {
      const c = await this.db.concept.create({
        data: { ...body, description: body.description ?? null },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'curriculum.concept.created',
        entityType: 'concept',
        entityId: c.id,
        after: body,
        ip: actor.ip,
      });
      return c.id;
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That concept key already exists.', {
          fields: { key: 'Already used.' },
        });
      throw err;
    }
  }

  async updateConcept(id: string, patch: Partial<Omit<ConceptBody, 'subtopicId'>>, actor: Actor) {
    try {
      await this.db.concept.update({ where: { id }, data: patch });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That concept');
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That concept key already exists.', {
          fields: { key: 'Already used.' },
        });
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.concept.updated',
      entityType: 'concept',
      entityId: id,
      after: patch,
      ip: actor.ip,
    });
  }

  async deleteConcept(id: string, actor: Actor) {
    try {
      await this.db.concept.delete({ where: { id } });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That concept');
      if (isForeignKeyViolation(err)) {
        throw new AppError(
          'CONFLICT',
          'Lesson sections are tagged with this concept, so it cannot be deleted. Rename it instead.',
        );
      }
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.concept.deleted',
      entityType: 'concept',
      entityId: id,
      ip: actor.ip,
    });
  }

  // ───────────── Role × package curricula ─────────────

  private async assertTarget(roleId: string, bracketId: string) {
    const [role, bracket] = await Promise.all([
      this.db.careerRole.findUnique({ where: { id: roleId } }),
      this.db.packageBracket.findUnique({ where: { id: bracketId } }),
    ]);
    if (!role) throw notFound('That role');
    if (!bracket) throw notFound('That package');
  }

  /** Every role × package with its curriculum state, for the admin picker. */
  async index(): Promise<CurriculaIndex> {
    const [roles, brackets, curricula, goals] = await Promise.all([
      this.db.careerRole.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true } }),
      this.db.packageBracket.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true } }),
      this.db.roleCurriculum.findMany({
        where: { status: { in: ['PUBLISHED', 'DRAFT'] } },
        include: { _count: { select: { items: true } } },
      }),
      this.db.studentGoal.groupBy({
        by: ['roleId', 'bracketId'],
        where: { isActive: true },
        _count: true,
      }),
    ]);
    return {
      targets: roles.flatMap((r) =>
        brackets.map((b) => {
          const mine = curricula.filter((c) => c.roleId === r.id && c.bracketId === b.id);
          const published = mine.find((c) => c.status === 'PUBLISHED');
          return {
            roleId: r.id,
            bracketId: b.id,
            publishedVersion: published?.version ?? null,
            publishedAt: published?.publishedAt?.toISOString() ?? null,
            hasDraft: mine.some((c) => c.status === 'DRAFT'),
            itemCount: published?._count.items ?? 0,
            activeStudents:
              goals.find((g) => g.roleId === r.id && g.bracketId === b.id)?._count ?? 0,
          };
        }),
      ),
    };
  }

  async overview(roleId: string, bracketId: string): Promise<CurriculumOverview> {
    await this.assertTarget(roleId, bracketId);
    const [all, activeStudents] = await Promise.all([
      this.db.roleCurriculum.findMany({
        where: { roleId, bracketId },
        include: { items: true },
        orderBy: { version: 'desc' },
      }),
      this.db.studentGoal.count({ where: { roleId, bracketId, isActive: true } }),
    ]);
    const published = all.find((c) => c.status === 'PUBLISHED');
    const draft = all.find((c) => c.status === 'DRAFT');
    return {
      roleId,
      bracketId,
      published: published ? toCurriculumDto(published) : null,
      draft: draft ? toCurriculumDto(draft) : null,
      history: all.map((c) => ({
        id: c.id,
        version: c.version,
        status: c.status,
        publishedAt: c.publishedAt?.toISOString() ?? null,
        changeNote: c.changeNote,
        itemCount: c.items.length,
      })),
      activeStudents,
    };
  }

  /** Saves the full item list as the draft (creating the draft if there is none). */
  async saveDraft(
    roleId: string,
    bracketId: string,
    body: SaveDraftBody,
    actor: Actor,
  ): Promise<CurriculumDto> {
    await this.assertTarget(roleId, bracketId);
    const ids = body.items.map((i) => i.subtopicId);
    if (new Set(ids).size !== ids.length) {
      throw new AppError('VALIDATION_ERROR', 'Each subtopic can appear only once.');
    }
    const found = await this.db.subtopic.count({ where: { id: { in: ids }, status: 'ACTIVE' } });
    if (found !== ids.length) {
      throw new AppError('VALIDATION_ERROR', 'Some subtopics do not exist or are archived.');
    }

    const draft = await this.db.$transaction(async (tx) => {
      let d = await tx.roleCurriculum.findFirst({ where: { roleId, bracketId, status: 'DRAFT' } });
      if (!d) {
        const last = await tx.roleCurriculum.findFirst({
          where: { roleId, bracketId },
          orderBy: { version: 'desc' },
        });
        d = await tx.roleCurriculum.create({
          data: {
            roleId,
            bracketId,
            version: (last?.version ?? 0) + 1,
            status: 'DRAFT',
            createdById: actor.id,
          },
        });
      }
      await tx.roleCurriculumItem.deleteMany({ where: { roleCurriculumId: d.id } });
      await tx.roleCurriculumItem.createMany({
        data: body.items.map((i) => ({
          roleCurriculumId: d.id,
          subtopicId: i.subtopicId,
          priority: i.priority,
          targetDepthRank: i.targetDepthRank,
          isOptional: i.isOptional,
          learningObjectives: i.learningObjectives,
          implementationExpectation: i.implementationExpectation ?? null,
          estimateMinutesOverride: i.estimateMinutesOverride ?? null,
          rationale: i.rationale ?? null,
        })),
      });
      return tx.roleCurriculum.update({
        where: { id: d.id },
        data: { changeNote: body.changeNote ?? d.changeNote },
        include: { items: true },
      });
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.draft.saved',
      entityType: 'role_curriculum',
      entityId: draft.id,
      after: { items: draft.items.length },
      ip: actor.ip,
    });
    return toCurriculumDto(draft);
  }

  async discardDraft(roleId: string, bracketId: string, actor: Actor) {
    const { count } = await this.db.roleCurriculum.deleteMany({
      where: { roleId, bracketId, status: 'DRAFT' },
    });
    if (count === 0) throw notFound('A draft');
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.draft.discarded',
      after: { roleId, bracketId },
      ip: actor.ip,
    });
  }

  /** Publishes the draft. Students on this target get an update *proposal*, never a silent change. */
  async publish(roleId: string, bracketId: string, changeNote: string, actor: Actor) {
    const draft = await this.db.roleCurriculum.findFirst({
      where: { roleId, bracketId, status: 'DRAFT' },
      include: { items: { include: { subtopic: true } } },
    });
    if (!draft) throw new AppError('CONFLICT', 'There is no draft to publish. Save a draft first.');
    if (draft.items.length === 0)
      throw new AppError('VALIDATION_ERROR', 'A curriculum needs at least one subtopic.');

    // The planner must be able to order the items: reject prerequisite loops before students see them.
    const [subEdges, topicEdges] = await Promise.all([
      this.db.subtopicPrerequisite.findMany(),
      this.db.topicPrerequisite.findMany(),
    ]);
    try {
      orderItems({
        items: draft.items.map((i) => ({
          subtopicId: i.subtopicId,
          topicId: i.subtopic.topicId,
          topicSort: 0,
          subtopicSort: i.subtopic.sortOrder,
          priority: i.priority,
          targetDepthRank: i.targetDepthRank,
          isOptional: i.isOptional,
          complexity: i.subtopic.complexity,
          estimateOverride: null,
          skillLevel: 0,
        })),
        subtopicPrereqs: subEdges.map((e) => [e.subtopicId, e.prerequisiteId]),
        topicPrereqs: topicEdges.map((e) => [e.topicId, e.prerequisiteId]),
      });
    } catch (err) {
      if (err instanceof CurriculumCycleError) {
        throw new AppError(
          'VALIDATION_ERROR',
          'The prerequisites of these subtopics form a loop. Fix them before publishing.',
        );
      }
      throw err;
    }

    const published = await this.db.$transaction(async (tx) => {
      await tx.roleCurriculum.updateMany({
        where: { roleId, bracketId, status: 'PUBLISHED' },
        data: { status: 'SUPERSEDED' },
      });
      return tx.roleCurriculum.update({
        where: { id: draft.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: this.ctx.now(),
          publishedById: actor.id,
          changeNote,
        },
        include: { items: true },
      });
    });
    const proposalsCreated = await this.roadmaps.proposeForCurriculum(published.id);
    await this.audit.record({
      actorId: actor.id,
      action: 'curriculum.published',
      entityType: 'role_curriculum',
      entityId: published.id,
      after: {
        roleId,
        bracketId,
        version: published.version,
        items: published.items.length,
        proposalsCreated,
      },
      ip: actor.ip,
    });
    return { curriculum: toCurriculumDto(published), proposalsCreated };
  }
}
