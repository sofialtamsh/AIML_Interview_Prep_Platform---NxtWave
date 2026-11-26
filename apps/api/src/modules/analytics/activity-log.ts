import type { AppContext } from '../../context.ts';
import type { ActivityKind } from '../../generated/prisma/enums.ts';

const IST = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The calendar day in India for a moment in time, as YYYY-MM-DD. */
export const istDay = (at: Date): string => IST.format(at);

/** A YYYY-MM-DD day as the value a `@db.Date` column takes. */
export const toDbDay = (iso: string): Date => new Date(`${iso}T00:00:00Z`);

/** The day `n` days after (or, negative, before) a YYYY-MM-DD day. */
export function addDays(iso: string, n: number): string {
  const d = toDbDay(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Writes one row for something a student did. It is a record for the team's analytics and never
 * part of the work itself, so a failure here is logged and swallowed: a student's lesson step or
 * quiz answer must not fail because the activity log could not be written.
 */
export class ActivityLog {
  constructor(private readonly ctx: AppContext) {}

  async record(
    studentId: string,
    kind: ActivityKind,
    target: string | null = null,
    value = 0,
  ): Promise<void> {
    try {
      const now = this.ctx.now();
      await this.ctx.db.studentActivity.create({
        data: {
          studentId,
          kind,
          target,
          value,
          day: toDbDay(istDay(now)),
          createdAt: now,
        },
      });
    } catch (err) {
      this.ctx.log.warn({ err, kind }, 'student activity was not recorded');
    }
  }
}
