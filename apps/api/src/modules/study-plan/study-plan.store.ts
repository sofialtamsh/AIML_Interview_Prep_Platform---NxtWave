/**
 * The team's study plan (admin → Study plan), stored as a platform setting.
 *
 * Kept free of service dependencies so goals, roadmaps and the admin service can all read it
 * without import cycles.
 */
import { type DeadlineRule, type Schedule, StudyPlan } from '@app/contracts';
import type { Db } from '../../db/prisma.ts';
import { addDays, daysBetween } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';

export const STUDY_PLAN_KEY = 'study.plan';

/**
 * Used until an admin saves a plan: students choose their own time and package, exactly as
 * before the plan existed. The pilot bootstrap saves the pilot plan (both choices hidden).
 */
export const DEFAULT_STUDY_PLAN: StudyPlan = {
  dailyMinutes: 60,
  studyWeekdays: [1, 2, 3, 4, 5, 6],
  deadline: { mode: 'NONE' },
  message: null,
  bracketId: null,
  studentsChooseSchedule: true,
  studentsChoosePackage: true,
};

export interface StoredStudyPlan {
  plan: StudyPlan;
  updatedAt: Date | null;
  updatedById: string | null;
}

export async function loadStudyPlan(db: Db): Promise<StoredStudyPlan> {
  const row = await db.platformSetting.findUnique({ where: { key: STUDY_PLAN_KEY } });
  if (!row) return { plan: DEFAULT_STUDY_PLAN, updatedAt: null, updatedById: null };
  // Defaults first, so a plan saved before a field existed still reads cleanly.
  const stored = row.value && typeof row.value === 'object' ? row.value : {};
  const parsed = StudyPlan.safeParse({ ...DEFAULT_STUDY_PLAN, ...stored });
  return {
    plan: parsed.success ? parsed.data : DEFAULT_STUDY_PLAN,
    updatedAt: row.updatedAt,
    updatedById: row.updatedById,
  };
}

/** The deadline for a goal that starts on `startDate`. A fixed date that has passed means none. */
export function deadlineFor(rule: DeadlineRule, startDate: string): string | null {
  switch (rule.mode) {
    case 'NONE':
      return null;
    case 'DATE':
      return daysBetween(startDate, rule.date) > 0 ? rule.date : null;
    case 'DAYS_AFTER_START':
      return addDays(startDate, rule.days);
  }
}

export function scheduleFromPlan(plan: StudyPlan, startDate: string): Schedule {
  return {
    dailyMinutes: plan.dailyMinutes,
    studyWeekdays: [...plan.studyWeekdays].sort((a, b) => a - b),
    deadline: deadlineFor(plan.deadline, startDate),
  };
}

/** The package students are placed in: the plan's choice while it is open, else the first open one. */
export async function planBracketId(
  db: Db,
  plan: Pick<StudyPlan, 'bracketId'>,
): Promise<string | null> {
  if (plan.bracketId) {
    const chosen = await db.packageBracket.findUnique({
      where: { id: plan.bracketId },
      select: { availability: true },
    });
    if (chosen?.availability === 'LIVE') return plan.bracketId;
  }
  const first = await db.packageBracket.findFirst({
    where: { availability: 'LIVE' },
    orderBy: { sortOrder: 'asc' },
    select: { id: true },
  });
  return first?.id ?? null;
}

export interface GoalChoices {
  bracketId: string;
  schedule: Schedule;
  /** True when the schedule came from the plan (so the student-facing limits don't apply). */
  scheduleFromPlan: boolean;
}

/**
 * Package and schedule for a new goal: what the student picked while they may pick, the team's
 * plan otherwise. A missing required choice is a field error the onboarding form can show.
 */
export async function resolveGoalChoices(
  db: Db,
  plan: StudyPlan,
  input: { bracketId?: string; schedule?: Schedule },
  startDate: string,
): Promise<GoalChoices> {
  let bracketId: string | null;
  if (plan.studentsChoosePackage) {
    bracketId = input.bracketId ?? null;
    if (!bracketId) {
      throw new AppError('VALIDATION_ERROR', 'Pick the package you are aiming for.', {
        fields: { bracketId: 'Pick a package.' },
      });
    }
  } else {
    bracketId = await planBracketId(db, plan);
    if (!bracketId)
      throw new AppError('CONFLICT', 'No package is open yet. Please check back soon.');
  }

  if (plan.studentsChooseSchedule) {
    if (!input.schedule) {
      throw new AppError('VALIDATION_ERROR', 'Tell us when you can study.', {
        fields: { schedule: 'Pick your study time.' },
      });
    }
    return { bracketId, schedule: input.schedule, scheduleFromPlan: false };
  }
  return { bracketId, schedule: scheduleFromPlan(plan, startDate), scheduleFromPlan: true };
}
