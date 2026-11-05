import type { Logger } from 'pino';
import type { Env } from './config/env.ts';
import type { Db } from './db/prisma.ts';
import type { Mailer } from './mail/mailer.ts';
import type { JobQueue } from './modules/ai/job-queue.ts';
import type { PythonRunner } from './modules/ai/python-runner.ts';
import type { AiProvider } from './modules/ai/types.ts';
import type { GoogleOidcClient } from './modules/auth/google.ts';

/** Everything a service needs from the outside world. Built once per process (or per test). */
export interface AppContext {
  env: Env;
  db: Db;
  mailer: Mailer;
  log: Logger;
  /** Google Sign-In client, or null when Google credentials are not configured. */
  google: GoogleOidcClient | null;
  /** Injectable clock so expiry logic is testable. */
  now: () => Date;
  /** The AI provider for admin content agents, or null when AI is switched off. */
  ai: AiProvider | null;
  /** Runs AI-written Python in a sandbox to verify lesson code. */
  python: PythonRunner;
  /** Background jobs (pg-boss in the API and worker). */
  jobs: JobQueue;
}

/** Who/where a request came from, for sessions and the audit log. */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}
