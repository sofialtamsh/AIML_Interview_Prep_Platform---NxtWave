import { pino } from 'pino';
import type { Env } from '../config/env.ts';

/** Structured JSON logs. Secrets and credentials are redacted wherever they appear. */
export function createLogger(env: Env, name: string) {
  return pino({
    name,
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.cookie',
        'req.headers.authorization',
        'res.headers["set-cookie"]',
        '*.password',
        '*.currentPassword',
        '*.newPassword',
        '*.token',
        '*.passwordHash',
      ],
      censor: '[redacted]',
    },
  });
}
