import {
  type ChangeTargetBody,
  type CompleteOnboardingBody,
  type GoalDto,
  type GoalResponse,
  OnboardingDraft,
  type OnboardingState,
  type Schedule,
  type SkillRatingDto,
  type SkillRatings,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import { Prisma } from '../../db/prisma.ts';
import type { InterestKind } from '../../generated/prisma/enums.ts';
import { daysBetween, fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import type { SessionUser } from '../auth/session.service.ts';
import { RoadmapService } from '../roadmap/roadmap.service.ts';

const DEADLINE_MIN_DAYS = 7;
const DEADLINE_MAX_DAYS = 3 * 365;

type GoalRow = Prisma.StudentGoalGetPayload<{ include: { role: true; bracket: true } }>;

export function toGoalDto(g: GoalRow, timezone: string, now: Date): GoalDto {
  const deadline = g.deadline ? fromDbDate(g.deadline) : null;
  return {
    id: g.id,
    role: {
      id: g.role.id,
      slug: g.role.slug,
      title: g.role.title,
      shortCode: g.role.shortCode,
      colorKey: g.role.colorKey as GoalDto['role']['colorKey'],
      availability: g.role.availability,
    },
    bracket: {
      id: g.bracket.id,
      code: g.bracket.code,
      label: g.bracket.label,
      headline: g.bracket.headline,
      availability: g.bracket.availability,
    },
    dailyMinutes: g.dailyMinutes,
    studyWeekdays: [...g.studyWeekdays].sort((a, b) => a - b),
    weeklyMinutes: g.dailyMinutes * g.studyWeekdays.length,
    startDate: fromDbDate(g.startDate),
    deadline,
    daysToDeadline: deadline ? daysBetween(todayIn(timezone, now), deadline) : null,
    createdAt: g.createdAt.toISOString(),
  };
}

const tzOf = (user: SessionUser) => user.studentProfile?.timezone ?? 'Asia/Kolkata';

/** Onboarding, the student's goal (role × bracket × schedule) and skill self-ratings. */
export class GoalsService {
  private readonly roadmaps: RoadmapService;

  constructor(private readonly ctx: AppContext) {
    this.roadmaps = new RoadmapService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Onboarding ─────────────

  getOnboarding(user: SessionUser): OnboardingState {
    const parsed = OnboardingDraft.safeParse(user.studentProfile?.onboardingDraft ?? {});
    return {
      completed: user.studentProfile?.onboardingCompletedAt != null,
      draft: parsed.success ? parsed.data : {},
    };
  }

  /** Merges partial choices into the saved draft so a refresh resumes where the student was. */
  async saveDraft(user: SessionUser, patch: OnboardingDraft): Promise<OnboardingState> {
    const current = this.getOnboarding(user);
    if (current.completed) throw new AppError('CONFLICT', 'You have already finished onboarding.');
    const merged: OnboardingDraft = {
      ...current.draft,
      ...patch,
      skills: { ...current.draft.skills, ...patch.skills },
      schedule: { ...current.draft.schedule, ...patch.schedule },
    };
    await this.db.studentProfile.update({
      where: { userId: user.id },
      data: { onboardingDraft: merged, onboardingStep: merged.step ?? 0 },
    });
    return { completed: false, draft: merged };
  }

  async completeOnboarding(user: SessionUser, body: CompleteOnboardingBody) {
    if (user.studentProfile?.onboardingCompletedAt) {
      throw new AppError('CONFLICT', 'You have already finished onboarding.');
    }
    await this.assertSelectable(body.roleId, body.bracketId);
    this.assertSchedule(body.schedule, tzOf(user));
    await this.assertSkillAreas(body.skills);

    const today = todayIn(tzOf(user), this.ctx.now());
    const goal = await this.db.$transaction(async (tx) => {
      const created = await tx.studentGoal.create({
        data: this.goalData(user.id, body.roleId, body.bracketId, body.schedule, today),
      });
      await this.writeSkills(tx, user.id, body.skills);
      await tx.studentProfile.update({
        where: { userId: user.id },
        data: {
          onboardingCompletedAt: this.ctx.now(),
          onboardingDraft: Prisma.DbNull,
          onboardingStep: 4,
        },
      });
      return created;
    });
    // The first roadmap. If this fails, the roadmap page creates it on first visit instead.
    await this.roadmaps.ensureForGoal(goal.id);
    return this.getGoal(user.id, tzOf(user));
  }

  // ───────────── Goal ─────────────

  async getGoal(studentId: string, timezone: string): Promise<GoalResponse> {
    const goal = await this.db.studentGoal.findFirst({
      where: { studentId, isActive: true },
      include: { role: { include: { skillAreas: true } }, bracket: true },
    });
    const ratings = await this.db.studentSkillRating.findMany({
      where: { studentId },
      include: { skillArea: true },
    });
    const importance = new Map(
      goal?.role.skillAreas.map((s) => [s.skillAreaId, s.importance]) ?? [],
    );

    // Show the role's skill areas first (most important first), then any other rated areas.
    const byId = new Map(ratings.map((r) => [r.skillAreaId, r]));
    const roleAreas = goal
      ? await this.db.skillArea.findMany({ where: { id: { in: [...importance.keys()] } } })
      : [];
    const skills: SkillRatingDto[] = [
      ...roleAreas
        .map((a) => ({
          skillAreaId: a.id,
          name: a.name,
          level: byId.get(a.id)?.level ?? 0,
          importance: importance.get(a.id) ?? null,
        }))
        .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0)),
      ...ratings
        .filter((r) => !importance.has(r.skillAreaId))
        .map((r) => ({
          skillAreaId: r.skillAreaId,
          name: r.skillArea.name,
          level: r.level,
          importance: null,
        })),
    ];
    return { goal: goal ? toGoalDto(goal, timezone, this.ctx.now()) : null, skills };
  }

  async updateSchedule(user: SessionUser, schedule: Schedule) {
    this.assertSchedule(schedule, tzOf(user));
    const goal = await this.activeGoalOrThrow(user.id);
    await this.db.studentGoal.update({
      where: { id: goal.id },
      data: {
        dailyMinutes: schedule.dailyMinutes,
        studyWeekdays: [...schedule.studyWeekdays].sort((a, b) => a - b),
        deadline: schedule.deadline ? toDbDate(schedule.deadline) : null,
      },
    });
    await this.roadmaps.onSettingsChanged(goal.id);
    return this.getGoal(user.id, tzOf(user));
  }

  /** A new role or package is a new goal; the old one is kept as history. */
  async changeTarget(user: SessionUser, body: ChangeTargetBody) {
    const current = await this.activeGoalOrThrow(user.id);
    if (current.roleId === body.roleId && current.bracketId === body.bracketId) {
      return this.getGoal(user.id, tzOf(user));
    }
    await this.assertSelectable(body.roleId, body.bracketId);
    const schedule: Schedule = {
      dailyMinutes: current.dailyMinutes,
      studyWeekdays: current.studyWeekdays,
      deadline: current.deadline ? fromDbDate(current.deadline) : null,
    };
    const today = todayIn(tzOf(user), this.ctx.now());
    const [, next] = await this.db.$transaction([
      this.db.studentGoal.update({
        where: { id: current.id },
        data: { isActive: false, endedAt: this.ctx.now() },
      }),
      this.db.studentGoal.create({
        data: this.goalData(user.id, body.roleId, body.bracketId, schedule, today),
      }),
    ]);
    await this.roadmaps.ensureForGoal(next.id);
    return this.getGoal(user.id, tzOf(user));
  }

  async updateSkills(user: SessionUser, skills: SkillRatings) {
    await this.assertSkillAreas(skills);
    await this.db.$transaction(async (tx) => this.writeSkills(tx, user.id, skills));
    const goal = await this.db.studentGoal.findFirst({
      where: { studentId: user.id, isActive: true },
    });
    if (goal) await this.roadmaps.onSettingsChanged(goal.id);
    return this.getGoal(user.id, tzOf(user));
  }

  // ───────────── "Notify me" ─────────────

  async setInterest(studentId: string, kind: InterestKind, targetId: string, on: boolean) {
    if (kind === 'ROLE' && !(await this.db.careerRole.findUnique({ where: { id: targetId } }))) {
      throw notFound('That role');
    }
    if (
      kind === 'BRACKET' &&
      !(await this.db.packageBracket.findUnique({ where: { id: targetId } }))
    ) {
      throw notFound('That package');
    }
    if (kind === 'TOPIC' && !(await this.db.topic.findUnique({ where: { id: targetId } }))) {
      throw notFound('That topic');
    }
    if (on) {
      await this.db.interestSignal.upsert({
        where: { studentId_kind_targetId: { studentId, kind, targetId } },
        create: { studentId, kind, targetId },
        update: {},
      });
    } else {
      await this.db.interestSignal.deleteMany({ where: { studentId, kind, targetId } });
    }
    return { notifyMe: on };
  }

  // ───────────── helpers ─────────────

  private goalData(
    studentId: string,
    roleId: string,
    bracketId: string,
    s: Schedule,
    today: string,
  ) {
    return {
      studentId,
      roleId,
      bracketId,
      dailyMinutes: s.dailyMinutes,
      studyWeekdays: [...s.studyWeekdays].sort((a, b) => a - b),
      startDate: toDbDate(today),
      deadline: s.deadline ? toDbDate(s.deadline) : null,
    };
  }

  private async writeSkills(tx: Prisma.TransactionClient, studentId: string, skills: SkillRatings) {
    for (const [skillAreaId, level] of Object.entries(skills)) {
      await tx.studentSkillRating.upsert({
        where: { studentId_skillAreaId: { studentId, skillAreaId } },
        create: { studentId, skillAreaId, level },
        update: { level },
      });
    }
  }

  private async activeGoalOrThrow(studentId: string) {
    const goal = await this.db.studentGoal.findFirst({ where: { studentId, isActive: true } });
    if (!goal) throw new AppError('CONFLICT', 'Set your goal first.');
    return goal;
  }

  /** Students can only pick roles and packages that are LIVE. */
  private async assertSelectable(roleId: string, bracketId: string) {
    const [role, bracket] = await Promise.all([
      this.db.careerRole.findUnique({ where: { id: roleId } }),
      this.db.packageBracket.findUnique({ where: { id: bracketId } }),
    ]);
    if (role?.availability !== 'LIVE') {
      throw new AppError('VALIDATION_ERROR', 'That role is not open yet.', {
        fields: { roleId: 'Pick a role that is open now.' },
      });
    }
    if (bracket?.availability !== 'LIVE') {
      throw new AppError('VALIDATION_ERROR', 'That package is not open yet.', {
        fields: { bracketId: 'Pick a package that is open now.' },
      });
    }
  }

  private assertSchedule(s: Schedule, timezone: string) {
    if (!s.deadline) return;
    const days = daysBetween(todayIn(timezone, this.ctx.now()), s.deadline);
    if (days < DEADLINE_MIN_DAYS || days > DEADLINE_MAX_DAYS) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Pick a deadline between 1 week and 3 years from today.',
        {
          fields: { deadline: 'Pick a date between 1 week and 3 years from today.' },
        },
      );
    }
  }

  private async assertSkillAreas(skills: SkillRatings) {
    const ids = Object.keys(skills);
    if (ids.length === 0) return;
    const found = await this.db.skillArea.count({ where: { id: { in: ids } } });
    if (found !== ids.length) {
      throw new AppError('VALIDATION_ERROR', 'One of the skill areas does not exist.', {
        fields: { skills: 'Unknown skill area.' },
      });
    }
  }
}
