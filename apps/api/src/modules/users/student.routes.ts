import { StudentMeResponse, UpdateProfileBody } from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requireStudent } from '../../http/auth.ts';
import { AppError } from '../../lib/errors.ts';
import { toStudentMe } from '../auth/auth.service.ts';

/** /api/v1/student — everything here is scoped to the signed-in student. */
export const studentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireStudent);
  const { auth, ctx } = app.services;

  app.get(
    '/profile',
    { schema: { tags: ['student'], response: { 200: StudentMeResponse } } },
    async (req) => ({ user: toStudentMe(authOf(req).user) }),
  );

  app.patch(
    '/profile',
    {
      schema: { tags: ['student'], body: UpdateProfileBody, response: { 200: StudentMeResponse } },
    },
    async (req) => {
      const { user } = authOf(req);
      if (req.body.timezone && !isValidTimezone(req.body.timezone)) {
        throw new AppError('VALIDATION_ERROR', 'Pick a valid timezone.', {
          fields: { timezone: 'Pick a valid timezone.' },
        });
      }
      await ctx.db.studentProfile.update({
        where: { userId: user.id },
        data: { fullName: req.body.fullName, timezone: req.body.timezone },
      });
      return { user: toStudentMe(await auth.loadUser(user.id)) };
    },
  );
};

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
