import { env } from './config/env.ts';
import type { AppContext } from './context.ts';
import { createDb } from './db/prisma.ts';
import { createLogger } from './lib/logger.ts';
import { type Mailer, SmtpMailer } from './mail/mailer.ts';
import { createAiProvider } from './modules/ai/create-provider.ts';
import { type JobQueue, noJobQueue } from './modules/ai/job-queue.ts';
import { SandboxedPythonRunner } from './modules/ai/python-runner.ts';
import { GoogleOidc } from './modules/auth/google.ts';

/**
 * Production wiring of the app context (real DB, logger, clock).
 * The API passes a queue-backed mailer; CLIs and the worker send over SMTP directly.
 */
export function createAppContext(
  name: string,
  opts: { mailer?: Mailer; jobs?: JobQueue } = {},
): AppContext {
  return {
    env,
    db: createDb(env.DATABASE_URL),
    mailer: opts.mailer ?? new SmtpMailer(env),
    log: createLogger(env, name),
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? new GoogleOidc(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET)
        : null,
    now: () => new Date(),
    ai: createAiProvider(env),
    python: new SandboxedPythonRunner({ cacheDir: env.PYODIDE_CACHE_DIR }),
    jobs: opts.jobs ?? noJobQueue,
  };
}
