import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from '../src/app.ts';
import { env } from '../src/config/env.ts';
import type { AppContext } from '../src/context.ts';
import { createDb, type Db } from '../src/db/prisma.ts';
import { createLogger } from '../src/lib/logger.ts';
import { hashPassword } from '../src/lib/password.ts';
import { MemoryMailer } from '../src/mail/mailer.ts';
import { MemoryJobQueue } from '../src/modules/ai/job-queue.ts';
import { type PythonRunner, SandboxedPythonRunner } from '../src/modules/ai/python-runner.ts';
import type { AiProvider } from '../src/modules/ai/types.ts';
import type { GoogleOidcClient } from '../src/modules/auth/google.ts';

export const STUDENT_ORIGIN = new URL(env.STUDENT_APP_URL).origin;
export const ADMIN_ORIGIN = new URL(env.ADMIN_APP_URL).origin;

let sharedDb: Db | undefined;
export function testDb(): Db {
  sharedDb ??= createDb(env.DATABASE_URL);
  return sharedDb;
}

/** A controllable clock for expiry tests. */
export function testClock(start = new Date('2026-11-03T09:00:00Z')) {
  let t = start.getTime();
  return {
    now: () => new Date(t),
    advance: (ms: number) => {
      t += ms;
    },
  };
}

export async function createTestApp(
  opts: {
    now?: () => Date;
    rateLimit?: boolean;
    google?: GoogleOidcClient | null;
    env?: Partial<typeof env>;
    /** AI is off unless a test passes a provider (e.g. SimulatedProvider). */
    ai?: AiProvider | null;
    python?: PythonRunner;
  } = {},
) {
  const mailer = new MemoryMailer();
  const jobs = new MemoryJobQueue();
  const ctx: AppContext = {
    env: { ...env, RATE_LIMIT_ENABLED: opts.rateLimit ?? false, ...opts.env },
    db: testDb(),
    mailer,
    log: createLogger(env, 'test'),
    google: opts.google ?? null,
    now: opts.now ?? (() => new Date()),
    ai: opts.ai ?? null,
    python: opts.python ?? new SandboxedPythonRunner({ snippetLimitMs: 10_000 }),
    jobs,
  };
  const app = await buildApp(ctx);
  await app.ready();
  return { app, ctx, mailer, jobs };
}

/** Empties every application table (keeps the migration history). */
export async function resetDb(db: Db = testDb()) {
  const rows = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (rows.length === 0) return;
  const list = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/**
 * A tiny browser-like client: keeps cookies and always sends the right Origin header.
 * `now` decides when a cookie has expired (pass the app's test clock when time is faked).
 */
export function browser(app: FastifyInstance, origin: string, now: () => Date = () => new Date()) {
  const jar = new Map<string, string>();
  async function send(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    payload?: object,
  ) {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await app.inject({
      method,
      url,
      ...(payload ? { payload } : {}),
      headers: { origin, ...(cookie ? { cookie } : {}) },
    });
    for (const c of res.cookies as { name: string; value: string; expires?: Date }[]) {
      if (!c.value || (c.expires && c.expires.getTime() <= now().getTime())) jar.delete(c.name);
      else jar.set(c.name, c.value);
    }
    return res;
  }
  return {
    jar,
    get: (url: string) => send('GET', url),
    post: (url: string, payload?: object) => send('POST', url, payload ?? {}),
    patch: (url: string, payload?: object) => send('PATCH', url, payload ?? {}),
    put: (url: string, payload?: object) => send('PUT', url, payload ?? {}),
    del: (url: string) => send('DELETE', url),
  };
}

export function json<T = Record<string, unknown>>(res: LightMyRequestResponse): T {
  return res.json() as T;
}

export const errorCode = (res: LightMyRequestResponse) =>
  (res.json() as { error?: { code?: string } }).error?.code;

/** Pulls the token out of the first link in the most recent email to `to`. */
export function tokenFromEmail(mailer: MemoryMailer, to: string): string {
  const mail = mailer.last(to);
  if (!mail) throw new Error(`no email sent to ${to}`);
  const match = mail.text.match(/token=([A-Za-z0-9_\-%]+)/);
  if (!match?.[1]) throw new Error('no token in email');
  return decodeURIComponent(match[1]);
}

export async function createAdmin(
  email = 'admin@test.local',
  password = 'Admin-Pass-2026!',
  role: 'ADMIN' | 'SUPER_ADMIN' = 'SUPER_ADMIN',
) {
  await testDb().user.create({
    data: {
      email,
      role,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
      adminProfile: { create: { fullName: 'Test Admin' } },
    },
  });
  return { email, password };
}

export const STUDENT = {
  email: 'priya@student.test',
  password: 'Learn-RAG-2026',
  fullName: 'Priya Sharma',
};

/**
 * Resets the DB and loads the real catalog bootstrap (and, unless told not to, the pilot
 * curriculum); returns lookups by slug/code.
 */
export async function resetWithCatalog(opts: { curriculum?: boolean } = {}) {
  const { bootstrapCatalog } = await import('../src/modules/catalog/catalog.bootstrap.ts');
  const { bootstrapPilotCurriculum } = await import(
    '../src/modules/curriculum/pilot-curriculum.ts'
  );
  await resetDb();
  await bootstrapCatalog(testDb());
  if (opts.curriculum !== false) await bootstrapPilotCurriculum(testDb());
  const db = testDb();
  const [roles, brackets, areas] = await Promise.all([
    db.careerRole.findMany(),
    db.packageBracket.findMany(),
    db.skillArea.findMany(),
  ]);
  const role = (slug: string) => {
    const r = roles.find((x) => x.slug === slug);
    if (!r) throw new Error(`no role ${slug}`);
    return r.id;
  };
  const bracket = (code: string) => {
    const b = brackets.find((x) => x.code === code);
    if (!b) throw new Error(`no bracket ${code}`);
    return b.id;
  };
  const area = (slug: string) => {
    const a = areas.find((x) => x.slug === slug);
    if (!a) throw new Error(`no skill area ${slug}`);
    return a.id;
  };
  return { role, bracket, area };
}

/** YYYY-MM-DD n days from today in Asia/Kolkata. */
export function isoInDays(n: number, now = new Date()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  return new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
