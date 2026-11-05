import {
  ChangeTargetBody,
  CompleteOnboardingBody,
  GoalResponse,
  InterestBody,
  InterestResponse,
  OnboardingDraft,
  OnboardingState,
  Schedule,
  StudentCatalogResponse,
  UpdateSkillsBody,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireStudent } from '../../http/auth.ts';

const tags = ['student'];

/** /api/v1/student — catalog, onboarding, goal and interest for the signed-in student. */
export const studentGoalsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { catalog, goals } = app.services;
  const tzOf = (req: Parameters<typeof authOf>[0]) =>
    authOf(req).user.studentProfile?.timezone ?? 'Asia/Kolkata';

  app.get('/catalog', { schema: { tags, response: { 200: StudentCatalogResponse } } }, (req) =>
    catalog.studentCatalog(authOf(req).user.id),
  );

  app.get('/onboarding', { schema: { tags, response: { 200: OnboardingState } } }, (req) =>
    goals.getOnboarding(authOf(req).user),
  );
  app.put(
    '/onboarding',
    { schema: { tags, body: OnboardingDraft, response: { 200: OnboardingState } } },
    (req) => goals.saveDraft(authOf(req).user, req.body),
  );
  app.post(
    '/onboarding/complete',
    { schema: { tags, body: CompleteOnboardingBody, response: { 200: GoalResponse } } },
    (req) => goals.completeOnboarding(authOf(req).user, req.body),
  );

  app.get('/goal', { schema: { tags, response: { 200: GoalResponse } } }, (req) =>
    goals.getGoal(authOf(req).user.id, tzOf(req)),
  );
  app.put(
    '/goal/schedule',
    { schema: { tags, body: Schedule, response: { 200: GoalResponse } } },
    (req) => goals.updateSchedule(authOf(req).user, req.body),
  );
  app.post(
    '/goal/target',
    { schema: { tags, body: ChangeTargetBody, response: { 200: GoalResponse } } },
    (req) => goals.changeTarget(authOf(req).user, req.body),
  );
  app.put(
    '/skills',
    { schema: { tags, body: UpdateSkillsBody, response: { 200: GoalResponse } } },
    (req) => goals.updateSkills(authOf(req).user, req.body.skills),
  );

  app.post(
    '/interest',
    { schema: { tags, body: InterestBody, response: { 200: InterestResponse } } },
    (req) =>
      goals.setInterest(authOf(req).user.id, req.body.kind, req.body.targetId, req.body.notify),
  );
};
