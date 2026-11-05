import { CheckResult } from '@app/content';
import {
  CheckAttemptBody,
  CompleteLessonBody,
  CompleteLessonResponse,
  FeedbackBody,
  LessonParams,
  LessonProgressBody,
  LessonProgressDto,
  LessonResponse,
  OkResponse,
  SolutionBody,
  SolutionResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireStudent } from '../../http/auth.ts';

const tags = ['student-lessons'];

/** /api/v1/student — lessons on the student's own roadmap, and feedback. */
export const studentLessonRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { lessons } = app.services;
  const me = (req: Parameters<typeof authOf>[0]) => authOf(req).user.id;

  app.get(
    '/lessons/:topicSlug/:subtopicSlug',
    { schema: { tags, params: LessonParams, response: { 200: LessonResponse } } },
    (req) => lessons.get(me(req), req.params),
  );
  app.put(
    '/lessons/:topicSlug/:subtopicSlug/progress',
    {
      schema: {
        tags,
        params: LessonParams,
        body: LessonProgressBody,
        response: { 200: LessonProgressDto },
      },
    },
    (req) => lessons.saveProgress(me(req), req.params, req.body),
  );
  app.post(
    '/lessons/:topicSlug/:subtopicSlug/checks',
    {
      schema: {
        tags,
        params: LessonParams,
        body: CheckAttemptBody,
        response: { 200: CheckResult },
      },
    },
    (req) => lessons.check(me(req), req.params, req.body),
  );
  app.post(
    '/lessons/:topicSlug/:subtopicSlug/solution',
    {
      schema: {
        tags,
        params: LessonParams,
        body: SolutionBody,
        response: { 200: SolutionResponse },
      },
    },
    (req) => lessons.solution(me(req), req.params, req.body),
  );
  app.post(
    '/lessons/:topicSlug/:subtopicSlug/complete',
    {
      schema: {
        tags,
        params: LessonParams,
        body: CompleteLessonBody,
        response: { 200: CompleteLessonResponse },
      },
    },
    (req) => lessons.complete(me(req), req.params, req.body),
  );
  app.post(
    '/feedback',
    { schema: { tags, body: FeedbackBody, response: { 200: OkResponse } } },
    (req) => lessons.feedback(me(req), req.body),
  );
};
