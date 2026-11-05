import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { RegistrationPolicy } from '@app/contracts';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

/** Finds the nearest .env walking up from the working directory (the repo root in dev). */
function findEnvFile(): string | undefined {
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

// Production reads configuration only from the real environment (12-factor).
// Elsewhere the repo-root .env is loaded; variables already set in the process win.
if (process.env.NODE_ENV !== 'production') {
  const path = process.env.ENV_FILE ?? findEnvFile();
  if (path) loadDotenv({ path, quiet: true });
}

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('NxtWave Prep'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  API_HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  TRUST_PROXY: bool.default(false),
  RATE_LIMIT_ENABLED: bool.default(true),

  DATABASE_URL: z.url(),

  STUDENT_APP_URL: z.url(),
  ADMIN_APP_URL: z.url(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: bool.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('NxtWave Prep <no-reply@prep.local>'),

  REGISTRATION_POLICY_DEFAULT: RegistrationPolicy.default('OPEN'),
  REQUIRE_EMAIL_VERIFICATION: bool.default(false),

  // "Continue with Google" appears only when both are set (Google Cloud → OAuth client, type Web).
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Comma-separated; when set, admin Google sign-in is limited to these email domains. */
  ADMIN_GOOGLE_ALLOWED_DOMAINS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean),
    ),

  // ── AI (admin-only content agents) ──
  /** Server-side only. Never sent to a browser, never logged, never stored in the database. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /**
   * auto: Claude when ANTHROPIC_API_KEY is set, otherwise AI features are off.
   * simulated: a deterministic stand-in for demos and tests (never in production).
   */
  AI_PROVIDER: z.enum(['auto', 'anthropic', 'simulated', 'off']).default('auto'),
  /** A job stops before it spends more than this (USD). */
  AI_JOB_BUDGET_USD: z.coerce.number().positive().max(100).default(5),
  /** Where the code verifier caches Python packages (numpy, pandas). */
  PYODIDE_CACHE_DIR: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

function load(): Env {
  const parsed = EnvSchema.safeParse({
    ...process.env,
    // Empty strings in .env mean "not set".
    SMTP_USER: process.env.SMTP_USER || undefined,
    SMTP_PASS: process.env.SMTP_PASS || undefined,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || undefined,
    PYODIDE_CACHE_DIR: process.env.PYODIDE_CACHE_DIR || undefined,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.AI_PROVIDER === 'simulated') {
    throw new Error(
      'Invalid environment configuration:\n  - AI_PROVIDER: "simulated" is not allowed in production',
    );
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
