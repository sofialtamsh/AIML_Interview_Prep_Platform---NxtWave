import type { StudentSection } from '@app/content';
import { Button, cn } from '@app/ui';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  Info,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Rich } from '../rich';
import { richToPlain } from '../rich-parse';

type Visual = Extract<StudentSection, { kind: 'VISUAL' }>;
type Scene = Visual['body']['scene'];
type ChatScene = Extract<Scene, { type: 'chat' }>;
type AnatomyScene = Extract<Scene, { type: 'anatomy' }>;
type ArrayScene = Extract<Scene, { type: 'array' }>;
type Tone = 'ok' | 'bad' | 'info';

/** Categorical palette, in fixed order (dark-mode steps come from the same tokens). */
const PART_COLORS = ['var(--g0)', 'var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)'];
const tint = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`;

const words = (s: string) => (s.match(/\S+/g) ?? []).length;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
/** How long a frame stays up while playing: long enough to read it. */
const readMs = (text: string, base = 900, perWord = 230, lo = 1800, hi = 7000) =>
  clamp(base + words(richToPlain(text)) * perWord, lo, hi);

// ───────────── Shared player ─────────────

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

interface Player {
  index: number;
  count: number;
  playing: boolean;
  /** The scene has been played or stepped to its last frame at least once. */
  done: boolean;
  reduced: boolean;
  play: () => void;
  pause: () => void;
  go: (i: number) => void;
  restart: () => void;
}

/**
 * Plays frames in order, each for its own duration. Starts by itself the first time the scene
 * scrolls into view, unless the student prefers reduced motion; any manual step pauses it.
 */
function usePlayer(durations: number[], root: RefObject<HTMLElement | null>): Player {
  const count = durations.length;
  // Timers follow the durations' values, not the array's identity.
  const key = durations.join(',');
  const times = useRef(durations);
  times.current = durations;
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(count <= 1);
  const started = useRef(false);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced || started.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !started.current) {
          started.current = true;
          setPlaying(true);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root, reduced]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the durations
  useEffect(() => {
    if (!playing) return;
    if (index >= count - 1) {
      setPlaying(false);
      setDone(true);
      return;
    }
    const t = setTimeout(() => setIndex((i) => Math.min(count - 1, i + 1)), times.current[index]);
    return () => clearTimeout(t);
  }, [playing, index, count, key]);

  const go = useCallback(
    (i: number) => {
      started.current = true;
      setPlaying(false);
      const n = clamp(i, 0, count - 1);
      setIndex(n);
      if (n === count - 1) setDone(true);
    },
    [count],
  );
  return {
    index,
    count,
    playing,
    done,
    reduced,
    play: () => {
      started.current = true;
      if (index >= count - 1) setIndex(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
    go,
    restart: () => {
      started.current = true;
      setIndex(0);
      setPlaying(!reduced);
    },
  };
}

function PlayerBar({ p, label }: { p: Player; label: (i: number) => string }) {
  const atEnd = p.index >= p.count - 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={p.restart}
          aria-label="Replay from the start"
          title="Replay"
        >
          <RotateCcw className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => p.go(p.index - 1)}
          disabled={p.index === 0}
          aria-label="Previous step"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          size="sm"
          variant={p.playing ? 'secondary' : 'dark'}
          onClick={p.playing ? p.pause : p.play}
          aria-label={p.playing ? 'Pause' : atEnd ? 'Play again' : 'Play'}
        >
          {p.playing ? (
            <Pause className="size-4" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          <span className="hidden sm:inline">
            {p.playing ? 'Pause' : atEnd ? 'Play again' : 'Play'}
          </span>
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => p.go(p.index + 1)}
          disabled={atEnd}
          aria-label="Next step"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1" aria-hidden>
        {Array.from({ length: p.count }, (_, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: frames are positional
            key={i}
            type="button"
            tabIndex={-1}
            onClick={() => p.go(i)}
            title={label(i)}
            className="group grid h-5 flex-1 place-items-center"
          >
            <span
              className={cn(
                'h-1.5 w-full rounded-full transition-colors duration-300',
                i < p.index ? 'bg-brand/60' : i === p.index ? 'bg-brand' : 'bg-line-2',
                'group-hover:bg-brand/80',
              )}
            />
          </button>
        ))}
      </div>
      <span className="font-mono text-[11.5px] text-muted tabular-nums">
        {p.index + 1}/{p.count}
      </span>
    </div>
  );
}

const TONE: Record<Tone, { Icon: typeof Info; cls: string }> = {
  ok: { Icon: CircleCheck, cls: 'border-ok/30 bg-ok-bg text-ok' },
  bad: { Icon: CircleX, cls: 'border-bad/30 bg-bad-bg text-bad' },
  info: { Icon: Info, cls: 'border-brand/25 bg-brand-soft text-brand-deep' },
};

// ───────────── The section ─────────────

export function VisualView({ s }: { s: Visual }) {
  const { scene, caption, altText } = s.body;
  return (
    <figure className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <p className="sr-only">{altText}</p>
      {scene.type === 'chat' && <ChatPlayer scene={scene} />}
      {scene.type === 'anatomy' && <AnatomyPlayer scene={scene} />}
      {scene.type === 'array' && <ArrayPlayer scene={scene} />}
      {caption && <figcaption className="text-[13px] text-muted">{caption}</figcaption>}
    </figure>
  );
}

// ───────────── Chat: a mock interview ─────────────

const TYPING_MS = 650;

function ChatPlayer({ scene }: { scene: ChatScene }) {
  const [take, setTake] = useState(0);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {scene.takes.length > 1 && (
        <div
          role="tablist"
          aria-label="Answers to compare"
          className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
        >
          {scene.takes.map((t, i) => {
            const { Icon } = TONE[t.tone];
            const on = i === take;
            return (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTake(i)}
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
                  on ? 'bg-surface text-ink shadow-soft' : 'text-muted hover:text-ink',
                )}
              >
                <Icon
                  className={cn(
                    'size-4 shrink-0',
                    t.tone === 'ok' ? 'text-ok' : t.tone === 'bad' ? 'text-bad' : 'text-brand',
                  )}
                  aria-hidden
                />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
      )}
      {/* A fresh player per take, so switching starts the new answer from the top. */}
      <ChatTake key={take} scene={scene} take={scene.takes[take] as ChatScene['takes'][number]} />
    </div>
  );
}

function ChatTake({ scene, take }: { scene: ChatScene; take: ChatScene['takes'][number] }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const durations = useMemo(
    () => take.messages.map((m) => readMs(m.text) + (m.note ? 900 : 0)),
    [take],
  );
  const p = usePlayer(durations, root);
  const [typing, setTyping] = useState(false);
  const next = take.messages[p.index + 1];

  // While playing, the next speaker "types" just before their message appears.
  useEffect(() => {
    setTyping(false);
    if (!p.playing || !next) return;
    const t = setTimeout(() => setTyping(true), Math.max(0, (durations[p.index] ?? 0) - TYPING_MS));
    return () => clearTimeout(t);
  }, [p.playing, p.index, next, durations]);

  // Keep the newest message in view inside the chat window (never scrolls the page).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when a message or the dots appear
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: p.reduced ? 'auto' : 'smooth' });
  }, [p.index, typing, p.reduced]);

  const shown = take.messages.slice(0, p.index + 1);
  const current = take.messages[p.index];
  const finished = p.index === take.messages.length - 1;
  const who = (from: 'interviewer' | 'candidate') =>
    from === 'interviewer' ? scene.interviewer : scene.candidate;

  return (
    <div ref={root} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2">
          <span className="size-2 rounded-full bg-ok" aria-hidden />
          <span className="text-[12.5px] font-semibold text-ink">Mock interview</span>
          <span className="text-[12px] text-muted">
            · {scene.interviewer} and {scene.candidate}
          </span>
        </div>
        <section
          ref={scroller}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1)
          tabIndex={0}
          aria-label="Conversation"
          className="dotgrid grid max-h-[26rem] content-start gap-3 overflow-y-auto overscroll-contain p-3 sm:p-4"
        >
          {shown.map((m, i) => (
            <Bubble
              // biome-ignore lint/suspicious/noArrayIndexKey: messages are positional
              key={i}
              from={m.from}
              name={who(m.from)}
              text={m.text}
              note={m.note}
              fresh={i === p.index}
            />
          ))}
          {typing && next && <TypingDots from={next.from} name={who(next.from)} />}
        </section>
      </div>
      <p className="sr-only" aria-live="polite">
        {current ? `${who(current.from)}: ${richToPlain(current.text)}` : ''}
        {current?.note ? ` Coach: ${current.note.text}` : ''}
      </p>
      <PlayerBar p={p} label={(i) => `Message ${i + 1}`} />
      {take.verdict && finished && (
        <div
          className={cn(
            'flex gap-2.5 rounded-xl border px-4 py-3 animate-rise',
            TONE[take.verdict.tone].cls,
          )}
        >
          {(() => {
            const { Icon } = TONE[take.verdict.tone];
            return <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />;
          })()}
          <Rich text={take.verdict.text} className="text-[14px] text-ink" />
        </div>
      )}
    </div>
  );
}

function Avatar({ from, name }: { from: 'interviewer' | 'candidate'; name: string }) {
  return (
    <span
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold',
        from === 'interviewer' ? 'bg-ink text-surface' : 'bg-brand text-brand-ink',
      )}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function Bubble({
  from,
  name,
  text,
  note,
  fresh,
}: {
  from: 'interviewer' | 'candidate';
  name: string;
  text: string;
  note?: { tone: Tone; text: string };
  fresh: boolean;
}) {
  const me = from === 'candidate';
  return (
    <div className={cn('flex items-end gap-2', me && 'flex-row-reverse', fresh && 'animate-rise')}>
      <Avatar from={from} name={name} />
      <div
        className={cn('grid max-w-[85%] gap-1.5', me ? 'justify-items-end' : 'justify-items-start')}
      >
        <span className="px-1 text-[11px] font-semibold text-muted">{name}</span>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed',
            me
              ? 'rounded-br-md bg-brand-soft text-ink'
              : 'rounded-bl-md border border-line bg-surface text-ink',
          )}
        >
          <Rich text={text} />
        </div>
        {note && (
          <span
            className={cn(
              'inline-flex max-w-full items-start gap-1.5 rounded-lg border px-2 py-1 text-[12px] font-medium',
              TONE[note.tone].cls,
              fresh && 'animate-rise [animation-delay:350ms]',
            )}
          >
            {(() => {
              const { Icon } = TONE[note.tone];
              return <Icon className="mt-px size-3.5 shrink-0" aria-hidden />;
            })()}
            <span className="text-ink">{note.text}</span>
          </span>
        )}
      </div>
    </div>
  );
}

function TypingDots({ from, name }: { from: 'interviewer' | 'candidate'; name: string }) {
  const me = from === 'candidate';
  return (
    <div className={cn('flex items-end gap-2 animate-rise', me && 'flex-row-reverse')} aria-hidden>
      <Avatar from={from} name={name} />
      <span
        className={cn(
          'flex gap-1 rounded-2xl px-3.5 py-3',
          me ? 'bg-brand-soft' : 'border border-line bg-surface',
        )}
      >
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            className="size-1.5 animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${d * 140}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

// ───────────── Anatomy: a passage taken apart ─────────────

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
/** "75 seconds", "1.5 minutes", "2 minutes": how long the whole passage takes to say. */
const duration = (s: number) => {
  if (s < 90) return `${s} seconds`;
  const half = Math.round((s / 60) * 2) / 2;
  return `${half} minute${half === 1 ? '' : 's'}`;
};

function AnatomyPlayer({ scene }: { scene: AnatomyScene }) {
  const root = useRef<HTMLDivElement>(null);
  const parts = scene.parts;
  // One frame per part, then the whole passage.
  const durations = useMemo(
    () => [
      ...parts.map((pt) => readMs(`${pt.text} ${pt.note ?? ''}`, 1200, 200, 2400, 8000)),
      4000,
    ],
    [parts],
  );
  const p = usePlayer(durations, root);
  const whole = p.index >= parts.length;
  const timed = parts.every((pt) => pt.seconds !== undefined);
  const total = parts.reduce((a, pt) => a + (pt.seconds ?? 0), 0);
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, pt) => a + (pt.seconds ?? 0), 0));
  const current = whole ? null : parts[p.index];
  const color = (i: number) => PART_COLORS[i % PART_COLORS.length] as string;

  return (
    <div ref={root} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        {scene.heading && <span className="eyebrow">{scene.heading}</span>}

        {/* Legend: identity is never colour alone, every part is named. */}
        <ul className="flex flex-wrap gap-1.5">
          {parts.map((pt, i) => {
            const on = i === p.index;
            return (
              <li key={pt.label}>
                <button
                  type="button"
                  onClick={() => p.go(i)}
                  aria-current={on ? 'step' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-all',
                    on
                      ? 'border-transparent text-ink'
                      : 'border-line text-ink-2 hover:border-line-2',
                    !whole && i > p.index && 'opacity-60',
                  )}
                  style={on ? { background: tint(color(i), 22) } : undefined}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: color(i) }}
                    aria-hidden
                  />
                  {pt.label}
                  {timed && (
                    <span className="font-mono text-[10.5px] font-medium text-muted">
                      {pt.seconds}s
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {timed && (
          <div aria-hidden>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {parts.map((pt, i) => {
                const filled = whole || i <= p.index;
                const growing = !whole && i === p.index && p.playing;
                return (
                  <span
                    key={pt.label}
                    className="relative h-full overflow-hidden"
                    style={{ flex: pt.seconds, background: tint(color(i), 22) }}
                  >
                    {filled && (
                      <span
                        // A new key restarts the fill each time this part starts playing.
                        key={growing ? `grow-${p.index}` : 'full'}
                        className="absolute inset-0 origin-left"
                        style={{
                          background: color(i),
                          animation: growing ? `grow-x ${durations[i]}ms linear both` : undefined,
                        }}
                      />
                    )}
                  </span>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted">
              <span>0:00</span>
              <span>{mmss(total)}</span>
            </div>
          </div>
        )}

        <PlayerBar
          p={p}
          label={(i) => (i < parts.length ? (parts[i]?.label ?? '') : 'The whole thing')}
        />
        <div className="grid gap-1.5 rounded-xl bg-surface-2 px-3.5 py-3" aria-live="polite">
          {current ? (
            <>
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: color(p.index) }}
                  aria-hidden
                />
                <span className="text-[14px] font-semibold text-ink">{current.label}</span>
                {timed && (
                  <span className="font-mono text-[11.5px] text-muted">
                    {mmss(starts[p.index] ?? 0)}–
                    {mmss((starts[p.index] ?? 0) + (current.seconds ?? 0))}
                  </span>
                )}
              </span>
              {current.note ? (
                <Rich text={current.note} className="text-[14px]" />
              ) : (
                <span className="sr-only">{richToPlain(current.text)}</span>
              )}
            </>
          ) : (
            <span className="text-[14px] text-ink">
              <b>The whole thing:</b> {parts.length} parts
              {timed ? `, about ${duration(total)}` : ''}. Each part has one job.
            </span>
          )}
        </div>
        <blockquote className="text-[15px] leading-[1.8] text-ink">
          {parts.map((pt, i) => {
            const past = whole || i < p.index;
            const on = !whole && i === p.index;
            const style: CSSProperties = {
              textDecorationColor: past || on ? color(i) : 'transparent',
              background: on ? tint(color(i), 18) : undefined,
            };
            return (
              <span key={pt.label}>
                <span
                  className={cn(
                    'rounded-[4px] px-0.5 underline decoration-2 underline-offset-[5px] transition-all duration-300 [box-decoration-break:clone]',
                    !past && !on && 'text-muted opacity-45',
                  )}
                  style={style}
                >
                  <Rich text={pt.text} inline />
                </span>{' '}
              </span>
            );
          })}
        </blockquote>
      </div>
    </div>
  );
}

// ───────────── Array: a row of boxes, frame by frame ─────────────

const CELL_TONE = {
  brand: 'border-brand bg-brand text-brand-ink',
  ok: 'border-ok bg-ok text-surface',
  bad: 'border-bad bg-bad text-surface',
} as const;

function ArrayPlayer({ scene }: { scene: ArrayScene }) {
  const root = useRef<HTMLDivElement>(null);
  const durations = useMemo(
    () => scene.frames.map((f) => readMs(f.narration, 1400, 200, 2600, 8000)),
    [scene.frames],
  );
  const p = usePlayer(durations, root);
  const frame = scene.frames[p.index] as ArrayScene['frames'][number];
  const values = frame.values ?? scene.cells;
  const n = values.length;
  const lit = new Set(frame.highlight);
  // Columns: cell, gap, cell, gap, … so gap labels sit between their two cells.
  const col = (cell: number) => 2 * cell + 1;

  return (
    <div ref={root} className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        {scene.label && <span className="eyebrow">{scene.label}</span>}
        <section
          className="mt-2 overflow-x-auto pb-1"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1)
          tabIndex={0}
          aria-label="The row of values"
        >
          <div
            className="mx-auto grid w-full max-w-max items-center gap-y-1.5"
            style={{
              gridTemplateColumns: Array.from({ length: n }, (_, i) =>
                i < n - 1 ? 'minmax(2rem, 3.2rem) minmax(0.75rem, 1.5rem)' : 'minmax(2rem, 3.2rem)',
              ).join(' '),
            }}
          >
            {/* Row 1: labels between cells */}
            {frame.gaps.map((g) => (
              <span
                key={`gap-${g.after}`}
                className="animate-rise text-center font-mono text-[11.5px] font-bold whitespace-nowrap text-brand-deep"
                style={{ gridRow: 1, gridColumn: `${col(g.after)} / ${col(g.after + 1) + 1}` }}
              >
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5">{g.label}</span>
              </span>
            ))}
            {/* Row 2: the cells */}
            {values.map((v, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                key={`${i}-${v}`}
                className={cn(
                  'grid h-11 place-items-center rounded-xl border font-mono text-[15px] font-bold tabular-nums transition-colors duration-300',
                  lit.has(i) ? CELL_TONE[frame.tone] : 'border-line-2 bg-surface-2 text-ink',
                  v !== scene.cells[i] && 'animate-rise',
                )}
                style={{ gridRow: 2, gridColumn: col(i) }}
              >
                {v}
              </span>
            ))}
            {/* Row 3: pointers */}
            {frame.pointers.map((ptr) => (
              <span
                key={`${ptr.label}-${ptr.index}`}
                className="grid justify-items-center font-mono text-[11px] font-bold text-ink transition-all"
                style={{ gridRow: 3, gridColumn: col(ptr.index) }}
              >
                <span aria-hidden className="leading-none text-brand">
                  ▲
                </span>
                {ptr.label}
              </span>
            ))}
            {/* Row 4: a window under a range of cells */}
            {frame.window && (
              <span
                className="grid animate-rise justify-items-center gap-0.5"
                style={{
                  gridRow: 4,
                  gridColumn: `${col(frame.window.from)} / ${col(frame.window.to) + 1}`,
                }}
              >
                <span className="h-2 w-full rounded-b-md border-x-2 border-b-2 border-brand" />
                {frame.window.label && (
                  <span className="font-mono text-[11px] font-semibold text-brand-deep">
                    {frame.window.label}
                  </span>
                )}
              </span>
            )}
          </div>
        </section>
      </div>
      <div
        className="grid gap-1.5 rounded-2xl border border-line bg-surface-2 p-4"
        aria-live="polite"
      >
        <span className="eyebrow">{frame.title}</span>
        <Rich text={frame.narration} className="text-[14px]" />
      </div>
      <PlayerBar p={p} label={(i) => scene.frames[i]?.title ?? ''} />
    </div>
  );
}
