import {
  IdParam,
  PracticeFeedbackBody,
  PracticeFeedbackResponse,
  PracticeOpenResponse,
  StudentPracticeResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireStudent } from '../../http/auth.ts';

const tags = ['student-practice'];

/** /api/v1/student/practice — the student's Practice tab. */
export const studentPracticeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { practice } = app.services;

  app.get('/', { schema: { tags, response: { 200: StudentPracticeResponse } } }, (req) =>
    practice.studentList(authOf(req).user.id),
  );
  app.post(
    '/:id/open',
    { schema: { tags, params: IdParam, response: { 200: PracticeOpenResponse } } },
    (req) => practice.recordOpen(authOf(req).user.id, req.params.id),
  );
  // The 11★ loop: "How was this question?" plus "What would make it an 11★ question?"
  app.post(
    '/:id/feedback',
    {
      schema: {
        tags,
        params: IdParam,
        body: PracticeFeedbackBody,
        response: { 200: PracticeFeedbackResponse },
      },
    },
    (req) => practice.feedback(authOf(req).user.id, req.params.id, req.body),
  );
};
