import {
  ConceptBody,
  ConceptPatch,
  CreatedResponse,
  CurriculaIndex,
  CurriculumOverview,
  CurriculumQuery,
  IdParam,
  OkResponse,
  PublishBody,
  PublishResponse,
  SaveDraftBody,
  SubtopicBody,
  SubtopicPatch,
  TaxonomyResponse,
  TopicBody,
  TopicPatch,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-curriculum'];

/** /api/v1/admin/curriculum — topics, subtopics, concepts and the role × package curricula. */
export const adminCurriculumRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { curriculum } = app.services;

  // Taxonomy (shared by every role)
  app.get('/taxonomy', { schema: { tags, response: { 200: TaxonomyResponse } } }, () =>
    curriculum.taxonomy(),
  );
  app.post(
    '/topics',
    { schema: { tags, body: TopicBody, response: { 201: CreatedResponse } } },
    async (req, reply) =>
      reply.status(201).send({ id: await curriculum.createTopic(req.body, actorOf(req)) }),
  );
  app.patch(
    '/topics/:id',
    { schema: { tags, params: IdParam, body: TopicPatch, response: { 200: OkResponse } } },
    async (req) => {
      await curriculum.updateTopic(req.params.id, req.body, actorOf(req));
      return { ok: true as const };
    },
  );
  app.post(
    '/subtopics',
    { schema: { tags, body: SubtopicBody, response: { 201: CreatedResponse } } },
    async (req, reply) =>
      reply.status(201).send({ id: await curriculum.createSubtopic(req.body, actorOf(req)) }),
  );
  app.patch(
    '/subtopics/:id',
    { schema: { tags, params: IdParam, body: SubtopicPatch, response: { 200: OkResponse } } },
    async (req) => {
      await curriculum.updateSubtopic(req.params.id, req.body, actorOf(req));
      return { ok: true as const };
    },
  );
  app.post(
    '/concepts',
    { schema: { tags, body: ConceptBody, response: { 201: CreatedResponse } } },
    async (req, reply) =>
      reply.status(201).send({ id: await curriculum.createConcept(req.body, actorOf(req)) }),
  );
  app.patch(
    '/concepts/:id',
    { schema: { tags, params: IdParam, body: ConceptPatch, response: { 200: OkResponse } } },
    async (req) => {
      await curriculum.updateConcept(req.params.id, req.body, actorOf(req));
      return { ok: true as const };
    },
  );
  app.delete(
    '/concepts/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await curriculum.deleteConcept(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );

  // Role × package curricula
  app.get('/curricula', { schema: { tags, response: { 200: CurriculaIndex } } }, () =>
    curriculum.index(),
  );
  app.get(
    '/curricula/target',
    { schema: { tags, querystring: CurriculumQuery, response: { 200: CurriculumOverview } } },
    (req) => curriculum.overview(req.query.roleId, req.query.bracketId),
  );
  app.put(
    '/curricula/target/draft',
    {
      schema: {
        tags,
        querystring: CurriculumQuery,
        body: SaveDraftBody,
        response: { 200: CurriculumOverview },
      },
    },
    async (req) => {
      const { roleId, bracketId } = req.query;
      await curriculum.saveDraft(roleId, bracketId, req.body, actorOf(req));
      return curriculum.overview(roleId, bracketId);
    },
  );
  app.delete(
    '/curricula/target/draft',
    { schema: { tags, querystring: CurriculumQuery, response: { 200: CurriculumOverview } } },
    async (req) => {
      const { roleId, bracketId } = req.query;
      await curriculum.discardDraft(roleId, bracketId, actorOf(req));
      return curriculum.overview(roleId, bracketId);
    },
  );
  app.post(
    '/curricula/target/publish',
    {
      schema: {
        tags,
        querystring: CurriculumQuery,
        body: PublishBody,
        response: { 200: PublishResponse },
      },
    },
    (req) =>
      curriculum.publish(req.query.roleId, req.query.bracketId, req.body.changeNote, actorOf(req)),
  );
};
