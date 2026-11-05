/** The provider-neutral surface every AI call goes through (docs/06 §1). */

export const AI_TASKS = [
  'LESSON_PLAN',
  'LESSON_DRAFT',
  'LESSON_EVALUATION',
  'SECTION_REWRITE',
] as const;
export type AiTask = (typeof AI_TASKS)[number];

export const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type Effort = (typeof EFFORTS)[number];

export interface AiCallRequest {
  task: AiTask;
  model: string;
  effort: Effort;
  maxTokens: number;
  /** Stable instructions first (cached), then anything that varies per call goes in `user`. */
  system: Array<{ text: string; cache?: boolean }>;
  user: string;
  /** JSON Schema the response must follow (structured outputs). */
  jsonSchema: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export interface AiCallResult {
  /** The JSON text the model returned. */
  text: string;
  /** The model that actually answered (a refusal fallback may switch it). */
  model: string;
  usage: AiUsage;
  stopReason: string;
}

export interface AiProvider {
  readonly name: 'anthropic' | 'simulated';
  call(req: AiCallRequest): Promise<AiCallResult>;
}

export type AiErrorKind =
  | 'not_configured'
  | 'refused'
  | 'truncated'
  | 'invalid_output'
  | 'budget'
  | 'cancelled'
  | 'provider';

/** A failure an admin can act on. The message is safe to show (never contains keys). */
export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}
