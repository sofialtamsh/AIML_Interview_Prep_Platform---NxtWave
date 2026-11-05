import type { PaceDto, PaceKey, PlanPreview } from '@app/contracts';
import { cn, Spinner } from '@app/ui';
import { CalendarCheck, Check, ChevronDown, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatMinutes } from '../roadmap/parts';
import { type ScheduleValue, WEEKDAYS } from './pickers';

const PACE_LABEL: Record<PaceKey, string> = {
  recommended: 'Recommended',
  'just-in-time': 'Just in time',
  'every-day': 'Study every day',
  light: 'Light',
  steady: 'Steady',
  intensive: 'Intensive',
};

/** When the chosen time already leaves revision days, the suggestions are lighter options. */
const ROOMY_LABEL: Partial<Record<PaceKey, string>> = {
  recommended: 'Lighter, still revises',
  'just-in-time': 'Lightest that fits',
};

const dayList = (days: number[]) =>
  days.length === 7
    ? 'every day'
    : WEEKDAYS.filter((w) => days.includes(w.day))
        .map((w) => w.short)
        .join(', ');

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * "How long will my prep take?" for the schedule being edited: total study time, finish
 * date, deadline fit, suggested paces (tap to fill the form) and the first weeks of the plan.
 * Nothing here saves anything.
 */
export function PlanTimeline({
  preview,
  loading,
  schedule,
  onPick,
  compact = false,
}: {
  preview: PlanPreview | null | undefined;
  loading: boolean;
  schedule: ScheduleValue;
  onPick?: (s: ScheduleValue) => void;
  compact?: boolean;
}) {
  if (!preview) {
    return loading ? (
      <div className="mt-5">
        <Spinner label="Working out your timeline" />
      </div>
    ) : null;
  }
  const p = preview.proposed;
  const f = preview.feasibility;
  const late = f !== null && !f.feasible;
  const tight =
    !late &&
    preview.daysToSpare !== null &&
    preview.revisionDays !== null &&
    preview.daysToSpare < preview.revisionDays;
  const roomy = f !== null && !late && !tight;

  return (
    <section
      className={cn('mt-5 rounded-2xl border border-line bg-surface', loading && 'opacity-70')}
      aria-live="polite"
      aria-label="Your prep timeline"
    >
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <CalendarCheck className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <span className="eyebrow">Your prep timeline</span>
          <p className="mt-1 text-[15px] leading-relaxed">
            Your target needs about <b>{formatMinutes(p.totalMinutes)}</b> of study across{' '}
            {plural(p.subtopics, 'subtopic')}. At <b>{schedule.dailyMinutes} min</b> on{' '}
            {dayList(schedule.studyWeekdays)}, you finish in{' '}
            <b>{plural(preview.weeks.length, 'week')}</b>
            {p.plannedEndDate && (
              <>
                , by <b>{formatDate(p.plannedEndDate)}</b>
              </>
            )}
            .
          </p>
        </div>
      </div>

      {f && (
        <div
          className={cn(
            'mx-5 mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-[13.5px]',
            late || tight ? 'bg-warn-bg text-warn' : 'bg-ok-bg text-ok',
          )}
        >
          {late || tight ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <span>
            {late
              ? `This runs ${plural(f.daysOver, 'day')} past your deadline (${formatDate(f.deadline)}). Pick a pace below, or move the date.`
              : tight
                ? `You finish ${preview.daysToSpare === 0 ? 'right on' : `${plural(preview.daysToSpare ?? 0, 'day')} before`} your deadline. Leave about ${plural(preview.revisionDays ?? 0, 'day')} for revision and mock interviews.`
                : `That leaves ${plural(preview.daysToSpare ?? 0, 'day')} before your deadline for revision and practice.`}
          </span>
        </div>
      )}

      {preview.paces.length > 0 && onPick && (
        <div className="px-5 pt-4">
          <div className="eyebrow">
            {!f
              ? 'Pick a pace (you can change it any time)'
              : roomy
                ? 'You have room. Lighter paces that still fit'
                : 'Paces that fit your deadline'}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {preview.paces.map((pace) => (
              <PaceCard
                key={pace.key}
                pace={pace}
                label={(roomy && ROOMY_LABEL[pace.key]) || PACE_LABEL[pace.key]}
                selected={
                  pace.dailyMinutes === schedule.dailyMinutes &&
                  pace.studyWeekdays.join() === [...schedule.studyWeekdays].sort().join()
                }
                onPick={() =>
                  onPick({
                    ...schedule,
                    dailyMinutes: pace.dailyMinutes,
                    studyWeekdays: pace.studyWeekdays,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}
      {late && preview.paces.length === 0 && (
        <p className="px-5 pt-3 text-[13px] text-muted">
          Even 10 hours a day can't make this date on these days. Try a later deadline.
        </p>
      )}

      {!compact && <WeekStrip weeks={preview.weeks} />}
      <div className="h-5" />
    </section>
  );
}

function PaceCard({
  pace,
  label,
  selected,
  onPick,
}: {
  pace: PaceDto;
  label: string;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={cn(
        'grid gap-0.5 rounded-xl border px-3.5 py-3 text-left transition',
        selected
          ? 'border-ink bg-ink text-surface'
          : 'border-line bg-surface hover:border-line-2 hover:bg-surface-2',
      )}
    >
      <span className="flex items-center justify-between gap-2 text-[12px] font-semibold">
        {label}
        {selected && <Check className="size-3.5" aria-hidden />}
      </span>
      <b className="font-display text-[17px]">{pace.dailyMinutes} min a day</b>
      <span className={cn('text-[12.5px]', selected ? 'text-surface/80' : 'text-muted')}>
        {dayList(pace.studyWeekdays)}
        {pace.plannedEndDate && ` · done ${formatDate(pace.plannedEndDate)}`}
        {pace.daysToSpare !== null &&
          pace.daysToSpare > 0 &&
          ` · ${plural(pace.daysToSpare, 'day')} to revise`}
      </span>
    </button>
  );
}

function WeekStrip({ weeks }: { weeks: PlanPreview['weeks'] }) {
  const [all, setAll] = useState(false);
  const shown = all ? weeks : weeks.slice(0, 3);
  if (weeks.length === 0) return null;
  return (
    <div className="px-5 pt-4">
      <div className="eyebrow">Week by week</div>
      <ol className="mt-2 grid gap-2">
        {shown.map((w) => (
          <li key={w.index} className="rounded-xl bg-surface-2 px-3.5 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
              <b>
                Week {w.index}{' '}
                <span className="font-normal text-muted">
                  · {formatDate(w.start)} – {formatDate(w.end)}
                </span>
              </b>
              <span className="text-muted">{formatMinutes(w.minutes)}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink-2">
              {w.items.map((i, n) => (
                <span key={i.subtopicId}>
                  {n > 0 && ' · '}
                  {i.title}
                  {i.finishes && (
                    <Check
                      className="ml-0.5 inline size-3 text-ok"
                      aria-label="finished this week"
                    />
                  )}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ol>
      {weeks.length > 3 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
        >
          {all ? 'Show fewer weeks' : `Show all ${weeks.length} weeks`}
          <ChevronDown className={cn('size-3.5 transition', all && 'rotate-180')} aria-hidden />
        </button>
      )}
    </div>
  );
}
