import { z } from 'zod';
import { IsoDate } from './goals';

// ───────────── Student: what the app reports ─────────────

/**
 * What the student app tells the server about use that the server cannot see for itself: a page
 * opened, and the two Academy links on the Practice tab. Lesson steps, quiz answers and finished
 * lessons are recorded by the server as they happen, never from the browser.
 */
export const ActivityBody = z.object({
  kind: z.enum(['VISIT', 'PRACTICE_SOLVE', 'PRACTICE_CONCEPT']),
  /** An app path for a visit ("/roadmap"); the question id ("PY-001") for a practice link. */
  target: z
    .string()
    .trim()
    .max(200)
    .regex(/^[A-Za-z0-9/_.:#-]*$/, 'Use a path or an id')
    .optional(),
});
export type ActivityBody = z.infer<typeof ActivityBody>;

// ───────────── Admin: analytics ─────────────

/** The longest range one request may cover, in days. */
export const ANALYTICS_MAX_DAYS = 92;

export const AnalyticsQuery = z.object({
  /** First and last day, inclusive, as days in India. Left out: the last 14 days. */
  from: IsoDate.optional(),
  to: IsoDate.optional(),
  q: z.string().trim().max(100).optional(),
  cohortId: z.uuid().optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuery>;

/** One student's or one day's activity, counted the same way everywhere. */
const Counts = {
  /** Pages opened in the student app. */
  visits: z.number().int(),
  /** Minutes of study time inside lessons. */
  learnMinutes: z.number().int(),
  /** Lesson steps saved. */
  steps: z.number().int(),
  quizAnswers: z.number().int(),
  quizRight: z.number().int(),
  /** "Solve Question" opened on the Practice tab. */
  practiceSolves: z.number().int(),
  /** "Watch concept" opened on the Practice tab. */
  conceptViews: z.number().int(),
  lessonsCompleted: z.number().int(),
};

export const AnalyticsDay = z.object({
  day: IsoDate,
  activeStudents: z.number().int(),
  ...Counts,
});
export type AnalyticsDay = z.infer<typeof AnalyticsDay>;

export const AnalyticsStudent = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED']),
  cohorts: z.array(z.string()),
  joinedAt: z.string(),
  /** The last time they did anything, in the range or not; null if never. */
  lastActiveAt: z.string().nullable(),
  /** Days in the range on which they did anything. */
  activeDays: z.number().int(),
  /** The days themselves, so a row can show which days. */
  days: z.array(IsoDate),
  ...Counts,
  /** All time, not only in the range: lessons started and finished. */
  unitsStarted: z.number().int(),
  unitsDone: z.number().int(),
});
export type AnalyticsStudent = z.infer<typeof AnalyticsStudent>;

export const AnalyticsResponse = z.object({
  range: z.object({ from: IsoDate, to: IsoDate, days: z.number().int(), today: IsoDate }),
  summary: z.object({
    students: z.number().int(),
    activeToday: z.number().int(),
    /** Active on any of the last 7 days, today included. */
    activeLast7Days: z.number().int(),
    activeInRange: z.number().int(),
    joinedInRange: z.number().int(),
    learnMinutes: z.number().int(),
    lessonsCompleted: z.number().int(),
    practiceSolves: z.number().int(),
    /** False until the first activity was ever recorded: earlier use was not tracked. */
    trackingSince: IsoDate.nullable(),
  }),
  daily: z.array(AnalyticsDay),
  students: z.array(AnalyticsStudent),
});
export type AnalyticsResponse = z.infer<typeof AnalyticsResponse>;

export const AnalyticsStudentQuery = z.object({ from: IsoDate.optional(), to: IsoDate.optional() });

export const StudentAnalyticsResponse = z.object({
  student: AnalyticsStudent.pick({
    id: true,
    fullName: true,
    email: true,
    status: true,
    cohorts: true,
    joinedAt: true,
    lastActiveAt: true,
  }),
  range: z.object({ from: IsoDate, to: IsoDate }),
  /** One row per day they were active in the range, newest first. */
  days: z.array(z.object({ day: IsoDate, ...Counts })),
  /** Every lesson they have opened, all time. */
  lessons: z.array(
    z.object({
      topic: z.string(),
      title: z.string(),
      status: z.enum(['IN_PROGRESS', 'COMPLETED']),
      stepsDone: z.number().int(),
      minutes: z.number().int(),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
      lastSeenAt: z.string(),
    }),
  ),
  /** The latest things they did, newest first. */
  recent: z.array(
    z.object({
      at: z.string(),
      kind: z.enum([
        'VISIT',
        'LESSON_STEP',
        'LESSON_COMPLETED',
        'QUIZ_ANSWER',
        'PRACTICE_SOLVE',
        'PRACTICE_CONCEPT',
      ]),
      target: z.string().nullable(),
      value: z.number().int(),
    }),
  ),
});
export type StudentAnalyticsResponse = z.infer<typeof StudentAnalyticsResponse>;
