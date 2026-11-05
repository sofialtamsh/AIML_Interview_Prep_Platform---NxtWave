/**
 * Lessons: the admin content workspace (import, edit, review, publish) and the student
 * lesson player. Lesson bodies themselves are defined once in @app/content.
 */
import { CheckResponse, CheckResult, type LessonDocument, StudentSection } from '@app/content';
import { z } from 'zod';
import { StyleKey } from './ai';
import { ColorKey } from './catalog';

const Uuid = z.uuid();
const Key = z
  .string()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
  .max(80);
const SlugParam = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(80);

/**
 * Lesson documents are validated by the service (with path-level messages) rather than by the
 * route schema, and are typed here without re-validating on the way out.
 */
const Document = z.unknown() as unknown as z.ZodType<LessonDocument>;

export const LessonVersionStatus = z.enum([
  'DRAFT',
  'AI_GENERATED',
  'UNDER_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
  'ARCHIVED',
]);
export type LessonVersionStatus = z.infer<typeof LessonVersionStatus>;
export const ContentOrigin = z.enum(['IMPORT', 'MANUAL', 'AI']);
export type ContentOrigin = z.infer<typeof ContentOrigin>;
export const ReviewDecision = z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED']);
export type ReviewDecision = z.infer<typeof ReviewDecision>;

/** A validation problem with the path inside the lesson document, e.g. "sections.3.body.items.0". */
export const ContentIssue = z.object({ path: z.string(), message: z.string() });
export type ContentIssue = z.infer<typeof ContentIssue>;

// ───────────── Admin: lessons index ─────────────

/** A published curriculum that includes this subtopic, and how deep it goes there. */
export const LessonTargetDto = z.object({
  roleId: z.string(),
  roleSlug: z.string(),
  roleTitle: z.string(),
  roleShortCode: z.string(),
  colorKey: ColorKey,
  bracketId: z.string(),
  bracketLabel: z.string(),
  depth: z.object({ rank: z.number().int(), name: z.string() }),
  /** What the roadmap budgets for this subtopic (before practice time). */
  plannedMinutes: z.number().int(),
});
export type LessonTargetDto = z.infer<typeof LessonTargetDto>;

export const LessonIndexRow = z.object({
  subtopicId: z.string(),
  slug: z.string(),
  title: z.string(),
  targets: z.array(LessonTargetDto),
  published: z
    .object({
      versionNumber: z.number().int(),
      publishedAt: z.string(),
      sections: z.number().int(),
    })
    .nullable(),
  working: z
    .object({
      id: z.string(),
      versionNumber: z.number().int(),
      status: LessonVersionStatus,
      updatedAt: z.string(),
    })
    .nullable(),
});
export type LessonIndexRow = z.infer<typeof LessonIndexRow>;

export const LessonIndexResponse = z.object({
  topics: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      iconKey: z.string(),
      subtopics: z.array(LessonIndexRow),
    }),
  ),
  counts: z.object({
    published: z.number().int(),
    inReview: z.number().int(),
    inProgress: z.number().int(),
    missing: z.number().int(),
  }),
});
export type LessonIndexResponse = z.infer<typeof LessonIndexResponse>;

// ───────────── Admin: one lesson ─────────────

export const LessonVersionSummary = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  status: LessonVersionStatus,
  origin: ContentOrigin,
  /** The writing style its checks use (AI drafts: the style they were written in). */
  style: StyleKey,
  title: z.string(),
  changeNote: z.string().nullable(),
  sectionCount: z.number().int(),
  basedOnVersionNumber: z.number().int().nullable(),
  createdAt: z.string(),
  createdBy: z.string().nullable(),
  updatedAt: z.string(),
  submittedAt: z.string().nullable(),
  publishedAt: z.string().nullable(),
  publishedBy: z.string().nullable(),
});
export type LessonVersionSummary = z.infer<typeof LessonVersionSummary>;

export const LessonModuleResponse = z.object({
  subtopic: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    topic: z.object({ slug: z.string(), title: z.string(), iconKey: z.string() }),
  }),
  targets: z.array(LessonTargetDto),
  versions: z.array(LessonVersionSummary),
  publishedVersionId: z.string().nullable(),
  workingVersionId: z.string().nullable(),
  /** Concepts of this subtopic, for tagging sections. */
  concepts: z.array(z.object({ key: z.string(), name: z.string() })),
  roles: z.array(z.object({ slug: z.string(), title: z.string() })),
  depthLevels: z.array(z.object({ rank: z.number().int(), name: z.string() })),
});
export type LessonModuleResponse = z.infer<typeof LessonModuleResponse>;

