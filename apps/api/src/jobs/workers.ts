import type { PgBoss } from 'pg-boss';
import type { AppContext } from '../context.ts';
import type { MailMessage } from '../mail/mailer.ts';
import { runAgentJob } from '../modules/content/agents/run-job.ts';
import { deliverMail } from './mail.job.ts';
import { purgeExpiredAuthRecords } from './maintenance.ts';
import { QUEUES } from './queues.ts';

/**
 * Starts the background work: email delivery, the AI content agents and the nightly clean-up.
 * The worker process runs it; the API runs it too when RUN_JOBS_IN_API is on, so a small
 * deployment needs one server instead of two. `ctx.mailer` must deliver directly (SMTP), never
 * back into the queue.
 */
export async function startWorkers(boss: PgBoss, ctx: AppContext, mailer = ctx.mailer) {
  await boss.schedule(QUEUES.purgeAuth.name, '17 3 * * *', null, { tz: 'Asia/Kolkata' });

  await boss.work<MailMessage>(QUEUES.mail.name, async (jobs) =>
    deliverMail(jobs, mailer, ctx.log),
  );

  // AI content agents: up to two jobs of each kind at once. Each job records its own state,
  // so a failure is reported to the admin instead of being retried.
  for (const q of [QUEUES.aiGenerate, QUEUES.aiEvaluate, QUEUES.aiRewrite]) {
    await boss.work<{ jobId: string }>(q.name, { localConcurrency: 2 }, async (jobs) => {
      for (const job of jobs) await runAgentJob(ctx, job.data.jobId);
    });
  }

  await boss.work(QUEUES.purgeAuth.name, async () => {
    const result = await purgeExpiredAuthRecords(ctx);
    ctx.log.info(result, 'purged expired auth records');
    return result;
  });

  ctx.log.info(
    { queues: Object.values(QUEUES).map((q) => q.name), ai: ctx.ai?.name ?? 'off' },
    'background jobs started',
  );
}
