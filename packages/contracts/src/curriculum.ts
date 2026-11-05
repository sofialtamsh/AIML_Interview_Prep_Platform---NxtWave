import { z } from 'zod';
import { Availability, ColorKey, Slug } from './catalog';
import { LessonSummaryDto } from './content';
import { IsoDate, Schedule, SkillRatings } from './goals';

export const Priority = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type Priority = z.infer<typeof Priority>;
export const TaxonomyStatus = z.enum(['ACTIVE', 'ARCHIVED']);

const Text = (min: number, max: number) => z.string().trim().min(min).max(max);
const ConceptKey = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'Use lowercase words joined by dots or dashes')
  .max(120);

// ───────────── Taxonomy ─────────────

export const ConceptDto = z.object({
  id: z.string(),
  subtopicId: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type ConceptDto = z.infer<typeof ConceptDto>;

export const SubtopicDto = z.object({
  id: z.string(),
  topicId: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  sortOrder: z.number().int(),
  complexity: z.number().int(),
  status: TaxonomyStatus,
  prerequisiteIds: z.array(z.string()),
  concepts: z.array(ConceptDto),
});
export type SubtopicDto = z.infer<typeof SubtopicDto>;

export const TopicDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  iconKey: z.string(),
  skillAreaId: z.string().nullable(),
  sortOrder: z.number().int(),
  status: TaxonomyStatus,
  prerequisiteIds: z.array(z.string()),
  subtopics: z.array(SubtopicDto),
});
export type TopicDto = z.infer<typeof TopicDto>;

export const TaxonomyResponse = z.object({ topics: z.array(TopicDto) });
export const CreatedResponse = z.object({ id: z.string() });
export type TaxonomyResponse = z.infer<typeof TaxonomyResponse>;

export const TopicBody = z.object({
  slug: Slug,
  title: Text(2, 80),
  summary: Text(5, 400),
  iconKey: z.string().trim().max(40).default('book-open'),
  skillAreaId: z.uuid().nullable(),
  sortOrder: z.number().int().min(0).max(999),
  status: TaxonomyStatus.default('ACTIVE'),
  prerequisiteIds: z.array(z.uuid()).max(20),
});
export type TopicBody = z.infer<typeof TopicBody>;
export const TopicPatch = TopicBody.partial();

export const SubtopicBody = z.object({
  topicId: z.uuid(),
  slug: Slug,
  title: Text(2, 100),
  summary: Text(5, 500),
  sortOrder: z.number().int().min(0).max(999),
  complexity: z.number().int().min(1).max(5),
  status: TaxonomyStatus.default('ACTIVE'),
  prerequisiteIds: z.array(z.uuid()).max(20),
});
export type SubtopicBody = z.infer<typeof SubtopicBody>;
export const SubtopicPatch = SubtopicBody.partial();

export const ConceptBody = z.object({
  subtopicId: z.uuid(),
  key: ConceptKey,
  name: Text(2, 120),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(999),
});
export type ConceptBody = z.infer<typeof ConceptBody>;
export const ConceptPatch = ConceptBody.omit({ subtopicId: true }).partial();

// ───────────── Role × package curriculum ─────────────

export const CurriculumItemBody = z.object({
  subtopicId: z.uuid(),
  priority: Priority,
  targetDepthRank: z.number().int().min(1).max(5),
  isOptional: z.boolean(),
  learningObjectives: z.array(Text(3, 200)).min(1, 'Add at least one learning objective').max(8),
  implementationExpectation: z.string().trim().max(400).nullable().optional(),
  estimateMinutesOverride: z.number().int().min(5).max(2000).nullable().optional(),
  rationale: z.string().trim().max(600).nullable().optional(),
});
export type CurriculumItemBody = z.infer<typeof CurriculumItemBody>;

export const CurriculumItemDto = CurriculumItemBody.extend({
  id: z.string(),
  origin: z.string(),
  implementationExpectation: z.string().nullable(),
  estimateMinutesOverride: z.number().int().nullable(),
  rationale: z.string().nullable(),
});
export type CurriculumItemDto = z.infer<typeof CurriculumItemDto>;

export const CurriculumStatus = z.enum(['DRAFT', 'PUBLISHED', 'SUPERSEDED']);

export const CurriculumDto = z.object({
  id: z.string(),
  roleId: z.string(),
  bracketId: z.string(),
  version: z.number().int(),
  status: CurriculumStatus,
  changeNote: z.string().nullable(),
  publishedAt: z.string().nullable(),
  items: z.array(CurriculumItemDto),
  updatedAt: z.string(),
});
export type CurriculumDto = z.infer<typeof CurriculumDto>;

export const CurriculumQuery = z.object({ roleId: z.uuid(), bracketId: z.uuid() });

