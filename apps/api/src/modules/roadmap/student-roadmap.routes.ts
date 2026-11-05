import {
  OnboardingPlanPreviewBody,
  OnboardingPlanPreviewResponse,
  RoadmapResponse,
  Schedule,
  SchedulePreviewResponse,
  SlugParam,
  TopicPageResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireStudent } from '../../http/auth.ts';

const tags = ['student-roadmap'];

/** /api/v1/student — the signed-in student's own roadmap and topic pages. */
export const studentRoadmapRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { roadmaps } = app.services;
  const me = (req: Parameters<typeof authOf>[0]) => authOf(req).user.id;

  app.get('/roadmap', { schema: { tags, response: { 200: RoadmapResponse } } }, (req) =>
    roadmaps.getForStudent(me(req)),
  );
  app.post(
    '/roadmap/preview-schedule',
    { schema: { tags, body: Schedule, response: { 200: SchedulePreviewResponse } } },
    (req) => roadmaps.previewSchedule(me(req), req.body),
  );
  app.post(
    '/onboarding/plan-preview',
    {
      schema: {
        tags,
        body: OnboardingPlanPreviewBody,
        response: { 200: OnboardingPlanPreviewResponse },
      },
    },
    (req) => {
      const { user } = authOf(req);
      return roadmaps.onboardingPreview(
        user.id,
        user.studentProfile?.timezone ?? 'Asia/Kolkata',
        req.body,
      );
    },
  );
  // A plain file download (iCalendar), so no JSON response schema.
  app.get('/roadmap/calendar.ics', { schema: { tags } }, async (req, reply) =>
    reply
      .header('content-type', 'text/calendar; charset=utf-8')
      .header('content-disposition', 'attachment; filename="nxtwave-prep-plan.ics"')
      .header('cache-control', 'no-store')
      .send(await roadmaps.calendar(me(req))),
  );
  app.post('/roadmap/replan', { schema: { tags, response: { 200: RoadmapResponse } } }, (req) =>
    roadmaps.replan(me(req)),
  );
  app.post(
    '/roadmap/proposal/accept',
    { schema: { tags, response: { 200: RoadmapResponse } } },
    (req) => roadmaps.acceptProposal(me(req)),
  );
  app.post(
    '/roadmap/proposal/decline',
    { schema: { tags, response: { 200: RoadmapResponse } } },
    (req) => roadmaps.declineProposal(me(req)),
  );

  app.get(
    '/topics/:slug',
    { schema: { tags, params: SlugParam, response: { 200: TopicPageResponse } } },
    (req) => roadmaps.topicPage(me(req), req.params.slug),
  );
};
