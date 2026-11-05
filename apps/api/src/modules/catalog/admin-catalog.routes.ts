import {
  AdminCatalogResponse,
  BracketBody,
  BracketPatch,
  CareerRoleDto,
  CompanyBody,
  CompanyDto,
  DepthLevelDto,
  DepthLevelPatch,
  DifficultyPolicy,
  IdParam,
  OkResponse,
  PackageBracketDto,
  RankParam,
  RoleBody,
  RolePatch,
  SkillAreaBody,
  SkillAreaDto,
  SkillAreaPatch,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { actorOf, requireAdmin } from '../../http/auth.ts';

const tags = ['admin-catalog'];

/** /api/v1/admin/catalog — roles, packages, depth levels, skill areas, companies. */
export const adminCatalogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { catalog } = app.services;

  app.get('/', { schema: { tags, response: { 200: AdminCatalogResponse } } }, () =>
    catalog.adminCatalog(),
  );

  // Roles
  app.post(
    '/roles',
    { schema: { tags, body: RoleBody, response: { 201: CareerRoleDto } } },
    async (req, reply) => reply.status(201).send(await catalog.createRole(req.body, actorOf(req))),
  );
  app.patch(
    '/roles/:id',
    { schema: { tags, params: IdParam, body: RolePatch, response: { 200: CareerRoleDto } } },
    (req) => catalog.updateRole(req.params.id, req.body, actorOf(req)),
  );

  // Package brackets
  app.post(
    '/brackets',
    { schema: { tags, body: BracketBody, response: { 201: PackageBracketDto } } },
    async (req, reply) =>
      reply.status(201).send(await catalog.createBracket(req.body, actorOf(req))),
  );
  app.patch(
    '/brackets/:id',
    { schema: { tags, params: IdParam, body: BracketPatch, response: { 200: PackageBracketDto } } },
    (req) => catalog.updateBracket(req.params.id, req.body, actorOf(req)),
  );
  app.put(
    '/brackets/:id/difficulty-policy',
    {
      schema: {
        tags,
        params: IdParam,
        body: DifficultyPolicy,
        response: { 200: PackageBracketDto },
      },
    },
    (req) => catalog.setDifficultyPolicy(req.params.id, req.body, actorOf(req)),
  );

  // Depth levels (the five ranks are fixed; their wording and guidance are editable)
  app.patch(
    '/depth-levels/:rank',
    {
      schema: { tags, params: RankParam, body: DepthLevelPatch, response: { 200: DepthLevelDto } },
    },
    (req) => catalog.updateDepthLevel(req.params.rank, req.body, actorOf(req)),
  );

  // Skill areas
  app.post(
    '/skill-areas',
    { schema: { tags, body: SkillAreaBody, response: { 201: SkillAreaDto } } },
    async (req, reply) =>
      reply.status(201).send(await catalog.createSkillArea(req.body, actorOf(req))),
  );
  app.patch(
    '/skill-areas/:id',
    { schema: { tags, params: IdParam, body: SkillAreaPatch, response: { 200: SkillAreaDto } } },
    (req) => catalog.updateSkillArea(req.params.id, req.body, actorOf(req)),
  );
  app.delete(
    '/skill-areas/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await catalog.deleteSkillArea(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );

  // Companies
  app.post(
    '/companies',
    { schema: { tags, body: CompanyBody, response: { 201: CompanyDto } } },
    async (req, reply) =>
      reply.status(201).send(await catalog.createCompany(req.body.name, actorOf(req))),
  );
  app.patch(
    '/companies/:id',
    { schema: { tags, params: IdParam, body: CompanyBody, response: { 200: CompanyDto } } },
    (req) => catalog.updateCompany(req.params.id, req.body.name, actorOf(req)),
  );
  app.delete(
    '/companies/:id',
    { schema: { tags, params: IdParam, response: { 200: OkResponse } } },
    async (req) => {
      await catalog.deleteCompany(req.params.id, actorOf(req));
      return { ok: true as const };
    },
  );
};
