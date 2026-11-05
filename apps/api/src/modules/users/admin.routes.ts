import {
  AdminListResponse,
  AdminOverview,
  InviteAdminBody,
  InviteAdminResponse,
} from '@app/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { authOf, requestMeta, requireAdmin, requireSuperAdmin } from '../../http/auth.ts';

const DAY = 86_400_000;

/** /api/v1/admin — admin console API. Every route requires an admin-audience session. */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('onRequest', requireAdmin);
  const { auth, ctx } = app.services;

  app.get(
    '/overview',
    { schema: { tags: ['admin'], response: { 200: AdminOverview } } },
    async () => {
      const weekAgo = new Date(ctx.now().getTime() - 7 * DAY);
      const live = { role: 'STUDENT' as const, status: { not: 'DELETED' as const } };
      const [
        total,
        verified,
        onboarded,
        joinedLast7Days,
        activeRows,
        admins,
        byRole,
        byBracket,
        roles,
        brackets,
      ] = await Promise.all([
        ctx.db.user.count({ where: live }),
        ctx.db.user.count({ where: { ...live, emailVerifiedAt: { not: null } } }),
        ctx.db.user.count({
          where: { ...live, studentProfile: { onboardingCompletedAt: { not: null } } },
        }),
        ctx.db.user.count({ where: { role: 'STUDENT', createdAt: { gte: weekAgo } } }),
        ctx.db.session.findMany({
          where: { audience: 'STUDENT', lastSeenAt: { gte: weekAgo } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        ctx.db.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'ACTIVE' } }),
        ctx.db.studentGoal.groupBy({ by: ['roleId'], where: { isActive: true }, _count: true }),
        ctx.db.studentGoal.groupBy({ by: ['bracketId'], where: { isActive: true }, _count: true }),
        ctx.db.careerRole.findMany({
          select: { id: true, title: true },
          orderBy: { sortOrder: 'asc' },
        }),
        ctx.db.packageBracket.findMany({
          select: { id: true, label: true },
          orderBy: { sortOrder: 'asc' },
        }),
      ]);
      const roleCounts = new Map(byRole.map((r) => [r.roleId, r._count]));
      const bracketCounts = new Map(byBracket.map((b) => [b.bracketId, b._count]));
      return {
        students: {
          total,
          verified,
          onboarded,
          joinedLast7Days,
          activeLast7Days: activeRows.length,
        },
        byRole: roles
          .map((r) => ({ id: r.id, label: r.title, count: roleCounts.get(r.id) ?? 0 }))
          .filter((r) => r.count > 0),
        byBracket: brackets
          .map((b) => ({ id: b.id, label: b.label, count: bracketCounts.get(b.id) ?? 0 }))
          .filter((b) => b.count > 0),
        admins,
      };
    },
  );

  app.get(
    '/admins',
    {
      onRequest: requireSuperAdmin,
      schema: { tags: ['admin'], response: { 200: AdminListResponse } },
    },
    async () => {
      const rows = await ctx.db.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        include: { adminProfile: true },
        orderBy: { createdAt: 'asc' },
      });
      return {
        items: rows.map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.adminProfile?.fullName ?? null,
          role: u.role,
          status: u.status,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        })),
      };
    },
  );

  app.post(
    '/admins/invites',
    {
      onRequest: requireSuperAdmin,
      schema: { tags: ['admin'], body: InviteAdminBody, response: { 201: InviteAdminResponse } },
    },
    async (req, reply) => {
      const { user } = authOf(req);
      const invite = await auth.inviteAdmin(
        req.body.email,
        req.body.role,
        { id: user.id, name: user.adminProfile?.fullName ?? user.email },
        requestMeta(req),
      );
      return reply.status(201).send({ ...invite, expiresAt: invite.expiresAt.toISOString() });
    },
  );
};
