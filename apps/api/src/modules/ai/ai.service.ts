import type { AiStatusResponse } from '@app/contracts';
import type { AppContext } from '../../context.ts';
import { AppError } from '../../lib/errors.ts';
import { AuditService } from '../audit/audit.service.ts';
import { AgentJobService } from './jobs.service.ts';
import { ALLOWED_MODELS, DEFAULT_ROUTES } from './models.ts';
import { AI_TASKS, type AiTask, type Effort } from './types.ts';

const DAY = 86_400_000;

/** AI settings and usage for the admin console. Never reveals a key. */
export class AiService {
  constructor(private readonly ctx: AppContext) {}

  async status(): Promise<AiStatusResponse> {
    const db = this.ctx.db;
    const now = this.ctx.now().getTime();
    const [routes, pricing, byTask, recent] = await Promise.all([
      db.aiModelRoute.findMany(),
      db.aiModelPricing.findMany({ orderBy: { model: 'asc' } }),
      db.aiUsageRecord.groupBy({
        by: ['task'],
        where: { createdAt: { gte: new Date(now - 30 * DAY) } },
        _count: { _all: true },
        _sum: { costUsd: true },
      }),
      new AgentJobService(this.ctx).list({ limit: 10 }),
    ]);
    const usage = await Promise.all(
      (
        [
          ['today', 1],
          ['7d', 7],
          ['30d', 30],
        ] as const
      ).map(async ([period, days]) => {
        const where = { createdAt: { gte: new Date(now - days * DAY) } };
        const [agg, failed] = await Promise.all([
          db.aiUsageRecord.aggregate({
            where,
            _count: { _all: true },
            _sum: { costUsd: true, inputTokens: true, outputTokens: true, cacheReadTokens: true },
          }),
          db.aiUsageRecord.count({ where: { ...where, status: { not: 'OK' } } }),
        ]);
        return {
          period,
          calls: agg._count._all,
          costUsd: Math.round((agg._sum.costUsd ?? 0) * 10_000) / 10_000,
          inputTokens: (agg._sum.inputTokens ?? 0) + (agg._sum.cacheReadTokens ?? 0),
          outputTokens: agg._sum.outputTokens ?? 0,
          failed,
        };
      }),
    );
    const routeOf = (task: AiTask) => {
      const r = routes.find((x) => x.task === task);
      return r
        ? { task, model: r.model, effort: r.effort as Effort, maxTokens: r.maxTokens }
        : { task, ...DEFAULT_ROUTES[task] };
    };
    return {
      provider: this.ctx.ai?.name ?? null,
      keyConfigured: Boolean(this.ctx.env.ANTHROPIC_API_KEY),
      budgetUsd: this.ctx.env.AI_JOB_BUDGET_USD,
      models: [...ALLOWED_MODELS],
      routes: AI_TASKS.map(routeOf),
      pricing: pricing.map((p) => ({
        model: p.model,
        inputPerMTok: p.inputPerMTok,
        outputPerMTok: p.outputPerMTok,
        cacheReadPerMTok: p.cacheReadPerMTok,
        cacheWritePerMTok: p.cacheWritePerMTok,
      })),
      usage,
      byTask: byTask.map((t) => ({
        task: t.task,
        calls: t._count._all,
        costUsd: Math.round((t._sum.costUsd ?? 0) * 10_000) / 10_000,
      })),
      recentJobs: recent.map(({ logs: _logs, ...rest }) => rest),
    };
  }

  async updateRoute(
    task: AiTask,
    body: { model: string; effort: Effort; maxTokens: number },
    actor: { id: string; ip: string | null },
  ) {
    if (!(ALLOWED_MODELS as readonly string[]).includes(body.model)) {
      throw new AppError('VALIDATION_ERROR', `Choose one of: ${ALLOWED_MODELS.join(', ')}`, {
        fields: { model: 'Not an allowed model' },
      });
    }
    const before = await this.ctx.db.aiModelRoute.findUnique({ where: { task } });
    await this.ctx.db.aiModelRoute.upsert({
      where: { task },
      create: { task, ...body, updatedById: actor.id },
      update: { ...body, updatedById: actor.id },
    });
    await new AuditService(this.ctx).record({
      actorId: actor.id,
      action: 'ai.route.updated',
      entityType: 'ai_model_route',
      entityId: task,
      before: before
        ? { model: before.model, effort: before.effort, maxTokens: before.maxTokens }
        : undefined,
      after: body,
      ip: actor.ip,
    });
    return this.status();
  }
}
