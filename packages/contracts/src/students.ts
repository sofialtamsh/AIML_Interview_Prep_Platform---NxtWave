import { z } from 'zod';
import { Timezone } from './auth';
import { ColorKey } from './catalog';
import { PageQuery, pageOf, RegistrationPolicy } from './common';
import { GoalDto, IsoDate, SkillRatingDto } from './goals';

// ───────────── Admin: students ─────────────

export const StudentListQuery = PageQuery.extend({
  q: z.string().trim().max(100).optional(),
  roleId: z.uuid().optional(),
  bracketId: z.uuid().optional(),
  cohortId: z.uuid().optional(),
  onboarding: z.enum(['done', 'pending']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
});
export type StudentListQuery = z.infer<typeof StudentListQuery>;

export const StudentListItem = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED']),
  emailVerified: z.boolean(),
  onboarded: z.boolean(),
  role: z
    .object({ id: z.string(), title: z.string(), shortCode: z.string(), colorKey: ColorKey })
    .nullable(),
  bracket: z.object({ id: z.string(), label: z.string() }).nullable(),
  cohorts: z.array(z.object({ id: z.string(), name: z.string() })),
  lastActiveAt: z.string().nullable(),
  createdAt: z.string(),
});
export type StudentListItem = z.infer<typeof StudentListItem>;

export const StudentListResponse = pageOf(StudentListItem);
export type StudentListResponse = z.infer<typeof StudentListResponse>;

export const StudentDetail = StudentListItem.extend({
  timezone: Timezone,
  goal: GoalDto.nullable(),
  skills: z.array(SkillRatingDto),
  previousGoals: z.number().int(),
});
export type StudentDetail = z.infer<typeof StudentDetail>;

export const UpdateStudentBody = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  cohortIds: z.array(z.uuid()).max(20).optional(),
});
export type UpdateStudentBody = z.infer<typeof UpdateStudentBody>;

// ───────────── Admin: access (cohorts, allowlist, registration) ─────────────

export const CohortDto = z.object({
  id: z.string(),
  name: z.string(),
  startsOn: IsoDate.nullable(),
  endsOn: IsoDate.nullable(),
  memberCount: z.number().int(),
  createdAt: z.string(),
});
export type CohortDto = z.infer<typeof CohortDto>;
export const CohortListResponse = z.object({ items: z.array(CohortDto) });

export const CohortBody = z.object({
  name: z.string().trim().min(2).max(80),
  startsOn: IsoDate.nullable().optional(),
  endsOn: IsoDate.nullable().optional(),
});
export type CohortBody = z.infer<typeof CohortBody>;
export const CohortPatch = CohortBody.partial();

export const AllowlistEntryDto = z.object({
  id: z.string(),
  email: z.string().nullable(),
  domain: z.string().nullable(),
  cohort: z.object({ id: z.string(), name: z.string() }).nullable(),
  note: z.string().nullable(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AllowlistEntryDto = z.infer<typeof AllowlistEntryDto>;

export const AllowlistQuery = PageQuery.extend({ q: z.string().trim().max(100).optional() });
export const AllowlistResponse = pageOf(AllowlistEntryDto);
export type AllowlistResponse = z.infer<typeof AllowlistResponse>;

/** Each entry is an email (`priya@college.edu`) or a whole domain (`@nxtwave.co.in`). */
export const AddAllowlistBody = z.object({
  entries: z.array(z.string().trim().toLowerCase().min(3).max(254)).min(1).max(5000),
  cohortId: z.uuid().nullable().optional(),
  note: z.string().trim().max(200).optional(),
});
export type AddAllowlistBody = z.infer<typeof AddAllowlistBody>;

export const AddAllowlistResponse = z.object({
  added: z.number().int(),
  alreadyListed: z.number().int(),
  invalid: z.array(z.string()),
});
export type AddAllowlistResponse = z.infer<typeof AddAllowlistResponse>;

export const RegistrationSettings = z.object({ policy: RegistrationPolicy });
export type RegistrationSettings = z.infer<typeof RegistrationSettings>;
