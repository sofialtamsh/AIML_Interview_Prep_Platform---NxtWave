/**
 * Calendar dates (YYYY-MM-DD) are always interpreted in the STUDENT's timezone, because
 * "today", streaks and study days are personal. Stored as Postgres DATE (UTC midnight).
 */
const DAY = 86_400_000;

export function todayIn(timeZone: string, now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export const toDbDate = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
export const fromDbDate = (d: Date): string => d.toISOString().slice(0, 10);

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toDbDate(toIso).getTime() - toDbDate(fromIso).getTime()) / DAY);
}

export function addDays(iso: string, n: number): string {
  return fromDbDate(new Date(toDbDate(iso).getTime() + n * DAY));
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
export const weekdayOf = (iso: string): number => toDbDate(iso).getUTCDay();
