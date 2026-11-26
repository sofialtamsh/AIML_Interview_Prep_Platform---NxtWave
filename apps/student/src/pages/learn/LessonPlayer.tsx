import type { CheckResult, StudentSection } from '@app/content';
import type { CompleteLessonResponse, LessonProgressDto, LessonResponse } from '@app/contracts';
import {
  type AttemptRecord,
  glossaryOf,
  type LessonRuntime,
  LessonRuntimeProvider,
  SectionBody,
  SectionHeader,
  type StepFlow,
  safeStorage,
  sectionTitle,
  wantsWideStage,
} from '@app/learning-ui';
import { Alert, ApiError, Button, cn, Dialog, errorMessage } from '@app/ui';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  FastForward,
  Flag,
  ListOrdered,
  PanelLeftClose,
  RefreshCw,
  Target,
  X,
} from 'lucide-react';
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router';
import { DepthMeter, formatMinutes } from '../../features/roadmap/parts';
import { api, queryClient, useMe } from '../../lib/api';
import { LESSON_NARRATION, SELF_PACED } from '../../lib/features';
import { afterLessonProgress, keys, lessonPath } from '../../lib/queries';
import { LessonComplete } from './LessonComplete';
import { StepFeedback } from './StepFeedback';

/** Where to pick up: the first step still open, else where they left off, else the start. */
function startIndex(steps: StudentSection[], progress: LessonProgressDto) {
  if (progress.status === 'COMPLETED') return 0;
  const done = new Set(progress.completedSectionKeys);
  const open = steps.findIndex((s) => !s.fastTrack && !done.has(s.key));
  if (open >= 0) return open;
  const last = steps.findIndex((s) => s.key === progress.lastSectionKey);
  return Math.max(0, last);
}

/** Seconds of visible study time since the last save (paused while the tab is hidden). */
function useStudyTimer() {
  const acc = useRef(0);
  const since = useRef<number | null>(Date.now());
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (since.current !== null) acc.current += Date.now() - since.current;
        since.current = null;
      } else {
        since.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  return () => {
    let ms = acc.current;
    if (since.current !== null) {
      ms += Date.now() - since.current;
      since.current = Date.now();
    }
    acc.current = 0;
    return Math.min(1800, Math.round(ms / 1000));
  };
}

/**
 * Tells the step how much of the window it has, as `--lesson-room` on the step's body: the
 * height left under the lesson header, the step's title and any notice above the content, and
 * over the step bar where that is fixed to the bottom (small screens). Slide decks size their
 * frame from it, so the frame and its controls sit inside the window without scrolling the
 * page, however short the window is (a laptop browser that is not full screen).
 */
function useStepRoom(
  body: RefObject<HTMLElement | null>,
  bar: RefObject<HTMLElement | null>,
  stepKey: string | null,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: measured again for every step
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => {
      // Offsets, not client rects: the step's entrance animation must not skew the reading.
      let top = 0;
      for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null)
        top += n.offsetTop;
      const nav = bar.current;
      const fixedBar = nav && getComputedStyle(nav).position === 'fixed' ? nav.offsetHeight : 0;
      const room = document.documentElement.clientHeight - top - fixedBar - 12;
      el.style.setProperty('--lesson-room', `${Math.round(room)}px`);
    };
    measure();
    window.addEventListener('resize', measure);
    // A title that wraps or a notice that appears moves the content: measure again.
    const watched = el.closest('main');
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (ro && watched) ro.observe(watched);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [stepKey]);
}

const OUTLINE_KEY = 'nwp:lesson-steps';
const isDesktop = () => window.matchMedia('(min-width: 64rem)').matches;

/**
 * Whether the list of steps is shown beside the lesson on a wide screen. The student's own
 * choice is remembered; until they make one it is open only where there is room for it and a
 * lab side by side (1440px), so a laptop gives the whole width to the lesson.
 */
