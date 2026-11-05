import type {
  AdminCatalogResponse,
  BracketBody,
  BracketPatch,
  CareerRoleDto,
  ColorKey,
  CompanyDto,
  DepthLevelDto,
  DepthLevelPatch,
  DifficultyPolicy,
  PackageBracketDto,
  RoleBody,
  RolePatch,
  SkillAreaBody,
  SkillAreaDto,
  StudentCatalogResponse,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import type { QuestionDifficulty } from '../../generated/prisma/enums.ts';
import { isNotFound, isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { slugify } from './catalog.bootstrap.ts';

const DIFFICULTIES: QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'EXPERT'];
const DEFAULT_POLICY: DifficultyPolicy = { EASY: 25, MEDIUM: 50, HARD: 25, EXPERT: 0 };

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

type RoleRow = Prisma.CareerRoleGetPayload<{ include: { skillAreas: true } }>;
type BracketRow = Prisma.PackageBracketGetPayload<{ include: { difficultyPolicy: true } }>;

export function toRoleDto(r: RoleRow): CareerRoleDto {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    shortCode: r.shortCode,
    tagline: r.tagline,
    description: r.description,
    competencies: strings(r.competencies),
    interviewFocus: strings(r.interviewFocus),
    colorKey: r.colorKey as ColorKey,
    availability: r.availability,
    sortOrder: r.sortOrder,
    skillAreas: r.skillAreas
      .map((s) => ({ skillAreaId: s.skillAreaId, importance: s.importance }))
      .sort((a, b) => b.importance - a.importance),
  };
}

export function toBracketDto(b: BracketRow): PackageBracketDto {
  const policy = { EASY: 0, MEDIUM: 0, HARD: 0, EXPERT: 0 };
  for (const p of b.difficultyPolicy) policy[p.difficulty] = p.weight;
  return {
    id: b.id,
    code: b.code,
    label: b.label,
    minLpa: b.minLpa,
    maxLpa: b.maxLpa,
    headline: b.headline,
    expectations: b.expectations,
    availability: b.availability,
    sortOrder: b.sortOrder,
    difficultyPolicy: policy,
  };
}

const toSkillAreaDto = (s: SkillAreaDto & Record<string, unknown>): SkillAreaDto => ({
  id: s.id,
  slug: s.slug,
  name: s.name,
  description: s.description,
  sortOrder: s.sortOrder,
});

interface Actor {
  id: string;
  ip: string | null;
}

/** Roles, package brackets, depth levels, skill areas, companies and difficulty mix. */
export class CatalogService {
  private readonly audit: AuditService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Reads ─────────────

