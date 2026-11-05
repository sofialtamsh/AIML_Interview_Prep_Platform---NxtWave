import type {
  ChangeSummaryDto,
  ColorKey,
  OnboardingPlanPreviewResponse,
  PlanPreview,
  RoadmapItemDto,
  RoadmapResponse,
  RoadmapTopicDto,
  RoadmapVersionDto,
  Schedule,
  SchedulePreviewResponse,
  SkillRatings,
  TopicPageResponse,
  WeekPlanDto,
} from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import type { RoadmapTrigger, RoadmapVersionStatus } from '../../generated/prisma/enums.ts';
import { daysBetween, fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import { lessonSummaries } from '../content/lesson-view.ts';
import { planToIcs } from './calendar.ts';
import {
  allocateDays,
  buildPlan,
  type DayAllocation,
  deriveStatuses,
  diffPlans,
  groupByWeek,
  type Plan,
  type PlanInput,
  type PlanItemInput,
  revisionDays,
  suggestPaces,
  type WeekPlan,
} from './planner.engine.ts';

type Tx = Prisma.TransactionClient;

const PRACTICE_ALLOWANCE = 0.25;
const DEFAULT_TZ = 'Asia/Kolkata';

/** Everything the planner needs from a published curriculum. */
interface LoadedCurriculum {
  id: string;
  version: number;
  /** skillAreaId links each item to the student's self-rating for fast-tracking. */
  items: Array<PlanItemInput & { skillAreaId: string | null; title: string; topicTitle: string }>;
  subtopicPrereqs: PlanInput['subtopicPrereqs'];
  topicPrereqs: PlanInput['topicPrereqs'];
}

/** The student-side facts a plan depends on. Snapshotted into each version's `inputs`. */
interface PlanSettings {
  dailyMinutes: number;
  studyWeekdays: number[];
  deadline: string | null;
  /** Self-rating per skill area id (0 new … 3 confident). */
  skills: Record<string, number>;
}

type GoalRow = Prisma.StudentGoalGetPayload<{
  include: { role: true; bracket: true; student: { include: { studentProfile: true } } };
}>;

type VersionWithItems = Prisma.RoadmapVersionGetPayload<{ include: { items: true } }>;

/** What a student may open, and how deep: their active roadmap, in order. */
export interface StudentTrack {
  roleSlug: string;
  items: Array<{
    subtopicId: string;
    subtopicSlug: string;
    title: string;
    topicId: string;
    topicSlug: string;
    sequence: number;
    depthRank: number;
    /** Self-rating for the topic's skill area: 0 new … 3 confident. */
    skillLevel: number;
  }>;
}

/**
 * A student's roadmap: one per goal, made of immutable versions.
 *
 *   INITIAL           first plan, from the published curriculum for the goal's role × package
 *   SETTINGS_CHANGE   the student changed their schedule → re-planned from today
 *   REPLAN            the student asked to re-plan from today (e.g. after falling behind)
 *   CURRICULUM_UPDATE admins published a new curriculum → a PROPOSED version the student
 *                     accepts or declines. A curriculum change never silently rewrites a plan.
 */
export class RoadmapService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }

  // ───────────── Reads ─────────────

  async getForStudent(studentId: string): Promise<RoadmapResponse> {
    const goal = await this.activeGoal(studentId);
    if (!goal) return { status: 'NO_GOAL', roadmap: null, proposal: null };

    // Lazy safety net: creates the first version if onboarding finished before a curriculum existed.
    const roadmapId = await this.ensureForGoal(goal.id);
    if (!roadmapId) return { status: 'PENDING_CURRICULUM', roadmap: null, proposal: null };

    const versions = await this.db.roadmapVersion.findMany({
      where: { roadmapId, status: { in: ['ACTIVE', 'PROPOSED'] } },
      include: { items: { orderBy: { sequence: 'asc' } } },
    });
    const active = versions.find((v) => v.status === 'ACTIVE');
    if (!active) return { status: 'PENDING_CURRICULUM', roadmap: null, proposal: null };
    const proposal = versions.find((v) => v.status === 'PROPOSED') ?? null;

    const tz = goal.student.studentProfile?.timezone ?? DEFAULT_TZ;
    const today = todayIn(tz, this.ctx.now());
    const { topics, items } = await this.describeItems(active, studentId, today);

    // Feasibility is about *now*: what happens if the student keeps going from today.
    const curriculum = await this.loadCurriculum(active.roleCurriculumId);
    const live = await this.plan(curriculum, await this.settingsOf(goal), today, studentId);

    const doneMinutes = items
      .filter((i) => i.status === 'DONE')
      .reduce((a, i) => a + i.estimatedMinutes, 0);
    const plannedEnd = active.plannedEndDate ? fromDbDate(active.plannedEndDate) : null;
    const deadline = goal.deadline ? fromDbDate(goal.deadline) : null;
    const topicTitle = new Map(topics.map((t) => [t.id, t.title]));
    const named = new Map(
      items.map((i) => [
        i.subtopicId,
        { title: i.title, topicTitle: topicTitle.get(i.topicId) ?? '' },
      ]),
    );
    return {
      status: 'READY',
      roadmap: {
        version: toVersionDto(active),
        totals: {
          totalMinutes: active.totalMinutes,
          doneMinutes,
          remainingMinutes: active.totalMinutes - doneMinutes,
          percentComplete:
            active.totalMinutes > 0 ? Math.round((doneMinutes / active.totalMinutes) * 100) : 0,
          plannedEndDate: active.plannedEndDate ? fromDbDate(active.plannedEndDate) : null,
          weeklyMinutes: goal.dailyMinutes * goal.studyWeekdays.length,
          subtopics: items.length,
          delayed: items.filter((i) => i.status === 'DELAYED').length,
        },
        feasibility: live.feasibility,
        topics,
        weeks: weekDtos(groupByWeek(this.storedDays(active, goal)), named),
        daysToSpare: deadline && plannedEnd ? daysBetween(plannedEnd, deadline) : null,
        nextUp: items.find((i) => i.status !== 'DONE' && i.status !== 'UPCOMING') ?? null,
        role: {
          title: goal.role.title,
          shortCode: goal.role.shortCode,
          colorKey: goal.role.colorKey as ColorKey,
        },
        bracket: { label: goal.bracket.label, availability: goal.bracket.availability },
      },
      proposal: proposal ? toVersionDto(proposal) : null,
    };
  }

  /** What a schedule change would do, before the student saves it. */
  async previewSchedule(studentId: string, schedule: Schedule): Promise<SchedulePreviewResponse> {
    const goal = await this.activeGoal(studentId);
    if (!goal) throw new AppError('CONFLICT', 'Set your goal first.');
    const active = await this.activeVersion(goal.id);
    const curriculumId =
      active?.roleCurriculumId ?? (await this.publishedCurriculumId(goal.roleId, goal.bracketId));
    if (!curriculumId) throw new AppError('CONFLICT', 'Your roadmap is still being prepared.');

    const curriculum = await this.loadCurriculum(curriculumId);
    const settings = { ...(await this.settingsOf(goal)), ...schedule };
    const input = await this.planInput(curriculum, settings, this.todayOf(goal), studentId);
    return previewOf(
      curriculum,
      input,
      active
        ? {
            plannedEndDate: active.plannedEndDate ? fromDbDate(active.plannedEndDate) : null,
            totalMinutes: active.totalMinutes,
          }
        : null,
    );
  }

  /**
   * During onboarding there is no goal yet: preview the plan for the choices so far, so the
   * student sees how long their prep takes before they commit.
   */
  async onboardingPreview(
    studentId: string,
    timezone: string,
    body: { roleId: string; bracketId: string; skills: SkillRatings; schedule: Schedule },
  ): Promise<OnboardingPlanPreviewResponse> {
    const curriculumId = await this.publishedCurriculumId(body.roleId, body.bracketId);
    if (!curriculumId) return { preview: null };
    const curriculum = await this.loadCurriculum(curriculumId);
    const input = await this.planInput(
      curriculum,
      {
        ...body.schedule,
        studyWeekdays: [...body.schedule.studyWeekdays].sort((a, b) => a - b),
        skills: body.skills,
      },
      todayIn(timezone, this.ctx.now()),
      studentId,
    );
    return { preview: previewOf(curriculum, input, null) };
  }

  /** The active plan as an iCalendar file: one all-day event per study day. */
  async calendar(studentId: string): Promise<string> {
    const goal = await this.activeGoal(studentId);
    const active = goal ? await this.activeVersion(goal.id) : null;
    if (!goal || !active) throw notFound('Your roadmap');
    const subtopics = await this.db.subtopic.findMany({
      where: { id: { in: active.items.map((i) => i.subtopicId) } },
      select: { id: true, title: true },
    });
    const title = new Map(subtopics.map((x) => [x.id, x.title]));
    return planToIcs({
      calendarName: `NxtWave Prep · ${goal.role.title} ${goal.bracket.label}`,
      uidPrefix: active.id,
      roadmapUrl: `${this.ctx.env.STUDENT_APP_URL}/roadmap`,
      now: this.ctx.now(),
      days: this.storedDays(active, goal),
      titleOf: (id) => title.get(id) ?? 'Study',
    });
  }

  /**
   * The student's own track (active roadmap version) with depth and prior knowledge per
   * subtopic. Lessons use it to decide what a student may open and what they see.
   */
  async track(studentId: string): Promise<StudentTrack | null> {
    const goal = await this.activeGoal(studentId);
    if (!goal) return null;
    const active = await this.activeVersion(goal.id);
    if (!active) return null;
    const [subtopics, settings] = await Promise.all([
      this.db.subtopic.findMany({
        where: { id: { in: active.items.map((i) => i.subtopicId) } },
        include: { topic: { select: { id: true, slug: true, skillAreaId: true } } },
      }),
      this.settingsOf(goal),
    ]);
    const sub = new Map(subtopics.map((s) => [s.id, s]));
    return {
      roleSlug: goal.role.slug,
      items: [...active.items]
        .sort((a, b) => a.sequence - b.sequence)
        .flatMap((i) => {
          const s = sub.get(i.subtopicId);
          if (!s) return [];
          return [
            {
              subtopicId: s.id,
              subtopicSlug: s.slug,
              title: s.title,
              topicId: s.topic.id,
              topicSlug: s.topic.slug,
              sequence: i.sequence,
              depthRank: i.targetDepthRank,
              skillLevel: (s.topic.skillAreaId && settings.skills[s.topic.skillAreaId]) || 0,
            },
          ];
        }),
    };
  }

  /** A topic as this student sees it: their subtopics, depth and the Learn / Practice entry points. */
  async topicPage(studentId: string, slug: string): Promise<TopicPageResponse> {
    const roadmap = await this.getForStudent(studentId);
    const topicDto = roadmap.roadmap?.topics.find((t) => t.slug === slug);
    if (!roadmap.roadmap || !topicDto) throw notFound('That topic');

    const track = await this.track(studentId);
    const lessons = track
      ? await lessonSummaries(
          this.db,
          studentId,
          track.roleSlug,
          track.items.filter((i) => i.topicId === topicDto.id),
        )
      : new Map();

    const [topic, concepts, interest, goal] = await Promise.all([
      this.db.topic.findUniqueOrThrow({ where: { id: topicDto.id } }),
      this.db.concept.findMany({
        where: { subtopicId: { in: topicDto.items.map((i) => i.subtopicId) } },
        orderBy: { sortOrder: 'asc' },
      }),
      this.db.interestSignal.findUnique({
        where: { studentId_kind_targetId: { studentId, kind: 'TOPIC', targetId: topicDto.id } },
      }),
      this.activeGoal(studentId),
    ]);

    // The deepest level in this topic, explained in the student's own target terms.
    const deepest = Math.max(...topicDto.items.map((i) => i.depth.rank));
    const level = await this.db.depthLevel.findUnique({ where: { rank: deepest } });
    const target = goal ? `${goal.bracket.label} ${goal.role.title}` : 'your target';
    const depthNote = level
      ? `For ${target} interviews you go up to ${level.name} here. ${level.description}`
      : '';

    return {
      topic: {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        summary: topic.summary,
        iconKey: topic.iconKey,
      },
      items: topicDto.items.map((i) => ({
        ...i,
        concepts: concepts
          .filter((c) => c.subtopicId === i.subtopicId)
          .map((c) => ({ key: c.key, name: c.name })),
        lesson: lessons.get(i.subtopicId) ?? null,
      })),
      depthNote,
      learn: {
        available: lessons.size > 0,
        lessons: lessons.size,
        completed: [...lessons.values()].filter((l) => l.status === 'COMPLETED').length,
      },
      // The question bank arrives in Phase 5. The entry point is shown now.
      practice: { available: false, questions: 0, notifyMe: interest !== null },
    };
  }

  // ───────────── Writes triggered by the student ─────────────

  /** Re-plans from today on the same curriculum (e.g. after falling behind). */
  async replan(studentId: string) {
    const goal = await this.activeGoal(studentId);
    if (!goal) throw new AppError('CONFLICT', 'Set your goal first.');
    await this.rebuildActive(goal, 'REPLAN');
    return this.getForStudent(studentId);
  }

  async acceptProposal(studentId: string) {
    const goal = await this.activeGoal(studentId);
    const roadmap = goal ? await this.db.roadmap.findUnique({ where: { goalId: goal.id } }) : null;
    if (!goal || !roadmap) throw new AppError('CONFLICT', 'There is no update waiting for you.');

    const settings = await this.settingsOf(goal);
    const today = this.todayOf(goal);
    await this.db.$transaction(async (tx) => {
      await lockRoadmap(tx, roadmap.id);
      const [active, proposal] = await Promise.all([
        tx.roadmapVersion.findFirst({
          where: { roadmapId: roadmap.id, status: 'ACTIVE' },
          include: { items: true },
        }),
        tx.roadmapVersion.findFirst({ where: { roadmapId: roadmap.id, status: 'PROPOSED' } }),
      ]);
      if (!proposal) throw new AppError('CONFLICT', 'There is no update waiting for you.');

      // Re-plan at accept time so the dates start from today, not from the day it was proposed.
      const plan = await this.plan(
        await this.loadCurriculum(proposal.roleCurriculumId, tx),
        settings,
        today,
        studentId,
      );
      if (active) {
        await tx.roadmapVersion.update({
          where: { id: active.id },
          data: { status: 'SUPERSEDED' },
        });
      }
      await tx.roadmapItem.deleteMany({ where: { roadmapVersionId: proposal.id } });
      await tx.roadmapItem.createMany({ data: itemRows(proposal.id, plan) });
      await tx.roadmapVersion.update({
        where: { id: proposal.id },
        data: {
          status: 'ACTIVE',
          decidedAt: this.ctx.now(),
          inputs: inputsJson(settings, today),
          totalMinutes: plan.totalMinutes,
          plannedEndDate: plan.plannedEndDate ? toDbDate(plan.plannedEndDate) : null,
          deadlineFeasible: plan.feasibility?.feasible ?? null,
          changeSummary: active ? await this.summarise(active, plan, tx) : undefined,
        },
      });
    });
    return this.getForStudent(studentId);
  }

  async declineProposal(studentId: string) {
    const goal = await this.activeGoal(studentId);
    const roadmap = goal ? await this.db.roadmap.findUnique({ where: { goalId: goal.id } }) : null;
    const { count } = roadmap
      ? await this.db.roadmapVersion.updateMany({
          where: { roadmapId: roadmap.id, status: 'PROPOSED' },
          data: { status: 'DECLINED', decidedAt: this.ctx.now() },
        })
      : { count: 0 };
    if (count === 0) throw new AppError('CONFLICT', 'There is no update waiting for you.');
    return this.getForStudent(studentId);
  }

  // ───────────── Hooks from goals and curriculum ─────────────

  /**
   * Creates the first version for a goal from the published curriculum.
   * Returns the roadmap id, or null when nothing is published for this role × package yet.
   */
  async ensureForGoal(goalId: string): Promise<string | null> {
    const goal = await this.goalById(goalId);
    if (!goal?.isActive) return null;
    const existing = await this.db.roadmap.findUnique({
      where: { goalId },
      include: { versions: { where: { status: 'ACTIVE' }, select: { id: true } } },
    });
    if (existing && existing.versions.length > 0) return existing.id;

    const curriculumId = await this.publishedCurriculumId(goal.roleId, goal.bracketId);
    if (!curriculumId) return existing?.id ?? null;

    const settings = await this.settingsOf(goal);
    const today = this.todayOf(goal);
    const plan = await this.plan(
      await this.loadCurriculum(curriculumId),
      settings,
      today,
      goal.studentId,
    );
    try {
      return await this.db.$transaction(async (tx) => {
        const roadmap =
          existing ?? (await tx.roadmap.create({ data: { studentId: goal.studentId, goalId } }));
        await lockRoadmap(tx, roadmap.id);
        if (
          await tx.roadmapVersion.findFirst({ where: { roadmapId: roadmap.id, status: 'ACTIVE' } })
        ) {
          return roadmap.id; // created concurrently
        }
        await this.writeVersion(
          tx,
          roadmap.id,
          'ACTIVE',
          'INITIAL',
          curriculumId,
          settings,
          today,
          plan,
          null,
        );
        return roadmap.id;
      });
    } catch (err) {
      // Two first requests raced to create the roadmap row: the other one won, which is fine.
      if (isUniqueViolation(err))
        return (await this.db.roadmap.findUnique({ where: { goalId } }))?.id ?? null;
      throw err;
    }
  }

  /** The student saved a new schedule or self-ratings: re-plan from today if anything changed. */
  async onSettingsChanged(goalId: string) {
    const goal = await this.goalById(goalId);
    if (!goal) return;
    const active = await this.activeVersion(goalId);
    if (!active) {
      await this.ensureForGoal(goalId);
      return;
    }
    const before = active.inputs as Partial<PlanSettings>;
    const now = await this.settingsOf(goal);
    const unchanged =
      before.dailyMinutes === now.dailyMinutes &&
      JSON.stringify(before.studyWeekdays) === JSON.stringify(now.studyWeekdays) &&
      (before.deadline ?? null) === now.deadline &&
      sameRecord(before.skills ?? {}, now.skills);
    if (unchanged) return;
    await this.rebuildActive(goal, 'SETTINGS_CHANGE');
  }

  /**
   * A curriculum was published. Students on that role × package get a PROPOSED version
   * (only when their plan would materially change). Returns how many proposals were made.
   *
   * Runs inline: fine for pilot cohorts (a few ms per student). Moves to a queue job at scale.
   */
  async proposeForCurriculum(curriculumId: string): Promise<number> {
    const curriculum = await this.db.roleCurriculum.findUniqueOrThrow({
      where: { id: curriculumId },
    });
    const goals = await this.db.studentGoal.findMany({
      where: { roleId: curriculum.roleId, bracketId: curriculum.bracketId, isActive: true },
      select: { id: true },
    });
    const loaded = await this.loadCurriculum(curriculumId);
    let proposals = 0;
    for (const { id } of goals) {
      const goal = await this.goalById(id);
      const active = await this.activeVersion(id);
      if (!goal) continue;
      if (!active) {
        await this.ensureForGoal(id); // first plan: nothing to compare with, nothing to accept
        continue;
      }
      if (active.roleCurriculumId === curriculumId) continue;

      const settings = await this.settingsOf(goal);
      const today = this.todayOf(goal);
      const plan = await this.plan(loaded, settings, today, goal.studentId);
      const summary = await this.summarise(active, plan);
      const material = isMaterial(summary);

      await this.db.$transaction(async (tx) => {
        await lockRoadmap(tx, active.roadmapId);
        // Only the newest curriculum can be proposed: an older pending one is replaced.
        await tx.roadmapVersion.deleteMany({
          where: { roadmapId: active.roadmapId, status: 'PROPOSED' },
        });
        if (material) {
          await this.writeVersion(
            tx,
            active.roadmapId,
            'PROPOSED',
            'CURRICULUM_UPDATE',
            curriculumId,
            settings,
            today,
            plan,
            summary,
          );
        } else {
          // Wording-only changes (objectives, rationale): same items and dates, newer text.
          await tx.roadmapVersion.update({
            where: { id: active.id },
            data: { status: 'SUPERSEDED' },
          });
          const copy = await tx.roadmapVersion.create({
            data: {
              roadmapId: active.roadmapId,
              versionNumber: await nextVersionNumber(tx, active.roadmapId),
              status: 'ACTIVE',
              trigger: 'CURRICULUM_UPDATE',
              roleCurriculumId: curriculumId,
              inputs: active.inputs as Prisma.InputJsonValue,
              changeSummary: { ...summary, endDateDeltaDays: 0 },
              totalMinutes: active.totalMinutes,
              plannedEndDate: active.plannedEndDate,
              deadlineFeasible: active.deadlineFeasible,
              decidedAt: this.ctx.now(),
            },
          });
          await tx.roadmapItem.createMany({
            data: active.items.map(({ id: _id, roadmapVersionId: _v, ...rest }) => ({
              ...rest,
              roadmapVersionId: copy.id,
            })),
          });
        }
      });
      if (material) proposals++;
    }
    return proposals;
  }

  // ───────────── Internals ─────────────

  private async rebuildActive(
    goal: GoalRow,
    trigger: Extract<RoadmapTrigger, 'SETTINGS_CHANGE' | 'REPLAN'>,
  ) {
    const active = await this.activeVersion(goal.id);
    if (!active) {
      await this.ensureForGoal(goal.id);
      return;
    }
    const settings = await this.settingsOf(goal);
    const today = this.todayOf(goal);
    const plan = await this.plan(
      await this.loadCurriculum(active.roleCurriculumId),
      settings,
      today,
      goal.studentId,
    );
    if (trigger === 'REPLAN' && samePlan(active.items, plan)) return; // already up to date
    const summary = await this.summarise(active, plan);

    const pending = await this.db.roadmapVersion.findFirst({
      where: { roadmapId: active.roadmapId, status: 'PROPOSED' },
    });
    const pendingPlan = pending
      ? await this.plan(
          await this.loadCurriculum(pending.roleCurriculumId),
          settings,
          today,
          goal.studentId,
        )
      : null;

    await this.db.$transaction(async (tx) => {
      await lockRoadmap(tx, active.roadmapId);
      // Keep version numbers in order: the pending update is re-made after the new active version.
      await tx.roadmapVersion.deleteMany({
        where: { roadmapId: active.roadmapId, status: 'PROPOSED' },
      });
      await tx.roadmapVersion.update({ where: { id: active.id }, data: { status: 'SUPERSEDED' } });
      const created = await this.writeVersion(
        tx,
        active.roadmapId,
        'ACTIVE',
        trigger,
        active.roleCurriculumId,
        settings,
        today,
        plan,
        summary,
      );
      if (pending && pendingPlan) {
        const pendingSummary = await this.summarise(
          { ...created, items: itemRows(created.id, plan) },
          pendingPlan,
          tx,
        );
        await this.writeVersion(
          tx,
          active.roadmapId,
          'PROPOSED',
          'CURRICULUM_UPDATE',
          pending.roleCurriculumId,
          settings,
          today,
          pendingPlan,
          pendingSummary,
        );
      }
    });
  }

  private async writeVersion(
    tx: Tx,
    roadmapId: string,
    status: Extract<RoadmapVersionStatus, 'ACTIVE' | 'PROPOSED'>,
    trigger: RoadmapTrigger,
    curriculumId: string,
    settings: PlanSettings,
    today: string,
    plan: Plan,
    summary: ChangeSummaryDto | null,
  ) {
    const version = await tx.roadmapVersion.create({
      data: {
        roadmapId,
        versionNumber: await nextVersionNumber(tx, roadmapId),
        status,
        trigger,
        roleCurriculumId: curriculumId,
        inputs: inputsJson(settings, today),
        changeSummary: summary ?? undefined,
        totalMinutes: plan.totalMinutes,
        plannedEndDate: plan.plannedEndDate ? toDbDate(plan.plannedEndDate) : null,
        deadlineFeasible: plan.feasibility?.feasible ?? null,
        decidedAt: status === 'ACTIVE' ? this.ctx.now() : null,
      },
    });
    await tx.roadmapItem.createMany({ data: itemRows(version.id, plan) });
    return version;
  }

  /** Change summary with titles and depth names, ready to show. */
  private async summarise(
    before: {
      items: Array<{ subtopicId: string; targetDepthRank: number }>;
      totalMinutes: number;
      plannedEndDate: Date | null;
    },
    after: Plan,
    tx: Tx = this.db,
  ): Promise<ChangeSummaryDto> {
    const d = diffPlans(
      {
        items: before.items,
        totalMinutes: before.totalMinutes,
        plannedEndDate: before.plannedEndDate ? fromDbDate(before.plannedEndDate) : null,
      },
      {
        items: after.items,
        totalMinutes: after.totalMinutes,
        plannedEndDate: after.plannedEndDate,
      },
    );
    const ids = [...d.added, ...d.removed, ...d.depthChanged.map((c) => c.subtopicId)];
    const [subtopics, depths] = await Promise.all([
      ids.length
        ? tx.subtopic.findMany({ where: { id: { in: ids } }, select: { id: true, title: true } })
        : [],
      tx.depthLevel.findMany(),
    ]);
    const title = new Map(subtopics.map((s) => [s.id, s.title]));
    const depthName = new Map(depths.map((x) => [x.rank, x.name]));
    const named = (id: string) => ({ subtopicId: id, title: title.get(id) ?? 'Removed subtopic' });
    return {
      added: d.added.map(named),
      removed: d.removed.map(named),
      depthChanged: d.depthChanged.map((c) => ({
        ...named(c.subtopicId),
        from: depthName.get(c.from) ?? String(c.from),
        to: depthName.get(c.to) ?? String(c.to),
      })),
      minutesDelta: d.minutesDelta,
      endDateDeltaDays: d.endDateDeltaDays,
    };
  }

  /** Turns stored items into DTOs with titles, objectives and live statuses, grouped by topic. */
  private async describeItems(version: VersionWithItems, studentId: string, today: string) {
    const [subtopics, curriculumItems, depths] = await Promise.all([
      this.db.subtopic.findMany({
        where: { id: { in: version.items.map((i) => i.subtopicId) } },
        include: { topic: true },
      }),
      this.db.roleCurriculumItem.findMany({
        where: { roleCurriculumId: version.roleCurriculumId },
      }),
      this.db.depthLevel.findMany(),
    ]);
    const sub = new Map(subtopics.map((s) => [s.id, s]));
    const objectives = new Map(
      curriculumItems.map((c) => [c.subtopicId, toStrings(c.learningObjectives)]),
    );
    const depthName = new Map(depths.map((d) => [d.rank, d.name]));

    const progress = await this.progressOf(studentId);
    const statuses = deriveStatuses(
      version.items.map((i) => ({
        subtopicId: i.subtopicId,
        plannedEnd: i.plannedEnd ? fromDbDate(i.plannedEnd) : null,
      })),
      progress,
      today,
    );

    const items: RoadmapItemDto[] = version.items.flatMap((i) => {
      const s = sub.get(i.subtopicId);
      if (!s) return [];
      return [
        {
          subtopicId: s.id,
          slug: s.slug,
          title: s.title,
          summary: s.summary,
          topicId: s.topicId,
          topicSlug: s.topic.slug,
          sequence: i.sequence,
          depth: { rank: i.targetDepthRank, name: depthName.get(i.targetDepthRank) ?? '' },
          priority: i.priority,
          isOptional: i.isOptional,
          fastTrack: i.fastTrack,
          estimatedMinutes: i.estimatedMinutes,
          plannedStart: i.plannedStart ? fromDbDate(i.plannedStart) : null,
          plannedEnd: i.plannedEnd ? fromDbDate(i.plannedEnd) : null,
          status: statuses.get(i.subtopicId) ?? 'UPCOMING',
          objectives: objectives.get(i.subtopicId) ?? [],
        },
      ];
    });

    const topics: RoadmapTopicDto[] = [];
    for (const item of items) {
      let t = topics.find((x) => x.id === item.topicId);
      if (!t) {
        const topic = sub.get(item.subtopicId)?.topic;
        if (!topic) continue;
        t = {
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          summary: topic.summary,
          iconKey: topic.iconKey,
          minutes: 0,
          plannedStart: null,
          plannedEnd: null,
          doneCount: 0,
          items: [],
        };
        topics.push(t);
      }
      t.items.push(item);
      t.minutes += item.estimatedMinutes;
      if (item.status === 'DONE') t.doneCount++;
      if (item.plannedStart && (!t.plannedStart || item.plannedStart < t.plannedStart))
        t.plannedStart = item.plannedStart;
      if (item.plannedEnd && (!t.plannedEnd || item.plannedEnd > t.plannedEnd))
        t.plannedEnd = item.plannedEnd;
    }
    return { topics, items };
  }

  /**
   * Which subtopics the student has finished or started, from their lesson progress.
   * (Practice performance is tracked separately and never marks a subtopic done.)
   */
  private async progressOf(
    studentId: string,
  ): Promise<{ done: Set<string>; started: Set<string> }> {
    const rows = await this.db.moduleProgress.findMany({
      where: { studentId },
      select: { subtopicId: true, status: true },
    });
    return {
      done: new Set(rows.filter((r) => r.status === 'COMPLETED').map((r) => r.subtopicId)),
      started: new Set(rows.filter((r) => r.status === 'IN_PROGRESS').map((r) => r.subtopicId)),
    };
  }

  /** Planner input from today. Finished subtopics stay in the plan but are not scheduled again. */
  private async planInput(
    c: LoadedCurriculum,
    s: PlanSettings,
    startDate: string,
    studentId: string,
  ): Promise<PlanInput> {
    const { done } = await this.progressOf(studentId);
    return {
      items: c.items.map((i) => ({
        ...i,
        skillLevel: (i.skillAreaId && s.skills[i.skillAreaId]) || 0,
      })),
      subtopicPrereqs: c.subtopicPrereqs,
      topicPrereqs: c.topicPrereqs,
      completed: done,
      dailyMinutes: s.dailyMinutes,
      studyWeekdays: s.studyWeekdays,
      startDate,
      deadline: s.deadline,
      practiceAllowance: PRACTICE_ALLOWANCE,
    };
  }

  private async plan(
    c: LoadedCurriculum,
    s: PlanSettings,
    startDate: string,
    studentId: string,
  ): Promise<Plan> {
    return buildPlan(await this.planInput(c, s, startDate, studentId));
  }

  /**
   * Minutes per study day for a saved version, re-packed from its own inputs so they always
   * agree with its stored dates.
   */
  private storedDays(version: VersionWithItems, goal: GoalRow): DayAllocation[] {
    const inputs = version.inputs as Partial<{
      startDate: string;
      dailyMinutes: number;
      studyWeekdays: number[];
    }>;
    const work = [...version.items]
      .filter((i) => i.plannedStart !== null)
      .sort((a, b) => a.sequence - b.sequence)
      .map((i) => ({ subtopicId: i.subtopicId, minutes: i.estimatedMinutes }));
    const first = version.items.find((i) => i.plannedStart !== null)?.plannedStart;
    const start = inputs.startDate ?? (first ? fromDbDate(first) : null);
    if (!start || work.length === 0) return [];
    return allocateDays(
      work,
      start,
      inputs.dailyMinutes ?? goal.dailyMinutes,
      new Set(inputs.studyWeekdays ?? goal.studyWeekdays),
    ).days;
  }

  /** Loads a curriculum in planner form, with the prerequisite edges among its items. */
  private async loadCurriculum(id: string, tx: Tx = this.db): Promise<LoadedCurriculum> {
    const c = await tx.roleCurriculum.findUniqueOrThrow({
      where: { id },
      include: { items: { include: { subtopic: { include: { topic: true } } } } },
    });
    const subtopicIds = c.items.map((i) => i.subtopicId);
    const topicIds = [...new Set(c.items.map((i) => i.subtopic.topicId))];
    const [subEdges, topicEdges] = await Promise.all([
      tx.subtopicPrerequisite.findMany({ where: { subtopicId: { in: subtopicIds } } }),
      tx.topicPrerequisite.findMany({ where: { topicId: { in: topicIds } } }),
    ]);
    return {
      id: c.id,
      version: c.version,
      items: c.items.map((i) => ({
        subtopicId: i.subtopicId,
        topicId: i.subtopic.topicId,
        topicSort: i.subtopic.topic.sortOrder,
        subtopicSort: i.subtopic.sortOrder,
        priority: i.priority,
        targetDepthRank: i.targetDepthRank,
        isOptional: i.isOptional,
        complexity: i.subtopic.complexity,
        estimateOverride: i.estimateMinutesOverride,
        skillLevel: 0,
        skillAreaId: i.subtopic.topic.skillAreaId,
        title: i.subtopic.title,
        topicTitle: i.subtopic.topic.title,
      })),
      subtopicPrereqs: subEdges.map((e) => [e.subtopicId, e.prerequisiteId]),
      topicPrereqs: topicEdges.map((e) => [e.topicId, e.prerequisiteId]),
    };
  }

  /** The goal's schedule plus the student's self-ratings. */
  private async settingsOf(goal: GoalRow): Promise<PlanSettings> {
    const ratings = await this.db.studentSkillRating.findMany({
      where: { studentId: goal.studentId },
    });
    return {
      dailyMinutes: goal.dailyMinutes,
      studyWeekdays: [...goal.studyWeekdays].sort((a, b) => a - b),
      deadline: goal.deadline ? fromDbDate(goal.deadline) : null,
      skills: Object.fromEntries(ratings.map((r) => [r.skillAreaId, r.level])),
    };
  }

  private todayOf(goal: GoalRow) {
    return todayIn(goal.student.studentProfile?.timezone ?? DEFAULT_TZ, this.ctx.now());
  }

  private activeGoal(studentId: string) {
    return this.db.studentGoal.findFirst({
      where: { studentId, isActive: true },
      include: { role: true, bracket: true, student: { include: { studentProfile: true } } },
    });
  }

  private goalById(id: string) {
    return this.db.studentGoal.findUnique({
      where: { id },
      include: { role: true, bracket: true, student: { include: { studentProfile: true } } },
    });
  }

  private async activeVersion(goalId: string) {
    return this.db.roadmapVersion.findFirst({
      where: { roadmap: { goalId }, status: 'ACTIVE' },
      include: { items: true },
    });
  }

  private async publishedCurriculumId(roleId: string, bracketId: string) {
    const c = await this.db.roleCurriculum.findFirst({
      where: { roleId, bracketId, status: 'PUBLISHED' },
      select: { id: true },
    });
    return c?.id ?? null;
  }
}

