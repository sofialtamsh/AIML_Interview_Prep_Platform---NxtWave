import { z } from 'zod';
import { ColorKey } from './catalog';
import { Priority } from './curriculum';
import { HiringCtcBand } from './hiring';

/**
 * Admin → Content coverage: how ready the content is for one role and package. It joins the
 * published curriculum, the lessons, the practice questions and the team's study plan, and, for
 * super admins, the Hiring Intelligence data. It is about content, not about student activity
 * (that is Overview and Students).
 */

export const CoverageQuery = z.object({
  roleId: z.uuid().optional(),
  bracketId: z.uuid().optional(),
});
export type CoverageQuery = z.infer<typeof CoverageQuery>;

/** A role × package with a published curriculum. */
export const CoverageTarget = z.object({
  roleId: z.string(),
  roleTitle: z.string(),
  roleShortCode: z.string(),
  colorKey: ColorKey,
  bracketId: z.string(),
  bracketLabel: z.string(),
  curriculumVersion: z.number().int(),
  units: z.number().int(),
});
export type CoverageTarget = z.infer<typeof CoverageTarget>;

/**
 * Where a unit's lesson stands. LIVE means students can open it (a newer version may be in
 * review); the others mean nothing is published yet.
 */
export const CoverageLessonState = z.enum(['LIVE', 'IN_REVIEW', 'IN_PROGRESS', 'NOT_STARTED']);
export type CoverageLessonState = z.infer<typeof CoverageLessonState>;

export const CoverageUnitLesson = z.object({
  state: CoverageLessonState,
  liveVersion: z.number().int().nullable(),
  workingVersion: z.number().int().nullable(),
  workingStatus: z.string().nullable(),
  /** The measured version has no slide decks: it was written before the slide format. */
  olderFormat: z.boolean(),
  /** Student minutes at this target's depth, from the live version (else the working one). */
  minutes: z.number().int().nullable(),
});
export type CoverageUnitLesson = z.infer<typeof CoverageUnitLesson>;

/** How much of the interview data a unit answers (super admins only). */
export const CoverageUnitEvidence = z.object({
  themes: z.array(z.string()),
  /** Companies in this package band that asked any of the unit's themes. */
  companies: z.number().int(),
  /** Share of the band's companies (0–1). */
  share: z.number(),
  questions: z.number().int(),
});
export type CoverageUnitEvidence = z.infer<typeof CoverageUnitEvidence>;

/** One subtopic of the curriculum, in roadmap order. */
export const CoverageUnit = z.object({
  subtopicId: z.string(),
  slug: z.string(),
  title: z.string(),
  topicId: z.string(),
  topicSlug: z.string(),
  topicTitle: z.string(),
  sequence: z.number().int(),
  priority: Priority,
  depth: z.object({ rank: z.number().int(), name: z.string() }),
  optional: z.boolean(),
  lesson: CoverageUnitLesson,
  /** Minutes the roadmap plans for the unit, practice allowance included. */
  plannedMinutes: z.number().int(),
  /** The same estimate without the practice allowance, to compare with the measured lesson. */
  plannedLessonMinutes: z.number().int(),
  /** Study day (1 = the first) on which the roadmap starts the unit for a student starting today. */
  startDay: z.number().int().nullable(),
  /** Published practice questions tagged to this unit that students on this role can see. */
  practice: z.number().int(),
  evidence: CoverageUnitEvidence.nullable(),
});
export type CoverageUnit = z.infer<typeof CoverageUnit>;

export const CoverageSignal = z.object({
  tone: z.enum(['bad', 'warn', 'info', 'ok']),
  title: z.string(),
  detail: z.string(),
  /** The units it is about, so the page can link them. */
  subtopicIds: z.array(z.string()),
});
export type CoverageSignal = z.infer<typeof CoverageSignal>;

