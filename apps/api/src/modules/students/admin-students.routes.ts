import {
  IdParam,
  RoadmapResponse,
  StudentDetail,
  StudentListQuery,
  StudentListResponse,
  UpdateStudentBody,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-students'];

/** /api/v1/admin/students — every student's track, with filters. */
export const adminStudentsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { students, roadmaps } = app.services;

  app.get(
    '/',
    { schema: { tags, querystring: StudentListQuery, response: { 200: StudentListResponse } } },
    (req) => students.list(req.query),
  );
  app.get('/:id', { schema: { tags, params: IdParam, response: { 200: StudentDetail } } }, (req) =>
    students.detail(req.params.id),
  );
  app.patch(
    '/:id',
    {
      schema: { tags, params: IdParam, body: UpdateStudentBody, response: { 200: StudentDetail } },
    },
    (req) => students.update(req.params.id, req.body, actorOf(req)),
  );
  // The same roadmap the student sees (admins can view every student's track).
  app.get(
    '/:id/roadmap',
    { schema: { tags, params: IdParam, response: { 200: RoadmapResponse } } },
    async (req) => {
      await students.detail(req.params.id); // 404 unless this is a student
      return roadmaps.getForStudent(req.params.id);
    },
  );
};
