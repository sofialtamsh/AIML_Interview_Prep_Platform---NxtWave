import { Alert, Button, buttonClass, Card, cn, errorMessage, Spinner } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CalendarClock, Clock3, Route, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router';
import { formatHours, LEVELS, RoleBadge, WEEKDAYS } from '../../features/goal/pickers';
import { ProposalBanner } from '../../features/roadmap/ProposalBanner';
import {
  DepthMeter,
  formatDate,
  formatMinutes,
  formatRange,
  STATUS,
  StatusIcon,
  TopicIcon,
} from '../../features/roadmap/parts';
import { api, useMe } from '../../lib/api';
import { useGoal, useRoadmap } from '../../lib/queries';

export function HomePage() {
  const { data: me } = useMe();
  const goal = useGoal();
  const resend = useMutation({ mutationFn: () => api.post('/auth/resend-verification') });
  const firstName = me?.fullName.split(' ')[0] || 'there';
  const g = goal.data?.goal;

  return (
    <div className="grid gap-6 animate-rise">
      <section>
        <span className="eyebrow">Your prep space</span>
        <h1 className="mt-2 text-[clamp(26px,3vw,36px)]">Hi {firstName} 👋</h1>
      </section>

      {me && !me.emailVerified && (
        <Alert
          tone={resend.isSuccess ? 'ok' : resend.isError ? 'bad' : 'warn'}
          action={
            !resend.isSuccess && (
              <Button
                size="sm"
                variant="secondary"
                loading={resend.isPending}
                onClick={() => resend.mutate()}
              >
                Resend link
              </Button>
            )
          }
        >
          {resend.isSuccess
            ? `Fresh link sent to ${me.email}. Check your inbox (and spam).`
            : resend.isError
              ? errorMessage(resend.error)
              : `Please confirm your email. We sent a link to ${me.email}.`}
        </Alert>
      )}

      {goal.isPending && <Spinner />}
      {goal.isError && <Alert tone="bad">{errorMessage(goal.error)}</Alert>}

      {g && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="dotgrid relative overflow-hidden p-6">
            <span className="eyebrow">Your target</span>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <RoleBadge code={g.role.shortCode} color={g.role.colorKey} size={48} />
              <div>
                <h2 className="text-[clamp(20px,2.4vw,26px)]">{g.role.title}</h2>
                <p className="text-sm text-ink-2">
                  <b className="font-display">{g.bracket.label}</b> · {g.bracket.headline}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Fact Icon={Clock3} label="Per study day" value={`${g.dailyMinutes} min`} />
              <Fact Icon={CalendarClock} label="Per week" value={formatHours(g.weeklyMinutes)} />
              <Fact
                Icon={Route}
                label="Deadline"
                value={g.daysToDeadline === null ? 'Open' : `${g.daysToDeadline} days`}
              />
            </div>
            <p className="mt-4 text-[13px] text-muted">
              Study days:{' '}
              {WEEKDAYS.filter((w) => g.studyWeekdays.includes(w.day))
                .map((w) => w.short)
                .join(' · ')}
            </p>
            <Link to="/plan" className={cn(buttonClass('secondary', 'sm'), 'mt-5')}>
              <SlidersHorizontal className="size-3.5" aria-hidden /> Adjust my plan
            </Link>
          </Card>

          <Card className="p-6">
            <span className="eyebrow">Your self-check</span>
            <ul className="mt-3 grid gap-2">
              {goal.data?.skills.map((s) => {
                const l = LEVELS[s.level];
                return (
                  <li
                    key={s.skillAreaId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{s.name}</span>
                    <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[12.5px] text-ink-2">
                      {l?.emoji} {l?.label}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-[13px] text-muted">
              Topics you are confident in become quick refreshers in your lessons. Nothing gets
              skipped.
            </p>
          </Card>
        </div>
      )}

      {g && <RoadmapCard />}
    </div>
  );
}

function Fact({ Icon, label, value }: { Icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-muted">
        <Icon className="size-3.5" aria-hidden />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}

function RoadmapCard() {
  const roadmap = useRoadmap();
  if (roadmap.isPending) return <Spinner />;
  if (roadmap.isError) return <Alert tone="bad">{errorMessage(roadmap.error)}</Alert>;
  const { roadmap: r, proposal, status } = roadmap.data;

  if (status !== 'READY' || !r) {
    return (
      <Card className="p-6">
        <span className="eyebrow">Your roadmap</span>
        <h2 className="mt-2 text-lg">Your roadmap is almost ready</h2>
        <p className="mt-1.5 max-w-[65ch] text-sm text-ink-2">
          Our content team is finishing the curriculum for your target. Your goal and time are
          saved, so it appears here the moment it is published.
        </p>
      </Card>
    );
  }

  const next = r.nextUp;
  return (
    <div className="grid gap-4">
      {proposal && <ProposalBanner proposal={proposal} />}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow">{next ? STATUS[next.status].label : 'All done'}</span>
            {r.totals.delayed > 0 && (
              <span className="text-[12.5px] font-semibold text-warn">
                {r.totals.delayed} behind
              </span>
            )}
          </div>
          {next ? (
            <>
              <div className="mt-3 flex items-start gap-3">
                <StatusIcon status={next.status} className="mt-1" />
                <div className="min-w-0">
                  <h2 className="text-[clamp(18px,2.2vw,22px)]">{next.title}</h2>
                  <p className="mt-1 text-sm text-ink-2">{next.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                    <DepthMeter rank={next.depth.rank} name={next.depth.name} />
                    <span>{formatMinutes(next.estimatedMinutes)}</span>
                    {formatRange(next.plannedStart, next.plannedEnd) && (
                      <span>{formatRange(next.plannedStart, next.plannedEnd)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={`/topics/${next.topicSlug}`} className={buttonClass('primary', 'sm')}>
                  Start here <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                <Link to="/roadmap" className={buttonClass('secondary', 'sm')}>
                  See full roadmap
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-2">
              You finished every subtopic. Time to practise.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <span className="eyebrow">Your journey</span>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <b className="font-display text-2xl">{r.totals.percentComplete}%</b>
            <span className="text-[12.5px] text-muted">
              {r.totals.plannedEndDate
                ? `done by ${formatDate(r.totals.plannedEndDate)}`
                : 'no end date'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(r.totals.percentComplete, 2)}%` }}
            />
          </div>
          <ol className="mt-4 grid gap-2.5">
            {r.topics.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/topics/${t.slug}`}
                  className="flex items-center gap-3 rounded-lg p-1 -m-1 hover:bg-surface-2"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                    <TopicIcon iconKey={t.iconKey} className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{t.title}</span>
                    <span className="block text-[12px] text-muted">
                      {t.doneCount}/{t.items.length} done · {formatMinutes(t.minutes)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