  async adminCatalog(): Promise<AdminCatalogResponse> {
    const [
      roles,
      brackets,
      depthLevels,
      skillAreas,
      companies,
      goalsByRole,
      goalsByBracket,
      interest,
    ] = await Promise.all([
      this.db.careerRole.findMany({ include: { skillAreas: true }, orderBy: { sortOrder: 'asc' } }),
      this.db.packageBracket.findMany({
        include: { difficultyPolicy: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.depthLevel.findMany({ orderBy: { rank: 'asc' } }),
      this.db.skillArea.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.db.company.findMany({ orderBy: { name: 'asc' } }),
      this.db.studentGoal.groupBy({ by: ['roleId'], where: { isActive: true }, _count: true }),
      this.db.studentGoal.groupBy({ by: ['bracketId'], where: { isActive: true }, _count: true }),
      this.db.interestSignal.groupBy({
        by: ['kind', 'targetId'],
        where: { kind: { in: ['ROLE', 'BRACKET'] } },
        _count: true,
      }),
    ]);
    const roleGoals = new Map(goalsByRole.map((g) => [g.roleId, g._count]));
    const bracketGoals = new Map(goalsByBracket.map((g) => [g.bracketId, g._count]));
    const interested = new Map(interest.map((i) => [`${i.kind}:${i.targetId}`, i._count]));

    return {
      roles: roles.map((r) => ({
        ...toRoleDto(r),
        activeGoals: roleGoals.get(r.id) ?? 0,
        interested: interested.get(`ROLE:${r.id}`) ?? 0,
      })),
      brackets: brackets.map((b) => ({
        ...toBracketDto(b),
        activeGoals: bracketGoals.get(b.id) ?? 0,
        interested: interested.get(`BRACKET:${b.id}`) ?? 0,
      })),
      depthLevels: depthLevels.map(
        (d): DepthLevelDto => ({
          rank: d.rank,
          code: d.code,
          name: d.name,
          description: d.description,
          generationGuidance: d.generationGuidance,
        }),
      ),
      skillAreas: skillAreas.map(toSkillAreaDto),
      companies: companies.map((c): CompanyDto => ({ id: c.id, slug: c.slug, name: c.name })),
    };
  }

  /** What a student may see: everything except HIDDEN, with their "notify me" flags. */
  async studentCatalog(studentId: string): Promise<StudentCatalogResponse> {
    const [roles, brackets, skillAreas, interests] = await Promise.all([
      this.db.careerRole.findMany({
        where: { availability: { not: 'HIDDEN' } },
        include: { skillAreas: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.packageBracket.findMany({
        where: { availability: { not: 'HIDDEN' } },
        include: { difficultyPolicy: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.skillArea.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      this.db.interestSignal.findMany({
        where: { studentId, kind: { in: ['ROLE', 'BRACKET'] } },
        select: { kind: true, targetId: true },
      }),
    ]);
    const wants = new Set(interests.map((i) => `${i.kind}:${i.targetId}`));
    return {
      roles: roles.map((r) => ({ ...toRoleDto(r), notifyMe: wants.has(`ROLE:${r.id}`) })),
      brackets: brackets.map((b) => {
        const { difficultyPolicy: _hidden, ...dto } = toBracketDto(b);
        return { ...dto, notifyMe: wants.has(`BRACKET:${b.id}`) };
      }),
      skillAreas: skillAreas.map(toSkillAreaDto),
    };
  }

  // ───────────── Roles ─────────────

  private async assertSkillAreasExist(ids: string[]) {
    if (ids.length === 0) return;
    const found = await this.db.skillArea.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) {
      throw new AppError('VALIDATION_ERROR', 'One of the selected skill areas does not exist.', {
        fields: { skillAreas: 'Pick skill areas from the list.' },
      });
    }
  }

  async createRole(body: RoleBody, actor: Actor) {
    await this.assertSkillAreasExist(body.skillAreas.map((s) => s.skillAreaId));
    try {
      const role = await this.db.careerRole.create({
        data: {
          ...body,
          updatedById: actor.id,
          skillAreas: { create: dedupeSkills(body.skillAreas) },
        },
        include: { skillAreas: true },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.role.created',
        entityType: 'career_role',
        entityId: role.id,
        after: toRoleDto(role),
        ip: actor.ip,
      });
      return toRoleDto(role);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'A role with this slug already exists.', {
          fields: { slug: 'Already used by another role.' },
        });
      }
      throw err;
    }
  }

  async updateRole(id: string, patch: RolePatch, actor: Actor) {
    const before = await this.db.careerRole.findUnique({
      where: { id },
      include: { skillAreas: true },
    });
    if (!before) throw notFound('That role');
    if (patch.skillAreas)
      await this.assertSkillAreasExist(patch.skillAreas.map((s) => s.skillAreaId));

    const { skillAreas, ...fields } = patch;
    try {
      const role = await this.db.$transaction(async (tx) => {
        if (skillAreas) {
          await tx.roleSkillArea.deleteMany({ where: { roleId: id } });
          await tx.roleSkillArea.createMany({
            data: dedupeSkills(skillAreas).map((s) => ({ ...s, roleId: id })),
          });
        }
        return tx.careerRole.update({
          where: { id },
          data: { ...fields, updatedById: actor.id },
          include: { skillAreas: true },
        });
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.role.updated',
        entityType: 'career_role',
        entityId: id,
        before: toRoleDto(before),
        after: toRoleDto(role),
        ip: actor.ip,
      });
      return toRoleDto(role);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'A role with this slug already exists.', {
          fields: { slug: 'Already used by another role.' },
        });
      }
      throw err;
    }
  }

  // ───────────── Brackets ─────────────

  private assertLpaRange(minLpa: number, maxLpa: number | null) {
    if (maxLpa !== null && maxLpa <= minLpa) {
      throw new AppError('VALIDATION_ERROR', 'The upper limit must be above the lower limit.', {
        fields: { maxLpa: 'Must be greater than the lower limit.' },
      });
    }
  }

  async createBracket(body: BracketBody, actor: Actor) {
    this.assertLpaRange(body.minLpa, body.maxLpa);
    try {
      const bracket = await this.db.packageBracket.create({
        data: {
          ...body,
          updatedById: actor.id,
          difficultyPolicy: {
            create: DIFFICULTIES.map((difficulty) => ({
              difficulty,
              weight: DEFAULT_POLICY[difficulty],
            })),
          },
        },
        include: { difficultyPolicy: true },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.bracket.created',
        entityType: 'package_bracket',
        entityId: bracket.id,
        after: toBracketDto(bracket),
        ip: actor.ip,
      });
      return toBracketDto(bracket);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'A package with this code already exists.', {
          fields: { code: 'Already used.' },
        });
      }
      throw err;
    }
  }

  async updateBracket(id: string, patch: BracketPatch, actor: Actor) {
    const before = await this.db.packageBracket.findUnique({
      where: { id },
      include: { difficultyPolicy: true },
    });
    if (!before) throw notFound('That package');
    this.assertLpaRange(
      patch.minLpa ?? before.minLpa,
      patch.maxLpa === undefined ? before.maxLpa : patch.maxLpa,
    );
    try {
      const bracket = await this.db.packageBracket.update({
        where: { id },
        data: { ...patch, updatedById: actor.id },
        include: { difficultyPolicy: true },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.bracket.updated',
        entityType: 'package_bracket',
        entityId: id,
        before: toBracketDto(before),
        after: toBracketDto(bracket),
        ip: actor.ip,
      });
      return toBracketDto(bracket);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError('CONFLICT', 'A package with this code already exists.', {
          fields: { code: 'Already used.' },
        });
      }
      throw err;
    }
  }

  async setDifficultyPolicy(bracketId: string, policy: DifficultyPolicy, actor: Actor) {
    const before = await this.db.packageBracket.findUnique({
      where: { id: bracketId },
      include: { difficultyPolicy: true },
    });
    if (!before) throw notFound('That package');
    if (DIFFICULTIES.every((d) => policy[d] === 0)) {
      throw new AppError('VALIDATION_ERROR', 'At least one difficulty needs a weight above zero.');
    }
    await this.db.$transaction(
      DIFFICULTIES.map((difficulty) =>
        this.db.bracketDifficultyPolicy.upsert({
          where: { bracketId_difficulty: { bracketId, difficulty } },
          create: { bracketId, difficulty, weight: policy[difficulty] },
          update: { weight: policy[difficulty] },
        }),
      ),
    );
    const after = await this.db.packageBracket.findUniqueOrThrow({
      where: { id: bracketId },
      include: { difficultyPolicy: true },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'catalog.bracket.difficulty_policy',
      entityType: 'package_bracket',
      entityId: bracketId,
      before: toBracketDto(before).difficultyPolicy,
      after: toBracketDto(after).difficultyPolicy,
      ip: actor.ip,
    });
    return toBracketDto(after);
  }

  // ───────────── Depth levels ─────────────

  async updateDepthLevel(
    rank: number,
    patch: DepthLevelPatch,
    actor: Actor,
  ): Promise<DepthLevelDto> {
    const before = await this.db.depthLevel.findUnique({ where: { rank } });
    if (!before) throw notFound('That depth level');
    const d = await this.db.depthLevel.update({
      where: { rank },
      data: { ...patch, updatedById: actor.id },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'catalog.depth_level.updated',
      entityType: 'depth_level',
      entityId: String(rank),
      before: {
        name: before.name,
        description: before.description,
        guidance: before.generationGuidance,
      },
      after: { name: d.name, description: d.description, guidance: d.generationGuidance },
      ip: actor.ip,
    });
    return {
      rank: d.rank,
      code: d.code,
      name: d.name,
      description: d.description,
      generationGuidance: d.generationGuidance,
    };
  }

  // ───────────── Skill areas ─────────────

  async createSkillArea(body: SkillAreaBody, actor: Actor) {
    try {
      const s = await this.db.skillArea.create({ data: body });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.skill_area.created',
        entityType: 'skill_area',
        entityId: s.id,
        after: body,
        ip: actor.ip,
      });
      return toSkillAreaDto(s);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That slug is already used.', {
          fields: { slug: 'Already used.' },
        });
      throw err;
    }
  }

  async updateSkillArea(id: string, patch: Partial<SkillAreaBody>, actor: Actor) {
    try {
      const s = await this.db.skillArea.update({ where: { id }, data: patch });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.skill_area.updated',
        entityType: 'skill_area',
        entityId: id,
        after: patch,
        ip: actor.ip,
      });
      return toSkillAreaDto(s);
    } catch (err) {
      if (isNotFound(err)) throw notFound('That skill area');
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That slug is already used.', {
          fields: { slug: 'Already used.' },
        });
      throw err;
    }
  }

  async deleteSkillArea(id: string, actor: Actor) {
    const ratings = await this.db.studentSkillRating.count({ where: { skillAreaId: id } });
    if (ratings > 0) {
      throw new AppError(
        'CONFLICT',
        `Students have rated this skill area (${ratings}). Rename it instead of deleting.`,
      );
    }
    try {
      await this.db.skillArea.delete({ where: { id } });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That skill area');
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'catalog.skill_area.deleted',
      entityType: 'skill_area',
      entityId: id,
      ip: actor.ip,
    });
  }

  // ───────────── Companies ─────────────

  async createCompany(name: string, actor: Actor): Promise<CompanyDto> {
    const slug = slugify(name);
    if (!slug)
      throw new AppError('VALIDATION_ERROR', 'Enter a company name.', {
        fields: { name: 'Enter a name.' },
      });
    try {
      const c = await this.db.company.create({ data: { name, slug } });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.company.created',
        entityType: 'company',
        entityId: c.id,
        after: { name },
        ip: actor.ip,
      });
      return { id: c.id, slug: c.slug, name: c.name };
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That company already exists.', {
          fields: { name: 'Already listed.' },
        });
      throw err;
    }
  }

  async updateCompany(id: string, name: string, actor: Actor): Promise<CompanyDto> {
    try {
      const c = await this.db.company.update({
        where: { id },
        data: { name, slug: slugify(name) },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'catalog.company.updated',
        entityType: 'company',
        entityId: id,
        after: { name },
        ip: actor.ip,
      });
      return { id: c.id, slug: c.slug, name: c.name };
    } catch (err) {
      if (isNotFound(err)) throw notFound('That company');
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'That company already exists.', {
          fields: { name: 'Already listed.' },
        });
      throw err;
    }
  }

  async deleteCompany(id: string, actor: Actor) {
    try {
      await this.db.company.delete({ where: { id } });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That company');
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'catalog.company.deleted',
      entityType: 'company',
      entityId: id,
      ip: actor.ip,
    });
  }
}

function dedupeSkills(skills: { skillAreaId: string; importance: number }[]) {
  const map = new Map<string, number>();
  for (const s of skills) map.set(s.skillAreaId, s.importance);
  return [...map].map(([skillAreaId, importance]) => ({ skillAreaId, importance }));
}
