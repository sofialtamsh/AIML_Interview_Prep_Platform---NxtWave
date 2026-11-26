import {
  AdminStudyPlanResponse,
  SaveStudyPlanBody,
  SaveStudyPlanResponse,
  StudyPlanPreviewBody,
  StudyPlanPreviewResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-study-plan'];

/** /api/v1/admin/study-plan — daily time, study days, deadline and note for every student. */
export const adminStudyPlanRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { studyPlan } = app.services;

  app.get('/', { schema: { tags, response: { 200: AdminStudyPlanResponse } } }, () =>
    studyPlan.adminView(),
  );
  app.put(
    '/',
    { schema: { tags, body: SaveStudyPlanBody, response: { 200: SaveStudyPlanResponse } } },
    (req) => studyPlan.save(req.body, actorOf(req)),
  );
  app.post(
    '/preview',
    { schema: { tags, body: StudyPlanPreviewBody, response: { 200: StudyPlanPreviewResponse } } },
    async (req) => ({ preview: await studyPlan.preview(req.body) }),
  );
};
