import {
  AgentJobDto,
  AgentJobList,
  AgentJobQuery,
  AiRouteBody,
  AiStatusResponse,
  AiTaskParam,
  IdParam,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin, requireSuperAdmin } from '../../http/auth.ts';
import { AgentJobService } from './jobs.service.ts';

const tags = ['admin-ai'];

/** /api/v1/admin/ai — AI status, model routes, usage and jobs. Admin-only; never shows keys. */
export const adminAiRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { ai } = app.services;
  const jobs = new AgentJobService(app.services.ctx);

  app.get('/status', { schema: { tags, response: { 200: AiStatusResponse } } }, () => ai.status());
  app.put(
    '/routes/:task',
    {
      onRequest: requireSuperAdmin,
      schema: { tags, params: AiTaskParam, body: AiRouteBody, response: { 200: AiStatusResponse } },
    },
    (req) => ai.updateRoute(req.params.task, req.body, actorOf(req)),
  );
  app.get(
    '/jobs',
    { schema: { tags, querystring: AgentJobQuery, response: { 200: AgentJobList } } },
    async (req) => ({
      jobs: await jobs.list(req.query),
    }),
  );
  app.get(
    '/jobs/:id',
    { schema: { tags, params: IdParam, response: { 200: AgentJobDto } } },
    (req) => jobs.get(req.params.id),
  );
  app.post(
    '/jobs/:id/cancel',
    { schema: { tags, params: IdParam, response: { 200: AgentJobDto } } },
    (req) => jobs.cancel(req.params.id),
  );
};
