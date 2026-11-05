/** Executes one AI job (called by the worker for each queued job, and by tests). */
import type { AppContext } from '../../../context.ts';
import type { Prisma } from '../../../db/prisma.ts';
import { AppError } from '../../../lib/errors.ts';
import { AgentJobService, JobRun } from '../../ai/jobs.service.ts';
import { AiError } from '../../ai/types.ts';
import { evaluateLesson } from './evaluate.agent.ts';
import { type GenerateInput, generateLesson } from './generate.agent.ts';
import { type RewriteInput, rewriteSection } from './rewrite.agent.ts';

export async function runAgentJob(ctx: AppContext, jobId: string): Promise<void> {
  const jobs = new AgentJobService(ctx);
  const job = await jobs.start(jobId);
  if (!job) return; // cancelled before it started, or already handled
  const run = new JobRun(ctx, job);
  try {
    const input = job.input as Record<string, unknown>;
    const output =
      job.type === 'LESSON_GENERATION'
        ? await generateLesson(ctx, run, input as unknown as GenerateInput)
        : job.type === 'LESSON_EVALUATION'
          ? await evaluateLesson(ctx, run, input as { moduleVersionId: string })
          : await rewriteSection(ctx, run, input as unknown as RewriteInput);
    await jobs.finish(jobId, output as unknown as Prisma.InputJsonValue);
  } catch (err) {
    if (err instanceof AiError && err.kind === 'cancelled') {
      await jobs.cancelled(jobId);
    } else if (err instanceof AiError || err instanceof AppError) {
      await jobs.fail(jobId, err.message, err instanceof AiError ? err.details : err.details);
    } else {
      ctx.log.error({ err, jobId }, 'AI job crashed');
      await jobs.fail(jobId, 'The job hit an unexpected error. The details are in the server log.');
    }
  } finally {
    run.dispose();
  }
}
