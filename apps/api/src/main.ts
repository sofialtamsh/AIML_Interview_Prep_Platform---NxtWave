import { buildApp } from './app.ts';
import { createAppContext } from './bootstrap.ts';
import { env } from './config/env.ts';
import { createBoss, ensureQueues, QUEUES } from './jobs/queues.ts';
import { startWorkers } from './jobs/workers.ts';
import { QueuedMailer, SmtpMailer } from './mail/mailer.ts';
import { BossJobQueue } from './modules/ai/job-queue.ts';

// Email goes through the job queue so no request ever waits on SMTP.
const boss = createBoss(env, env.RUN_JOBS_IN_API ? 'api-with-jobs' : 'api');
await boss.start();
await ensureQueues(boss);

const ctx = createAppContext('api', {
  mailer: new QueuedMailer(boss, QUEUES.mail.name),
  jobs: new BossJobQueue(boss),
});
boss.on('error', (err) => ctx.log.error({ err }, 'pg-boss error'));
const app = await buildApp(ctx);
// One-server deployments process the queues here too; the jobs deliver email over SMTP directly.
if (env.RUN_JOBS_IN_API) await startWorkers(boss, ctx, new SmtpMailer(env));

const shutdown = async (signal: string) => {
  ctx.log.info({ signal }, 'shutting down');
  await app.close();
  await boss.stop({ graceful: true });
  await ctx.db.$disconnect();
  process.exit(0);
};
process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await app.listen({ host: ctx.env.API_HOST, port: ctx.env.API_PORT });
} catch (err) {
  ctx.log.fatal({ err }, 'failed to start api');
  process.exit(1);
}
