import {
  ActivityBody,
  AnalyticsQuery,
  AnalyticsResponse,
  AnalyticsStudentQuery,
  IdParam,
  OkResponse,
  StudentAnalyticsResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireAdmin, requireStudent } from '../../http/auth.ts';

/** /api/v1/student/activity — what the student app reports: pages opened, practice links used. */
export const studentActivityRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { activity } = app.services;

  app.post(
    '/activity',
    { schema: { tags: ['student-activity'], body: ActivityBody, response: { 200: OkResponse } } },
    async (req) => {
      await activity.record(authOf(req).user.id, req.body.kind, req.body.target ?? null);
      return { ok: true as const };
    },
  );
};

/** /api/v1/admin/analytics — who was active on which day, for how long, doing what. */
export const adminAnalyticsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { analytics } = app.services;
  const tags = ['admin-analytics'];

  app.get(
    '/',
    { schema: { tags, querystring: AnalyticsQuery, response: { 200: AnalyticsResponse } } },
    (req) => analytics.overview(req.query),
  );
  app.get(
    '/students/:id',
    {
      schema: {
        tags,
        params: IdParam,
        querystring: AnalyticsStudentQuery,
        response: { 200: StudentAnalyticsResponse },
      },
    },
    (req) => analytics.student(req.params.id, req.query),
  );
};
