import type { CheckResponse, CheckResult, StudentCheckItem, StudentSection } from '@app/content';
import { Button, cn, errorMessage } from '@app/ui';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleHelp,
  RotateCcw,
  Shuffle,
  XCircle,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { CodeBlock } from '../code';
import { safeStorage, useLessonRuntime } from '../context';
import { Rich } from '../rich';

type CheckSection = Extract<StudentSection, { kind: 'KNOWLEDGE_CHECK' }>;

export function KnowledgeCheckView({ s }: { s: CheckSection }) {
  const { items, draw } = s.body;
  if (draw && draw < items.length) return <Quiz s={s} draw={draw} />;
  const total = items.length;
  return (
    <div className="grid gap-4">
      {items.map((item, i) => (
        <CheckCard
          key={item.key}
          section={s}
          item={item}
          label={total > 1 ? `Question ${i + 1} of ${total}` : 'Question'}
        />
      ))}
    </div>
  );
}

/** One attempt at a quiz: which questions were drawn, and how each was answered. */
interface Attempt {
  n: number;
  keys: string[];
  /** Item key → right or wrong, for the questions answered in this attempt. */
  results: Record<string, boolean>;
}

/** `count` questions, those in `first` before the rest, each group in a random order. */
function drawFrom(all: string[], first: ReadonlySet<string>, count: number): string[] {
  const shuffled = (list: string[]) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j] as string, out[i] as string];
    }
    return out;
  };
  return [
    ...shuffled(all.filter((k) => first.has(k))),
    ...shuffled(all.filter((k) => !first.has(k))),
  ].slice(0, count);
}

/**
 * A quiz drawn from a pool. Each attempt shows `draw` questions; "New questions" draws again,
 * taking the questions not yet answered correctly first, so another attempt is new work and not
 * a memory test. The attempt on screen is kept in this browser, so leaving and coming back
 * shows the same questions with their answers. Every answer is graded by the host as usual.
 */
