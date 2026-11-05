import type { RoadmapItemDto, RoadmapResponse, RoadmapTopicDto, WeekPlanDto } from '@app/contracts';
import {
  Alert,
  Badge,
  Button,
  buttonClass,
  Card,
  cn,
  EmptyState,
  errorMessage,
  Spinner,
} from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronDown,
  Clock3,
  Gauge,
  RefreshCw,
  Target,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { RoleBadge, WEEKDAYS } from '../../features/goal/pickers';
import { ProposalBanner } from '../../features/roadmap/ProposalBanner';
import {
  DepthMeter,
  FastTrackBadge,
  FeasibilityCard,
  formatDate,
  formatMinutes,
  formatRange,
  PriorityBadge,
  STATUS,
  StatusIcon,
  TopicIcon,
  TRIGGER_LABEL,
} from '../../features/roadmap/parts';
import { api } from '../../lib/api';
import { setRoadmap, useGoal, useRoadmap } from '../../lib/queries';

const VIEWS = [
  { id: 'journey', label: 'Journey' },
  { id: 'weeks', label: 'Week by week' },
] as const;
type ViewId = (typeof VIEWS)[number]['id'];

function spareLabel(days: number | null) {
  if (days === null) return undefined;
  const n = Math.abs(days);
  const unit = n === 1 ? 'day' : 'days';
  return days >= 0 ? `${n} ${unit} before your deadline` : `${n} ${unit} after your deadline`;
}

export function RoadmapPage() {
  const roadmap = useRoadmap();
  const goal = useGoal();
  const [view, setView] = useState<ViewId>('journey');
  const replan = useMutation({
    mutationFn: () => api.post<RoadmapResponse>('/student/roadmap/replan'),
    onSuccess: setRoadmap,
  });

  if (roadmap.isPending) return <Spinner />;
  if (roadmap.isError) return <Alert tone="bad">{errorMessage(roadmap.error)}</Alert>;
  const { status, roadmap: r, proposal } = roadmap.data;
  if (status !== 'READY' || !r) return <NotReady status={status} />;

  const g = goal.data?.goal;
  const days = g
    ? WEEKDAYS.filter((w) => g.studyWeekdays.includes(w.day))
        .map((w) => w.short)
        .join(' · ')
    : '';

  return (
    <div className="grid gap-6 animate-rise">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow">Your roadmap</span>
          <div className="mt-2 flex items-center gap-3">
            <RoleBadge code={r.role.shortCode} color={r.role.colorKey} size={44} />
            <h1 className="text-[clamp(22px,2.8vw,32px)]">
              {r.role.title} · <span className="whitespace-nowrap">{r.bracket.label}</span>
            </h1>
          </div>
          <p className="mt-2 max-w-[62ch] text-ink-2">
            {r.totals.subtopics} subtopics across {r.topics.length} topics, in the order that makes
            each one easier than the last.
            {g && (
              <>
                {' '}
                Built around your <b>{g.dailyMinutes} min</b> on {days}.
              </>
            )}
          </p>
        </div>
        <Link to="/plan" className={buttonClass('secondary', 'sm')}>
          Change my time
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Stat
          Icon={CalendarCheck}
          label="Finish by"
          value={r.totals.plannedEndDate ? formatDate(r.totals.plannedEndDate) : '—'}
          sub={spareLabel(r.daysToSpare)}
          tone={r.daysToSpare !== null && r.daysToSpare < 0 ? 'warn' : 'ok'}
        />
        <Stat Icon={Clock3} label="Total study" value={formatMinutes(r.totals.totalMinutes)} />
        <Stat Icon={Target} label="Per week" value={formatMinutes(r.totals.weeklyMinutes)} />
        <Stat Icon={Gauge} label="Done" value={`${r.totals.percentComplete}%`} />
      </div>

      {proposal && <ProposalBanner proposal={proposal} />}
      {r.feasibility && <FeasibilityCard feasibility={r.feasibility} />}
      {r.totals.delayed > 0 && (
        <Alert
          tone="warn"
          action={
            <Button
              size="sm"
              variant="secondary"
              loading={replan.isPending}
              onClick={() => replan.mutate()}
            >
              <RefreshCw className="size-3.5" aria-hidden /> Re-plan from today
            </Button>
          }
        >
          You are behind on {r.totals.delayed} subtopic{r.totals.delayed === 1 ? '' : 's'}. No
          stress: re-plan and we will spread the rest over your study days from today.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Roadmap view" className="flex rounded-xl bg-surface-2 p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition',
                view === v.id
                  ? 'bg-surface text-ink shadow-[var(--shadow-soft)]'
                  : 'text-muted hover:text-ink',
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <a
          href="/api/v1/student/roadmap/calendar.ics"
          download
          className={buttonClass('secondary', 'sm')}
          title="Adds one event per study day to Google Calendar, Outlook or Apple Calendar"
        >
          <CalendarPlus className="size-3.5" aria-hidden /> Add to calendar
        </a>
      </div>

      {view === 'journey' ? (
        <ol className="grid gap-4" aria-label="Topics in order">
          {r.topics.map((t, i) => (
            <TopicBlock key={t.id} topic={t} index={i} last={i === r.topics.length - 1} />
          ))}
        </ol>
      ) : (
        <WeekView weeks={r.weeks} topics={r.topics} />
      )}

      <p className="text-[12.5px] text-muted">
        Plan v{r.version.versionNumber} · {TRIGGER_LABEL[r.version.trigger]} · Time estimates
        include practice and get sharper as lessons go live.
      </p>
    </div>
  );
}

function Stat({
  Icon,
  label,
  value,
  sub,
  tone = 'ok',
}: {
  Icon: typeof Clock3;
  label: string;
  value: string;
  sub?: string;
  tone?: 'ok' | 'warn';
}) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" aria-hidden />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="mt-1 font-display text-[clamp(17px,2vw,22px)] font-bold">{value}</div>
      {sub && (
        <div
          className={cn(
            'mt-0.5 text-[12px] font-medium',
            tone === 'warn' ? 'text-warn' : 'text-ok',
          )}
        >
          {sub}
        </div>
      )}
    </Card>
  );
}

