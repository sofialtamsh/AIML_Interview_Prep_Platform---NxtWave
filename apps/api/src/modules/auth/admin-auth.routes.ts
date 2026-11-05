import {
  AcceptInviteBody,
  AdminMeResponse,
  AdminSessionResponse,
  ForgotPasswordBody,
  LoginBody,
  OkResponse,
  ResetPasswordBody,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { isProd } from '../../config/env.ts';
import {
  authOf,
  clearSessionCookie,
  readSessionToken,
  requestMeta,
  requireAdmin,
  setSessionCookie,
} from '../../http/auth.ts';
import { toAdminMe } from './auth.service.ts';

const perMinute = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

/** /api/v1/admin/auth — admin authentication (separate session audience and cookie). */
export const adminAuthRoutes: FastifyPluginAsyncZod = async (app) => {
  const { auth } = app.services;

  // Boot probe for the admin app: always 200, `user` is null when signed out.
  app.get(
    '/session',
    { schema: { tags: ['admin-auth'], response: { 200: AdminSessionResponse } } },
    async (req) => {
      const token = readSessionToken(req, 'ADMIN');
      const found = token ? await auth.sessions.validate(token, 'ADMIN') : null;
      const isAdmin = found && (found.user.role === 'ADMIN' || found.user.role === 'SUPER_ADMIN');
      return { user: isAdmin ? toAdminMe(found.user) : null };
    },
  );

  app.post(
    '/login',
    {
      config: perMinute(5),
      schema: { tags: ['admin-auth'], body: LoginBody, response: { 200: AdminMeResponse } },
    },
    async (req, reply) => {
      const s = await auth.login('ADMIN', req.body, requestMeta(req));
      setSessionCookie(reply, 'ADMIN', s.token, s.expiresAt, isProd);
      return { user: toAdminMe(await auth.loadUser(s.userId)) };
    },
  );

  app.post(
    '/logout',
    { schema: { tags: ['admin-auth'], response: { 200: OkResponse } } },
    async (req, reply) => {
      const token = readSessionToken(req, 'ADMIN');
      if (token) await auth.logout(token);
      clearSessionCookie(reply, 'ADMIN', isProd);
      return { ok: true as const };
    },
  );

  app.get(
    '/me',
    {
      onRequest: requireAdmin,
      schema: { tags: ['admin-auth'], response: { 200: AdminMeResponse } },
    },
    async (req) => ({ user: toAdminMe(authOf(req).user) }),
  );

  app.post(
    '/forgot-password',
    {
      config: perMinute(5),
      schema: { tags: ['admin-auth'], body: ForgotPasswordBody, response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.requestPasswordReset('ADMIN', req.body.email);
      return { ok: true as const };
    },
  );

  app.post(
    '/reset-password',
    {
      config: perMinute(10),
      schema: { tags: ['admin-auth'], body: ResetPasswordBody, response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.resetPassword(req.body, requestMeta(req));
      return { ok: true as const };
    },
  );

  app.post(
    '/accept-invite',
    {
      config: perMinute(10),
      schema: { tags: ['admin-auth'], body: AcceptInviteBody, response: { 200: AdminMeResponse } },
    },
    async (req, reply) => {
      const s = await auth.acceptInvite(req.body, requestMeta(req));
      setSessionCookie(reply, 'ADMIN', s.token, s.expiresAt, isProd);
      return { user: toAdminMe(await auth.loadUser(s.userId)) };
    },
  );
};
