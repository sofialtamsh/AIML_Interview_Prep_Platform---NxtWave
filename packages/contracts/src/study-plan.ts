import { z } from 'zod';
import { PlanPreview } from './curriculum';
import { IsoDate, Schedule } from './goals';

/**
 * The study plan the team sets for every student (admin → Study plan).
 *
 * While students do not choose their own time or package (the pilot default), every goal
 * follows this plan. The student-side pickers still exist and come back the moment an admin
 * switches `studentsChooseSchedule` / `studentsChoosePackage` on.
 */

/** How each student's deadline is set: none, one date for everyone, or N days after they start. */
export const DeadlineRule = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('NONE') }),
  z.object({ mode: z.literal('DATE'), date: IsoDate }),
  z.object({ mode: z.literal('DAYS_AFTER_START'), days: z.number().int().min(7).max(365) }),
]);
export type DeadlineRule = z.infer<typeof DeadlineRule>;

export const STUDY_PLAN_MESSAGE_MAX = 600;

export const StudyPlan = z.object({
  dailyMinutes: Schedule.shape.dailyMinutes,
  studyWeekdays: Schedule.shape.studyWeekdays,
  deadline: DeadlineRule,
  /** A note from the team, shown on the student's home and plan pages. */
  message: z.string().trim().max(STUDY_PLAN_MESSAGE_MAX).nullable(),
  /** The package every student is placed in while students don't pick one. Null: the first open one. */
  bracketId: z.uuid().nullable(),
  /** Off: the time picker is hidden from students and this plan applies to everyone. */
  studentsChooseSchedule: z.boolean(),
  /** Off: the package picker is hidden from students and everyone gets `bracketId`. */
  studentsChoosePackage: z.boolean(),
});
export type StudyPlan = z.infer<typeof StudyPlan>;

// ───────────── Admin ─────────────

export const StudyPlanBracketOption = z.object({
  id: z.string(),
  label: z.string(),
  headline: z.string(),
  /** Study time for the open role's published curriculum at this package (no prior knowledge). */
  totalMinutes: z.number().int().nullable(),
});
export type StudyPlanBracketOption = z.infer<typeof StudyPlanBracketOption>;

export const AdminStudyPlanResponse = z.object({
  plan: StudyPlan,
  updatedAt: z.string().nullable(),
  updatedBy: z.string().nullable(),
  /** The open role the estimates are for (the first live role). */
  role: z.object({ id: z.string(), title: z.string() }).nullable(),
  /** Open packages an admin can place students in. */
  brackets: z.array(StudyPlanBracketOption),
  /** The package students are actually placed in right now. */
  effectiveBracketId: z.string().nullable(),
  /** Students with an active goal: the ones "apply to current students" updates. */
  activeStudents: z.number().int(),
});
export type AdminStudyPlanResponse = z.infer<typeof AdminStudyPlanResponse>;

export const SaveStudyPlanBody = StudyPlan.extend({
  /** Also bring every current student's goal in line with the plan (and re-plan their roadmap). */
  applyToStudents: z.boolean(),
});
export type SaveStudyPlanBody = z.infer<typeof SaveStudyPlanBody>;

export const ApplyStudyPlanResult = z.object({
  /** Goals whose time or deadline changed. */
  updated: z.number().int(),
  /** Goals moved to the plan's package (a new goal; the old one stays as history). */
  movedPackage: z.number().int(),
});
export type ApplyStudyPlanResult = z.infer<typeof ApplyStudyPlanResult>;

export const SaveStudyPlanResponse = AdminStudyPlanResponse.extend({
  applied: ApplyStudyPlanResult.nullable(),
});
export type SaveStudyPlanResponse = z.infer<typeof SaveStudyPlanResponse>;

export const StudyPlanPreviewBody = StudyPlan.pick({
  dailyMinutes: true,
  studyWeekdays: true,
  deadline: true,
  bracketId: true,
});
export type StudyPlanPreviewBody = z.infer<typeof StudyPlanPreviewBody>;

export const StudyPlanPreviewResponse = z.object({
  /** Null when the open role has no published curriculum at that package. */
  preview: PlanPreview.nullable(),
});
export type StudyPlanPreviewResponse = z.infer<typeof StudyPlanPreviewResponse>;

// ───────────── Student ─────────────

export const StudentStudyPlan = z.object({
  message: z.string().nullable(),
  dailyMinutes: z.number().int(),
  studyWeekdays: z.array(z.number().int()),
  deadline: DeadlineRule,
  /** The deadline a student who starts today gets (null without one). */
  deadlineIfStartedToday: IsoDate.nullable(),
  studentsChooseSchedule: z.boolean(),
  studentsChoosePackage: z.boolean(),
  updatedAt: z.string().nullable(),
});
export type StudentStudyPlan = z.infer<typeof StudentStudyPlan>;