/** Mirrors `depthReport()` in @app/content. */
export const DepthReportDto = z.object({
  depth: z.number().int(),
  sectionKeys: z.array(z.string()),
  minutes: z.number().int(),
  objectives: z.number().int(),
  checks: z.array(
    z.object({
      key: z.enum(['hook', 'interactive', 'check', 'summary', 'outputs']),
      ok: z.boolean(),
      message: z.string(),
    }),
  ),
});
export type DepthReportDto = z.infer<typeof DepthReportDto>;

export const SectionChange = z.enum(['ADDED', 'CHANGED', 'UNCHANGED']);
export type SectionChange = z.infer<typeof SectionChange>;

export const LessonVersionResponse = z.object({
  version: LessonVersionSummary.extend({
    subtopicId: z.string(),
    editSeq: z.number().int(),
    /** Only drafts can be edited; anything later must go back to draft first. */
    editable: z.boolean(),
  }),
  /** The full lesson, answers included (admins only). */
  document: Document,
  sections: z.array(
    z.object({
      key: z.string(),
      revisionId: z.string(),
      origin: ContentOrigin,
      createdAt: z.string(),
      /** Compared with the published version (everything is ADDED when nothing is published). */
      change: SectionChange,
    }),
  ),
  /** Sections in the published version that this version removes. */
  removedKeys: z.array(z.string()),
  reviews: z.array(
    z.object({
      id: z.string(),
      decision: ReviewDecision,
      notes: z.string().nullable(),
      sectionNotes: z.record(z.string(), z.string()),
      reviewer: z.string(),
      createdAt: z.string(),
    }),
  ),
  /** The reviewer's checklist for every depth a published curriculum uses. */
  depthReports: z.array(DepthReportDto),
});
export type LessonVersionResponse = z.infer<typeof LessonVersionResponse>;

export const SubtopicIdParam = z.object({ subtopicId: Uuid });
export const VersionIdParam = z.object({ id: Uuid });
export const VersionSectionParam = z.object({ id: Uuid, key: Key });

export const CreateLessonVersionBody = z.discriminatedUnion('source', [
  /** Paste or upload a lesson JSON (e.g. the reference exemplar, or one written by hand). */
  z.object({
    source: z.literal('IMPORT'),
    document: z.unknown(),
    changeNote: z.string().trim().max(500).optional(),
  }),
  /** Start a new draft from any earlier version (the published one to make changes, an old one to roll back). */
  z.object({
    source: z.literal('COPY'),
    versionId: Uuid,
    changeNote: z.string().trim().max(500).optional(),
  }),
]);
export type CreateLessonVersionBody = z.infer<typeof CreateLessonVersionBody>;

export const SaveDocumentBody = z.object({
  editSeq: z.number().int().min(0),
  document: z.unknown(),
});
export type SaveDocumentBody = z.infer<typeof SaveDocumentBody>;

export const SaveSectionBody = z.object({
  editSeq: z.number().int().min(0),
  section: z.unknown(),
});
export type SaveSectionBody = z.infer<typeof SaveSectionBody>;

export const SubmitForReviewBody = z.object({
  editSeq: z.number().int().min(0),
  note: z.string().trim().max(500).optional(),
});
export type SubmitForReviewBody = z.infer<typeof SubmitForReviewBody>;

export const ReviewBody = z
  .object({
    decision: ReviewDecision,
    notes: z.string().trim().max(2000).optional(),
    sectionNotes: z.record(Key, z.string().trim().min(1).max(1000)).default({}),
  })
  .refine(
    (b) => b.decision === 'APPROVED' || Boolean(b.notes) || Object.keys(b.sectionNotes).length > 0,
    { message: 'Say what needs to change', path: ['notes'] },
  );
export type ReviewBody = z.input<typeof ReviewBody>;

export const PublishLessonBody = z.object({
  changeNote: z.string().trim().min(3, 'Say what changed for students').max(500),
});
export type PublishLessonBody = z.infer<typeof PublishLessonBody>;

