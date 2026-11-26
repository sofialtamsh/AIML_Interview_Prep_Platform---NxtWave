import { AdminFeedbackQuery, AdminFeedbackResponse } from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAdmin } from '../../http/auth.ts';

const tags = ['admin-feedback'];

/** /api/v1/admin/feedback — all student feedback and 11★ ideas. */
export const adminFeedbackRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { feedback } = app.services;

  app.get(
    '/',
    { schema: { tags, querystring: AdminFeedbackQuery, response: { 200: AdminFeedbackResponse } } },
    (req) => feedback.list(req.query),
  );
};
