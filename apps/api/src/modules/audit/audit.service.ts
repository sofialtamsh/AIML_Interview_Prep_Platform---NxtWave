import type { AppContext } from '../../context.ts';
import type { Prisma } from '../../db/prisma.ts';

export interface AuditEntry {
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
}

/** Append-only record of security events and admin changes. Never stores secrets. */
export class AuditService {
  constructor(private readonly ctx: AppContext) {}

  async record(entry: AuditEntry): Promise<void> {
    await this.ctx.db.auditLog.create({
      data: {
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        before: entry.before,
        after: entry.after,
        ip: entry.ip ?? null,
      },
    });
  }
}
