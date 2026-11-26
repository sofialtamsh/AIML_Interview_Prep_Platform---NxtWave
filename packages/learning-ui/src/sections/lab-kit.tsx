/**
 * Shared shell for guided labs (KNN, linear regression, …): a story card whose buttons never move,
 * and a layout that follows the width the lab really has, not the window's. A lab inside a narrow
 * column (an admin preview beside a side panel, a phone) stacks; a wide one puts the picture beside
 * the story, so the picture stays put while the student reads and steps.
 */
import { cn } from '@app/ui';
import { ArrowRight, Check } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { useOptionalRuntime } from '../context';
import { Rich } from '../rich';

/** The element's own width in px (0 until it is measured, so the first paint never overflows). */
export function useWidth() {
  // A callback ref: parts of a lab mount only at later story steps, and must be measured then.
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setWidth(Math.round(el.getBoundingClientRect().width));
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

/** The element's own width and height in px (0 until measured). */
function useBox() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => {
      const r = el.getBoundingClientRect();
      const next = { width: Math.round(r.width), height: Math.round(r.height) };
      setBox((old) => (old.width === next.width && old.height === next.height ? old : next));
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, box] as const;
}

/**
 * The height in px the host leaves for this step's content (`--lesson-room`, set by the lesson
 * player from the window, its header and its step bar). Outside a player, a share of the window.
 */
