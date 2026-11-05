import type { AgentJobDto } from '@app/contracts';
import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';
import type { AgentJobType } from '../../generated/prisma/enums.ts';
import { isUniqueViolation } from '../../lib/db-errors.ts';
import { AppError, notFound } from '../../lib/errors.ts';
import type { JobMeter } from './gateway.ts';
import { AiError, type AiUsage } from './types.ts';

type JobRow = Prisma.AgentJobGetPayload<object>;

const ACTIVE = ['QUEUED', 'RUNNING'] as const;

/** Creates, tracks and cancels AI jobs. The worker executes them (run-job.ts). */
export class AgentJobService {
  constructor(private readonly ctx: AppContext) {}

  private get db() {
    return this.ctx.db;
  }

  /** Records the job and queues it. One generation per lesson and one rewrite per step at a time. */
  async create(opts: {
    type: AgentJobType;
    queue: string;
    input: Prisma.InputJsonValue;
    subtopicId?: string | null;
    moduleVersionId?: string | null;
    sectionKey?: string | null;
    parentJobId?: string | null;
    createdById?: string | null;
  }): Promise<AgentJobDto> {
    let job: JobRow;
    try {
      job = await this.db.agentJob.create({
        data: {
          type: opts.type,
          input: opts.input,
          subtopicId: opts.subtopicId ?? null,
          moduleVersionId: opts.moduleVersionId ?? null,
          sectionKey: opts.sectionKey ?? null,
          parentJobId: opts.parentJobId ?? null,
          createdById: opts.createdById ?? null,
          budgetUsd: this.ctx.env.AI_JOB_BUDGET_USD,
          stage: 'Waiting to start',
        },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError(
          'CONFLICT',
          opts.type === 'SECTION_REWRITE'
            ? 'This step is already being rewritten. Wait for it to finish.'
            : 'AI is already writing this lesson. Wait for it to finish or cancel it.',
        );
      }
      throw err;
    }
    await this.db.agentJobLog.create({ data: { jobId: job.id, level: 'info', message: 'Queued' } });
    try {
      await this.ctx.jobs.enqueue(opts.queue, { jobId: job.id });
    } catch (err) {
      await this.fail(job.id, 'Could not queue the job. Is the worker running?');
      throw err;
    }
    return this.get(job.id);
  }

  async get(id: string, opts: { logs?: boolean } = { logs: true }): Promise<AgentJobDto> {
    const job = await this.db.agentJob.findUnique({
      where: { id },
      include: {
        logs: opts.logs ? { orderBy: { id: 'desc' }, take: 200 } : false,
        children: { select: { id: true, type: true, status: true } },
      },
    });
    if (!job) throw notFound('That AI job');
    return toDto(job);
  }

  async list(filter: { subtopicId?: string; moduleVersionId?: string; limit?: number }) {
    const rows = await this.db.agentJob.findMany({
      where: {
        ...(filter.subtopicId ? { subtopicId: filter.subtopicId } : {}),
        ...(filter.moduleVersionId ? { moduleVersionId: filter.moduleVersionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filter.limit ?? 20, 100),
      include: { children: { select: { id: true, type: true, status: true } } },
    });
    return rows.map((r) => toDto(r));
  }

  /** Queued jobs stop at once; running ones stop at their next checkpoint. */
  async cancel(id: string): Promise<AgentJobDto> {
    const job = await this.db.agentJob.findUnique({ where: { id } });
    if (!job) throw notFound('That AI job');
    if (job.status === 'QUEUED') {
      await this.db.agentJob.updateMany({
        where: { id, status: 'QUEUED' },
        data: {
          status: 'CANCELLED',
          cancelRequested: true,
          finishedAt: this.ctx.now(),
          stage: 'Cancelled',
        },
      });
    } else if (job.status === 'RUNNING') {
      await this.db.agentJob.update({ where: { id }, data: { cancelRequested: true } });
      await this.log(id, 'warn', 'Cancel requested; stopping at the next checkpoint');
    }
    return this.get(id);
  }

  /** Claims a queued job for the worker. Null when it was cancelled or already handled. */
  async start(id: string): Promise<JobRow | null> {
    const claimed = await this.db.agentJob.updateMany({
      where: { id, status: 'QUEUED', cancelRequested: false },
      data: { status: 'RUNNING', startedAt: this.ctx.now(), stage: 'Starting' },
    });
    if (claimed.count === 0) return null;
    return this.db.agentJob.findUniqueOrThrow({ where: { id } });
  }

  async finish(id: string, output: Prisma.InputJsonValue) {
    await this.db.agentJob.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        output,
        progress: 100,
        stage: 'Done',
        finishedAt: this.ctx.now(),
      },
    });
    await this.log(id, 'info', 'Done');
  }

