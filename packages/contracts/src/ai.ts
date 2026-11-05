/** Admin-only AI: content agents, their jobs, settings and usage. Students never see these. */
import { EVAL_DIMENSIONS, STYLE_KEYS } from '@app/content';
import { z } from 'zod';

export const StyleKey = z.enum(STYLE_KEYS);
export type StyleKey = z.infer<typeof StyleKey>;

export const AgentJobType = z.enum(['LESSON_GENERATION', 'LESSON_EVALUATION', 'SECTION_REWRITE']);
export const AgentJobStatus = z.enum(['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED']);
export type AgentJobStatus = z.infer<typeof AgentJobStatus>;

export const AgentJobDto = z.object({
  id: z.string(),
  type: AgentJobType,
  status: AgentJobStatus,
  stage: z.string().nullable(),
  progress: z.number().int(),
  subtopicId: z.string().nullable(),
  moduleVersionId: z.string().nullable(),
  sectionKey: z.string().nullable(),
  error: z.string().nullable(),
  output: z.record(z.string(), z.unknown()).nullable(),
  costUsd: z.number(),
  budgetUsd: z.number(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  children: z.array(z.object({ id: z.string(), type: AgentJobType, status: AgentJobStatus })),
  logs: z.array(
    z.object({
      level: z.enum(['info', 'warn', 'error']),
      message: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type AgentJobDto = z.infer<typeof AgentJobDto>;

export const AgentJobList = z.object({ jobs: z.array(AgentJobDto) });
export const AgentJobQuery = z.object({
  subtopicId: z.uuid().optional(),
  moduleVersionId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const GenerateLessonBody = z.object({
  style: StyleKey.default('genz'),
  /** Extra direction from the content team, e.g. "use a cricket example". */
  instructions: z.string().trim().max(2000).optional(),
});
export type GenerateLessonBody = z.input<typeof GenerateLessonBody>;

export const REWRITE_PRESET_KEYS = [
  'shorter',
  'simpler',
  'genz',
  'analogy',
  'example',
  'interactive',
  'fix',
] as const;
export const RewritePreset = z.enum(REWRITE_PRESET_KEYS);
export type RewritePreset = z.infer<typeof RewritePreset>;

export const RewriteSectionBody = z
  .object({
    presets: z.array(RewritePreset).max(4).default([]),
    instruction: z.string().trim().max(1000).optional(),
    /** The revision the admin was looking at; the rewrite is refused if the step changed since. */
    revisionId: z.uuid(),
  })
  .refine((b) => b.presets.length > 0 || Boolean(b.instruction), {
    message: 'Pick at least one change or describe it',
    path: ['instruction'],
  });
export type RewriteSectionBody = z.input<typeof RewriteSectionBody>;

export const EvaluateBody = z.object({});

export const EvaluationDto = z.object({
  id: z.string(),
  moduleVersionId: z.string(),
  model: z.string(),
  verdict: z.enum(['READY_FOR_REVIEW', 'NEEDS_CHANGES', 'BLOCKING_ISSUES']),
  overall: z.number(),
  scores: z.array(
    z.object({ dimension: z.enum(EVAL_DIMENSIONS), score: z.number().int(), reason: z.string() }),
  ),
  issues: z.array(
    z.object({
      sectionKey: z.string(),
      severity: z.enum(['blocking', 'major', 'minor']),
      dimension: z.enum(EVAL_DIMENSIONS),
      problem: z.string(),
      suggestion: z.string(),
      source: z.enum(['ai', 'check']),
    }),
  ),
  summary: z.string(),
  metrics: z.object({
    style: StyleKey,
    readability: z.array(
      z.object({
        sectionKey: z.string(),
        words: z.number().int(),
        sentences: z.number().int(),
        avgSentenceWords: z.number(),
        longestSentenceWords: z.number().int(),
        emoji: z.number().int(),
      }),
    ),
    styleIssues: z.array(
      z.object({ sectionKey: z.string(), rule: z.string(), message: z.string() }),
    ),
    codeChecks: z.array(
      z.object({
        sectionKey: z.string(),
        target: z.string(),
        status: z.enum(['ok', 'warning', 'failed']),
        message: z.string(),
      }),
    ),
  }),
  createdAt: z.string(),
});
export type EvaluationDto = z.infer<typeof EvaluationDto>;

export const EvaluationResponse = z.object({
  evaluation: EvaluationDto.nullable(),
  /** The latest evaluation job for this version (to show progress). */
  job: AgentJobDto.nullable(),
});
export type EvaluationResponse = z.infer<typeof EvaluationResponse>;

export const AI_TASK_KEYS = [
  'LESSON_PLAN',
  'LESSON_DRAFT',
  'LESSON_EVALUATION',
  'SECTION_REWRITE',
] as const;
export const AiTaskKey = z.enum(AI_TASK_KEYS);
export const EffortKey = z.enum(['low', 'medium', 'high', 'xhigh', 'max']);

export const AiStatusResponse = z.object({
  /** Null when AI is off (no key). Never includes the key itself. */
  provider: z.enum(['anthropic', 'simulated']).nullable(),
  keyConfigured: z.boolean(),
  budgetUsd: z.number(),
  models: z.array(z.string()),
  routes: z.array(
    z.object({
      task: AiTaskKey,
      model: z.string(),
      effort: EffortKey,
      maxTokens: z.number().int(),
    }),
  ),
  pricing: z.array(
    z.object({
      model: z.string(),
      inputPerMTok: z.number(),
      outputPerMTok: z.number(),
      cacheReadPerMTok: z.number(),
      cacheWritePerMTok: z.number(),
    }),
  ),
  usage: z.array(
    z.object({
      period: z.enum(['today', '7d', '30d']),
      calls: z.number().int(),
      costUsd: z.number(),
      inputTokens: z.number().int(),
      outputTokens: z.number().int(),
      failed: z.number().int(),
    }),
  ),
  byTask: z.array(z.object({ task: z.string(), calls: z.number().int(), costUsd: z.number() })),
  recentJobs: z.array(AgentJobDto.omit({ logs: true })),
});
export type AiStatusResponse = z.infer<typeof AiStatusResponse>;

export const AiRouteBody = z.object({
  model: z.string().min(1).max(80),
  effort: EffortKey,
  maxTokens: z.number().int().min(1024).max(128_000),
});
export const AiTaskParam = z.object({ task: AiTaskKey });