function Quiz({ s, draw }: { s: CheckSection; draw: number }) {
  const runtime = useLessonRuntime();
  const storageKey = `${runtime.storagePrefix}:quiz:${s.revisionId}`;
  const all = s.body.items.map((i) => i.key);
  const byKey = new Map(s.body.items.map((i) => [i.key, i]));
  const rightSoFar = () =>
    new Set(all.filter((k) => runtime.attempts.get(`${s.key}#${k}`)?.result.correct === true));
  const fresh = (n: number): Attempt => {
    const right = rightSoFar();
    return { n, keys: drawFrom(all, new Set(all.filter((k) => !right.has(k))), draw), results: {} };
  };
  const [attempt, setAttempt] = useState<Attempt>(() => {
    try {
      const saved = JSON.parse(safeStorage.get(storageKey) ?? 'null') as Attempt | null;
      if (
        saved &&
        Array.isArray(saved.keys) &&
        saved.keys.length === draw &&
        saved.keys.every((k) => byKey.has(k))
      ) {
        return { n: saved.n || 1, keys: saved.keys, results: saved.results ?? {} };
      }
    } catch {
      /* a broken note in storage: start a new attempt */
    }
    // A quiz answered before this browser kept attempts: show those questions, answered.
    const answered = all.filter((k) => runtime.attempts.has(`${s.key}#${k}`));
    if (answered.length >= draw) {
      const keys = answered.slice(0, draw);
      return {
        n: 1,
        keys,
        results: Object.fromEntries(
          keys.map((k) => [k, runtime.attempts.get(`${s.key}#${k}`)?.result.correct === true]),
        ),
      };
    }
    return fresh(1);
  });
  const keep = (next: Attempt) => {
    setAttempt(next);
    safeStorage.set(storageKey, JSON.stringify(next));
  };

  const total = attempt.keys.length;
  const answered = attempt.keys.filter((k) => k in attempt.results).length;
  const right = attempt.keys.filter((k) => attempt.results[k]).length;
  const finished = answered === total;
  const perfect = finished && right === total;
  // One question on screen at a time; `total` is the score card after the last one.
  const firstOpen = attempt.keys.findIndex((k) => !(k in attempt.results));
  const [at, setAt] = useState(firstOpen < 0 ? total : firstOpen);
  const currentKey = attempt.keys[at];
  const current = currentKey ? byKey.get(currentKey) : undefined;
  const currentDone = currentKey !== undefined && currentKey in attempt.results;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-[13px] text-ink-2">
        <span>
          <span className="font-semibold text-ink">
            {attempt.n > 1 ? `Attempt ${attempt.n} · ` : ''}
            {draw} questions
          </span>{' '}
          drawn from a pool of {all.length}. Every attempt gets a different set.
        </span>
        {/* One dot per question: where you are, and how each answered one went. */}
        <ol className="flex items-center gap-1.5" aria-label="Questions in this attempt">
          {attempt.keys.map((k, i) => {
            const done = k in attempt.results;
            const ok = attempt.results[k] === true;
            const reachable = done || i === firstOpen;
            return (
              <li key={k}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => setAt(i)}
                  aria-current={i === at ? 'step' : undefined}
                  aria-label={`Question ${i + 1}${done ? (ok ? ': correct' : ': not correct') : ''}`}
                  className={cn(
                    'grid size-6 place-items-center rounded-full border font-mono text-[11px] font-bold transition pointer-coarse:size-9 pointer-coarse:text-[13px]',
                    done
                      ? ok
                        ? 'border-ok bg-ok-bg text-ok'
                        : 'border-bad bg-bad-bg text-bad'
                      : 'border-line-2 bg-surface text-muted',
                    i === at && 'ring-2 ring-brand ring-offset-1 ring-offset-surface-2',
                  )}
                >
                  {i + 1}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {current && currentKey && (
        <>
          <CheckCard
            key={`${attempt.n}:${currentKey}`}
            section={s}
            item={current}
            label={`Question ${at + 1} of ${total}`}
            // An answer from an earlier attempt is not this attempt's answer.
            usePrior={currentDone}
            retry={false}
            onResult={(correct) => {
              if (correct === null) return;
              setAttempt((old) => {
                // The first answer in an attempt is the one that counts.
                if (currentKey in old.results) return old;
                const next = { ...old, results: { ...old.results, [currentKey]: correct } };
                safeStorage.set(storageKey, JSON.stringify(next));
                return next;
              });
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={at === 0}
              onClick={() => setAt(at - 1)}
            >
              Previous question
            </Button>
            {currentDone ? (
              <Button type="button" size="sm" onClick={() => setAt(at + 1)}>
                {at === total - 1 ? 'See your score' : 'Next question'}
              </Button>
            ) : (
              <span className="text-[12.5px] text-muted">Pick an answer, then press Check.</span>
            )}
          </div>
        </>
      )}

      {at >= total && finished && (
        <div
          className={cn(
            'grid gap-4 rounded-2xl border p-4 animate-rise sm:p-5',
            perfect ? 'border-ok/35 bg-ok-bg' : 'border-line bg-surface',
          )}
          aria-live="polite"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-[26px] leading-none font-bold text-ink">
              {right} / {total}
            </span>
            <span className="text-[14px] text-ink-2">
              {perfect
                ? 'All correct. Continue, or test yourself on a new set.'
                : right >= total - 1
                  ? 'Nearly there. Open the one you missed to read why, then try a new set.'
                  : 'Open the ones you missed to read why. A new set brings those questions back first.'}
            </span>
          </div>
          <ol className="grid gap-1.5">
            {attempt.keys.map((k, i) => {
              const item = byKey.get(k);
              const ok = attempt.results[k] === true;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => setAt(i)}
                    className="flex w-full items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2 text-left text-[13.5px] hover:border-line-2"
                  >
                    {ok ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 size-4 shrink-0 text-bad" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1 text-ink">
                      <span className="sr-only">{ok ? 'Correct: ' : 'Not correct: '}</span>
                      {item && 'prompt' in item && item.prompt ? (
                        <Rich text={item.prompt} inline />
                      ) : (
                        `Question ${i + 1}`
                      )}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-brand">Review</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="dark"
              onClick={() => {
                keep(fresh(attempt.n + 1));
                setAt(0);
              }}
            >
              <Shuffle className="size-3.5" aria-hidden /> New questions
            </Button>
            <span className="text-[12.5px] text-muted">
              Or press Continue at the bottom to move on.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

type Draft =
  | { type: 'mcq' | 'predict_output'; choice: string | null }
  | { type: 'multi'; choices: string[] }
  | { type: 'fill_blank'; blanks: Record<string, string> }
  | { type: 'order_steps'; order: string[] }
  | { type: 'reasoning'; text: string };

function initialDraft(item: StudentCheckItem, prior?: CheckResponse): Draft {
  if (prior && prior.type === item.type) {
    switch (prior.type) {
      case 'mcq':
      case 'predict_output':
        return { type: prior.type, choice: prior.choice };
      case 'multi':
        return { type: 'multi', choices: prior.choices };
      case 'fill_blank':
        return { type: 'fill_blank', blanks: prior.blanks };
      case 'order_steps':
        return { type: 'order_steps', order: prior.order };
      case 'reasoning':
        return { type: 'reasoning', text: prior.text };
    }
  }
  switch (item.type) {
    case 'mcq':
    case 'predict_output':
      return { type: item.type, choice: null };
    case 'multi':
      return { type: 'multi', choices: [] };
    case 'fill_blank':
      return { type: 'fill_blank', blanks: {} };
    case 'order_steps':
      return { type: 'order_steps', order: item.steps.map((st) => st.id) };
    case 'reasoning':
      return { type: 'reasoning', text: '' };
  }
}

function toResponse(d: Draft, selfRating?: 'got_it' | 'partly' | 'missed'): CheckResponse | null {
  switch (d.type) {
    case 'mcq':
    case 'predict_output':
      return d.choice ? { type: d.type, choice: d.choice } : null;
    case 'multi':
      return d.choices.length ? { type: 'multi', choices: d.choices } : null;
    case 'fill_blank':
      return Object.values(d.blanks).some((v) => v.trim())
        ? { type: 'fill_blank', blanks: d.blanks }
        : null;
    case 'order_steps':
      return { type: 'order_steps', order: d.order };
    case 'reasoning':
      return d.text.trim()
        ? { type: 'reasoning', text: d.text.trim(), ...(selfRating ? { selfRating } : {}) }
        : null;
  }
}

const RATINGS = [
  { value: 'got_it', label: 'Got it', hint: 'I covered the main points' },
  { value: 'partly', label: 'Partly', hint: 'I missed something' },
  { value: 'missed', label: 'Missed it', hint: 'I need another look' },
] as const;

function CheckCard({
  section,
  item,
  label,
  usePrior = true,
  retry = true,
  onResult,
}: {
  section: CheckSection;
  item: StudentCheckItem;
  label: string;
  /** False starts the question blank even if it was answered before (a new quiz attempt). */
  usePrior?: boolean;
  /** Whether a wrong answer may be tried again in place. A quiz draws new questions instead. */
  retry?: boolean;
  /** Told each graded answer: right, wrong, or null while a written answer awaits its rating. */
  onResult?: (correct: boolean | null) => void;
}) {
  const runtime = useLessonRuntime();
  const prior = usePrior ? runtime.attempts.get(`${section.key}#${item.key}`) : undefined;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(item, prior?.response));
  const [result, setResult] = useState<CheckResult | null>(prior?.result ?? null);
  const [rating, setRating] = useState(
    prior?.response.type === 'reasoning' ? (prior.response.selfRating ?? null) : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (response: CheckResponse) => {
    setBusy(true);
    setError(null);
    try {
      const r = await runtime.grade({
        sectionKey: section.key,
        revisionId: section.revisionId,
        itemKey: item.key,
        response,
      });
      setResult(r);
      runtime.onAttempt?.(section.key, item.key, { response, result: r });
      onResult?.(r.correct);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const response = toResponse(draft);
    if (response) void send(response);
  };
  const graded = result !== null && result.correct !== null;
  const locked = result !== null;
  const ready = toResponse(draft) !== null;

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5"
    >
      <span className="flex items-center gap-1.5 eyebrow">
        <CircleHelp className="size-3.5" aria-hidden /> {label}
      </span>
      {'prompt' in item && item.prompt && (
        <Rich text={item.prompt} className="text-[15px] font-medium text-ink" />
      )}
      {item.type === 'predict_output' && <CodeBlock code={item.code} language={item.language} />}

      <ItemInput item={item} draft={draft} setDraft={setDraft} result={result} locked={locked} />

      {error && (
        <p className="text-[13px] text-bad" role="alert">
          {error}
        </p>
      )}

      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" variant="dark" loading={busy} disabled={!ready}>
            {item.type === 'reasoning' ? 'Compare with a model answer' : 'Check'}
          </Button>
          {item.type === 'reasoning' && (
            <span className="text-[12px] text-muted">
              Write your answer first. Then compare honestly.
            </span>
          )}
        </div>
      )}

      {result && item.type === 'reasoning' && 'modelAnswer' in result.reveal && (
        <div className="grid gap-3 animate-rise" aria-live="polite">
          <div className="rounded-xl border border-brand/25 bg-brand-soft p-4">
            <span className="eyebrow text-brand">A strong answer</span>
            <Rich text={result.reveal.modelAnswer} className="mt-1.5 text-[14px] text-ink" />
            <span className="mt-3 block eyebrow">It should</span>
            <ul className="mt-1 grid gap-1 text-[13.5px]">
              {result.reveal.rubric.map((r) => (
                <li key={r} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-[14px] font-semibold">How did your answer compare?</legend>
            <div className="flex flex-wrap gap-2">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={rating === r.value}
                  disabled={busy}
                  onClick={() => {
                    setRating(r.value);
                    const response = toResponse(draft, r.value);
                    if (response) void send(response);
                  }}
                  className={cn(
                    'grid rounded-xl border px-3.5 py-2 text-left transition',
                    rating === r.value
                      ? 'border-ink bg-ink text-surface'
                      : 'border-line-2 bg-surface hover:border-ink-2',
                  )}
                >
                  <span className="text-[13.5px] font-semibold">{r.label}</span>
                  <span
                    className={cn(
                      'text-[11.5px]',
                      rating === r.value ? 'opacity-80' : 'text-muted',
                    )}
                  >
                    {r.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {graded && item.type !== 'reasoning' && (
        <div
          className={cn(
            'grid gap-1.5 rounded-xl border px-4 py-3 animate-rise',
            result.correct ? 'border-ok/35 bg-ok-bg' : 'border-bad/30 bg-bad-bg',
          )}
          aria-live="polite"
        >
          <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            {result.correct ? (
              <CheckCircle2 className="size-4 text-ok" aria-hidden />
            ) : (
              <XCircle className="size-4 text-bad" aria-hidden />
            )}
            {result.correct ? 'Correct.' : "Not quite. Here's why."}
          </span>
          {result.explanation && (
            <Rich text={result.explanation} className="text-[13.5px] text-ink" />
          )}
        </div>
      )}

      {retry && graded && item.type !== 'reasoning' && !result.correct && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => {
            setResult(null);
            setError(null);
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden /> Try again
        </Button>
      )}
    </form>
  );
}

function ItemInput({
  item,
  draft,
  setDraft,
  result,
  locked,
}: {
  item: StudentCheckItem;
  draft: Draft;
  setDraft: (d: Draft) => void;
  result: CheckResult | null;
  locked: boolean;
}) {
  const correctIds = result && 'correct' in result.reveal ? new Set(result.reveal.correct) : null;

  if (item.type === 'mcq' || item.type === 'predict_output' || item.type === 'multi') {
    const multi = item.type === 'multi';
    const chosen = new Set(
      draft.type === 'multi'
        ? draft.choices
        : 'choice' in draft && draft.choice
          ? [draft.choice]
          : [],
    );
    return (
      <div className="grid gap-2" role={multi ? 'group' : 'radiogroup'}>
        {multi && <span className="text-[12.5px] text-muted">Pick every answer that applies.</span>}
        {item.options.map((o) => {
          const on = chosen.has(o.id);
          const isRight = correctIds?.has(o.id) ?? false;
          return (
            // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the role is radio or checkbox, both use aria-checked
            <button
              key={o.id}
              type="button"
              role={multi ? 'checkbox' : 'radio'}
              aria-checked={on}
              disabled={locked}
              onClick={() => {
                if (multi) {
                  const next = new Set(chosen);
                  if (next.has(o.id)) next.delete(o.id);
                  else next.add(o.id);
                  setDraft({ type: 'multi', choices: [...next] });
                } else {
                  setDraft({ type: item.type as 'mcq' | 'predict_output', choice: o.id });
                }
              }}
              className={cn(
                'flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[14px] transition disabled:cursor-default',
                correctIds
                  ? isRight
                    ? 'border-ok bg-ok-bg text-ink'
                    : on
                      ? 'border-bad bg-bad-bg text-ink'
                      : 'border-line bg-surface opacity-70'
                  : on
                    ? 'border-brand bg-brand-soft text-ink'
                    : 'border-line bg-surface hover:border-line-2',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center border',
                  multi ? 'rounded-[4px]' : 'rounded-full',
                  on ? 'border-brand bg-brand' : 'border-line-2 bg-surface',
                )}
                aria-hidden
              >
                {on && (
                  <span
                    className={cn(
                      'bg-brand-ink',
                      multi ? 'size-2 rounded-[2px]' : 'size-1.5 rounded-full',
                    )}
                  />
                )}
              </span>
              <Rich text={o.text} inline />
            </button>
          );
        })}
      </div>
    );
  }

  if (item.type === 'fill_blank' && draft.type === 'fill_blank') {
    const answers = result && 'answers' in result.reveal ? result.reveal.answers : null;
    const parts = item.template.split(/(\{\{[a-z0-9-]+\}\})/g);
    return (
      <p className="text-[15px] leading-[2.2]">
        {/* Each part's position in the template is its identity. */}
        {parts
          .map((part, at) => ({ part, at }))
          .map(({ part, at }) => {
            const m = /^\{\{([a-z0-9-]+)\}\}$/.exec(part);
            if (!m) return <Rich key={at} text={part} inline />;
            const blank = m[1] as string;
            return (
              <span
                key={at}
                className="inline-flex flex-wrap items-baseline gap-1.5 align-baseline"
              >
                <input
                  aria-label={`Blank ${blank}`}
                  value={draft.blanks[blank] ?? ''}
                  disabled={locked}
                  onChange={(e) =>
                    setDraft({
                      type: 'fill_blank',
                      blanks: { ...draft.blanks, [blank]: e.target.value },
                    })
                  }
                  className={cn(
                    'w-36 rounded-lg border bg-surface px-2 py-0.5 font-mono text-[13.5px] outline-none focus:border-brand',
                    result?.correct === true
                      ? 'border-ok'
                      : result?.correct === false
                        ? 'border-bad'
                        : 'border-line-2',
                  )}
                />
                {answers && result?.correct === false && (
                  <span className="rounded-md bg-ok-bg px-1.5 font-mono text-[12.5px] text-ok">
                    {answers[blank]}
                  </span>
                )}
              </span>
            );
          })}
      </p>
    );
  }

  if (item.type === 'order_steps' && draft.type === 'order_steps') {
    const text = new Map(item.steps.map((st) => [st.id, st.text]));
    const answer = result && 'order' in result.reveal ? result.reveal.order : null;
    const move = (i: number, d: -1 | 1) => {
      const next = [...draft.order];
      const j = i + d;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j] as string, next[i] as string];
      setDraft({ type: 'order_steps', order: next });
    };
    return (
      <div className="grid gap-3">
        {!locked && (
          <span className="text-[12.5px] text-muted">
            Use the arrows to put the steps in order.
          </span>
        )}
        <ol className="grid gap-1.5">
          {draft.order.map((id, i) => {
            const right = answer ? answer[i] === id : null;
            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-3 py-2 text-[14px]',
                  right === null
                    ? 'border-line bg-surface'
                    : right
                      ? 'border-ok bg-ok-bg'
                      : 'border-bad bg-bad-bg',
                )}
              >
                <span className="w-5 shrink-0 font-mono text-[12px] font-bold text-muted">
                  {i + 1}
                </span>
                <Rich text={text.get(id) ?? ''} inline className="flex-1" />
                {!locked && (
                  <span className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="rounded-md border border-line p-1 text-ink-2 hover:border-line-2 disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === draft.order.length - 1}
                      aria-label="Move down"
                      className="rounded-md border border-line p-1 text-ink-2 hover:border-line-2 disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
        {answer && result?.correct === false && (
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <span className="eyebrow">The right order</span>
            <ol className="mt-1.5 grid list-decimal gap-1 pl-5 text-[13.5px]">
              {answer.map((id) => (
                <li key={id}>
                  <Rich text={text.get(id) ?? ''} inline />
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  }

  if (item.type === 'reasoning' && draft.type === 'reasoning') {
    return (
      <textarea
        aria-label="Your answer"
        value={draft.text}
        disabled={locked}
        onChange={(e) => setDraft({ type: 'reasoning', text: e.target.value })}
        rows={5}
        maxLength={4000}
        placeholder="Answer as you would in the interview…"
        className="w-full resize-y rounded-xl border border-line-2 bg-surface px-3.5 py-2.5 text-[14px] outline-none focus:border-brand disabled:bg-surface-2"
      />
    );
  }
  return null;
}