  async fail(id: string, error: string, details?: unknown) {
    await this.db.agentJob.update({
      where: { id },
      data: {
        status: 'FAILED',
        error: error.slice(0, 2000),
        finishedAt: this.ctx.now(),
        stage: 'Failed',
      },
    });
    await this.log(id, 'error', error, details);
  }

  async cancelled(id: string) {
    await this.db.agentJob.update({
      where: { id },
      data: { status: 'CANCELLED', finishedAt: this.ctx.now(), stage: 'Cancelled' },
    });
    await this.log(id, 'warn', 'Cancelled');
  }

  async log(id: string, level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    await this.db.agentJobLog.create({
      data: {
        jobId: id,
        level,
        message: message.slice(0, 2000),
        ...(data === undefined
          ? {}
          : { data: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue }),
      },
    });
  }
}

/** A running job, as the agents see it: progress, logs, budget and cancellation. */
export class JobRun implements JobMeter {
  readonly jobId: string;
  private readonly controller = new AbortController();
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly service: AgentJobService;
  private cost: number;
  private readonly budget: number;

  constructor(
    private readonly ctx: AppContext,
    job: JobRow,
  ) {
    this.jobId = job.id;
    this.cost = job.costUsd;
    this.budget = job.budgetUsd;
    this.service = new AgentJobService(ctx);
    // Watch for a cancel request so long AI calls are aborted, not just skipped afterwards.
    this.timer = setInterval(() => {
      void ctx.db.agentJob
        .findUnique({ where: { id: job.id }, select: { cancelRequested: true } })
        .then((j) => {
          if (j?.cancelRequested) this.controller.abort();
        })
        .catch(() => undefined);
    }, 2000);
    this.timer.unref?.();
  }

  get signal() {
    return this.controller.signal;
  }

  get spentUsd() {
    return this.cost;
  }

  async ensureActive() {
    const j = await this.ctx.db.agentJob.findUnique({
      where: { id: this.jobId },
      select: { cancelRequested: true },
    });
    if (j?.cancelRequested || this.controller.signal.aborted) {
      this.controller.abort();
      throw new AiError('cancelled', 'The job was cancelled.');
    }
  }

  async charge(costUsd: number, usage: AiUsage) {
    this.cost += costUsd;
    await this.ctx.db.agentJob.update({
      where: { id: this.jobId },
      data: {
        costUsd: { increment: costUsd },
        inputTokens: {
          increment: usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens,
        },
        outputTokens: { increment: usage.outputTokens },
      },
    });
    if (this.cost > this.budget) {
      throw new AiError(
        'budget',
        `Stopped: this job has spent $${this.cost.toFixed(2)}, over its $${this.budget.toFixed(2)} budget (AI_JOB_BUDGET_USD).`,
      );
    }
  }

  async log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    await this.service.log(this.jobId, level, message, data);
  }

  async stage(stage: string, progress: number) {
    await this.ctx.db.agentJob.update({
      where: { id: this.jobId },
      data: { stage, progress: Math.max(0, Math.min(99, Math.round(progress))) },
    });
    await this.log('info', stage);
  }

  dispose() {
    clearInterval(this.timer);
  }
}

function toDto(
  job: JobRow & {
    logs?: Array<{ level: string; message: string; data: unknown; createdAt: Date }>;
    children?: Array<{ id: string; type: AgentJobType; status: string }>;
  },
): AgentJobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    subtopicId: job.subtopicId,
    moduleVersionId: job.moduleVersionId,
    sectionKey: job.sectionKey,
    error: job.error,
    output: (job.output ?? null) as AgentJobDto['output'],
    costUsd: Math.round(job.costUsd * 10_000) / 10_000,
    budgetUsd: job.budgetUsd,
    inputTokens: job.inputTokens,
    outputTokens: job.outputTokens,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    children: (job.children ?? []).map((c) => ({
      id: c.id,
      type: c.type,
      status: c.status as AgentJobDto['status'],
    })),
    logs: (job.logs ?? [])
      .slice()
      .reverse()
      .map((l) => ({
        level: l.level as 'info' | 'warn' | 'error',
        message: l.message,
        createdAt: l.createdAt.toISOString(),
      })),
  };
}

export const isActive = (status: string) => (ACTIVE as readonly string[]).includes(status);
