import {
  AgentJobDto,
  CreatedResponse,
  CreateLessonVersionBody,
  EvaluationResponse,
  GenerateLessonBody,
  LessonFeedbackResponse,
  LessonIndexResponse,
  LessonModuleResponse,
  LessonVersionResponse,
  PublishLessonBody,
  ReviewBody,
  RewriteSectionBody,
  SaveDocumentBody,
  SaveSectionBody,
  SubmitForReviewBody,
  SubtopicIdParam,
  VersionIdParam,
  VersionSectionParam,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-content'];

/** /api/v1/admin/content — lessons: import, edit, review and publish. */
export const adminContentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { content, contentAi } = app.services;
  const version = {
    schema: { tags, params: VersionIdParam, response: { 200: LessonVersionResponse } },
  };

  app.get('/lessons', { schema: { tags, response: { 200: LessonIndexResponse } } }, () =>
    content.index(),
  );
  app.get(
    '/lessons/:subtopicId',
    { schema: { tags, params: SubtopicIdParam, response: { 200: LessonModuleResponse } } },
    (req) => content.module(req.params.subtopicId),
  );
  app.get(
    '/lessons/:subtopicId/feedback',
    { schema: { tags, params: SubtopicIdParam, response: { 200: LessonFeedbackResponse } } },
    (req) => content.feedback(req.params.subtopicId),
  );
  app.post(
    '/lessons/:subtopicId/versions',
    {
      // Lesson documents can be large; everything else keeps the 1 MB default.
      bodyLimit: 2 * 1_048_576,
      schema: {
        tags,
        params: SubtopicIdParam,
        body: CreateLessonVersionBody,
        response: { 201: CreatedResponse },
      },
    },
    async (req, reply) =>
      reply
        .status(201)
        .send(await content.createVersion(req.params.subtopicId, req.body, actorOf(req))),
  );

  // AI (Phase 4B): every job runs in the worker; the response is the queued job to follow.
  app.post(
    '/lessons/:subtopicId/generate',
    {
      schema: {
        tags,
        params: SubtopicIdParam,
        body: GenerateLessonBody,
        response: { 202: AgentJobDto },
      },
    },
    async (req, reply) =>
      reply
        .status(202)
        .send(await contentAi.generate(req.params.subtopicId, req.body, actorOf(req))),
  );
  app.get(
    '/versions/:id/evaluation',
    { schema: { tags, params: VersionIdParam, response: { 200: EvaluationResponse } } },
    (req) => contentAi.evaluation(req.params.id),
  );
  app.post(
    '/versions/:id/evaluate',
    { schema: { tags, params: VersionIdParam, response: { 202: AgentJobDto } } },
    async (req, reply) =>
      reply.status(202).send(await contentAi.evaluate(req.params.id, actorOf(req))),
  );
  app.post(
    '/versions/:id/sections/:key/rewrite',
    {
      schema: {
        tags,
        params: VersionSectionParam,
        body: RewriteSectionBody,
        response: { 202: AgentJobDto },
      },
    },
    async (req, reply) =>
      reply
        .status(202)
        .send(await contentAi.rewrite(req.params.id, req.params.key, req.body, actorOf(req))),
  );

  app.get('/versions/:id', version, (req) => content.version(req.params.id));
  app.put(
    '/versions/:id/document',
    { ...version, bodyLimit: 2 * 1_048_576, schema: { ...version.schema, body: SaveDocumentBody } },
    (req) => content.saveDocument(req.params.id, req.body, actorOf(req)),
  );
  app.put(
    '/versions/:id/sections/:key',
    {
      schema: {
        tags,
        params: VersionSectionParam,
        body: SaveSectionBody,
        response: { 200: LessonVersionResponse },
      },
    },
    (req) => content.saveSection(req.params.id, req.params.key, req.body, actorOf(req)),
  );
  app.post(
    '/versions/:id/submit',
    { schema: { ...version.schema, body: SubmitForReviewBody } },
    (req) => content.submit(req.params.id, req.body, actorOf(req)),
  );
  app.post('/versions/:id/review', { schema: { ...version.schema, body: ReviewBody } }, (req) =>
    content.review(req.params.id, req.body, actorOf(req)),
  );
  app.post(
    '/versions/:id/publish',
    { schema: { ...version.schema, body: PublishLessonBody } },
    (req) => content.publish(req.params.id, req.body, actorOf(req)),
  );
  app.post('/versions/:id/unpublish', version, (req) =>
    content.unpublish(req.params.id, actorOf(req)),
  );
  app.post('/versions/:id/discard', version, (req) => content.discard(req.params.id, actorOf(req)));
};
