import {
  ChangePasswordBody,
  ForgotPasswordBody,
  LoginBody,
  OkResponse,
  RegisterBody,
  ResetPasswordBody,
  StudentMeResponse,
  StudentSessionResponse,
  VerifyEmailBody,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { isProd } from '../../config/env.ts';
import {
  authOf,
  clearSessionCookie,
  readSessionToken,
  requestMeta,
  requireStudent,
  setSessionCookie,
} from '../../http/auth.ts';
import { toStudentMe } from './auth.service.ts';

const perMinute = (max: number) => ({ rateLimit: { max, timeWindow: '1 minute' } });

/** /api/v1/auth — student authentication. */
export const studentAuthRoutes: FastifyPluginAsyncZod = async (app) => {
  const { auth } = app.services;

  // The app calls this on boot. Signed out is a normal state, not an error, so it is always 200.
  app.get(
    '/session',
    { schema: { tags: ['auth'], response: { 200: StudentSessionResponse } } },
    async (req) => {
      const token = readSessionToken(req, 'STUDENT');
      const found = token ? await auth.sessions.validate(token, 'STUDENT') : null;
      return { user: found ? toStudentMe(found.user) : null };
    },
  );

  app.post(
    '/register',
    {
      config: perMinute(5),
      schema: { tags: ['auth'], body: RegisterBody, response: { 201: StudentMeResponse } },
    },
    async (req, reply) => {
      const s = await auth.registerStudent(req.body, requestMeta(req));
      setSessionCookie(reply, 'STUDENT', s.token, s.expiresAt, isProd);
      return reply.status(201).send({ user: toStudentMe(await auth.loadUser(s.userId)) });
    },
  );

  app.post(
    '/login',
    {
      config: perMinute(10),
      schema: { tags: ['auth'], body: LoginBody, response: { 200: StudentMeResponse } },
    },
    async (req, reply) => {
      const s = await auth.login('STUDENT', req.body, requestMeta(req));
      setSessionCookie(reply, 'STUDENT', s.token, s.expiresAt, isProd);
      return { user: toStudentMe(await auth.loadUser(s.userId)) };
    },
  );

  app.post(
    '/logout',
    { schema: { tags: ['auth'], response: { 200: OkResponse } } },
    async (req, reply) => {
      const token = readSessionToken(req, 'STUDENT');
      if (token) await auth.logout(token);
      clearSessionCookie(reply, 'STUDENT', isProd);
      return { ok: true as const };
    },
  );

  app.get(
    '/me',
    { onRequest: requireStudent, schema: { tags: ['auth'], response: { 200: StudentMeResponse } } },
    async (req) => ({ user: toStudentMe(authOf(req).user) }),
  );

  app.post(
    '/verify-email',
    {
      config: perMinute(10),
      schema: { tags: ['auth'], body: VerifyEmailBody, response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.verifyEmail(req.body.token);
      return { ok: true as const };
    },
  );

  app.post(
    '/resend-verification',
    {
      onRequest: requireStudent,
      config: perMinute(3),
      schema: { tags: ['auth'], response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.resendVerification(authOf(req).user);
      return { ok: true as const };
    },
  );

  app.post(
    '/forgot-password',
    {
      config: perMinute(5),
      schema: { tags: ['auth'], body: ForgotPasswordBody, response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.requestPasswordReset('STUDENT', req.body.email);
      return { ok: true as const };
    },
  );

  app.post(
    '/reset-password',
    {
      config: perMinute(10),
      schema: { tags: ['auth'], body: ResetPasswordBody, response: { 200: OkResponse } },
    },
    async (req) => {
      await auth.resetPassword(req.body, requestMeta(req));
      return { ok: true as const };
    },
  );

  app.post(
    '/change-password',
    {
      onRequest: requireStudent,
      config: perMinute(10),
      schema: { tags: ['auth'], body: ChangePasswordBody, response: { 200: OkResponse } },
    },
    async (req) => {
      const { user, session } = authOf(req);
      await auth.changePassword(user, session.id, req.body, requestMeta(req));
      return { ok: true as const };
    },
  );
};
