import type { z } from 'zod';
import type { AppContext } from '../../context.ts';
import { DEFAULT_PRICING, DEFAULT_ROUTES, type Route } from './models.ts';
import {
  type AiCallResult,
  AiError,
  type AiProvider,
  type AiTask,
  type AiUsage,
  type Effort,
} from './types.ts';

export interface PromptRef {
  key: string;
  version: number;
}

export interface Problem {
  path: string;
  message: string;
}

/** What a running job lets the gateway do: spend within budget, stop when cancelled. */
export interface JobMeter {
  readonly jobId: string;
  readonly signal: AbortSignal;
  /** Throws when the job was cancelled. */
  ensureActive(): Promise<void>;
  /** Records spend; throws when the job's budget is exceeded. */
  charge(costUsd: number, usage: AiUsage): Promise<void>;
  log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): Promise<void>;
}

export interface RunOptions<T> {
  task: AiTask;
  prompt: PromptRef;
  system: Array<{ text: string; cache?: boolean }>;
  user: string;
  schema: z.ZodType<T>;
  jsonSchema: Record<string, unknown>;
  /** Extra rules beyond the schema (e.g. "exactly these step keys"). */
  check?: (value: T) => Problem[];
  job?: JobMeter;
}

const MAX_PROBLEMS_SHOWN = 40;

/**
 * Every AI call goes through here (docs/06 §1): route → provider → parse → validate →
 * one repair → usage record. Agents never talk to a provider directly.
 */
export class AiGateway {
  constructor(private readonly ctx: AppContext) {}

  get provider(): AiProvider | null {
    return this.ctx.ai;
  }

  async route(task: AiTask): Promise<Route> {
    const row = await this.ctx.db.aiModelRoute.findUnique({ where: { task } });
    return row
      ? { model: row.model, effort: row.effort as Effort, maxTokens: row.maxTokens }
      : DEFAULT_ROUTES[task];
  }

  async run<T>(opts: RunOptions<T>): Promise<T> {
    const provider = this.ctx.ai;
    if (!provider) {
      throw new AiError(
        'not_configured',
        'AI generation is switched off. Add ANTHROPIC_API_KEY to the server environment.',
      );
    }
    const route = await this.route(opts.task);
    const model = provider.name === 'simulated' ? 'simulated' : route.model;

    const first = await this.attempt(provider, { ...opts, model, route, user: opts.user });
    const firstProblems = this.problemsOf(first.parsed, opts);
    if (firstProblems.ok) return firstProblems.value;

    await opts.job?.log(
      'warn',
      `The ${label(opts.task)} needed a fix: ${firstProblems.problems.length} problem(s)`,
      {
        problems: firstProblems.problems.slice(0, 10),
      },
    );
    // One repair: show the model its own output and exactly what failed.
    const repairUser = `${opts.user}

<previous_attempt>
${first.result.text}
</previous_attempt>

<problems_to_fix>
${firstProblems.problems
  .slice(0, MAX_PROBLEMS_SHOWN)
  .map((p) => `- ${p.path}: ${p.message}`)
  .join('\n')}
</problems_to_fix>

Your previous attempt (above) failed these checks. Return a complete corrected version that fixes every problem and keeps everything else that was good.`;
    const second = await this.attempt(provider, { ...opts, model, route, user: repairUser });
    const secondProblems = this.problemsOf(second.parsed, opts);
    if (secondProblems.ok) return secondProblems.value;
    throw new AiError(
      'invalid_output',
      `The AI's ${label(opts.task)} still had ${secondProblems.problems.length} problem(s) after one repair.`,
      { problems: secondProblems.problems.slice(0, MAX_PROBLEMS_SHOWN) },
    );
  }

  private async attempt<T>(
    provider: AiProvider,
    opts: RunOptions<T> & { model: string; route: Route },
  ): Promise<{ result: AiCallResult; parsed: unknown }> {
    await opts.job?.ensureActive();
    const started = Date.now();
    let result: AiCallResult;
    try {
      result = await provider.call({
        task: opts.task,
        model: opts.model,
        effort: opts.route.effort,
        maxTokens: opts.route.maxTokens,
        system: opts.system,
        user: opts.user,
        jsonSchema: opts.jsonSchema,
        signal: opts.job?.signal,
      });
    } catch (err) {
      const e = err instanceof AiError ? err : new AiError('provider', String(err));
      await this.record(provider, opts, {
        model: opts.model,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        latencyMs: Date.now() - started,
        status: e.kind === 'refused' ? 'REFUSED' : 'ERROR',
        error: e.message,
      });
      throw e;
    }
    const cost = await this.record(provider, opts, {
      model: result.model,
      usage: result.usage,
      latencyMs: Date.now() - started,
      status: 'OK',
    });
    await opts.job?.charge(cost, result.usage);
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      parsed = undefined;
    }
    return { result, parsed };
  }

  private problemsOf<T>(
    parsed: unknown,
    opts: RunOptions<T>,
  ): { ok: true; value: T } | { ok: false; problems: Problem[] } {
    if (parsed === undefined) {
      return {
        ok: false,
        problems: [{ path: '(output)', message: 'The output was not valid JSON' }],
      };
    }
    const r = opts.schema.safeParse(parsed);
    if (!r.success) {
      return {
        ok: false,
        problems: r.error.issues.map((i) => ({
          path: i.path.map(String).join('.') || '(output)',
          message: i.message,
        })),
      };
    }
    const extra = opts.check?.(r.data) ?? [];
    return extra.length ? { ok: false, problems: extra } : { ok: true, value: r.data };
  }

  /** One usage row per call, priced from the model table. Returns the cost. */
  private async record<T>(
    provider: AiProvider,
    opts: RunOptions<T>,
    call: {
      model: string;
      usage: AiUsage;
      latencyMs: number;
      status: 'OK' | 'ERROR' | 'REFUSED';
      error?: string;
    },
  ): Promise<number> {
    const cost = await this.costOf(call.model, call.usage);
    await this.ctx.db.aiUsageRecord.create({
      data: {
        jobId: opts.job?.jobId ?? null,
        task: opts.task,
        provider: provider.name,
        model: call.model,
        promptKey: opts.prompt.key,
        promptVersion: opts.prompt.version,
        inputTokens: call.usage.inputTokens,
        outputTokens: call.usage.outputTokens,
        cacheReadTokens: call.usage.cacheReadTokens,
        cacheWriteTokens: call.usage.cacheWriteTokens,
        costUsd: cost,
        latencyMs: call.latencyMs,
        status: call.status,
        error: call.error ?? null,
      },
    });
    return cost;
  }

  async costOf(model: string, u: AiUsage): Promise<number> {
    const row = await this.ctx.db.aiModelPricing.findUnique({ where: { model } });
    const p = row
      ? {
          input: row.inputPerMTok,
          output: row.outputPerMTok,
          cacheRead: row.cacheReadPerMTok,
          cacheWrite: row.cacheWritePerMTok,
        }
      : (DEFAULT_PRICING[model] ?? null);
    if (!p) return 0;
    return (
      (u.inputTokens * p.input +
        u.outputTokens * p.output +
        u.cacheReadTokens * p.cacheRead +
        u.cacheWriteTokens * p.cacheWrite) /
      1_000_000
    );
  }
}

const label = (task: AiTask) =>
  ({
    LESSON_PLAN: 'lesson plan',
    LESSON_DRAFT: 'lesson steps',
    LESSON_EVALUATION: 'evaluation',
    SECTION_REWRITE: 'rewritten step',
  })[task];
