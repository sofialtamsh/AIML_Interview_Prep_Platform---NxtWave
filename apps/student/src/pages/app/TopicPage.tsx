import type { TopicPageResponse } from '@app/contracts';
import { Alert, Badge, buttonClass, Card, cn, errorMessage, Spinner } from '@app/ui';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  CircleCheck,
  Dumbbell,
  GraduationCap,
  Lightbulb,
  Play,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { QuestionRow } from '../../features/practice/QuestionRow';
import {
  DepthMeter,
  FastTrackBadge,
  formatMinutes,
  PriorityBadge,
  STATUS,
  StatusIcon,
  scheduleRange,
  shownStatus,
  TopicIcon,
} from '../../features/roadmap/parts';
import { api, queryClient } from '../../lib/api';
import { LEARN_SUBJECT, SELF_PACED } from '../../lib/features';
import { keys, useTopic } from '../../lib/queries';

export function TopicPage() {
  const { slug = '' } = useParams();
  const topic = useTopic(slug);

  if (topic.isPending) return <Spinner />;
  if (topic.isError) {
    return (
      <div className="grid gap-4">
        <BackLink />
        <Alert tone="bad">{errorMessage(topic.error)}</Alert>
      </div>
    );
  }
  const t = topic.data;
  const minutes = t.items.reduce((a, i) => a + i.estimatedMinutes, 0);
  // The first lesson on the path that isn't finished yet.
  const nextLesson = t.items.find((i) => i.lesson && i.lesson.status !== 'COMPLETED');

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 animate-rise">
      <BackLink />
      <header className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-brand/20 bg-brand-soft text-brand sm:size-14">
          <TopicIcon iconKey={t.topic.iconKey} className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0">
          <span className="eyebrow">
            Topic · {t.items.length} subtopics · {formatMinutes(minutes)}
          </span>
          <h1 className="mt-1 text-[clamp(22px,2.8vw,32px)]">{t.topic.title}</h1>
          <p className="mt-1.5 max-w-[64ch] text-ink-2">{t.topic.summary}</p>
        </div>
      </header>

      {t.depthNote && (
        <div className="flex gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2 px-4 py-3.5 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          <p className="text-ink-2">{t.depthNote}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <PathTile
          Icon={GraduationCap}
          title="Learn the Concept"
          body="Short, explorable lessons: the idea in plain words, then code you can poke at, then a quick check."
          ready={t.learn.available}
          status={
            t.learn.available
              ? `${t.learn.completed} of ${t.learn.lessons} ${t.learn.lessons === 1 ? 'lesson' : 'lessons'} done${
                  t.learn.lessons < t.items.length ? ' · more on the way' : ''
                }`
              : 'Lessons are being written for your level'
          }
          action={
            nextLesson ? (
              <Link
                to={`/learn/${slug}/${nextLesson.slug}`}
                className={buttonClass('primary', 'sm')}
              >
                {nextLesson.lesson?.status === 'IN_PROGRESS' ? 'Continue' : 'Start learning'}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            ) : undefined
          }
        />
        <PathTile
          Icon={Dumbbell}
          ready={t.practice.available}
          title="Practice Questions"
          body={
            t.practice.available
              ? 'Real interview questions for your role. Solve them on the NxtWave learning portal.'
              : 'Interview questions picked for your role, from warm-ups to the ones that trip people up.'
          }
          status={
            t.practice.available
              ? `${t.practice.questions} question${t.practice.questions === 1 ? '' : 's'} for this topic`
              : 'Questions are being matched to this topic'
          }
          action={
            t.practice.available ? (
              <a href="#practice" className={buttonClass('primary', 'sm')}>
                See the questions <ArrowRight className="size-3.5" aria-hidden />
              </a>
            ) : (
              <TopicNotify topicId={t.topic.id} slug={slug} on={t.practice.notifyMe} />
            )
          }
        />
      </div>

      <section className="grid gap-3">
        <h2 className="text-base">What you will cover</h2>
        <ol className="grid gap-3">
          {t.items.map((i) => (
            <SubtopicCard
              key={i.subtopicId}
              item={i}
              topicSlug={slug}
              practice={
                t.practice.items.filter((q) =>
                  q.tags.some((tag) => tag.topicSlug === slug && tag.subtopicSlug === i.slug),
                ).length
              }
            />
          ))}
        </ol>
      </section>

      {t.practice.items.length > 0 && (
        <section id="practice" className="grid scroll-mt-24 gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base">Practice questions for this topic</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                Tap Solve to open a question on the NxtWave learning portal, signed in with your
                NxtWave account.
              </p>
            </div>
            <Link
              to={`/practice?topic=${encodeURIComponent(slug)}`}
              className="text-[13px] font-semibold text-brand hover:underline"
            >
              Open in Practice
            </Link>
          </div>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {t.practice.items.map((q) => (
                <QuestionRow key={q.id} q={q} />
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/roadmap"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden />{' '}
      {SELF_PACED ? `Back to ${LEARN_SUBJECT.title}` : 'Back to roadmap'}
    </Link>
  );
}

function PathTile({
  Icon,
  title,
  body,
  status,
  action,
  ready,
}: {
  Icon: typeof Dumbbell;
  title: string;
  body: string;
  status: string;
  action?: ReactNode;
  ready: boolean;
}) {
  return (
    <Card className="dotgrid flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-ink text-surface">
          <Icon className="size-5" aria-hidden />
        </span>
        {ready ? <Badge tone="ok">Ready</Badge> : <Badge tone="next">Coming soon</Badge>}
      </div>
      <div>
        <h3 className="text-[17px]">{title}</h3>
        <p className="mt-1 text-[13.5px] text-ink-2">{body}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[12.5px] text-muted">{status}</span>
        {action}
      </div>
    </Card>
  );
}

function TopicNotify({ topicId, slug, on }: { topicId: string; slug: string; on: boolean }) {
  const toggle = useMutation({
    mutationFn: () =>
      api.post('/student/interest', { kind: 'TOPIC', targetId: topicId, notify: !on }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.topic(slug) }),
  });
  return (
    <button
      type="button"
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      aria-pressed={on}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
        on ? 'bg-ok-bg text-ok' : 'bg-ink text-surface hover:opacity-90',
      )}
    >
      {on ? (
        <BellRing className="size-3.5" aria-hidden />
      ) : (
        <Bell className="size-3.5" aria-hidden />
      )}
      {on ? 'We will tell you' : 'Notify me'}
    </button>
  );
}

/** One unit: what it covers, where the student stands in it, and the way into its lesson. */
export function SubtopicCard({
  item,
  topicSlug,
  practice,
}: {
  item: TopicPageResponse['items'][number];
  topicSlug: string;
  /** Practice questions tagged with this subtopic. */
  practice: number;
}) {
  const range = scheduleRange(item.plannedStart, item.plannedEnd);
  const lesson = item.lesson;
  const status = shownStatus(item.status, lesson?.status === 'IN_PROGRESS');
  return (
    <li>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <StatusIcon status={status} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-sans text-[15.5px] font-semibold tracking-normal">
                {item.title}
              </h3>
              {status !== 'UPCOMING' && (
                <Badge tone={STATUS[status].tone}>{STATUS[status].label}</Badge>
              )}
              <PriorityBadge priority={item.priority} optional={item.isOptional} />
              {item.fastTrack && <FastTrackBadge />}
            </div>
            <p className="mt-1 text-[13.5px] text-ink-2">{item.summary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
              <DepthMeter rank={item.depth.rank} name={item.depth.name} />
              {/* The planned time is a schedule figure. Self-paced, a unit with a lesson shows
                  that lesson's real length beside its button instead of two different times. */}
              {!(SELF_PACED && lesson) && <span>{formatMinutes(item.estimatedMinutes)}</span>}
              {range && <span>{range}</span>}
            </div>

            {/* The parts this unit covers. What the student will be able to do afterwards waits
                inside the lesson, where it belongs: the roadmap stays a map, not a syllabus. */}
            {item.concepts.length > 0 && (
              <>
                <div className="eyebrow mt-3">Covered here</div>
                <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Covered here">
                  {item.concepts.map((c) => (
                    <li
                      key={c.key}
                      className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[12px] text-ink-2"
                    >
                      {c.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="mt-3.5 flex flex-wrap items-center gap-3">
              {lesson ? (
                <>
                  <Link
                    to={`/learn/${topicSlug}/${item.slug}`}
                    className={buttonClass(
                      lesson.status === 'COMPLETED' ? 'secondary' : 'dark',
                      'sm',
                    )}
                  >
                    {lesson.status === 'COMPLETED' ? (
                      <CircleCheck className="size-3.5" aria-hidden />
                    ) : (
                      <Play className="size-3.5" aria-hidden />
                    )}
                    {lesson.status === 'COMPLETED'
                      ? 'Review lesson'
                      : lesson.status === 'IN_PROGRESS'
                        ? 'Continue lesson'
                        : 'Start lesson'}
                  </Link>
                  <span className="text-[12.5px] text-muted">
                    {lesson.status === 'IN_PROGRESS' ? `${lesson.percent}% done · ` : ''}
                    {lesson.sections} steps · {formatMinutes(lesson.minutes)}
                  </span>
                </>
              ) : (
                <span className="text-[12.5px] text-muted">Lesson coming soon</span>
              )}
              {practice > 0 && (
                <a
                  href="#practice"
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand hover:underline"
                >
                  <Dumbbell className="size-3.5" aria-hidden /> {practice} practice question
                  {practice === 1 ? '' : 's'}
                </a>
              )}
            </div>
          </div>
        </div>
      </Card>
    </li>
  );
}
