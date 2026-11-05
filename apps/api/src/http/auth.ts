import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import type { RequestMeta } from '../context.ts';
import type { SessionAudience, UserRole } from '../generated/prisma/enums.ts';
import { forbidden, unauthenticated } from '../lib/errors.ts';
import type { SessionRecord, SessionUser } from '../modules/auth/session.service.ts';

/**
 * Separate cookies per audience. The admin cookie is only ever sent to /api/v1/admin,
 * and a student cookie is rejected there anyway because its session audience differs.
 */
export const SESSION_COOKIES = {
  STUDENT: { name: 'nwp_sid', path: '/api/v1' },
  ADMIN: { name: 'nwp_asid', path: '/api/v1/admin' },
} as const satisfies Record<SessionAudience, { name: string; path: string }>;

export interface RequestAuth {
  user: SessionUser;
  session: SessionRecord;
  token: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: RequestAuth | null;
  }
}

export function requestMeta(req: FastifyRequest): RequestMeta {
  const ua = req.headers['user-agent'];
  return { ip: req.ip ?? null, userAgent: typeof ua === 'string' ? ua : null };
}

export function setSessionCookie(
  reply: FastifyReply,
  audience: SessionAudience,
  token: string,
  expiresAt: Date,
  secure: boolean,
) {
  const c = SESSION_COOKIES[audience];
  reply.setCookie(c.name, token, {
    path: c.path,
    httpOnly: true,
    sameSite: 'lax',
    secure,
    expires: expiresAt,
  });
}

export function clearSessionCookie(
  reply: FastifyReply,
  audience: SessionAudience,
  secure: boolean,
) {
  const c = SESSION_COOKIES[audience];
  reply.clearCookie(c.name, { path: c.path, httpOnly: true, sameSite: 'lax', secure });
}

export function readSessionToken(req: FastifyRequest, audience: SessionAudience): string | null {
  const value = req.cookies[SESSION_COOKIES[audience].name];
  return value && value.length <= 200 ? value : null;
}

/**
 * Route guard: a live session of the right audience and (optionally) one of the given roles.
 * Runs at `onRequest`, so unauthenticated calls are refused before the body is even parsed.
 * Stacked guards reuse the session already resolved for this request.
 */
export function requireAuth(
  audience: SessionAudience,
  roles?: readonly UserRole[],
): onRequestAsyncHookHandler {
  return async function guard(req) {
    if (!req.auth || req.auth.session.audience !== audience) {
      const token = readSessionToken(req, audience);
      if (!token) throw unauthenticated();
      const found = await req.server.services.auth.sessions.validate(token, audience);
      if (!found) throw unauthenticated('Your session has ended. Please sign in again.');
      req.auth = { ...found, token };
    }
    if (roles && !roles.includes(req.auth.user.role)) throw forbidden();
  };
}

export const requireStudent = requireAuth('STUDENT', ['STUDENT']);
export const requireAdmin = requireAuth('ADMIN', ['ADMIN', 'SUPER_ADMIN']);
export const requireSuperAdmin = requireAuth('ADMIN', ['SUPER_ADMIN']);

/** The signed-in admin (or student) as an audit-log actor. */
export function actorOf(req: FastifyRequest): { id: string; ip: string | null } {
  return { id: authOf(req).user.id, ip: req.ip ?? null };
}

/** Narrow `req.auth` inside handlers that sit behind a guard. */
export function authOf(req: FastifyRequest): RequestAuth {
  if (!req.auth) throw unauthenticated();
  return req.auth;
}
