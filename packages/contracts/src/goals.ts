import { z } from 'zod';
import { Availability, CareerRoleDto, ColorKey, PackageBracketDto, SkillAreaDto } from './catalog';

export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date');
export type IsoDate = z.infer<typeof IsoDate>;

/** 0 = new to it · 1 = know the basics · 2 = comfortable · 3 = confident */
export const SkillLevel = z.number().int().min(0).max(3);
export const SkillRatings = z.record(z.uuid(), SkillLevel);
export type SkillRatings = z.infer<typeof SkillRatings>;

export const Weekday = z.number().int().min(0).max(6);

export const MIN_DAILY_MINUTES = 15;
export const MAX_DAILY_MINUTES = 600;

export const Schedule = z.object({
  dailyMinutes: z
    .number()
    .int()
    .min(MIN_DAILY_MINUTES, `At least ${MIN_DAILY_MINUTES} minutes a day`)
    .max(MAX_DAILY_MINUTES, 'That is more than 10 hours a day')
    .multipleOf(5, 'Use steps of 5 minutes'),
  studyWeekdays: z
    .array(Weekday)
    .min(1, 'Pick at least one day')
    .max(7)
    .refine((d) => new Set(d).size === d.length, 'Each day only once'),
  deadline: IsoDate.nullable(),
});
export type Schedule = z.infer<typeof Schedule>;

// ───────────── Student catalog ─────────────

export const StudentRole = CareerRoleDto.extend({ notifyMe: z.boolean() });
export type StudentRole = z.infer<typeof StudentRole>;
export const StudentBracket = PackageBracketDto.omit({ difficultyPolicy: true }).extend({
  notifyMe: z.boolean(),
});
export type StudentBracket = z.infer<typeof StudentBracket>;

export const StudentCatalogResponse = z.object({
  roles: z.array(StudentRole),
  brackets: z.array(StudentBracket),
  skillAreas: z.array(SkillAreaDto),
});
export type StudentCatalogResponse = z.infer<typeof StudentCatalogResponse>;

// ───────────── Onboarding ─────────────

export const OnboardingDraft = z.object({
  step: z.number().int().min(0).max(4).optional(),
  roleId: z.uuid().optional(),
  bracketId: z.uuid().optional(),
  skills: SkillRatings.optional(),
  schedule: Schedule.partial().optional(),
});
export type OnboardingDraft = z.infer<typeof OnboardingDraft>;

export const OnboardingState = z.object({ completed: z.boolean(), draft: OnboardingDraft });
export type OnboardingState = z.infer<typeof OnboardingState>;

export const CompleteOnboardingBody = z.object({
  roleId: z.uuid(),
  bracketId: z.uuid(),
  skills: SkillRatings,
  schedule: Schedule,
});
export type CompleteOnboardingBody = z.infer<typeof CompleteOnboardingBody>;

// ───────────── Goal ─────────────

export const GoalRole = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  shortCode: z.string(),
  colorKey: ColorKey,
  availability: Availability,
});
export const GoalBracket = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  headline: z.string(),
  availability: Availability,
});

export const GoalDto = z.object({
  id: z.string(),
  role: GoalRole,
  bracket: GoalBracket,
  dailyMinutes: z.number().int(),
  studyWeekdays: z.array(z.number().int()),
  weeklyMinutes: z.number().int(),
  startDate: IsoDate,
  deadline: IsoDate.nullable(),
  /** Calendar days from today (student's timezone) to the deadline; null without a deadline. */
  daysToDeadline: z.number().int().nullable(),
  createdAt: z.string(),
});
export type GoalDto = z.infer<typeof GoalDto>;

export const SkillRatingDto = z.object({
  skillAreaId: z.string(),
  name: z.string(),
  level: SkillLevel,
  importance: z.number().int().nullable(),
});
export type SkillRatingDto = z.infer<typeof SkillRatingDto>;

export const GoalResponse = z.object({
  goal: GoalDto.nullable(),
  skills: z.array(SkillRatingDto),
});
export type GoalResponse = z.infer<typeof GoalResponse>;

export const ChangeTargetBody = z.object({ roleId: z.uuid(), bracketId: z.uuid() });
export type ChangeTargetBody = z.infer<typeof ChangeTargetBody>;

export const UpdateSkillsBody = z.object({ skills: SkillRatings });
export type UpdateSkillsBody = z.infer<typeof UpdateSkillsBody>;

export const InterestKind = z.enum(['ROLE', 'BRACKET', 'TOPIC', 'CASE_STUDY']);
export const InterestBody = z.object({
  kind: InterestKind,
  targetId: z.uuid(),
  notify: z.boolean(),
});
export type InterestBody = z.infer<typeof InterestBody>;
export const InterestResponse = z.object({ notifyMe: z.boolean() });
