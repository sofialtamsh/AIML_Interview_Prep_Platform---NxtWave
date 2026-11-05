import type {
  ChangeSummaryDto,
  FeasibilityDto,
  GoalResponse,
  ItemStatus,
  RoadmapVersionDto,
} from '@app/contracts';
import { Alert, Badge, type BadgeTone, Button, cn, errorMessage } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import {
  AlarmClock,
  BookOpen,
  CircleCheck,
  CircleDot,
  Circle as CircleIcon,
  CirclePlay,
  Grid3x3,
  Library,
  type LucideIcon,
  ScanSearch,
  Zap,
} from 'lucide-react';
import { api } from '../../lib/api';
import { setGoal, useGoal } from '../../lib/queries';
import { WEEKDAYS } from '../goal/pickers';

// ───────────── Formatting ─────────────

const DATE = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const DATE_LONG = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "Mon, 2 Nov" for a YYYY-MM-DD date (calendar dates carry no timezone). */
export const formatDate = (iso: string) => DATE.format(new Date(`${iso}T00:00:00Z`));
export const formatDateLong = (iso: string) => DATE_LONG.format(new Date(`${iso}T00:00:00Z`));

export function formatRange(start: string | null, end: string | null) {
  if (!start || !end) return null;
  return start === end ? formatDate(start) : `${formatDate(start)} → ${formatDate(end)}`;
}

/** "45 min", "1 h 35 min", "16 h". */
export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export const weekdayName = (d: number) => WEEKDAYS.find((w) => w.day === d)?.short ?? '';

// ───────────── Status, depth, icons ─────────────

export const STATUS: Record<ItemStatus, { label: string; tone: BadgeTone; Icon: LucideIcon }> = {
  DONE: { label: 'Done', tone: 'ok', Icon: CircleCheck },
  IN_PROGRESS: { label: 'In progress', tone: 'next', Icon: CircleDot },
  DELAYED: { label: 'Behind', tone: 'warn', Icon: AlarmClock },
  UP_NEXT: { label: 'Up next', tone: 'next', Icon: CirclePlay },
  UPCOMING: { label: 'Coming up', tone: 'neutral', Icon: CircleIcon },
};

export function StatusIcon({ status, className }: { status: ItemStatus; className?: string }) {
  const { Icon, label } = STATUS[status];
  return (
    <Icon
      className={cn(
        'size-5 shrink-0',
        status === 'DONE' && 'text-ok',
        status === 'DELAYED' && 'text-warn',
        (status === 'UP_NEXT' || status === 'IN_PROGRESS') && 'text-brand',
        status === 'UPCOMING' && 'text-line-2',
        className,
      )}
      aria-label={label}
    />
  );
}

/** Five segments filled up to the target depth, with its name. */
export function DepthMeter({ rank, name }: { rank: number; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`Depth ${rank} of 5: ${name}`}
      role="img"
      aria-label={`Depth ${rank} of 5: ${name}`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn('h-2.5 w-1.5 rounded-[2px]', n <= rank ? 'bg-brand' : 'bg-surface-3')}
          />
        ))}
      </span>
      <span className="text-[12.5px] font-medium text-ink-2">{name}</span>
    </span>
  );
}

const TOPIC_ICONS: Record<string, LucideIcon> = {
  'grid-3x3': Grid3x3,
  'scan-search': ScanSearch,
  library: Library,
};

export function TopicIcon({ iconKey, className }: { iconKey: string; className?: string }) {
  const Icon = TOPIC_ICONS[iconKey] ?? BookOpen;
  return <Icon className={className} aria-hidden />;
}

export function FastTrackBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-ok-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-ok"
      title="You rated yourself well here, so this goes faster. The depth stays the same."
    >
      <Zap className="size-3" aria-hidden /> Fast-track
    </span>
  );
}

export const TRIGGER_LABEL: Record<RoadmapVersionDto['trigger'], string> = {
  INITIAL: 'Built from your target',
  SETTINGS_CHANGE: 'Re-planned after you changed your time',
  REPLAN: 'Re-planned from today',
  CURRICULUM_UPDATE: 'Updated with the latest curriculum',
};

// ───────────── What changed ─────────────