/** What students said about a lesson, per section, for the content team. */
export const LessonFeedbackResponse = z.object({
  rating: z.object({ average: z.number().nullable(), count: z.number().int() }),
  sections: z.array(
    z.object({
      sectionKey: z.string(),
      up: z.number().int(),
      down: z.number().int(),
      tags: z.record(z.string(), z.number().int()),
    }),
  ),
  comments: z.array(
    z.object({
      target: z.enum(['SECTION', 'LESSON']),
      sectionKey: z.string().nullable(),
      versionNumber: z.number().int(),
      rating: z.number().int().nullable(),
      thumbs: z.enum(['UP', 'DOWN']).nullable(),
      tags: z.array(z.string()),
      text: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type LessonFeedbackResponse = z.infer<typeof LessonFeedbackResponse>;

// ───────────── Student: lesson player ─────────────

export const LessonParams = z.object({ topicSlug: SlugParam, subtopicSlug: SlugParam });

export const LessonStatus = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']);
export type LessonStatus = z.infer<typeof LessonStatus>;

export const LessonProgressDto = z.object({
  status: LessonStatus,
  completedSectionKeys: z.array(z.string()),
  lastSectionKey: z.string().nullable(),
  timeSpentSec: z.number().int(),
  completedAt: z.string().nullable(),
  /** A newer version was published after the student finished. */
  updatedSinceCompletion: z.boolean(),
});
export type LessonProgressDto = z.infer<typeof LessonProgressDto>;

export const CheckAttemptDto = z.object({
  sectionKey: z.string(),
  itemKey: z.string(),
  response: CheckResponse,
  result: CheckResult,
});
export type CheckAttemptDto = z.infer<typeof CheckAttemptDto>;

export const NextLessonDto = z.object({
  topicSlug: z.string(),
  subtopicSlug: z.string(),
  title: z.string(),
  hasLesson: z.boolean(),
});

export const LessonResponse = z.object({
  subtopic: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    topic: z.object({ slug: z.string(), title: z.string(), iconKey: z.string() }),
  }),
  depth: z.object({ rank: z.number().int(), name: z.string() }),
  lesson: z.object({
    moduleVersionId: z.string(),
    versionNumber: z.number().int(),
    title: z.string(),
    subtitle: z.string().nullable(),
    publishedAt: z.string(),
    objectives: z.array(z.object({ key: z.string(), text: z.string() })),
    sections: z.array(StudentSection),
    totalMinutes: z.number().int(),
  }),
  progress: LessonProgressDto,
  /** The latest try per check item (answers are only included once the student has tried). */
  attempts: z.array(CheckAttemptDto),
  feedback: z.object({
    sections: z.record(z.string(), z.enum(['UP', 'DOWN'])),
    lessonRating: z.number().int().nullable(),
  }),
  next: NextLessonDto.nullable(),
});
export type LessonResponse = z.infer<typeof LessonResponse>;

export const LessonProgressBody = z.object({
  moduleVersionId: Uuid,
  sectionKey: Key,
  completed: z.boolean(),
  /** Seconds spent since the last save. The server caps each save. */
  timeSpentSec: z.number().int().min(0).max(86_400).default(0),
});
export type LessonProgressBody = z.input<typeof LessonProgressBody>;

export const CheckAttemptBody = z.object({
  revisionId: Uuid,
  sectionKey: Key,
  itemKey: Key,
  response: CheckResponse,
});
export type CheckAttemptBody = z.infer<typeof CheckAttemptBody>;

export const SolutionBody = z.object({ revisionId: Uuid, sectionKey: Key });
export const SolutionResponse = z.object({ solution: z.string() });

export const CompleteLessonBody = z.object({ moduleVersionId: Uuid });
export const CompleteLessonResponse = z.object({
  progress: LessonProgressDto,
  next: NextLessonDto.nullable(),
});
export type CompleteLessonResponse = z.infer<typeof CompleteLessonResponse>;

// ───────────── Student: feedback (the 11★ loop) ─────────────

export const SECTION_FEEDBACK_TAGS = [
  'too_fast',
  'hard_words',
  'visual_unclear',
  'content_error',
  'too_basic',
] as const;
export const LESSON_FEEDBACK_TAGS = [
  'clear_examples',
  'fun_to_explore',
  'right_depth',
  'too_long',
  'too_hard',
  'too_easy',
  'want_more_practice',
] as const;
export const PAGE_FEEDBACK_TAGS = ['idea', 'bug', 'confusing', 'praise'] as const;

const FeedbackText = z.string().trim().max(2000).optional();

export const FeedbackBody = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('SECTION'),
    moduleVersionId: Uuid,
    sectionKey: Key,
    revisionId: Uuid,
    /** Null clears the thumbs. */
    thumbs: z.enum(['UP', 'DOWN']).nullable(),
    tags: z.array(z.enum(SECTION_FEEDBACK_TAGS)).max(5).default([]),
    text: FeedbackText,
  }),
  z.object({
    target: z.literal('LESSON'),
    moduleVersionId: Uuid,
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.enum(LESSON_FEEDBACK_TAGS)).max(7).default([]),
    /** "What would make this an 11★ lesson?" */
    text: FeedbackText,
  }),
  z.object({
    target: z.literal('PAGE'),
    page: z
      .string()
      .regex(/^\/[A-Za-z0-9/_-]*$/)
      .max(200),
    tags: z.array(z.enum(PAGE_FEEDBACK_TAGS)).max(4).default([]),
    text: z.string().trim().min(3, 'Tell us a little more').max(2000),
  }),
]);
export type FeedbackBody = z.input<typeof FeedbackBody>;

/** Lesson state shown on the topic page for each subtopic. */
export const LessonSummaryDto = z.object({
  minutes: z.number().int(),
  sections: z.number().int(),
  status: LessonStatus,
  percent: z.number().int(),
});
export type LessonSummaryDto = z.infer<typeof LessonSummaryDto>;
