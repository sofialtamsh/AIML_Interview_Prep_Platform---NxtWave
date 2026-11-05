import type { FastifyInstance } from 'fastify';
import type { Env } from '../config/env.ts';
import { AppError } from '../lib/errors.ts';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF defense in depth (with SameSite cookies): every state-changing request must come
 * from our own app origin. The admin namespace only accepts the admin app's origin.
 */
export function registerOriginGuard(app: FastifyInstance, env: Env) {
  const studentOrigin = new URL(env.STUDENT_APP_URL).origin;
  const adminOrigin = new URL(env.ADMIN_APP_URL).origin;

  app.addHook('onRequest', async (req) => {
    if (SAFE_METHODS.has(req.method) || !req.url.startsWith('/api/')) return;

    const allowed = req.url.startsWith('/api/v1/admin') ? adminOrigin : studentOrigin;
    const origin = req.headers.origin ?? originFromReferer(req.headers.referer);
    if (origin !== allowed) {
      throw new AppError(
        'FORBIDDEN',
        'This request was blocked because it came from another site.',
      );
    }
  });
}

function originFromReferer(referer: string | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}
