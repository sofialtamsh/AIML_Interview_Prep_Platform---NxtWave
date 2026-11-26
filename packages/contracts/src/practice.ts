import { z } from 'zod';
import { Difficulty } from './catalog';

/**
 * Practice questions that students solve on the NxtWave learning portal (CCBP). The platform
 * lists them in the student's Practice tab and links out; solving happens on the portal, where
 * students sign in with their NxtWave account.
 *
 * The in-app question bank (Phase 5) extends this; it does not replace these links.
 */

/** Links must point at NxtWave's own portals, so a mistyped or foreign link can't reach students. */
export const PRACTICE_LINK_HOSTS = [
  'ccbp.in',
  'nxtwave.tech',
  'nxtwave.in',
  'nxtwave.co.in',
] as const;

/** https, then the host (letters, digits, dots, dashes only: no user@ tricks), an optional port. */
const HTTPS_HOST = /^https:\/\/([a-z0-9.-]+)(?::\d{1,5})?(?:[/?#]|$)/i;

export function isPracticeLinkAllowed(raw: string): boolean {
  const host = HTTPS_HOST.exec(raw.trim())?.[1]?.toLowerCase();
  return Boolean(host && PRACTICE_LINK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)));
}

export const PRACTICE_LINK_HINT = `Use an https link on the NxtWave learning portal (${PRACTICE_LINK_HOSTS.join(', ')})`;

const SolveUrl = z.string().trim().max(2000).refine(isPracticeLinkAllowed, PRACTICE_LINK_HINT);
const OptionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((s) => s || null);

const AskedAt = z.array(z.string().trim().min(1).max(60)).max(6);
const TopicIds = z.array(z.uuid()).max(10);
const SubtopicIds = z.array(z.uuid()).max(20);

/** Without defaults, so a partial update never resets a field the admin did not send. */
const CORE = {
  title: z.string().trim().min(3, 'Give the question a name').max(200),
  /** The group it is listed under, e.g. "Machine Learning". */
  category: z.string().trim().min(2, 'Pick a category').max(60),
  /** Optional finer label, e.g. "Linear regression". */
  skill: OptionalText(60),
  /** One or two lines: what the question asks. */
  description: OptionalText(300),
  difficulty: Difficulty,
  solveUrl: SolveUrl,
  estimatedMinutes: z.number().int().min(5).max(240).nullable(),
  /** Companies known to ask it, shown as "Asked at". */
  askedAt: AskedAt,
  /** Interview topics and subtopics it practises: it is listed on those topic pages. */
  topicIds: TopicIds,
  subtopicIds: SubtopicIds,
};
const LISTING = {
  /** Roles that see the question. Empty: every role. */
  roleIds: z.array(z.uuid()).max(10),
  published: z.boolean(),
  sortOrder: z.number().int().min(0).max(99_999),
};

/** A question's own fields; the newer ones (description, asked at, tags) may be left out. */
export const PracticeQuestionFields = z.object({
  ...CORE,
  description: CORE.description.default(null),
  askedAt: AskedAt.default([]),
  topicIds: TopicIds.default([]),
  subtopicIds: SubtopicIds.default([]),
});

export const PracticeQuestionBody = PracticeQuestionFields.extend(LISTING);
export type PracticeQuestionBody = z.infer<typeof PracticeQuestionBody>;
export const PracticeQuestionPatch = z.object({ ...CORE, ...LISTING }).partial();
export type PracticeQuestionPatch = z.infer<typeof PracticeQuestionPatch>;
export type PracticeQuestionFields = z.infer<typeof PracticeQuestionFields>;

export const AdminPracticeQuestionDto = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  skill: z.string().nullable(),
  description: z.string().nullable(),
  difficulty: Difficulty,
  solveUrl: z.string(),
  estimatedMinutes: z.number().int().nullable(),
  askedAt: z.array(z.string()),
  roleIds: z.array(z.string()),
  topicIds: z.array(z.string()),
  subtopicIds: z.array(z.string()),
  published: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Students who opened it from the Practice tab, and how many times in total. */
  opens: z.object({ students: z.number().int(), total: z.number().int() }),
  /** Students' ratings (1–5 faces). */
  rating: z.object({ average: z.number().nullable(), count: z.number().int() }),
});
export type AdminPracticeQuestionDto = z.infer<typeof AdminPracticeQuestionDto>;

export const AdminPracticeResponse = z.object({
  items: z.array(AdminPracticeQuestionDto),
  categories: z.array(z.string()),
});
export type AdminPracticeResponse = z.infer<typeof AdminPracticeResponse>;

