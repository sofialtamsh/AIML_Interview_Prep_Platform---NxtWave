import type { RoadmapTopicDto } from '@app/contracts';
import { Alert, buttonClass, Card, cn, EmptyState, errorMessage, Spinner } from '@app/ui';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { RoleBadge } from '../../features/goal/pickers';
import { ProposalBanner } from '../../features/roadmap/ProposalBanner';
import { formatMinutes, TopicIcon } from '../../features/roadmap/parts';
import { LEARN_SUBJECT } from '../../lib/features';
import { useRoadmap, useTopic } from '../../lib/queries';
import { SubtopicCard } from './TopicPage';

/**
 * A subject's units, self-paced: every unit of every topic in teaching order, each with its
 * lesson one click away. No dates, no weeks, nothing marked behind. It reads the same roadmap
 * as the dated view it stands in for, so progress and order are the same.
 */
export function SubjectPage() {
  const roadmap = useRoadmap();
  if (roadmap.isPending) return <Spinner />;
  if (roadmap.isError) return <Alert tone="bad">{errorMessage(roadmap.error)}</Alert>;
  const { status, roadmap: r, proposal } = roadmap.data;

  const back = (
    <Link
      to="/"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> All subjects
    </Link>
  );

  if (status !== 'READY' || !r) {
    return (
      <div className="grid gap-4">
        {back}
        <Card>
          {status === 'PENDING_CURRICULUM' ? (
            <EmptyState title={`${LEARN_SUBJECT.title} is almost ready`}>
              Our content team is finishing the units. They appear here the moment they are
              published.
            </EmptyState>
          ) : (
            <EmptyState title="Set your goal first">
              <Link to="/onboarding" className={buttonClass('primary', 'sm')}>
                Pick a target
              </Link>
            </EmptyState>
          )}
        </Card>
      </div>
    );
  }

  const units = r.topics.reduce((a, t) => a + t.items.length, 0);
  const done = r.topics.reduce((a, t) => a + t.doneCount, 0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 animate-rise">
      {back}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-4">
          <RoleBadge code={r.role.shortCode} color={r.role.colorKey} size={48} />
          <div className="min-w-0">
            <span className="eyebrow">
              Subject · {units} units · {formatMinutes(r.totals.totalMinutes)}
            </span>
            <h1 className="mt-1 text-[clamp(22px,2.8vw,32px)]">{LEARN_SUBJECT.title}</h1>
            <p className="mt-1.5 max-w-[64ch] text-ink-2">
              The units are in the order that makes each one easier than the last. Go at your own
              pace: open a unit, work through its steps, and come back for the next.
            </p>
          </div>
        </div>
        <div className="w-full max-w-[16rem] shrink-0">
          <div className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
            <span>
              <b className="font-display text-[17px] text-ink">{done}</b> of {units} units done
            </span>
            <span className="font-mono">{r.totals.percentComplete}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(r.totals.percentComplete, 2)}%` }}
            />
          </div>
        </div>
      </header>

      {proposal && <ProposalBanner proposal={proposal} />}

      {r.topics.map((t, i) => (
        <TopicUnits
          key={t.id}
          topic={t}
          index={i}
          // The topic the student is working in starts open; the rest start folded.
          startOpen={r.nextUp ? r.nextUp.topicSlug === t.slug : i === 0}
        />
      ))}
    </div>
  );
}

/**
 * One topic of the subject, as a section that opens and closes: its heading (with how many units
 * it has and how many are done) from the roadmap, its units (with lessons) from the topic.
 */
function TopicUnits({
  topic,
  index,
  startOpen,
}: {
  topic: RoadmapTopicDto;
  index: number;
  startOpen: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  // The units load the first time the section is opened.
  const detail = useTopic(topic.slug, open);
  const ready = detail.data?.items.filter((i) => i.lesson).length;
  return (
    <section
      className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface"
      aria-labelledby={`topic-${topic.id}`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`units-${topic.id}`}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-surface-2/60 sm:px-5"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand-soft text-brand">
          <TopicIcon iconKey={topic.iconKey} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">
            Topic {index + 1} · {topic.items.length} units · {topic.doneCount} done
            {ready !== undefined && ` · ${ready} ready to study`}
          </span>
          <span
            id={`topic-${topic.id}`}
            className="mt-0.5 block font-display text-[17px] font-bold tracking-tight text-ink sm:text-lg"
          >
            {topic.title}
          </span>
          <span className="mt-0.5 block max-w-[64ch] text-[13.5px] text-ink-2">
            {topic.summary}
          </span>
          {!open && (
            <span className="mt-2 flex flex-wrap gap-1.5" aria-hidden>
              {topic.items.map((i) => (
                <span
                  key={i.subtopicId}
                  className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2"
                >
                  {i.title}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-brand">
          <span className="hidden sm:inline">{open ? 'Hide units' : 'Show units'}</span>
          <ChevronDown
            className={cn('size-4 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </span>
      </button>
      {open && (
        <div id={`units-${topic.id}`} className="border-line border-t bg-bg/60 p-3 sm:p-4">
          {detail.isPending && <Spinner />}
          {detail.isError && <Alert tone="bad">{errorMessage(detail.error)}</Alert>}
          {detail.data && (
            <ol className="grid gap-3">
              {detail.data.items.map((item) => (
                // Practice questions for a unit are listed on the Practice tab, not on this page.
                <SubtopicCard
                  key={item.subtopicId}
                  item={item}
                  topicSlug={topic.slug}
                  practice={0}
                />
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  );
}
