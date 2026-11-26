import {
  AdminPracticeQuestionDto,
  AdminPracticeResponse,
  IdParam,
  OkResponse,
  PracticeImportBody,
  PracticeImportResponse,
  PracticeQuestionBody,
  PracticeQuestionPatch,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-practice'];

/** /api/v1/admin/practice — the questions students open on the NxtWave learning portal. */
export const adminPracticeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { practice } = app.services;

  app.get('/', { schema: { tags, response: { 200: AdminPracticeResponse } } }, () =>
    practice.adminList(),
  );
  app.post(
    '/',
    { schema: { tags, body: PracticeQuestionBody, response: { 201: AdminPracticeQuestionDto } } },
    async (req, reply) => reply.status(201).send(await practice.create(req.body, actorOf(req))),
  );
  app.post(
    '/import',
    { schema: { tags, body: PracticeImportBody, response: { 200: PracticeImportResponse } } },
    (req) => practice.import(req.body, actorOf(req)),
  );
  app.patch(
    '/:id',
    {
      schema: {
        tags,
        params: IdParam,
        body: PracticeQuestionPatch,
        response: { 200: AdminPracticeQuestionDto },
      },
    },
    (req) => practice.update(req.params.id, req.body, actorOf(req)),
  );
  app.delete(
    '/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await practice.remove(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );
};
