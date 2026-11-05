/**
 * Study plan → iCalendar (RFC 5545), so students can put their plan in Google Calendar,
 * Outlook or Apple Calendar. One all-day event per study day (we don't know their hours).
 */
import { addDays } from '../../lib/dates.ts';
import type { DayAllocation } from './planner.engine.ts';

export interface CalendarInput {
  calendarName: string;
  /** Stable per plan version, so re-importing updates events instead of duplicating them. */
  uidPrefix: string;
  roadmapUrl: string;
  now: Date;
  days: DayAllocation[];
  titleOf: (subtopicId: string) => string;
}

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
const esc = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

const compactDate = (iso: string) => iso.replaceAll('-', '');
const stamp = (d: Date) => `${d.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;

/** Lines longer than 75 octets are folded: CRLF followed by a space. */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length;
    if (size + n > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += n;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const formatMinutes = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
};

export function planToIcs(input: CalendarInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NxtWave Prep//Study plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(input.calendarName)}`,
  ];
  for (const day of input.days) {
    const minutes = day.items.reduce((a, i) => a + i.minutes, 0);
    const titles = day.items.map((i) => input.titleOf(i.subtopicId));
    const description = [
      ...day.items.map((i) => `• ${input.titleOf(i.subtopicId)} (${formatMinutes(i.minutes)})`),
      '',
      `Your roadmap: ${input.roadmapUrl}`,
    ].join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${input.uidPrefix}-${compactDate(day.date)}@nxtwave-prep`,
      `DTSTAMP:${stamp(input.now)}`,
      `DTSTART;VALUE=DATE:${compactDate(day.date)}`,
      `DTEND;VALUE=DATE:${compactDate(addDays(day.date, 1))}`,
      `SUMMARY:${esc(`Prep ${formatMinutes(minutes)}: ${titles.join(' + ')}`)}`,
      `DESCRIPTION:${esc(description)}`,
      `URL:${input.roadmapUrl}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