export function ChangeList({ summary }: { summary: ChangeSummaryDto }) {
  const rows: Array<{ sign: string; tone: string; text: string }> = [
    ...summary.added.map((a) => ({ sign: '+', tone: 'text-ok', text: `New: ${a.title}` })),
    ...summary.removed.map((r) => ({ sign: '−', tone: 'text-bad', text: `Removed: ${r.title}` })),
    ...summary.depthChanged.map((d) => ({
      sign: '↕',
      tone: 'text-brand',
      text: `${d.title}: ${d.from} → ${d.to}`,
    })),
  ];
  const time =
    summary.minutesDelta === 0
      ? null
      : `${summary.minutesDelta > 0 ? '+' : '−'}${formatMinutes(Math.abs(summary.minutesDelta))} of study`;
  const finish =
    summary.endDateDeltaDays === null || summary.endDateDeltaDays === 0
      ? null
      : summary.endDateDeltaDays > 0
        ? `You finish ${summary.endDateDeltaDays} day${summary.endDateDeltaDays === 1 ? '' : 's'} later`
        : `You finish ${-summary.endDateDeltaDays} day${summary.endDateDeltaDays === -1 ? '' : 's'} earlier`;

  return (
    <ul className="grid gap-1.5 text-sm">
      {rows.map((r) => (
        <li key={r.text} className="flex gap-2.5">
          <span className={cn('w-3 shrink-0 text-center font-mono font-bold', r.tone)} aria-hidden>
            {r.sign}
          </span>
          {r.text}
        </li>
      ))}
      {time && <li className="pl-5.5 text-ink-2">{time}</li>}
      {finish && <li className="pl-5.5 text-ink-2">{finish}</li>}
      {rows.length === 0 && !time && !finish && (
        <li className="text-ink-2">Small wording updates only. Your dates stay the same.</li>
      )}
    </ul>
  );
}

// ───────────── Deadline doesn't fit ─────────────

/** Shows why the deadline doesn't fit and lets the student pick a fix. Nothing changes on its own. */
export function FeasibilityCard({ feasibility }: { feasibility: FeasibilityDto }) {
  const { data } = useGoal();
  const g = data?.goal;
  const apply = useMutation({
    mutationFn: (patch: { dailyMinutes?: number; studyWeekdays?: number[]; deadline?: string }) =>
      g
        ? api.put<GoalResponse>('/student/goal/schedule', {
            dailyMinutes: g.dailyMinutes,
            studyWeekdays: g.studyWeekdays,
            deadline: g.deadline,
            ...patch,
          })
        : Promise.reject(new Error('Set your goal first.')),
    onSuccess: setGoal,
  });
  if (feasibility.feasible || !g) return null;
  const o = feasibility.options;

  return (
    <div className="rounded-[var(--radius-card)] border border-warn/30 bg-warn-bg p-5">
      <div className="flex items-start gap-3">
        <AlarmClock className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base text-warn">
            Heads up: this runs {feasibility.daysOver} day{feasibility.daysOver === 1 ? '' : 's'}{' '}
            past your deadline
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            Your deadline is {formatDateLong(feasibility.deadline)}. Pick one fix below, or keep
            going as is. We never drop topics without asking.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {o.increaseDailyTo !== null && (
              <Button
                size="sm"
                variant="secondary"
                loading={apply.isPending && apply.variables?.dailyMinutes !== undefined}
                onClick={() => apply.mutate({ dailyMinutes: o.increaseDailyTo ?? g.dailyMinutes })}
              >
                Study {o.increaseDailyTo} min a day
              </Button>
            )}
            {o.addStudyDay && (
              <Button
                size="sm"
                variant="secondary"
                loading={apply.isPending && apply.variables?.studyWeekdays !== undefined}
                onClick={() =>
                  apply.mutate({ studyWeekdays: [...g.studyWeekdays, o.addStudyDay?.weekday ?? 0] })
                }
              >
                Add {weekdayName(o.addStudyDay.weekday)}s
                <span className="font-normal text-muted">
                  {o.addStudyDay.fits ? '· fits' : `· ends ${formatDate(o.addStudyDay.endDate)}`}
                </span>
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              loading={apply.isPending && apply.variables?.deadline !== undefined}
              onClick={() => apply.mutate({ deadline: o.extendDeadlineTo })}
            >
              Move deadline to {formatDate(o.extendDeadlineTo)}
            </Button>
          </div>
          {o.skipOptional && (
            <p className="mt-3 text-[13px] text-ink-2">
              Tip: the optional subtopics add {formatMinutes(o.skipOptional.minutesSaved)}. Leave
              them for last if time gets tight
              {o.skipOptional.fits ? ' and you will make the deadline.' : '.'}
            </p>
          )}
          {apply.isError && (
            <div className="mt-3">
              <Alert tone="bad">{errorMessage(apply.error)}</Alert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PriorityBadge({ priority, optional }: { priority: string; optional: boolean }) {
  if (optional) return <Badge tone="planned">Optional</Badge>;
  if (priority === 'HIGH') return <Badge tone="next">Must-know</Badge>;
  return null;
}
