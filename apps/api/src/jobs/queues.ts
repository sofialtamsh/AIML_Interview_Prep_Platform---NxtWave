import { PgBoss } from 'pg-boss';
import type { Env } from '../config/env.ts';

/** Every background queue, with its retry and retention policy, in one place. */
export const QUEUES = {
  /** Transactional email. Sent by the worker so user actions never wait on SMTP. */
  mail: {
    name: 'mail.send',
    options: {
      retryLimit: 5,
      retryDelay: 30,
      retryBackoff: true,
      expireInSeconds: 120,
      // Payloads contain single-use links: drop them soon after delivery.
      deleteAfterSeconds: 3600,
    },
  },
  purgeAuth: {
    name: 'maintenance.purge-auth',
    options: { retryLimit: 2 },
  },
  // AI content agents. Never retried automatically (an admin decides, and retries cost money);
  // a lesson can take several minutes to write.
  aiGenerate: {
    name: 'ai.lesson.generate',
    options: { retryLimit: 0, expireInSeconds: 3600, deleteAfterSeconds: 7 * 86_400 },
  },
  aiEvaluate: {
    name: 'ai.lesson.evaluate',
    options: { retryLimit: 0, expireInSeconds: 1800, deleteAfterSeconds: 7 * 86_400 },
  },
  aiRewrite: {
    name: 'ai.section.rewrite',
    options: { retryLimit: 0, expireInSeconds: 1800, deleteAfterSeconds: 7 * 86_400 },
  },
} as const;

/**
 * The API only *enqueues* (no scheduling/supervision); the worker processes and schedules.
 * Both run pg-boss's idempotent schema migration on start.
 */
export function createBoss(env: Env, role: 'api' | 'worker') {
  return new PgBoss({
    connectionString: env.DATABASE_URL,
    application_name: `nwp-${role}`,
    ...(role === 'api' ? { schedule: false, supervise: false } : {}),
  });
}

export async function ensureQueues(boss: PgBoss) {
  for (const q of Object.values(QUEUES)) {
    await boss.createQueue(q.name, q.options);
  }
}
