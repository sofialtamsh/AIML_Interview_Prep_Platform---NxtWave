import type {
  AddAllowlistBody,
  AddAllowlistResponse,
  AllowlistResponse,
  CohortBody,
  CohortDto,
  RegistrationPolicy,
} from '@app/contracts';
import { Email } from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import { fromDbDate, toDbDate } from '../../lib/dates.ts';
import { isNotFound, isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { SettingsService } from '../settings/settings.service.ts';

const DOMAIN_RE = /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

type CohortRow = Prisma.CohortGetPayload<{ include: { _count: { select: { members: true } } } }>;

const toCohortDto = (c: CohortRow): CohortDto => ({
  id: c.id,
  name: c.name,
  startsOn: c.startsOn ? fromDbDate(c.startsOn) : null,
  endsOn: c.endsOn ? fromDbDate(c.endsOn) : null,
  memberCount: c._count.members,
  createdAt: c.createdAt.toISOString(),
});

/** Parses "priya@college.edu" as an email and "@nxtwave.co.in" / "nxtwave.co.in" as a domain. */
export function parseAllowlistEntry(raw: string): { email: string } | { domain: string } | null {
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith('@') || !v.includes('@')) {
    const domain = v.replace(/^@/, '');
    return DOMAIN_RE.test(domain) ? { domain } : null;
  }
  const email = Email.safeParse(v);
  return email.success ? { email: email.data } : null;
}

interface Actor {
  id: string;
  ip: string | null;
}

/** Who may join: cohorts, the enrollment allowlist and the registration policy. */
export class AccessService {
  private readonly audit: AuditService;
  private readonly settings: SettingsService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
    this.settings = new SettingsService(ctx);
  }

  // ───────────── Cohorts ─────────────

  async listCohorts(): Promise<CohortDto[]> {
    const rows = await this.ctx.db.cohort.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toCohortDto);
  }

  async createCohort(body: CohortBody, actor: Actor): Promise<CohortDto> {
    try {
      const c = await this.ctx.db.cohort.create({
        data: {
          name: body.name,
          startsOn: body.startsOn ? toDbDate(body.startsOn) : null,
          endsOn: body.endsOn ? toDbDate(body.endsOn) : null,
        },
        include: { _count: { select: { members: true } } },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'cohort.created',
        entityType: 'cohort',
        entityId: c.id,
        after: body,
        ip: actor.ip,
      });
      return toCohortDto(c);
    } catch (err) {
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'A cohort with this name exists.', {
          fields: { name: 'Already used.' },
        });
      throw err;
    }
  }

  async updateCohort(id: string, body: Partial<CohortBody>, actor: Actor): Promise<CohortDto> {
    try {
      const c = await this.ctx.db.cohort.update({
        where: { id },
        data: {
          name: body.name,
          startsOn:
            body.startsOn === undefined
              ? undefined
              : body.startsOn
                ? toDbDate(body.startsOn)
                : null,
          endsOn:
            body.endsOn === undefined ? undefined : body.endsOn ? toDbDate(body.endsOn) : null,
        },
        include: { _count: { select: { members: true } } },
      });
      await this.audit.record({
        actorId: actor.id,
        action: 'cohort.updated',
        entityType: 'cohort',
        entityId: id,
        after: body,
        ip: actor.ip,
      });
      return toCohortDto(c);
    } catch (err) {
      if (isNotFound(err)) throw notFound('That cohort');
      if (isUniqueViolation(err))
        throw new AppError('CONFLICT', 'A cohort with this name exists.', {
          fields: { name: 'Already used.' },
        });
      throw err;
    }
  }

  async deleteCohort(id: string, actor: Actor) {
    try {
      await this.ctx.db.cohort.delete({ where: { id } });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That cohort');
      throw err;
    }
    await this.audit.record({
      actorId: actor.id,
      action: 'cohort.deleted',
      entityType: 'cohort',
      entityId: id,
      ip: actor.ip,
    });
  }

  // ───────────── Allowlist ─────────────

  async listAllowlist(q: {
    page: number;
    pageSize: number;
    q?: string;
  }): Promise<AllowlistResponse> {
    const where: Prisma.EnrollmentAllowlistWhereInput = q.q
      ? {
          OR: [
            { email: { contains: q.q, mode: 'insensitive' } },
            { domain: { contains: q.q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      this.ctx.db.enrollmentAllowlist.count({ where }),
      this.ctx.db.enrollmentAllowlist.findMany({
        where,
        include: { cohort: true },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        email: r.email,
        domain: r.domain,
        cohort: r.cohort ? { id: r.cohort.id, name: r.cohort.name } : null,
        note: r.note,
        usedAt: r.usedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }

  /** Bulk add (e.g. a pasted enrollment list). Invalid lines are reported, duplicates skipped. */
  async addToAllowlist(body: AddAllowlistBody, actor: Actor): Promise<AddAllowlistResponse> {
    if (body.cohortId && !(await this.ctx.db.cohort.findUnique({ where: { id: body.cohortId } }))) {
      throw notFound('That cohort');
    }
    const invalid: string[] = [];
    const emails = new Set<string>();
    const domains = new Set<string>();
    for (const raw of body.entries) {
      const parsed = parseAllowlistEntry(raw);
      if (!parsed) invalid.push(raw);
      else if ('email' in parsed) emails.add(parsed.email);
      else domains.add(parsed.domain);
    }
    const data = [
      ...[...emails].map((email) => ({ email })),
      ...[...domains].map((domain) => ({ domain })),
    ].map((d) => ({
      ...d,
      cohortId: body.cohortId ?? null,
      note: body.note ?? null,
      addedById: actor.id,
    }));

    const { count } = await this.ctx.db.enrollmentAllowlist.createMany({
      data,
      skipDuplicates: true,
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'allowlist.added',
      entityType: 'enrollment_allowlist',
      after: { added: count, cohortId: body.cohortId ?? null },
      ip: actor.ip,
    });
    return { added: count, alreadyListed: data.length - count, invalid: invalid.slice(0, 100) };
  }

  async removeFromAllowlist(id: string, actor: Actor) {
    try {
      const row = await this.ctx.db.enrollmentAllowlist.delete({ where: { id } });
      await this.audit.record({
        actorId: actor.id,
        action: 'allowlist.removed',
        entityType: 'enrollment_allowlist',
        entityId: id,
        before: { email: row.email, domain: row.domain },
        ip: actor.ip,
      });
    } catch (err) {
      if (isNotFound(err)) throw notFound('That entry');
      throw err;
    }
  }

  // ───────────── Registration policy ─────────────

  getRegistrationPolicy() {
    return this.settings.getRegistrationPolicy();
  }

  async setRegistrationPolicy(policy: RegistrationPolicy, actor: Actor) {
    const before = await this.settings.getRegistrationPolicy();
    await this.settings.setRegistrationPolicy(policy, actor.id);
    await this.audit.record({
      actorId: actor.id,
      action: 'settings.registration_policy',
      entityType: 'platform_setting',
      entityId: 'registration.policy',
      before,
      after: policy,
      ip: actor.ip,
    });
    return policy;
  }
}