// ───────────── helpers ─────────────

function weekDtos(
  weeks: WeekPlan[],
  named: Map<string, { title: string; topicTitle: string }>,
): WeekPlanDto[] {
  return weeks.map((w) => ({
    ...w,
    items: w.items.map((i) => ({
      ...i,
      title: named.get(i.subtopicId)?.title ?? '',
      topicTitle: named.get(i.subtopicId)?.topicTitle ?? '',
    })),
  }));
}

/** Finish date, spare days, suggested paces and the week-by-week plan for one schedule. */
function previewOf(
  c: LoadedCurriculum,
  input: PlanInput,
  current: PlanPreview['current'],
): PlanPreview {
  const plan = buildPlan(input);
  const named = new Map(
    c.items.map((i) => [i.subtopicId, { title: i.title, topicTitle: i.topicTitle }]),
  );
  return {
    current,
    proposed: {
      startDate: input.startDate,
      plannedEndDate: plan.plannedEndDate,
      totalMinutes: plan.totalMinutes,
      weeklyMinutes: plan.weeklyMinutes,
      studyDays: plan.studyDays,
      subtopics: plan.items.length,
      topics: new Set(plan.items.map((i) => i.topicId)).size,
    },
    feasibility: plan.feasibility,
    daysToSpare:
      input.deadline && plan.plannedEndDate
        ? daysBetween(plan.plannedEndDate, input.deadline)
        : null,
    revisionDays: input.deadline ? revisionDays(input.startDate, input.deadline) : null,
    paces: suggestPaces(input),
    weeks: weekDtos(groupByWeek(plan.days), named),
  };
}

