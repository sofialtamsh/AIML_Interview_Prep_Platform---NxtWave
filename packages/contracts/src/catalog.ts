import { z } from 'zod';

export const Availability = z.enum(['LIVE', 'NEXT_UP', 'PLANNED', 'HIDDEN']);
export type Availability = z.infer<typeof Availability>;

export const Difficulty = z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']);
export type Difficulty = z.infer<typeof Difficulty>;

export const ColorKey = z.enum(['g0', 'g1', 'g2', 'g3', 'g4']);
export type ColorKey = z.infer<typeof ColorKey>;

export const Slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes')
  .min(2)
  .max(60);

const Text = (min: number, max: number) => z.string().trim().min(min).max(max);
const Lines = (maxItems: number) => z.array(Text(1, 160)).max(maxItems);

// ───────────── DTOs ─────────────

export const SkillAreaDto = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  sortOrder: z.number().int(),
});
export type SkillAreaDto = z.infer<typeof SkillAreaDto>;

export const RoleSkill = z.object({
  skillAreaId: z.uuid(),
  importance: z.number().int().min(1).max(3),
});
export type RoleSkill = z.infer<typeof RoleSkill>;

export const CareerRoleDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  shortCode: z.string(),
  tagline: z.string(),
  description: z.string(),
  competencies: z.array(z.string()),
  interviewFocus: z.array(z.string()),
  colorKey: ColorKey,
  availability: Availability,
  sortOrder: z.number().int(),
  skillAreas: z.array(RoleSkill),
});
export type CareerRoleDto = z.infer<typeof CareerRoleDto>;

export const DifficultyPolicy = z.object({
  EASY: z.number().int().min(0).max(100),
  MEDIUM: z.number().int().min(0).max(100),
  HARD: z.number().int().min(0).max(100),
  EXPERT: z.number().int().min(0).max(100),
});
export type DifficultyPolicy = z.infer<typeof DifficultyPolicy>;

export const PackageBracketDto = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string(),
  minLpa: z.number().int(),
  maxLpa: z.number().int().nullable(),
  headline: z.string(),
  expectations: z.string(),
  availability: Availability,
  sortOrder: z.number().int(),
  difficultyPolicy: DifficultyPolicy,
});
export type PackageBracketDto = z.infer<typeof PackageBracketDto>;

export const DepthLevelDto = z.object({
  rank: z.number().int(),
  code: z.string(),
  name: z.string(),
  description: z.string(),
  generationGuidance: z.string(),
});
export type DepthLevelDto = z.infer<typeof DepthLevelDto>;

export const CompanyDto = z.object({ id: z.string(), slug: z.string(), name: z.string() });
export type CompanyDto = z.infer<typeof CompanyDto>;

/** Admin views add demand and usage counts. */
export const AdminRoleDto = CareerRoleDto.extend({
  activeGoals: z.number().int(),
  interested: z.number().int(),
});
export type AdminRoleDto = z.infer<typeof AdminRoleDto>;
export const AdminBracketDto = PackageBracketDto.extend({
  activeGoals: z.number().int(),
  interested: z.number().int(),
});
export type AdminBracketDto = z.infer<typeof AdminBracketDto>;

export const AdminCatalogResponse = z.object({
  roles: z.array(AdminRoleDto),
  brackets: z.array(AdminBracketDto),
  depthLevels: z.array(DepthLevelDto),
  skillAreas: z.array(SkillAreaDto),
  companies: z.array(CompanyDto),
});
export type AdminCatalogResponse = z.infer<typeof AdminCatalogResponse>;

// ───────────── Admin write bodies ─────────────

export const RoleBody = z.object({
  slug: Slug,
  title: Text(2, 60),
  shortCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,4}$/, 'Use 1–4 letters or digits'),
  tagline: Text(3, 120),
  description: Text(10, 1200),
  competencies: Lines(15),
  interviewFocus: Lines(10),
  colorKey: ColorKey,
  availability: Availability,
  sortOrder: z.number().int().min(0).max(999),
  skillAreas: z.array(RoleSkill).max(12),
});
export type RoleBody = z.infer<typeof RoleBody>;
export const RolePatch = RoleBody.partial();
export type RolePatch = z.infer<typeof RolePatch>;

export const BracketBody = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_]{2,24}$/, 'Use A–Z, 0–9 and _'),
  label: Text(2, 30),
  minLpa: z.number().int().min(0).max(500),
  maxLpa: z.number().int().min(1).max(500).nullable(),
  headline: Text(3, 60),
  expectations: Text(10, 400),
  availability: Availability,
  sortOrder: z.number().int().min(0).max(999),
});
export type BracketBody = z.infer<typeof BracketBody>;
export const BracketPatch = BracketBody.partial();
export type BracketPatch = z.infer<typeof BracketPatch>;

export const DepthLevelPatch = z.object({
  name: Text(2, 40).optional(),
  description: Text(5, 300).optional(),
  generationGuidance: Text(10, 1000).optional(),
});
export type DepthLevelPatch = z.infer<typeof DepthLevelPatch>;

export const SkillAreaBody = z.object({
  slug: Slug,
  name: Text(2, 60),
  description: Text(3, 300),
  sortOrder: z.number().int().min(0).max(999),
});
export type SkillAreaBody = z.infer<typeof SkillAreaBody>;
export const SkillAreaPatch = SkillAreaBody.partial();

export const CompanyBody = z.object({ name: Text(1, 80) });
export type CompanyBody = z.infer<typeof CompanyBody>;

export const IdParam = z.object({ id: z.uuid() });
export const RankParam = z.object({ rank: z.coerce.number().int().min(1).max(10) });