/** The plan as weeks (Monday to Sunday): what to study, for how long, and what you finish. */
function WeekView({ weeks, topics }: { weeks: WeekPlanDto[]; topics: RoadmapTopicDto[] }) {
  const today = new Intl.DateTimeFormat('en-CA').format(new Date());
  const slugOf = new Map(topics.flatMap((t) => t.items.map((i) => [i.subtopicId, t.slug])));
  if (weeks.length === 0) {
    return (
      <Card>
        <EmptyState title="Nothing left to schedule">
          Every subtopic is done. Time to practise.
        </EmptyState>
      </Card>
    );
  }
  return (
    <ol className="grid gap-3" aria-label="Weeks">
      {weeks.map((w) => {
        const now = today >= w.start && today <= w.end;
        return (
          <li key={w.index}>
            <Card className={cn('overflow-hidden', now && 'border-brand/40')}>
              <div
                className={cn(
                  'flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-5',
                  now ? 'bg-brand-soft/60' : 'bg-surface-2/60',
                )}
              >
                <h3 className="flex items-center gap-2 text-[15px]">
                  Week {w.index}
                  {now && <Badge tone="next">This week</Badge>}
                </h3>
                <span className="text-[12.5px] text-muted">
                  {formatDate(w.start)} – {formatDate(w.end)} · {formatMinutes(w.minutes)} over{' '}
                  {w.studyDays} study day{w.studyDays === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {w.items.map((i) => (
                  <li key={i.subtopicId} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <span
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full',
                        i.finishes ? 'bg-ok-bg text-ok' : 'bg-surface-3 text-muted',
                      )}
                      aria-hidden
                    >
                      {i.finishes ? (
                        <Check className="size-3.5" />
                      ) : (
                        <ArrowRight className="size-3.5" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/topics/${slugOf.get(i.subtopicId) ?? ''}`}
                        className="block truncate text-[14px] font-semibold hover:underline"
                      >
                        {i.title}
                      </Link>
                      <span className="block text-[12px] text-muted">
                        {i.topicTitle} · {i.finishes ? 'finish this week' : 'continues next week'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[12.5px] text-ink-2">
                      {formatMinutes(i.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}

function TopicBlock({
  topic,
  index,
  last,
}: {
  topic: RoadmapTopicDto;
  index: number;
  last: boolean;
}) {
  const range = formatRange(topic.plannedStart, topic.plannedEnd);
  const allDone = topic.doneCount === topic.items.length;
  return (
    <li className="relative grid grid-cols-[40px_1fr] gap-3 sm:grid-cols-[48px_1fr] sm:gap-4">
      <div className="relative flex justify-center">
        <span
          className={cn(
            'z-10 grid size-10 place-items-center rounded-xl border sm:size-12',
            allDone ? 'border-ok/30 bg-ok-bg text-ok' : 'border-brand/20 bg-brand-soft text-brand',
          )}
        >
          <TopicIcon iconKey={topic.iconKey} className="size-5 sm:size-6" />
        </span>
        {!last && <span className="absolute top-12 bottom-[-16px] w-px bg-line-2" aria-hidden />}
      </div>

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <span className="eyebrow">Topic {index + 1}</span>
            <h2 className="mt-0.5 text-[17px] sm:text-lg">{topic.title}</h2>
            <p className="mt-1 max-w-[64ch] text-[13.5px] text-ink-2">{topic.summary}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
              {range && <span>{range}</span>}
              <span>{formatMinutes(topic.minutes)}</span>
              <span>
                {topic.doneCount}/{topic.items.length} done
              </span>
            </div>
          </div>
          <Link to={`/topics/${topic.slug}`} className={buttonClass('secondary', 'sm')}>
            Open <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <ul className="divide-y divide-line">
          {topic.items.map((item) => (
            <ItemRow key={item.subtopicId} item={item} />
          ))}
        </ul>
      </Card>
    </li>
  );
}

function ItemRow({ item }: { item: RoadmapItemDto }) {
  const range = formatRange(item.plannedStart, item.plannedEnd);
  const highlight = item.status === 'UP_NEXT' || item.status === 'IN_PROGRESS';
  return (
    <li className={cn(highlight && 'bg-brand-soft/40')}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3.5 hover:bg-surface-2/60 sm:px-5 [&::-webkit-details-marker]:hidden">
          <StatusIcon status={item.status} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <b className="text-[14.5px] font-semibold">{item.title}</b>
              {item.status !== 'UPCOMING' && (
                <Badge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</Badge>
              )}
              <PriorityBadge priority={item.priority} optional={item.isOptional} />
              {item.fastTrack && <FastTrackBadge />}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
              <DepthMeter rank={item.depth.rank} name={item.depth.name} />
              <span>{formatMinutes(item.estimatedMinutes)}</span>
              {range && <span>{range}</span>}
            </div>
          </div>
          <ChevronDown
            className="mt-1 size-4 shrink-0 text-muted transition group-open:rotate-180"
            aria-hidden
          />
        </summary>
        <div className="px-4 pb-4 pl-12 sm:px-5 sm:pl-13">
          <p className="text-[13.5px] text-ink-2">{item.summary}</p>
          {item.objectives.length > 0 && (
            <>
              <div className="eyebrow mt-3">You will be able to</div>
              <ul className="mt-1.5 grid gap-1 text-[13.5px]">
                {item.objectives.map((o) => (
                  <li key={o} className="flex gap-2">
                    <span className="text-brand" aria-hidden>
                      ✓
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link
            to={`/topics/${item.topicSlug}`}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline"
          >
            Learn or practise this <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </details>
    </li>
  );
}

function NotReady({ status }: { status: RoadmapResponse['status'] }) {
  return (
    <Card>
      {status === 'PENDING_CURRICULUM' ? (
        <EmptyState title="Your roadmap is almost ready">
          Our content team is finishing the curriculum for your target. Your goal and time are
          saved, so your roadmap appears here the moment it is published.
        </EmptyState>
      ) : (
        <EmptyState title="Set your goal first">
          <Link to="/onboarding" className={buttonClass('primary', 'sm')}>
            Pick a target
          </Link>
        </EmptyState>
      )}
    </Card>
  );
}