/** One row per role × package, for the admin picker. */
export const CurriculaIndex = z.object({
  targets: z.array(
    z.object({
      roleId: z.string(),
      bracketId: z.string(),
      publishedVersion: z.number().int().nullable(),
      publishedAt: z.string().nullable(),
      hasDraft: z.boolean(),
      itemCount: z.number().int(),
      activeStudents: z.number().int(),
    }),
  ),
});
export type CurriculaIndex = z.infer<typeof CurriculaIndex>;

export const CurriculumOverview = z.object({
  roleId: z.string(),
  bracketId: z.string(),
  published: CurriculumDto.nullable(),
  draft: CurriculumDto.nullable(),
  history: z.array(
    z.object({
      id: z.string(),
      version: z.number().int(),
      status: CurriculumStatus,
      publishedAt: z.string().nullable(),
      changeNote: z.string().nullable(),
      itemCount: z.number().int(),
    }),
  ),
  /** Students currently on this role × package. */
  activeStudents: z.number().int(),
});
export type CurriculumOverview = z.infer<typeof CurriculumOverview>;

export const SaveDraftBody = z.object({
  items: z.array(CurriculumItemBody).max(300),
  changeNote: z.string().trim().max(400).optional(),
});
export type SaveDraftBody = z.infer<typeof SaveDraftBody>;

export const PublishBody = z.object({ changeNote: Text(3, 400) });

export const PublishResponse = z.object({
  curriculum: CurriculumDto,
  /** Students who got an update proposal (they choose whether to accept it). */
  proposalsCreated: z.number().int(),
});
export type PublishResponse = z.infer<typeof PublishResponse>;

// ───────────── Student roadmap ─────────────

export const ItemStatus = z.enum(['DONE', 'IN_PROGRESS', 'DELAYED', 'UP_NEXT', 'UPCOMING']);
export type ItemStatus = z.infer<typeof ItemStatus>;

export const DepthRef = z.object({ rank: z.number().int(), name: z.string() });

export const RoadmapItemDto = z.object({
  subtopicId: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  topicId: z.string(),
  topicSlug: z.string(),
  sequence: z.number().int(),
  depth: DepthRef,
  priority: Priority,
  isOptional: z.boolean(),
  fastTrack: z.boolean(),
  estimatedMinutes: z.number().int(),
  plannedStart: IsoDate.nullable(),
  plannedEnd: IsoDate.nullable(),
  status: ItemStatus,
  objectives: z.array(z.string()),
});
export type RoadmapItemDto = z.infer<typeof RoadmapItemDto>;

export const RoadmapTopicDto = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  iconKey: z.string(),
  minutes: z.number().int(),
  plannedStart: IsoDate.nullable(),
  plannedEnd: IsoDate.nullable(),
  doneCount: z.number().int(),
  items: z.array(RoadmapItemDto),
});
export type RoadmapTopicDto = z.infer<typeof RoadmapTopicDto>;

export const FeasibilityDto = z.object({
  feasible: z.boolean(),
  deadline: IsoDate,
  daysOver: z.number().int(),
  options: z.object({
    increaseDailyTo: z.number().int().nullable(),
    extendDeadlineTo: IsoDate,
    skipOptional: z
      .object({ minutesSaved: z.number().int(), endDate: IsoDate.nullable(), fits: z.boolean() })
      .nullable(),
    addStudyDay: z
      .object({ weekday: z.number().int(), endDate: IsoDate, fits: z.boolean() })
      .nullable(),
  }),
});
export type FeasibilityDto = z.infer<typeof FeasibilityDto>;

const NamedChange = z.object({ subtopicId: z.string(), title: z.string() });
export const ChangeSummaryDto = z.object({
  added: z.array(NamedChange),
  removed: z.array(NamedChange),
  depthChanged: z.array(NamedChange.extend({ from: z.string(), to: z.string() })),
  minutesDelta: z.number().int(),
  endDateDeltaDays: z.number().int().nullable(),
});
export type ChangeSummaryDto = z.infer<typeof ChangeSummaryDto>;

export const RoadmapTrigger = z.enum(['INITIAL', 'SETTINGS_CHANGE', 'CURRICULUM_UPDATE', 'REPLAN']);

export const RoadmapVersionDto = z.object({
  id: z.string(),
  versionNumber: z.number().int(),
  trigger: RoadmapTrigger,
  createdAt: z.string(),
  totalMinutes: z.number().int(),
  plannedEndDate: IsoDate.nullable(),
  deadlineFeasible: z.boolean().nullable(),
  changeSummary: ChangeSummaryDto.nullable(),
});
export type RoadmapVersionDto = z.infer<typeof RoadmapVersionDto>;

/** One week of the plan (Monday to Sunday), for the week-by-week planner. */
export const WeekPlanDto = z.object({
  index: z.number().int(),
  start: IsoDate,
  end: IsoDate,
  minutes: z.number().int(),
  studyDays: z.number().int(),
  items: z.array(
    z.object({
      subtopicId: z.string(),
      title: z.string(),
      topicTitle: z.string(),
      minutes: z.number().int(),
      /** True in the week this subtopic is finished. */
      finishes: z.boolean(),
    }),
  ),
});
export type WeekPlanDto = z.infer<typeof WeekPlanDto>;