function useRoom(el: HTMLElement | null, width: number) {
  const [room, setRoom] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: read again when the lab is resized
  useEffect(() => {
    if (!el) return;
    const read = () => {
      const given = Number.parseFloat(getComputedStyle(el).getPropertyValue('--lesson-room'));
      setRoom(Number.isFinite(given) ? given : Math.max(320, window.innerHeight - 208));
    };
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, [el, width]);
  return room;
}

/** True once the element is at least `min` px wide. */
export function useWide(min = 640) {
  const [ref, width] = useWidth();
  return [ref, width >= min] as const;
}

/**
 * Tells the lesson where this step's walkthrough stands, so the lesson's one "next" button walks
 * it before leaving the step. The student is never left wondering which button comes next.
 */
export function useStepFlow(
  index: number,
  count: number,
  go: (i: number) => void,
  words: { label: string; next: string },
) {
  const report = useOptionalRuntime()?.reportFlow;
  const goRef = useRef(go);
  goRef.current = go;
  const { label, next } = words;
  useEffect(() => {
    if (!report || count === 0) return;
    report({ index, count, go: (i) => goRef.current(i), label, next });
  }, [report, index, count, label, next]);
  useEffect(() => {
    if (!report) return;
    return () => report(null);
  }, [report]);
}

export interface StoryText {
  kicker: string;
  title: string;
  body: string;
}

/**
 * The story beside the picture, one step at a time. Every step is laid out in the same grid cell
 * and only the current one is visible, so the card is always as tall as its longest step: the Back
 * and Next buttons stay exactly where they are from the first click to the last.
 *
 * After the last step the card does not go quiet: it says the walkthrough is over, lists what to
 * try now, and its own button becomes the lesson's Continue.
 */
export function StoryCard({
  steps,
  step,
  onStep,
  freeTitle,
  freeBody,
  tasks,
}: {
  steps: readonly StoryText[];
  /** 0 … steps.length; steps.length is the free-play state after the last step. */
  step: number;
  onStep: (i: number) => void;
  freeTitle: string;
  freeBody: string;
  /** Things to try in free play, shown as a checklist in the card itself. */
  tasks?: readonly string[];
}) {
  const advance = useOptionalRuntime()?.advance;
  useStepFlow(step, steps.length, onStep, {
    label: `Walkthrough · step ${Math.min(step, steps.length - 1) + 1} of ${steps.length}`,
    next: step === steps.length - 1 ? 'Try it yourself' : 'Next step',
  });
  if (steps.length === 0) return null;
  const free = step >= steps.length;
  const blocks = [...steps, { kicker: '', title: freeTitle, body: freeBody }];
  const current = steps[step];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      {/* One line each, never wrapping: a label that wrapped would push the buttons down. */}
      <p className={cn('eyebrow truncate', free && 'text-ok')}>
        {current
          ? `Step ${step + 1} of ${steps.length} · ${current.kicker}`
          : 'Walkthrough done · your turn'}
      </p>
      <div className="mt-1 flex gap-1.5">
        {steps.map((st, i) => (
          <button
            key={st.title}
            type="button"
            onClick={() => onStep(i)}
            title={`Step ${i + 1}: ${st.title}`}
            aria-label={`Go to step ${i + 1}: ${st.title}`}
            aria-current={i === step ? 'step' : undefined}
            className="group min-w-0 flex-1 py-1.5"
          >
            <span
              className={cn(
                'block h-1.5 rounded-full transition-colors group-hover:bg-brand-deep',
                i <= step ? 'bg-brand' : 'bg-line-2',
              )}
            />
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)' }} className="mt-0.5">
        {blocks.map((b, i) => (
          <div
            key={b.title}
            style={{ gridArea: '1 / 1', visibility: i === step ? 'visible' : 'hidden' }}
            aria-hidden={i !== step}
          >
            <h3 className="text-[17px] font-semibold text-ink">{b.title}</h3>
            <Rich text={b.body} className="mt-1.5 text-[14.5px]" />
            {i === steps.length && tasks && tasks.length > 0 && <TaskList tasks={tasks} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(step - 1)}
          disabled={step === 0}
          className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink disabled:opacity-40"
        >
          Back
        </button>
        {free && advance ? (
          <button
            type="button"
            onClick={advance.go}
            className="inline-flex min-w-[8.5rem] items-center justify-center gap-1.5 rounded-lg border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface"
          >
            Continue <ArrowRight className="size-3.5" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onStep(step + 1)}
            disabled={free}
            className="min-w-[8.5rem] rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            {free
              ? 'Walkthrough done'
              : step === steps.length - 1
                ? 'Try it yourself'
                : 'Next step'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Things to try, ticked off as the student goes. Nothing is graded: it is their own list. */
function TaskList({ tasks }: { tasks: readonly string[] }) {
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  return (
    <ul className="mt-2 grid gap-1.5">
      {tasks.map((t, i) => {
        const on = done.has(i);
        return (
          <li key={t}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() =>
                setDone((d) => {
                  const next = new Set(d);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className="flex w-full items-start gap-2 text-left text-[13.5px] leading-snug"
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded border',
                  on ? 'border-ok bg-ok text-white' : 'border-line-2',
                )}
                aria-hidden
              >
                {on && <Check className="size-3" />}
              </span>
              <Rich text={t} className={cn(on && 'text-muted line-through')} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** One column that may shrink below its content: long labels truncate instead of overflowing. */
const COLUMN = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 } as const;

/**
 * Arranges a lab by the width it has.
 * - 880 px or more: the picture on the left (it stays in view while the right side scrolls), the
 *   story and the side panels on the right.
 * - 600 px or more: the picture beside the story, so both fit a short laptop window; the side
 *   panels go underneath at full width.
 * - narrower: story, picture and side panels one under the other, the picture capped so it fits
 *   a phone.
 */
export function LabShell({
  story,
  picture,
  side,
  children,
}: {
  story: ReactNode;
  picture: ReactNode;
  side?: ReactNode;
  /** Full-width parts under the picture: calculation tables, charts, the verdict. */
  children?: ReactNode;
}) {
  const [ref, width] = useWidth();
  const mode = width >= 880 ? 'wide' : width >= 600 ? 'medium' : 'narrow';
  const twoUp = {
    display: 'grid',
    gap: 16,
    alignItems: 'start',
    gridTemplateColumns:
      mode === 'wide' ? 'minmax(0, 400px) minmax(0, 1fr)' : 'minmax(0, 46%) minmax(0, 1fr)',
  } as const;
  return (
    <div ref={ref} className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {mode === 'wide' && (
        <div style={twoUp}>
          <div style={{ ...COLUMN, position: 'sticky', top: 12 }}>{picture}</div>
          <div style={COLUMN}>
            {story}
            {side}
          </div>
        </div>
      )}
      {mode === 'medium' && (
        <>
          <div style={twoUp}>
            <div style={COLUMN}>{picture}</div>
            <div style={COLUMN}>{story}</div>
          </div>
          {side}
        </>
      )}
      {mode === 'narrow' && (
        <>
          {story}
          <div style={{ ...COLUMN, width: '100%', maxWidth: 420, margin: '0 auto' }}>{picture}</div>
          {side}
        </>
      )}
      {children}
    </div>
  );
}

/**
 * The one-frame lab: the story, the picture, and the controls with the live calculation side by
 * side, so a student moves a slider and sees the picture and every number change without
 * scrolling. It lays out by the width it has.
 * - 960 px or more: three columns. The picture is as large as the height left in the window
 *   allows (the host's `--lesson-room`) and its column is exactly that wide, so the calculation
 *   gets every pixel the picture cannot use. The controls sit at the top of the calculation
 *   column, directly above the numbers they change.
 * - 640 px or more: the picture on the left stays in view while the story, the controls and
 *   the calculation scroll past on the right.
 * - narrower: one column, in reading order.
 */
export function LabStage({
  prompt,
  story,
  picture,
  controls,
  calc,
  after,
}: {
  prompt?: string;
  story: ReactNode;
  /** A square picture, with or without a caption under it. */
  picture: ReactNode;
  /** Sliders and buttons that drive the picture. */
  controls?: ReactNode;
  /** Tables, working and scores that the controls change. */
  calc?: ReactNode;
  /** Anything that belongs after the calculation. */
  after?: ReactNode;
}) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const check = () => setWidth(Math.round(el.getBoundingClientRect().width));
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  const room = useRoom(el, width);
  const [pictureRef, box] = useBox();
  const mode = width >= 960 ? 'three' : width >= 640 ? 'two' : 'one';
  // The picture is square. Whatever it carries besides the square (padding, a legend, a caption)
  // is the height it has over its width; the square gets what is left of the room after that.
  const chrome = Math.max(0, box.height - box.width);
  // Beside two other columns the picture takes what the story (240px) and the calculation
  // (420px, the width its tables need) can spare, between 280 and 460px.
  const widest =
    mode === 'three'
      ? Math.max(280, Math.min(460, width - 32 - 240 - 420))
      : Math.round(width * 0.44);
  const size = Math.max(240, Math.min(widest, Math.round(room - chrome)));
  const stage = (
    <div
      ref={pictureRef}
      style={{
        width: mode === 'one' ? 'min(100%, 420px)' : `min(100%, ${size}px)`,
        margin: '0 auto',
      }}
    >
      {picture}
    </div>
  );
  const lead = (
    <>
      {prompt && <Rich text={prompt} className="text-[13.5px] text-ink-2" />}
      {story}
    </>
  );
  // Pinned under the lesson's sticky header (56px). A pinned column taller than the window
  // scrolls inside itself, so its foot is never out of reach.
  const pinned = {
    ...COLUMN,
    position: 'sticky',
    top: 68,
    maxHeight: 'calc(100svh - 68px - 4.75rem)',
    overflowY: 'auto',
    scrollbarWidth: 'thin',
  } as const;
  const columns = { display: 'grid', gap: 16, alignItems: 'start' } as const;
  return (
    <div ref={setEl} className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      {mode === 'three' && (
        <div
          style={{
            ...columns,
            gridTemplateColumns: `minmax(240px, 0.8fr) ${size}px minmax(340px, 1.6fr)`,
          }}
        >
          <div style={pinned}>{lead}</div>
          <div style={pinned}>{stage}</div>
          <div style={COLUMN}>
            {controls}
            {calc}
            {after}
          </div>
        </div>
      )}
      {mode === 'two' && (
        <div style={{ ...columns, gridTemplateColumns: 'minmax(0, 44%) minmax(0, 1fr)' }}>
          <div style={pinned}>{stage}</div>
          <div style={COLUMN}>
            {lead}
            {controls}
            {calc}
            {after}
          </div>
        </div>
      )}
      {mode === 'one' && (
        <>
          {lead}
          {stage}
          {controls}
          {calc}
          {after}
        </>
      )}
    </div>
  );
}

/** About five round tick values inside [lo, hi]: 0, 2, 4 … never 2.2, 4.4. */
export function niceTicks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 5;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

/**
 * A lab picture in its card, with a key under it. Every kind of mark in the picture is named
 * there (which dots are which, what a ring or a dashed line means), so nothing in the picture
 * is left for the student to guess. The key sits under the plot, never over the data.
 */
export function PictureFrame({ children, legend }: { children: ReactNode; legend: ReactNode }) {
  return (
    <figure className="rounded-2xl border border-line bg-surface p-2">
      {children}
      <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[12px] text-muted">
        {legend}
      </figcaption>
    </figure>
  );
}

/** How a mark is drawn in a picture's key. */
const SWATCH = {
  dot: 'size-2.5 rounded-full',
  hollow: 'size-2.5 rounded-full border-[1.5px] bg-surface',
  ring: 'size-2.5 rounded-full border-2 bg-transparent',
  line: 'h-0.5 w-4 rounded-full',
  dash: 'h-0 w-4 border-t-2 border-dashed bg-transparent',
  stick: 'h-3 w-0.5 rounded-full',
  area: 'size-2.5 rounded-[3px]',
} as const;

/** One entry of a picture's key: a swatch drawn like the mark, then what it stands for. */
export function Key({
  mark,
  tone,
  children,
}: {
  mark: keyof typeof SWATCH;
  /** Colour classes for the swatch, such as `bg-brand` or `border-bad`. */
  tone: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('shrink-0', SWATCH[mark], tone)} aria-hidden />
      {children}
    </span>
  );
}

/** The box that holds a lab's controls: one compact row each, above the numbers they change. */
export function ControlStrip({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
      {children}
      {hint && <p className="text-[12px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/**
 * A slider on one line: its name, the track, and its value. A third of the height of a stacked
 * slider, so three of them and the picture they drive fit one window.
 */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  shown,
  tight = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  shown: string;
  /** Half a row: the name takes only the width it needs, so two sliders share one line. */
  tight?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        'grid items-center',
        tight
          ? 'grid-cols-[auto_minmax(3.5rem,1fr)_2.5rem] gap-2'
          : 'grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_3.5rem] gap-2.5',
      )}
    >
      <label htmlFor={id} className="eyebrow truncate" title={label}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-4 w-full accent-[var(--brand)]"
      />
      <span className="text-right font-mono text-[13.5px] font-bold text-ink">{shown}</span>
    </div>
  );
}

/**
 * A choice on one line: its name, then the options. The stacked picker takes a line for its name
 * alone; three of those push the numbers they change out of the window.
 */
export function PickRow<T extends string>({
  label,
  options,
  value,
  onChange,
  names,
  note,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  names: Record<T, string>;
  /** A short line under the options, such as the formula the choice stands for. */
  note?: string;
}) {
  if (options.length < 2) return null;
  return (
    <fieldset className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)] items-start gap-x-2.5 gap-y-1">
      <legend className="sr-only">{label}</legend>
      <span className="eyebrow truncate pt-1.5" title={label} aria-hidden>
        {label}
      </span>
      <div className="grid gap-1">
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={o === value}
              onClick={() => onChange(o)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
                o === value
                  ? 'border-brand bg-brand text-white'
                  : 'border-line-2 bg-surface text-ink hover:border-brand',
              )}
            >
              {names[o]}
            </button>
          ))}
        </div>
        {note && <p className="font-mono text-[11.5px] text-muted">{note}</p>}
      </div>
    </fieldset>
  );
}

/** One panel at a time: in free play a lab's calculation panels share one place, by tab. */
export function PanelTabs<K extends string>({
  options,
  value,
  onChange,
  names,
}: {
  options: readonly K[];
  value: K;
  onChange: (k: K) => void;
  names: Record<K, string>;
}) {
  if (options.length < 2) return null;
  return (
    <div role="tablist" aria-label="What to work out" className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="tab"
          aria-selected={o === value}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
            o === value
              ? 'border-ink bg-ink text-surface'
              : 'border-line-2 bg-surface text-ink hover:border-ink-2',
          )}
        >
          {names[o]}
        </button>
      ))}
    </div>
  );
}