function useOutlineShown() {
  const [shown, setShown] = useState(() => {
    const saved = safeStorage.get(OUTLINE_KEY);
    return saved ? saved === 'open' : window.innerWidth >= 1440;
  });
  const set = (next: boolean) => {
    setShown(next);
    safeStorage.set(OUTLINE_KEY, next ? 'open' : 'closed');
  };
  return [shown, set] as const;
}

/**
 * A check is finished when every question has a graded answer. A quiz with a pool shows only
 * `draw` of its questions per attempt, so it is finished once that many are answered.
 */
function checkFinished(s: StudentSection, attempts: ReadonlyMap<string, AttemptRecord>) {
  if (s.kind !== 'KNOWLEDGE_CHECK') return true;
  const graded = s.body.items.filter((i) => {
    const a = attempts.get(`${s.key}#${i.key}`);
    return a !== undefined && a.result.correct !== null;
  }).length;
  return graded >= Math.min(s.body.items.length, s.body.draw ?? s.body.items.length);
}

export function LessonPlayer({ data }: { data: LessonResponse }) {
  const topicSlug = data.subtopic.topic.slug;
  const subtopicSlug = data.subtopic.slug;
  const base = lessonPath(topicSlug, subtopicSlug);
  const steps = data.lesson.sections;
  const { data: me } = useMe();

  const [done, setDone] = useState(() => new Set(data.progress.completedSectionKeys));
  const [attempts, setAttempts] = useState<Map<string, AttemptRecord>>(
    () =>
      new Map(
        data.attempts.map((a) => [
          `${a.sectionKey}#${a.itemKey}`,
          { response: a.response, result: a.result },
        ]),
      ),
  );
  const [index, setIndex] = useState(() => startIndex(steps, data.progress));
  const [finished, setFinished] = useState<CompleteLessonResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [outlineShown, setOutlineShown] = useOutlineShown();
  // A lab's walkthrough, when the step on screen has one: the step bar's button walks it first.
  const [flow, setFlow] = useState<StepFlow | null>(null);
  const reportFlow = useCallback((next: StepFlow | null) => setFlow(next), []);
  const [timeSpent, setTimeSpent] = useState(data.progress.timeSpentSec);
  const takeSeconds = useStudyTimer();
  const stepRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const advanceRef = useRef<() => void>(() => {});

  const step = steps[index] as StudentSection;
  const isLast = index === steps.length - 1;
  const nextStep = steps[index + 1];
  const nextLabel = nextStep ? `Next: ${sectionTitle(nextStep)}` : 'Last step of the lesson';

  const glossary = useMemo(() => glossaryOf(steps), [steps]);
  const runtime: LessonRuntime = useMemo(
    () => ({
      grade: (input) => api.post<CheckResult>(`${base}/checks`, input),
      solution: (input) =>
        api.post<{ solution: string }>(`${base}/solution`, input).then((r) => r.solution),
      attempts,
      glossary,
      onAttempt: (sectionKey, itemKey, record) =>
        setAttempts((prev) => new Map(prev).set(`${sectionKey}#${itemKey}`, record)),
      storagePrefix: `nwp:${me?.id ?? 'me'}`,
      voice: data.subtopic.topic.position % 2,
      narration: LESSON_NARRATION,
      reportFlow,
      advance: { label: nextLabel, go: () => advanceRef.current() },
    }),
    [base, attempts, glossary, me?.id, data.subtopic.topic.position, reportFlow, nextLabel],
  );

  const required = steps.filter((s) => !s.fastTrack);
  const requiredDone = required.filter((s) => done.has(s.key)).length;
  const percent = required.length ? Math.round((requiredDone / required.length) * 100) : 0;
  const canContinue = checkFinished(step, attempts);
  useStepRoom(bodyRef, barRef, finished ? null : step.key);

  // Each step starts at the top, with focus on its heading for keyboard and screen-reader users.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    stepRef.current?.focus({ preventScroll: true });
  }, [index]);

  const save = async (key: string, completed: boolean) => {
    const p = await api.put<LessonProgressDto>(`${base}/progress`, {
      moduleVersionId: data.lesson.moduleVersionId,
      sectionKey: key,
      completed,
      timeSpentSec: takeSeconds(),
    });
    setDone(new Set(p.completedSectionKeys));
    setTimeSpent(p.timeSpentSec);
    return p;
  };

  const advance = async (completed: boolean) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const p = await save(step.key, completed);
      if (!isLast) {
        setIndex(index + 1);
        if (p.completedSectionKeys.length === 1) afterLessonProgress();
        return;
      }
      const res = await api.post<CompleteLessonResponse>(`${base}/complete`, {
        moduleVersionId: data.lesson.moduleVersionId,
      });
      queryClient.setQueryData<LessonResponse>(keys.lesson(topicSlug, subtopicSlug), (old) =>
        old ? { ...old, progress: res.progress } : old,
      );
      afterLessonProgress();
      setMissing([]);
      setFinished(res);
    } catch (err) {
      const open =
        err instanceof ApiError
          ? (err.details as { missing?: string[] } | undefined)?.missing
          : undefined;
      if (open?.length) setMissing(open);
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  advanceRef.current = () => {
    if (canContinue) void advance(true);
  };

  if (finished) {
    return (
      <LessonComplete
        data={data}
        result={finished}
        timeSpentSec={timeSpent}
        attempts={attempts}
        onReview={() => {
          setFinished(null);
          setIndex(0);
        }}
      />
    );
  }

  const outline = (
    <Outline
      steps={steps}
      index={index}
      done={done}
      onPick={(i) => {
        setIndex(i);
        setOutlineOpen(false);
      }}
    />
  );

  // One button for "what comes next": a lab's walkthrough first, then the next step.
  const inFlow = flow !== null && flow.index < flow.count;
  const wide = wantsWideStage(step);
  const goBack = () => {
    if (flow && flow.index > 0) flow.go(flow.index - 1);
    else setIndex(index - 1);
  };
  const goNext = () => {
    if (flow && inFlow) flow.go(flow.index + 1);
    else void advance(true);
  };
  const toggleSteps = () => {
    if (isDesktop()) setOutlineShown(!outlineShown);
    else setOutlineOpen(true);
  };

  return (
    <LessonRuntimeProvider value={runtime}>
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/92 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Link
              to={SELF_PACED ? '/roadmap' : `/topics/${topicSlug}`}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
              aria-label={
                SELF_PACED
                  ? 'Close the lesson and go back to the list of units'
                  : 'Close the lesson and go back to the topic'
              }
            >
              <X className="size-5" aria-hidden />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[13.5px] font-semibold">{data.lesson.title}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-muted">
                  {index + 1}/{steps.length}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3"
                role="progressbar"
                aria-label="Lesson progress"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            {/* On a wide screen this shows or hides the list beside the lesson; on a small one
                it opens the list over it. */}
            <button
              type="button"
              onClick={toggleSteps}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold hover:border-line-2',
                outlineShown
                  ? 'border-line text-ink-2 lg:border-line-2 lg:bg-surface-2 lg:text-ink'
                  : 'border-line text-ink-2',
              )}
            >
              <ListOrdered className="size-4" aria-hidden />
              <span className="lg:hidden">Steps</span>
              <span className="hidden lg:inline">{outlineShown ? 'Hide steps' : 'Steps'}</span>
            </button>
          </div>
        </header>

        {/* `snug:` is a window under 700px tall, or a screen below `lg`: the space above the step
            tightens there (less padding, the step's label and title on one line where they fit),
            so the step keeps its room. A lab gets the whole width; a reading step keeps a
            column narrow enough to read. The bottom padding clears the fixed step bar. */}
        <div
          className={cn(
            'mx-auto grid gap-8 px-4 pt-6 pb-24 snug:pt-3 sm:px-6',
            wide ? 'max-w-[1600px]' : 'max-w-6xl',
            outlineShown && 'lg:grid-cols-[15.5rem_minmax(0,1fr)]',
          )}
        >
          {outlineShown && (
            <aside className="hidden min-w-0 lg:block">
              {/* A long outline scrolls inside the window: its last steps were cut off below a
                  short window and, being sticky, never came into view. The padding (taken back
                  by the margin) keeps the current step's shadow and focus rings from being cut. */}
              <div className="sticky top-[4.5rem] -m-2 max-h-[calc(100svh-9.5rem)] overflow-y-auto p-2 [scrollbar-width:thin]">
                <div className="mb-1 flex items-center justify-between px-2.5">
                  <span className="eyebrow">Steps</span>
                  <button
                    type="button"
                    onClick={() => setOutlineShown(false)}
                    aria-label="Hide the list of steps"
                    title="Hide the list of steps"
                    className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink"
                  >
                    <PanelLeftClose className="size-4" aria-hidden />
                  </button>
                </div>
                {outline}
              </div>
            </aside>
          )}

          <main
            className={cn(
              'mx-auto grid w-full min-w-0 content-start gap-6',
              !wide && 'max-w-3xl',
              outlineShown && 'lg:mx-0',
            )}
          >
            {index === 0 && <LessonIntro data={data} />}
            {data.progress.updatedSinceCompletion && index === 0 && (
              <Alert tone="info">
                This lesson was updated after you finished it. Have a look at what's new.
              </Alert>
            )}

            <article
              key={step.key}
              ref={stepRef}
              tabIndex={-1}
              className="grid gap-5 outline-none animate-rise snug:gap-3"
              aria-label={sectionTitle(step)}
            >
              <SectionHeader
                section={step}
                done={done.has(step.key)}
                className={cn(
                  'snug:flex snug:flex-wrap snug:items-baseline snug:gap-x-3',
                  // A lab needs every pixel of height: its label and title share one line.
                  wide && 'flex! flex-wrap items-baseline gap-x-3',
                )}
              />
              {step.fastTrack && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-g3/30 bg-g3/10 px-4 py-2.5 text-[13.5px]">
                  <span className="flex items-center gap-2 text-ink">
                    <FastForward className="size-4 text-g3" aria-hidden />
                    You said you know this already. Skim it, or skip ahead.
                  </span>
                  {!isLast && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => advance(false)}
                      disabled={saving}
                    >
                      Skip this step
                    </Button>
                  )}
                </div>
              )}
              <div ref={bodyRef} className="grid grid-cols-[minmax(0,1fr)]">
                <SectionBody section={step} />
              </div>
            </article>

            {error && (
              <Alert tone="bad">
                {error}{' '}
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => advance(true)}
                >
                  Try again
                </button>
              </Alert>
            )}
            {missing.length > 0 && (
              <Alert tone="warn">
                A few steps are still open:{' '}
                {missing.map((k, i) => {
                  const at = steps.findIndex((s) => s.key === k);
                  const s = steps[at];
                  return (
                    <span key={k}>
                      {i > 0 && ', '}
                      <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => setIndex(at)}
                      >
                        {s ? sectionTitle(s) : k}
                      </button>
                    </span>
                  );
                })}
                .
              </Alert>
            )}
          </main>
        </div>

        {/* The step bar is fixed to the bottom of the window at every size, so the way forward
            is always in view: no step ends with a hunt for the button. Its one main button is
            whatever comes next, a lab's walkthrough step first and then the next lesson step,
            and the line beside it names that next thing. */}
        <nav
          ref={barRef}
          className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:px-6"
          aria-label="Lesson steps"
        >
          <div className="mx-auto flex max-w-[1600px] items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={(index === 0 && !(flow && flow.index > 0)) || saving}
              aria-label="Back"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">Back</span>
            </Button>
            <StepFeedback
              key={`fb-${step.key}`}
              moduleVersionId={data.lesson.moduleVersionId}
              section={step}
              initial={data.feedback.sections[step.key] ?? null}
            />
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <span
                className="hidden min-w-0 truncate text-right text-[12.5px] text-muted md:block"
                aria-live="polite"
              >
                {!canContinue
                  ? 'Answer the questions to continue'
                  : flow && inFlow
                    ? flow.label
                    : nextLabel}
              </span>
              <Button
                variant={inFlow || isLast ? 'primary' : 'dark'}
                onClick={goNext}
                loading={saving}
                disabled={!canContinue}
                className="min-w-[9.75rem] shrink-0"
              >
                {flow && inFlow ? (
                  <>
                    {flow.next}
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                ) : isLast ? (
                  <>
                    <Flag className="size-4" aria-hidden /> Finish lesson
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            </div>
          </div>
        </nav>

        <Dialog
          open={outlineOpen}
          onClose={() => setOutlineOpen(false)}
          title="Steps in this lesson"
        >
          {outline}
        </Dialog>
      </div>
    </LessonRuntimeProvider>
  );
}

