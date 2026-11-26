import { cn } from '@app/ui';
import { CalendarCheck, CalendarDays, Clock3, Megaphone } from 'lucide-react';
import { formatDate } from '../roadmap/parts';
import { presetLabel, WEEKDAYS } from './pickers';

const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const short = (d: number) => WEEKDAYS.find((w) => w.day === d)?.short ?? '';

/** [1..6] → "Mon–Sat", [1,3,5] → "Mon · Wed · Fri", all seven → "Every day". */
export function dayRange(days: number[]) {
  const sorted = MON_FIRST.filter((d) => days.includes(d));
  if (sorted.length === 7) return 'Every day';
  const at = sorted.map((d) => MON_FIRST.indexOf(d));
  const runs = at.every((v, i) => i === 0 || v === (at[i - 1] ?? -1) + 1);
  if (runs && sorted.length >= 3) return `${short(sorted[0] ?? 1)}–${short(sorted.at(-1) ?? 6)}`;
  return sorted.map(short).join(' · ');
}

/** A note from the team, shown as a friendly message. */
export function MentorNote({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-3 rounded-[var(--radius-card)] border border-brand/25 bg-brand-soft px-4 py-3.5',
        className,
      )}
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-brand-ink">
        <Megaphone className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <span className="eyebrow text-brand-deep">From your mentors</span>
        <p className="mt-0.5 text-[14.5px] whitespace-pre-line text-ink">{message}</p>
      </div>
    </div>
  );
}

/** Daily time, study days and deadline as three tiles. */
export function PlanFacts({
  dailyMinutes,
  studyWeekdays,
  deadline,
  daysToDeadline,
}: {
  dailyMinutes: number;
  studyWeekdays: number[];
  deadline: string | null;
  daysToDeadline?: number | null;
}) {
  const left =
    daysToDeadline === undefined || daysToDeadline === null
      ? null
      : daysToDeadline > 0
        ? `${daysToDeadline} day${daysToDeadline === 1 ? '' : 's'} left`
        : daysToDeadline === 0
          ? 'Today'
          : 'Date passed';
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Fact Icon={Clock3} label="Every study day" value={presetLabel(dailyMinutes)} />
      <Fact
        Icon={CalendarDays}
        label="Study days"
        value={dayRange(studyWeekdays)}
        sub={`${studyWeekdays.length} day${studyWeekdays.length === 1 ? '' : 's'} a week`}
      />
      <Fact
        Icon={CalendarCheck}
        label="Finish by"
        value={deadline ? formatDate(deadline) : 'No fixed date'}
        sub={left ?? undefined}
      />
    </div>
  );
}

function Fact({
  Icon,
  label,
  value,
  sub,
}: {
  Icon: typeof Clock3;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" aria-hidden />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="mt-1 font-display text-lg font-bold">{value}</div>
      {sub && <div className="text-[12px] text-muted">{sub}</div>}
    </div>
  );
}