const isMaterial = (c: ChangeSummaryDto) =>
  c.added.length > 0 || c.removed.length > 0 || c.depthChanged.length > 0 || c.minutesDelta !== 0;

/** Same subtopics in the same order with the same minutes and dates. */
function samePlan(
  stored: Array<{
    subtopicId: string;
    sequence: number;
    estimatedMinutes: number;
    plannedStart: Date | null;
    plannedEnd: Date | null;
  }>,
  plan: Plan,
) {
  const fresh = itemRows('', plan);
  const key = (i: (typeof stored)[number]) =>
    [
      i.subtopicId,
      i.sequence,
      i.estimatedMinutes,
      i.plannedStart?.getTime(),
      i.plannedEnd?.getTime(),
    ].join('|');
  const a = [...stored].sort((x, y) => x.sequence - y.sequence).map(key);
  const b = fresh.map(key);
  return a.length === b.length && a.every((k, n) => k === b[n]);
}

function sameRecord(a: Record<string, number>, b: Record<string, number>) {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

const toStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Serialises version-number allocation and status flips for one roadmap. */
async function lockRoadmap(tx: Tx, roadmapId: string) {
  await tx.$queryRaw`SELECT id FROM roadmap WHERE id = ${roadmapId}::uuid FOR UPDATE`;
}

async function nextVersionNumber(tx: Tx, roadmapId: string) {
  const last = await tx.roadmapVersion.findFirst({
    where: { roadmapId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  });
  return (last?.versionNumber ?? 0) + 1;
}

function inputsJson(s: PlanSettings, startDate: string): Prisma.InputJsonValue {
  return {
    startDate,
    dailyMinutes: s.dailyMinutes,
    studyWeekdays: s.studyWeekdays,
    deadline: s.deadline,
    skills: s.skills,
    practiceAllowance: PRACTICE_ALLOWANCE,
  };
}

function itemRows(roadmapVersionId: string, plan: Plan) {
  return plan.items.map((i) => ({
    roadmapVersionId,
    subtopicId: i.subtopicId,
    topicId: i.topicId,
    sequence: i.sequence,
    targetDepthRank: i.targetDepthRank,
    priority: i.priority,
    isOptional: i.isOptional,
    fastTrack: i.fastTrack,
    estimatedMinutes: i.estimatedMinutes,
    plannedStart: i.plannedStart ? toDbDate(i.plannedStart) : null,
    plannedEnd: i.plannedEnd ? toDbDate(i.plannedEnd) : null,
  }));
}

function toVersionDto(v: {
  id: string;
  versionNumber: number;
  trigger: RoadmapTrigger;
  createdAt: Date;
  totalMinutes: number;
  plannedEndDate: Date | null;
  deadlineFeasible: boolean | null;
  changeSummary: Prisma.JsonValue | null;
}): RoadmapVersionDto {
  return {
    id: v.id,
    versionNumber: v.versionNumber,
    trigger: v.trigger,
    createdAt: v.createdAt.toISOString(),
    totalMinutes: v.totalMinutes,
    plannedEndDate: v.plannedEndDate ? fromDbDate(v.plannedEndDate) : null,
    deadlineFeasible: v.deadlineFeasible,
    changeSummary: (v.changeSummary as ChangeSummaryDto | null) ?? null,
  };
}