function LessonIntro({ data }: { data: LessonResponse }) {
  return (
    <section className="dotgrid grid gap-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <span className="eyebrow">
        {data.subtopic.topic.title} · Lesson{' '}
        {data.progress.status === 'COMPLETED' && '· Finished ✓'}
      </span>
      <h1 className="text-[clamp(24px,3vw,34px)]">{data.lesson.title}</h1>
      {data.lesson.subtitle && <p className="text-ink-2">{data.lesson.subtitle}</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
        <DepthMeter rank={data.depth.rank} name={data.depth.name} />
        <span>{formatMinutes(data.lesson.totalMinutes)}</span>
        <span>{data.lesson.sections.length} steps</span>
      </div>
      {data.lesson.objectives.length > 0 && (
        <div className="mt-1 grid gap-1.5">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold">
            <Target className="size-4 text-brand" aria-hidden /> By the end you can
          </span>
          <ul className="grid gap-1 text-[13.5px]">
            {data.lesson.objectives.map((o) => (
              <li key={o.key} className="flex gap-2">
                <span className="text-brand" aria-hidden>
                  ✓
                </span>
                {o.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Outline({
  steps,
  index,
  done,
  onPick,
}: {
  steps: StudentSection[];
  index: number;
  done: ReadonlySet<string>;
  onPick: (i: number) => void;
}) {
  return (
    <ol className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
      {steps.map((s, i) => {
        const current = i === index;
        const isDone = done.has(s.key);
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onPick(i)}
              title={sectionTitle(s)}
              aria-current={current ? 'step' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition',
                current
                  ? 'bg-surface font-semibold text-ink shadow-soft'
                  : 'text-ink-2 hover:bg-surface-2',
              )}
            >
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full',
                  isDone
                    ? 'bg-ok text-white'
                    : current
                      ? 'border-2 border-brand'
                      : 'border border-line-2',
                )}
                aria-hidden
              >
                {isDone ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : s.fastTrack ? (
                  <FastForward className="size-2.5 text-g3" />
                ) : current ? (
                  <Circle className="size-1.5 fill-brand text-brand" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{sectionTitle(s)}</span>
              <span className="font-mono text-[10.5px] text-muted">{s.estimatedMinutes}m</span>
              <span className="sr-only">
                {isDone ? '(done)' : s.fastTrack ? '(optional refresher)' : ''}
              </span>
            </button>
          </li>
        );
      })}
      <li className="mt-2 flex items-center gap-1.5 px-2.5 text-[11.5px] text-muted">
        <RefreshCw className="size-3" aria-hidden /> Progress saves as you go
      </li>
    </ol>
  );
}