export const PracticeImportBody = z.object({
  rows: z.array(PracticeQuestionFields).min(1).max(500),
  roleIds: z.array(z.uuid()).max(10),
  published: z.boolean(),
});
export type PracticeImportBody = z.infer<typeof PracticeImportBody>;

export const PracticeImportResponse = z.object({
  created: z.number().int(),
  /** Rows not imported because the link is already listed (or repeated in the paste). Row = 1-based. */
  skipped: z.array(z.object({ row: z.number().int(), title: z.string(), reason: z.string() })),
});
export type PracticeImportResponse = z.infer<typeof PracticeImportResponse>;

// ───────────── Student ─────────────

/** A topic (and optionally subtopic) a question is tagged with. */
export const PracticeTag = z.object({
  topicSlug: z.string(),
  topicTitle: z.string(),
  subtopicSlug: z.string().nullable(),
  subtopicTitle: z.string().nullable(),
});
export type PracticeTag = z.infer<typeof PracticeTag>;

export const StudentPracticeQuestion = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  skill: z.string().nullable(),
  description: z.string().nullable(),
  difficulty: Difficulty,
  solveUrl: z.string(),
  estimatedMinutes: z.number().int().nullable(),
  askedAt: z.array(z.string()),
  /** Topic and subtopic tags, for the topic pages and filters. */
  tags: z.array(PracticeTag),
  /** When this student first opened it from the Practice tab. */
  openedAt: z.string().nullable(),
  /** This student's rating (1–5), once they rate it. */
  myRating: z.number().int().nullable(),
});
export type StudentPracticeQuestion = z.infer<typeof StudentPracticeQuestion>;

export const StudentPracticeResponse = z.object({
  items: z.array(StudentPracticeQuestion),
  /** Categories in display order, with how many questions each has. */
  categories: z.array(z.object({ name: z.string(), count: z.number().int() })),
  /** Topics the questions are tagged with, in roadmap order, with counts. */
  topics: z.array(z.object({ slug: z.string(), title: z.string(), count: z.number().int() })),
});
export type StudentPracticeResponse = z.infer<typeof StudentPracticeResponse>;

export const PracticeOpenResponse = z.object({ openedAt: z.string() });
export type PracticeOpenResponse = z.infer<typeof PracticeOpenResponse>;

// ───────────── The 11★ loop for questions ─────────────

/** Tags for a low rating (1–3) and for a high one (4–5). */
export const PRACTICE_FEEDBACK_TAGS = [
  'statement_unclear',
  'too_hard',
  'too_easy',
  'portal_problem',
  'tests_wrong',
  'good_practice',
  'right_difficulty',
  'clear_statement',
  'lesson_helped',
] as const;
export type PracticeFeedbackTag = (typeof PRACTICE_FEEDBACK_TAGS)[number];

export const PracticeFeedbackBody = z.object({
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.enum(PRACTICE_FEEDBACK_TAGS)).max(6).default([]),
  /** "What would make this an 11★ question?" */
  text: z.string().trim().max(2000).optional(),
});
export type PracticeFeedbackBody = z.input<typeof PracticeFeedbackBody>;

export const PracticeFeedbackResponse = z.object({ rating: z.number().int() });

// ───────────── Admin: all student feedback ─────────────

export const FeedbackKind = z.enum(['SECTION', 'LESSON', 'PAGE', 'PRACTICE_QUESTION']);
export type FeedbackKind = z.infer<typeof FeedbackKind>;

export const AdminFeedbackQuery = z.object({
  kind: FeedbackKind.optional(),
  /** Only feedback with a written 11★ idea or comment. */
  withText: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const AdminFeedbackItem = z.object({
  id: z.string(),
  kind: FeedbackKind,
  /** What it is about, e.g. the lesson and step, the page path or the question name. */
  source: z.string(),
  rating: z.number().int().nullable(),
  thumbs: z.enum(['UP', 'DOWN']).nullable(),
  tags: z.array(z.string()),
  text: z.string().nullable(),
  student: z.string(),
  createdAt: z.string(),
});
export type AdminFeedbackItem = z.infer<typeof AdminFeedbackItem>;

export const AdminFeedbackResponse = z.object({
  items: z.array(AdminFeedbackItem),
  page: z.number().int(),
  total: z.number().int(),
  /** Per kind: how many, average rating, how many wrote an 11★ idea. */
  summary: z.array(
    z.object({
      kind: FeedbackKind,
      count: z.number().int(),
      averageRating: z.number().nullable(),
      ideas: z.number().int(),
    }),
  ),
});
export type AdminFeedbackResponse = z.infer<typeof AdminFeedbackResponse>;
