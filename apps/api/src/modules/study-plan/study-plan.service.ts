import type {
  AdminStudyPlanResponse,
  ApplyStudyPlanResult,
  PlanPreview,
  SaveStudyPlanBody,
  SaveStudyPlanResponse,
  Schedule,
  StudentStudyPlan,
  StudyPlan,
  StudyPlanPreviewBody,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import { daysBetween, fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { newGoalData } from '../goals/goals.service.ts';
import { RoadmapService } from '../roadmap/roadmap.service.ts';
import {
  deadlineFor,
  loadStudyPlan,
  planBracketId,
  STUDY_PLAN_KEY,
  scheduleFromPlan,
} from './study-plan.store.ts';

/** Admin dates are read in India time: the plan is set for one cohort. */
const ADMIN_TZ = 'Asia/Kolkata';
const MAX_DEADLINE_DAYS = 3 * 365;

interface Actor {
  id: string;
  ip: string | null;
}

const sameDays = (a: number[], b: number[]) =>
  [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();

/**
 * The study plan the team sets for every student: daily time, study days, deadline, a note,
 * and which package students are placed in. While students don't choose their time or
 * package, saving the plan can bring every current goal in line with it.
 */
export class StudyPlanService {
  private readonly audit: AuditService;
  private readonly roadmaps: RoadmapService;

  constructor(
    private readonly ctx: AppContext,
    roadmaps?: RoadmapService,
  ) {
    this.audit = new AuditService(ctx);
    this.roadmaps = roadmaps ?? new RoadmapService(ctx);
  }

  private get db() {
    return this.ctx.db;
  }

  private today() {
    return todayIn(ADMIN_TZ, this.ctx.now());
  }

  /** The first open role: the one the plan's estimates are for. */
  private liveRole() {
    return this.db.careerRole.findFirst({
      where: { availability: 'LIVE' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true },
    });
  }

  // ───────────── Student ─────────────

  async studentView(timezone: string): Promise<StudentStudyPlan> {
    const { plan, updatedAt } = await loadStudyPlan(this.db);
    return {
      message: plan.message,
      dailyMinutes: plan.dailyMinutes,
      studyWeekdays: [...plan.studyWeekdays].sort((a, b) => a - b),
      deadline: plan.deadline,
      deadlineIfStartedToday: deadlineFor(plan.deadline, todayIn(timezone, this.ctx.now())),
      studentsChooseSchedule: plan.studentsChooseSchedule,
      studentsChoosePackage: plan.studentsChoosePackage,
      updatedAt: updatedAt?.toISOString() ?? null,
    };
  }

  // ───────────── Admin ─────────────

  async adminView(): Promise<AdminStudyPlanResponse> {
    const stored = await loadStudyPlan(this.db);
    const [role, brackets, activeStudents, effectiveBracketId, updater] = await Promise.all([
      this.liveRole(),
      this.db.packageBracket.findMany({
        where: { availability: 'LIVE' },
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.studentGoal.count({ where: { isActive: true } }),
      planBracketId(this.db, stored.plan),
      stored.updatedById
        ? this.db.user.findUnique({
            where: { id: stored.updatedById },
            include: { adminProfile: true },
          })
        : null,
    ]);
    const today = this.today();
    // Total study time does not depend on the schedule, only on the curriculum and depth.
    const schedule: Schedule = { ...scheduleFromPlan(stored.plan, today), deadline: null };
    const options = await Promise.all(
      brackets.map(async (b) => ({
        id: b.id,
        label: b.label,
        headline: b.headline,
        totalMinutes: role
          ? ((await this.roadmaps.previewForTarget(role.id, b.id, schedule, today))?.proposed
              .totalMinutes ?? null)
          : null,
      })),
    );
    return {
      plan: stored.plan,
      updatedAt: stored.updatedAt?.toISOString() ?? null,
      updatedBy: updater ? (updater.adminProfile?.fullName ?? updater.email) : null,
      role,
      brackets: options,
      effectiveBracketId,
      activeStudents,
    };
  }

  /** How the open role's track plays out on this plan for a student who starts today. */
  async preview(body: StudyPlanPreviewBody): Promise<PlanPreview | null> {
    const role = await this.liveRole();
    const bracketId = await planBracketId(this.db, body);
    if (!role || !bracketId) return null;
    const today = this.today();
    return this.roadmaps.previewForTarget(
      role.id,
      bracketId,
      {
        dailyMinutes: body.dailyMinutes,
        studyWeekdays: body.studyWeekdays,
        deadline: deadlineFor(body.deadline, today),
      },
      today,
    );
  }

  async save(body: SaveStudyPlanBody, actor: Actor): Promise<SaveStudyPlanResponse> {
    const { applyToStudents, ...fields } = body;
    const plan: StudyPlan = {
      ...fields,
      studyWeekdays: [...new Set(fields.studyWeekdays)].sort((a, b) => a - b),
      message: fields.message?.trim() || null,
    };
    await this.validate(plan);

    const before = await loadStudyPlan(this.db);
    await this.db.platformSetting.upsert({
      where: { key: STUDY_PLAN_KEY },
      create: { key: STUDY_PLAN_KEY, value: plan, updatedById: actor.id },
      update: { value: plan, updatedById: actor.id },
    });
    await this.audit.record({
      actorId: actor.id,
      action: 'study_plan.updated',
      entityType: 'platform_setting',
      entityId: STUDY_PLAN_KEY,
      before: before.updatedAt ? (before.plan as Prisma.InputJsonValue) : undefined,
      after: plan as Prisma.InputJsonValue,
      ip: actor.ip,
    });

    const applied = applyToStudents ? await this.apply(plan) : null;
    if (applied) {
      await this.audit.record({
        actorId: actor.id,
        action: 'study_plan.applied',
        entityType: 'platform_setting',
        entityId: STUDY_PLAN_KEY,
        after: applied,
        ip: actor.ip,
      });
    }
    return { ...(await this.adminView()), applied };
  }

  /**
   * Brings every active goal in line with the plan: the plan's package (a new goal, the old one
   * stays as history) and the plan's time and deadline, then re-plans each roadmap from today.
   * Only what students don't choose themselves is touched. A plan deadline counts from each
   * student's own start date.
   *
   * Runs inline: a few ms per student, fine for pilot cohorts. Moves to a queue job at scale.
   */
  async apply(plan: StudyPlan): Promise<ApplyStudyPlanResult> {
    const result: ApplyStudyPlanResult = { updated: 0, movedPackage: 0 };
    if (plan.studentsChooseSchedule && plan.studentsChoosePackage) return result;
    const bracketId = plan.studentsChoosePackage ? null : await planBracketId(this.db, plan);
    const goals = await this.db.studentGoal.findMany({ where: { isActive: true } });

    for (const g of goals) {
      const start = fromDbDate(g.startDate);
      const current: Schedule = {
        dailyMinutes: g.dailyMinutes,
        studyWeekdays: [...g.studyWeekdays].sort((a, b) => a - b),
        deadline: g.deadline ? fromDbDate(g.deadline) : null,
      };
      const schedule = plan.studentsChooseSchedule ? current : scheduleFromPlan(plan, start);

      if (bracketId && g.bracketId !== bracketId) {
        const [, next] = await this.db.$transaction([
          this.db.studentGoal.update({
            where: { id: g.id },
            data: { isActive: false, endedAt: this.ctx.now() },
          }),
          this.db.studentGoal.create({
            data: newGoalData(g.studentId, g.roleId, bracketId, schedule, start),
          }),
        ]);
        await this.roadmaps.ensureForGoal(next.id);
        result.movedPackage++;
        continue;
      }

      if (!plan.studentsChooseSchedule) {
        const unchanged =
          current.dailyMinutes === schedule.dailyMinutes &&
          sameDays(current.studyWeekdays, schedule.studyWeekdays) &&
          current.deadline === schedule.deadline;
        if (!unchanged) {
          await this.db.studentGoal.update({
            where: { id: g.id },
            data: {
              dailyMinutes: schedule.dailyMinutes,
              studyWeekdays: schedule.studyWeekdays,
              deadline: schedule.deadline ? toDbDate(schedule.deadline) : null,
            },
          });
          result.updated++;
        }
        // Re-plans from today when anything changed; creates a first roadmap if one is missing.
        await this.roadmaps.onSettingsChanged(g.id);
      }
    }
    return result;
  }

  private async validate(plan: StudyPlan) {
    if (plan.deadline.mode === 'DATE') {
      const days = daysBetween(this.today(), plan.deadline.date);
      if (days < 1 || days > MAX_DEADLINE_DAYS) {
        throw new AppError('VALIDATION_ERROR', 'Pick a deadline after today.', {
          fields: { 'deadline.date': 'Pick a date between tomorrow and 3 years from today.' },
        });
      }
    }
    if (plan.bracketId) {
      const bracket = await this.db.packageBracket.findUnique({ where: { id: plan.bracketId } });
      if (bracket?.availability !== 'LIVE') {
        throw new AppError('VALIDATION_ERROR', 'That package is not open.', {
          fields: { bracketId: 'Pick an open package.' },
        });
      }
    }
    if (!plan.studentsChoosePackage) {
      // Placing everyone in a package with no curriculum would leave them without a roadmap.
      const [role, bracketId] = await Promise.all([this.liveRole(), planBracketId(this.db, plan)]);
      const published =
        role && bracketId
          ? await this.db.roleCurriculum.count({
              where: { roleId: role.id, bracketId, status: 'PUBLISHED' },
            })
          : 0;
      if (role && bracketId && published === 0) {
        throw new AppError(
          'VALIDATION_ERROR',
          `${role.title} has no published curriculum for that package yet. Publish one in Curriculum first.`,
          { fields: { bracketId: 'No published curriculum for this package.' } },
        );
      }
    }
  }
}