export const PaceKey = z.enum([
  'recommended',
  'just-in-time',
  'every-day',
  'light',
  'steady',
  'intensive',
]);
export type PaceKey = z.infer<typeof PaceKey>;

/** A suggested schedule the student can pick. Never applied without them saving. */
export const PaceDto = z.object({
  key: PaceKey,
  dailyMinutes: z.number().int(),
  studyWeekdays: z.array(z.number().int()),
  plannedEndDate: IsoDate.nullable(),
  /** Days between finishing and the deadline; null without a deadline. */
  daysToSpare: z.number().int().nullable(),
});
export type PaceDto = z.infer<typeof PaceDto>;

export const RoadmapTotals = z.object({
  totalMinutes: z.number().int(),
  remainingMinutes: z.number().int(),
  doneMinutes: z.number().int(),
  percentComplete: z.number().int(),
  plannedEndDate: IsoDate.nullable(),
  weeklyMinutes: z.number().int(),
  subtopics: z.number().int(),
  delayed: z.number().int(),
});
export type RoadmapTotals = z.infer<typeof RoadmapTotals>;

export const RoadmapResponse = z.object({
  /** READY · PENDING_CURRICULUM (nothing published yet for this target) · NO_GOAL */
  status: z.enum(['READY', 'PENDING_CURRICULUM', 'NO_GOAL']),
  roadmap: z
    .object({
      version: RoadmapVersionDto,
      totals: RoadmapTotals,
      feasibility: FeasibilityDto.nullable(),
      topics: z.array(RoadmapTopicDto),
      weeks: z.array(WeekPlanDto),
      /** Days between the planned finish and the deadline; null without a deadline. */
      daysToSpare: z.number().int().nullable(),
      nextUp: RoadmapItemDto.nullable(),
      role: z.object({ title: z.string(), colorKey: ColorKey, shortCode: z.string() }),
      bracket: z.object({ label: z.string(), availability: Availability }),
    })
    .nullable(),
  proposal: RoadmapVersionDto.nullable(),
});
export type RoadmapResponse = z.infer<typeof RoadmapResponse>;

/** What a schedule would mean for the target, before anything is saved. */
export const PlanPreview = z.object({
  /** The saved roadmap, when there is one, to compare with. */
  current: z
    .object({ plannedEndDate: IsoDate.nullable(), totalMinutes: z.number().int() })
    .nullable(),
  proposed: z.object({
    startDate: IsoDate,
    plannedEndDate: IsoDate.nullable(),
    totalMinutes: z.number().int(),
    weeklyMinutes: z.number().int(),
    studyDays: z.number().int(),
    subtopics: z.number().int(),
    topics: z.number().int(),
  }),
  feasibility: FeasibilityDto.nullable(),
  daysToSpare: z.number().int().nullable(),
  /** Days the recommended pace keeps free for revision before the deadline. */
  revisionDays: z.number().int().nullable(),
  paces: z.array(PaceDto),
  weeks: z.array(WeekPlanDto),
});
export type PlanPreview = z.infer<typeof PlanPreview>;

export const SchedulePreviewResponse = PlanPreview;
export type SchedulePreviewResponse = z.infer<typeof SchedulePreviewResponse>;

/** During onboarding there is no goal yet, so the choices so far are sent along. */
export const OnboardingPlanPreviewBody = z.object({
  roleId: z.uuid(),
  bracketId: z.uuid(),
  skills: SkillRatings.default({}),
  schedule: Schedule,
});
export const OnboardingPlanPreviewResponse = z.object({
  /** Null when no curriculum is published for this target yet. */
  preview: PlanPreview.nullable(),
});
export type OnboardingPlanPreviewResponse = z.infer<typeof OnboardingPlanPreviewResponse>;

export const TopicPageResponse = z.object({
  topic: z.object({
    id: z.string(),
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    iconKey: z.string(),
  }),
  items: z.array(
    RoadmapItemDto.extend({
      concepts: z.array(z.object({ key: z.string(), name: z.string() })),
      /** Null until a lesson for this subtopic is published. */
      lesson: LessonSummaryDto.nullable(),
    }),
  ),
  /** Plain-language reason for the depth, e.g. "8–12 LPA AI Engineer interviews go deeper here". */
  depthNote: z.string(),
  learn: z.object({
    available: z.boolean(),
    lessons: z.number().int(),
    completed: z.number().int(),
  }),
  practice: z.object({
    available: z.boolean(),
    questions: z.number().int(),
    notifyMe: z.boolean(),
  }),
});
export type TopicPageResponse = z.infer<typeof TopicPageResponse>;

export const SlugParam = z.object({ slug: Slug });
