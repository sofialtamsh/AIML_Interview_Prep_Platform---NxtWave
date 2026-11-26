import { Alert, Button, buttonClass, Card, cn, EmptyState, errorMessage, Spinner } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { RoleBadge } from '../../features/goal/pickers';
import { MentorNote } from '../../features/goal/StudyPlan';
import { formatMinutes } from '../../features/roadmap/parts';
import { api, useMe } from '../../lib/api';
import { LEARN_SUBJECT } from '../../lib/features';
import { useRoadmap, useStudyPlan } from '../../lib/queries';

/**
 * The Learn tab: the subjects a student can study, one card each. V1 has one. A card opens the
 * subject's units; nothing here carries a date, because V1 is self-paced.
 */
export function LearnPage() {
  const { data: me } = useMe();
  const { data: plan } = useStudyPlan();
  const resend = useMutation({ mutationFn: () => api.post('/auth/resend-verification') });
  const firstName = me?.fullName.split(' ')[0] || 'there';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 animate-rise">
      <section>
        <span className="eyebrow">Learn</span>
        <h1 className="mt-2 text-[clamp(26px,3vw,36px)]">Hi {firstName}</h1>
        <p className="mt-1.5 max-w-[62ch] text-ink-2">
          Pick a subject and go at your own pace. There is no schedule to keep up with: every unit
          waits for you, and your progress is saved as you go.
        </p>
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

      {plan?.message && <MentorNote message={plan.message} />}

      <section className="grid gap-3" aria-label="Subjects">
        <h2 className="text-base">Subjects</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <SubjectCard />
        </div>
      </section>
    </div>
  );
}

function SubjectCard() {
  const roadmap = useRoadmap();
  if (roadmap.isPending) return <Spinner />;
  if (roadmap.isError) return <Alert tone="bad">{errorMessage(roadmap.error)}</Alert>;
  const { roadmap: r, status } = roadmap.data;

  if (status !== 'READY' || !r) {
    return (
      <Card>
        {status === 'PENDING_CURRICULUM' ? (
          <EmptyState title={`${LEARN_SUBJECT.title} is almost ready`}>
            Our content team is finishing the units. They appear here the moment they are published.
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

  const units = r.topics.reduce((a, t) => a + t.items.length, 0);
  const done = r.topics.reduce((a, t) => a + t.doneCount, 0);
  const next = r.nextUp;
  const started = done > 0 || r.topics.some((t) => t.items.some((i) => i.status === 'IN_PROGRESS'));
  return (
    <Link
      to="/roadmap"
      className="group rounded-[var(--radius-card)] outline-none focus-visible:ring-[3px] focus-visible:ring-brand-soft"
      aria-label={`${LEARN_SUBJECT.title}: ${done} of ${units} units done. Open the units.`}
    >
      <Card className="dotgrid grid h-full gap-4 p-5 transition group-hover:border-line-2 group-hover:shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex items-start gap-3.5">
          <RoleBadge code={r.role.shortCode} color={r.role.colorKey} size={48} />
          <div className="min-w-0">
            <span className="eyebrow">
              {units} units · {r.topics.length} topics · {formatMinutes(r.totals.totalMinutes)}
            </span>
            <h3 className="mt-0.5 text-[clamp(20px,2.4vw,24px)]">{LEARN_SUBJECT.title}</h3>
          </div>
        </div>
        <p className="text-[14px] text-ink-2">{LEARN_SUBJECT.blurb}</p>

        <ul className="grid gap-1 text-[13px] text-ink-2">
          {r.topics.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3">
              <span className="truncate">{t.title}</span>
              <span className="shrink-0 font-mono text-[12px] text-muted">
                {t.doneCount}/{t.items.length} done
              </span>
            </li>
          ))}
        </ul>

        <div>
          <div className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
            <span>
              <b className="font-display text-[15px] text-ink">{done}</b> of {units} units done
            </span>
            {next && <span className="min-w-0 truncate">Next: {next.title}</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(units ? (done / units) * 100 : 0, 2)}%` }}
            />
          </div>
        </div>

        <span className={cn(buttonClass('primary', 'sm'), 'w-fit')}>
          {done === units && units > 0
            ? 'Review the units'
            : started
              ? 'Continue learning'
              : 'Start learning'}
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </Card>
    </Link>
  );
}
