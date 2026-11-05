import type {
  ColorKey,
  StudentDetail,
  StudentListItem,
  StudentListQuery,
  StudentListResponse,
  UpdateStudentBody,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import { notFound } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { SessionService } from '../auth/session.service.ts';
import { GoalsService } from '../goals/goals.service.ts';

const listInclude = {
  studentProfile: true,
  goals: { where: { isActive: true }, include: { role: true, bracket: true }, take: 1 },
  cohorts: { include: { cohort: true } },
  sessions: {
    where: { audience: 'STUDENT' },
    orderBy: { lastSeenAt: 'desc' },
    take: 1,
    select: { lastSeenAt: true },
  },
} satisfies Prisma.UserInclude;

type StudentRow = Prisma.UserGetPayload<{ include: typeof listInclude }>;

function toListItem(u: StudentRow): StudentListItem {
  const goal = u.goals[0];
  return {
    id: u.id,
    email: u.email,
    fullName: u.studentProfile?.fullName ?? '',
    status: u.status,
    emailVerified: u.emailVerifiedAt !== null,
    onboarded: u.studentProfile?.onboardingCompletedAt != null,
    role: goal
      ? {
          id: goal.role.id,
          title: goal.role.title,
          shortCode: goal.role.shortCode,
          colorKey: goal.role.colorKey as ColorKey,
        }
      : null,
    bracket: goal ? { id: goal.bracket.id, label: goal.bracket.label } : null,
    cohorts: u.cohorts.map((c) => ({ id: c.cohort.id, name: c.cohort.name })),
    lastActiveAt: u.sessions[0]?.lastSeenAt.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

/** Admin view of students: search, filters, a student's full track, status and cohorts. */
export class StudentsService {
  private readonly audit: AuditService;
  private readonly goals: GoalsService;
  private readonly sessions: SessionService;

  constructor(private readonly ctx: AppContext) {
    this.audit = new AuditService(ctx);
    this.goals = new GoalsService(ctx);
    this.sessions = new SessionService(ctx);
  }

  async list(q: StudentListQuery): Promise<StudentListResponse> {
    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      status: q.status ?? { not: 'DELETED' },
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: 'insensitive' } },
              { studentProfile: { fullName: { contains: q.q, mode: 'insensitive' } } },
            ],
          }
        : {}),
      ...(q.roleId || q.bracketId
        ? {
            goals: {
              some: {
                isActive: true,
                ...(q.roleId ? { roleId: q.roleId } : {}),
                ...(q.bracketId ? { bracketId: q.bracketId } : {}),
              },
            },
          }
        : {}),
      ...(q.cohortId ? { cohorts: { some: { cohortId: q.cohortId } } } : {}),
      ...(q.onboarding === 'done'
        ? { studentProfile: { onboardingCompletedAt: { not: null } } }
        : q.onboarding === 'pending'
          ? { studentProfile: { onboardingCompletedAt: null } }
          : {}),
    };
    const [total, rows] = await Promise.all([
      this.ctx.db.user.count({ where }),
      this.ctx.db.user.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { items: rows.map(toListItem), page: q.page, pageSize: q.pageSize, total };
  }

  async detail(id: string): Promise<StudentDetail> {
    const u = await this.ctx.db.user.findFirst({
      where: { id, role: 'STUDENT' },
      include: listInclude,
    });
    if (!u) throw notFound('That student');
    const tz = u.studentProfile?.timezone ?? 'Asia/Kolkata';
    const [{ goal, skills }, previousGoals] = await Promise.all([
      this.goals.getGoal(id, tz),
      this.ctx.db.studentGoal.count({ where: { studentId: id, isActive: false } }),
    ]);
    return { ...toListItem(u), timezone: tz, goal, skills, previousGoals };
  }

  async update(id: string, body: UpdateStudentBody, actor: { id: string; ip: string | null }) {
    const before = await this.detail(id);
    await this.ctx.db.$transaction(async (tx) => {
      if (body.status && body.status !== before.status) {
        await tx.user.update({ where: { id }, data: { status: body.status } });
      }
      if (body.cohortIds) {
        await tx.cohortMember.deleteMany({ where: { studentId: id } });
        if (body.cohortIds.length) {
          await tx.cohortMember.createMany({
            data: [...new Set(body.cohortIds)].map((cohortId) => ({ cohortId, studentId: id })),
            skipDuplicates: true,
          });
        }
      }
    });
    // A suspended student is signed out everywhere immediately.
    if (body.status === 'SUSPENDED') await this.sessions.revokeAllForUser(id);

    const after = await this.detail(id);
    await this.audit.record({
      actorId: actor.id,
      action: 'student.updated',
      entityType: 'user',
      entityId: id,
      before: { status: before.status, cohorts: before.cohorts.map((c) => c.name) },
      after: { status: after.status, cohorts: after.cohorts.map((c) => c.name) },
      ip: actor.ip,
    });
    return after;
  }
}
