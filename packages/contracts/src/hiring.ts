import { z } from 'zod';
import { PageQuery, pageOf } from './common';

/**
 * Hiring Intelligence: the interview questions companies asked in NxtWave placement drives,
 * imported from the Hiring Intelligence dashboard export. Super admins only; it feeds curriculum
 * and content decisions (docs/11-mle-interview-evidence.md) and never reaches students.
 */

export const HiringFamily = z.enum(['ML_TITLE', 'AI_TITLE']);
export type HiringFamily = z.infer<typeof HiringFamily>;

export const HiringCtcBand = z.enum(['UNDER_8_LPA', 'FROM_8_LPA']);
export type HiringCtcBand = z.infer<typeof HiringCtcBand>;

/** Which openings to look at. The ML Engineer family is both title tiers together. */
export const HiringScope = z.enum(['ML_FAMILY', 'ML_TITLE', 'AI_TITLE', 'ALL']);
export type HiringScope = z.infer<typeof HiringScope>;

export const HiringDifficulty = z.enum(['Easy', 'Medium', 'Hard']);

export const HiringSnapshotDto = z.object({
  id: z.string(),
  source: z.string(),
  dataFrom: z.string(),
  dataTo: z.string(),
  companies: z.number().int(),
  opportunities: z.number().int(),
  openings: z.number().int(),
  questions: z.number().int(),
  importedAt: z.string(),
  importedBy: z.string().nullable(),
});
export type HiringSnapshotDto = z.infer<typeof HiringSnapshotDto>;

const Count = z.object({ value: z.string(), count: z.number().int() });

/** How often the ML Engineer family is asked about one curriculum topic. */
export const HiringTopicCoverage = z.object({
  slug: z.string(),
  title: z.string(),
  questions: z.number().int(),
  companies: z.number().int(),
  /** Share of the family's companies that asked it (0–1), overall and per CTC band. */
  share: z.number(),
  shareUnder8: z.number().nullable(),
  shareFrom8: z.number().nullable(),
});
export type HiringTopicCoverage = z.infer<typeof HiringTopicCoverage>;

export const HiringOverviewResponse = z.object({
  snapshot: HiringSnapshotDto.nullable(),
  family: z.object({
    companies: z.number().int(),
    opportunities: z.number().int(),
    questions: z.number().int(),
    companiesUnder8: z.number().int(),
    companiesFrom8: z.number().int(),
    mlTitleCompanies: z.number().int(),
    aiTitleCompanies: z.number().int(),
  }),
  /** The evidence table behind the ML Engineer curriculum, recomputed from this snapshot. */
  topics: z.array(HiringTopicCoverage),
  rounds: z.array(Count),
  difficulty: z.array(Count),
});
export type HiringOverviewResponse = z.infer<typeof HiringOverviewResponse>;

export const HiringFacetsQuery = z.object({ scope: HiringScope.default('ML_FAMILY') });

export const HiringFacetsResponse = z.object({
  companies: z.array(Count),
  roles: z.array(Count),
  domains: z.array(Count),
  rounds: z.array(Count),
  questionTypes: z.array(Count),
  themes: z.array(Count),
  /** Curriculum topics, in roadmap order, with their question counts. */
  prepTopics: z.array(z.object({ slug: z.string(), title: z.string(), count: z.number().int() })),
});
export type HiringFacetsResponse = z.infer<typeof HiringFacetsResponse>;

const Filter = z.string().trim().min(1).max(200).optional();

export const HiringQuestionQuery = PageQuery.extend({
  scope: HiringScope.default('ML_FAMILY'),
  /** A curriculum topic slug, or "none" for questions outside the curriculum. */
  prepTopic: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80)
    .optional(),
  theme: Filter,
  company: Filter,
  role: Filter,
  domain: Filter,
  round: Filter,
  questionType: Filter,
  difficulty: HiringDifficulty.optional(),
  band: HiringCtcBand.optional(),
  /** Words to find in the question, topic or subtopic. */
  q: Filter,
});
export type HiringQuestionQuery = z.infer<typeof HiringQuestionQuery>;

export const HiringQuestionDto = z.object({
  id: z.string(),
  text: z.string(),
  company: z.string(),
  role: z.string(),
  domain: z.string(),
  topic: z.string(),
  subtopic: z.string().nullable(),
  skills: z.array(z.string()),
  questionType: z.string(),
  codingType: z.string(),
  round: z.string(),
  difficulty: z.string().nullable(),
  askedOn: z.string(),
  family: HiringFamily.nullable(),
  band: HiringCtcBand.nullable(),
  theme: z.string().nullable(),
  prepTopicSlug: z.string().nullable(),
});
export type HiringQuestionDto = z.infer<typeof HiringQuestionDto>;

export const HiringQuestionsResponse = pageOf(HiringQuestionDto);
export type HiringQuestionsResponse = z.infer<typeof HiringQuestionsResponse>;

export const HiringOpeningQuery = PageQuery.extend({
  scope: HiringScope.default('ML_FAMILY'),
  band: HiringCtcBand.optional(),
  /** Words to find in the company or a job title. */
  q: Filter,
});
export type HiringOpeningQuery = z.infer<typeof HiringOpeningQuery>;

export const HiringOpeningDto = z.object({
  id: z.string(),
  company: z.string(),
  roles: z.array(z.string()),
  domains: z.array(z.string()),
  skills: z.array(z.string()),
  ctcMinLpa: z.number().nullable(),
  ctcMaxLpa: z.number().nullable(),
  band: HiringCtcBand.nullable(),
  openings: z.number().int().nullable(),
  firstInterview: z.string(),
  lastInterview: z.string(),
  questions: z.number().int(),
  family: HiringFamily.nullable(),
});
export type HiringOpeningDto = z.infer<typeof HiringOpeningDto>;

export const HiringOpeningsResponse = pageOf(HiringOpeningDto);
export type HiringOpeningsResponse = z.infer<typeof HiringOpeningsResponse>;

export const HiringImportResponse = z.object({
  snapshot: HiringSnapshotDto,
  /** False when this exact file was already the current data. */
  imported: z.boolean(),
});
export type HiringImportResponse = z.infer<typeof HiringImportResponse>;