const UnitRef = z.object({
  subtopicId: z.string(),
  title: z.string(),
  state: CoverageLessonState,
  /** False when the unit exists in the catalog but not in this target's curriculum. */
  inCurriculum: z.boolean(),
  optional: z.boolean(),
  priority: Priority.nullable(),
});

/** Why a theme or interview format deserves a look. */
export const CoverageFlag = z.enum([
  /** No unit teaches it. */
  'NO_UNIT',
  /** Units exist, but none is in this curriculum. */
  'NOT_IN_CURRICULUM',
  /** Asked by a quarter or more of the companies, but every unit for it is optional. */
  'OPTIONAL_ONLY',
  /** Asked by a third or more of the companies, but no unit for it is high priority. */
  'NOT_HIGH',
]);
export type CoverageFlag = z.infer<typeof CoverageFlag>;

const EvidenceRow = z.object({
  companies: z.number().int(),
  share: z.number(),
  questions: z.number().int(),
  units: z.array(UnitRef),
  flag: CoverageFlag.nullable(),
});

export const CoverageEvidence = z.object({
  dataFrom: z.string(),
  dataTo: z.string(),
  band: HiringCtcBand,
  /** ML Engineer family (ML and AI job titles) in this package band. */
  companies: z.number().int(),
  questions: z.number().int(),
  /**
   * Share of the band's interview questions taught by a written / a live lesson. A theme taught
   * across several units counts in equal parts for each unit that has a lesson.
   */
  writtenShare: z.number(),
  liveShare: z.number(),
  themes: z.array(EvidenceRow.extend({ theme: z.string(), topicSlug: z.string().nullable() })),
  formats: z.array(EvidenceRow.extend({ key: z.string(), label: z.string() })),
  /** Questions the theme rules leave outside the curriculum, grouped by the dashboard's topic. */
  outside: z.object({
    questions: z.number().int(),
    companies: z.number().int(),
    groups: z.array(
      z.object({
        label: z.string(),
        domain: z.string(),
        companies: z.number().int(),
        questions: z.number().int(),
        example: z.string(),
      }),
    ),
  }),
});
export type CoverageEvidence = z.infer<typeof CoverageEvidence>;

export const CoverageResponse = z.object({
  targets: z.array(CoverageTarget),
  target: CoverageTarget.nullable(),
  /** The team's study plan the day numbers are computed with, for a student starting today. */
  schedule: z.object({
    startDate: z.string(),
    dailyMinutes: z.number().int(),
    studyWeekdays: z.array(z.number().int()),
    deadline: z.string().nullable(),
  }),
  summary: z.object({
    units: z.number().int(),
    optionalUnits: z.number().int(),
    written: z.number().int(),
    live: z.number().int(),
    inReview: z.number().int(),
    inProgress: z.number().int(),
    notStarted: z.number().int(),
    olderFormat: z.number().int(),
    withPractice: z.number().int(),
    plannedMinutes: z.number().int(),
    /** Measured lesson minutes for the units that have a lesson, and how many those are. */
    measuredMinutes: z.number().int(),
    measuredUnits: z.number().int(),
    /** The same units' planned lesson minutes (no practice allowance), for comparison. */
    measuredPlannedMinutes: z.number().int(),
    studyDays: z.number().int(),
    deadlineStudyDays: z.number().int().nullable(),
    /** Daily minutes that would fit the deadline on the same days (null when it fits). */
    fitsWithDailyMinutes: z.number().int().nullable(),
    firstNotLive: z
      .object({ subtopicId: z.string(), title: z.string(), day: z.number().int() })
      .nullable(),
    firstNotWritten: z
      .object({ subtopicId: z.string(), title: z.string(), day: z.number().int() })
      .nullable(),
  }),
  signals: z.array(CoverageSignal),
  units: z.array(CoverageUnit),
  /** Super admins only; null with `evidenceNote` saying why when it is missing. */
  evidence: CoverageEvidence.nullable(),
  evidenceNote: z.string().nullable(),
});
export type CoverageResponse = z.infer<typeof CoverageResponse>;
