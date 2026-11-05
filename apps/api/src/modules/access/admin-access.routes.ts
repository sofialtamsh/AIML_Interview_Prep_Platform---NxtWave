import {
  AddAllowlistBody,
  AddAllowlistResponse,
  AllowlistQuery,
  AllowlistResponse,
  CohortBody,
  CohortDto,
  CohortListResponse,
  CohortPatch,
  IdParam,
  OkResponse,
  RegistrationSettings,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin, requireSuperAdmin } from '../../http/auth.ts';

const tags = ['admin-access'];

/** /api/v1/admin/access — cohorts, enrollment allowlist and the registration policy. */
export const adminAccessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { access } = app.services;

  app.get('/cohorts', { schema: { tags, response: { 200: CohortListResponse } } }, async () => ({
    items: await access.listCohorts(),
  }));
  app.post(
    '/cohorts',
    { schema: { tags, body: CohortBody, response: { 201: CohortDto } } },
    async (req, reply) => reply.status(201).send(await access.createCohort(req.body, actorOf(req))),
  );
  app.patch(
    '/cohorts/:id',
    { schema: { tags, params: IdParam, body: CohortPatch, response: { 200: CohortDto } } },
    (req) => access.updateCohort(req.params.id, req.body, actorOf(req)),
  );
  app.delete(
    '/cohorts/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await access.deleteCohort(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );

  app.get(
    '/allowlist',
    { schema: { tags, querystring: AllowlistQuery, response: { 200: AllowlistResponse } } },
    (req) => access.listAllowlist(req.query),
  );
  app.post(
    '/allowlist',
    {
      bodyLimit: 512 * 1024,
      schema: { tags, body: AddAllowlistBody, response: { 200: AddAllowlistResponse } },
    },
    (req) => access.addToAllowlist(req.body, actorOf(req)),
  );
  app.delete(
    '/allowlist/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await access.removeFromAllowlist(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );

  app.get(
    '/registration',
    { schema: { tags, response: { 200: RegistrationSettings } } },
    async () => ({
      policy: await access.getRegistrationPolicy(),
    }),
  );
  app.put(
    '/registration',
    {
      onRequest: requireSuperAdmin,
      schema: { tags, body: RegistrationSettings, response: { 200: RegistrationSettings } },
    },
    async (req) => ({ policy: await access.setRegistrationPolicy(req.body.policy, actorOf(req)) }),
  );
};
