import { z } from 'zod';
import { Email } from './auth';
import { UserRole } from './common';

const Breakdown = z.array(z.object({ id: z.string(), label: z.string(), count: z.number().int() }));

export const AdminOverview = z.object({
  students: z.object({
    total: z.number().int(),
    verified: z.number().int(),
    onboarded: z.number().int(),
    joinedLast7Days: z.number().int(),
    activeLast7Days: z.number().int(),
  }),
  byRole: Breakdown,
  byBracket: Breakdown,
  admins: z.number().int(),
});
export type AdminOverview = z.infer<typeof AdminOverview>;

export const AdminListItem = z.object({
  id: z.string(),
  email: z.string(),
  fullName: z.string().nullable(),
  role: UserRole,
  status: z.enum(['ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED']),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminListItem = z.infer<typeof AdminListItem>;

export const AdminListResponse = z.object({ items: z.array(AdminListItem) });
export type AdminListResponse = z.infer<typeof AdminListResponse>;

export const InviteAdminBody = z.object({
  email: Email,
  role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN'),
});
export type InviteAdminBody = z.infer<typeof InviteAdminBody>;

export const InviteAdminResponse = z.object({
  id: z.string(),
  email: z.string(),
  /** Returned so a super admin can share it directly if email delivery is not set up yet. */
  inviteUrl: z.string(),
  expiresAt: z.string(),
});
export type InviteAdminResponse = z.infer<typeof InviteAdminResponse>;
