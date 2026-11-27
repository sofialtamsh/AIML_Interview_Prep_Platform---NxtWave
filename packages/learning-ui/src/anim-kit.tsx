/**
 * The parts every moving picture is drawn with: the loop plumbing (SMIL keyframes that are
 * dropped when the student prefers reduced motion) and the small drawing helpers in theme
 * colours. The pictures themselves live in animations.tsx and in anim/<unit>.tsx.
 *
 * Rules for a picture (see animations.test.ts): an accessible looping SVG, theme colours only,
 * no emoji, and the plain attributes are the final, most telling frame.
 */
import { cn } from '@app/ui';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

// ───────────── Plumbing ─────────────

export interface Ctx {
  still: boolean;
  dur: number;
  uid: string;
}
export const AnimCtx = createContext<Ctx>({ still: true, dur: 8, uid: 'anim' });

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!q) return;
    const on = () => setReduced(q.matches);
    on();
    q.addEventListener?.('change', on);
    return () => q.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/** Keyframes as [time, value] pairs; time runs 0–1 over one loop. */
export type Keys = ReadonlyArray<readonly [number, number | string]>;
export const FADE = 0.025;

export function keyAttrs(keys: Keys, discrete: boolean) {
  const ks = [...keys];
  const last = ks[ks.length - 1];
  if (!discrete && last && last[0] < 1) ks.push([1, last[1]]);
  return {
    values: ks.map((k) => k[1]).join(';'),
    keyTimes: ks.map((k) => Number(k[0].toFixed(4))).join(';'),
  };
}

/** Animates one attribute of its parent element over the loop. */
export function Anim({
  attr,
  keys,
  discrete = false,
}: {
  attr: string;
  keys: Keys;
  discrete?: boolean;
}) {
  const { still, dur } = useContext(AnimCtx);
  if (still) return null;
  return (
    <animate
      attributeName={attr}
      dur={`${dur}s`}
      repeatCount="indefinite"
      calcMode={discrete ? 'discrete' : 'linear'}
      {...keyAttrs(keys, discrete)}
    />
  );
}

/** Shown from `from` to `to` (fractions of the loop); `final` says whether the still frame shows it. */
export function Show({
  from = 0,
  to,
  final = true,
  children,
}: {
  from?: number;
  to?: number;
  final?: boolean;
  children: ReactNode;
}) {
  const keys: Array<readonly [number, number]> =
    from <= 0
      ? [[0, 1]]
      : [
          [0, 0],
          [from, 0],
          [Math.min(from + FADE, 1), 1],
        ];
  if (to !== undefined && to < 1) keys.push([to, 1], [Math.min(to + FADE, 1), 0]);
  return (
    <g opacity={final ? 1 : 0}>
      <Anim attr="opacity" keys={keys} />
      {children}
    </g>
  );
}

export type Pt = readonly [number, number];

/** Moves its children through [time, [dx, dy]] keyframes; `at` is the still-frame offset. */
export function Move({
  keys,
  at = [0, 0],
  discrete = false,
  children,
}: {
  keys: ReadonlyArray<readonly [number, Pt]>;
  at?: Pt;
  discrete?: boolean;
  children: ReactNode;
}) {
  const { still, dur } = useContext(AnimCtx);
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      {!still && (
        <animateTransform
          attributeName="transform"
          type="translate"
          dur={`${dur}s`}
          repeatCount="indefinite"
          calcMode={discrete ? 'discrete' : 'linear'}
          {...keyAttrs(
            keys.map(([t, [x, y]]) => [t, `${x} ${y}`] as const),
            discrete,
          )}
        />
      )}
      {children}
    </g>
  );
}

export function Spin({
  cx,
  cy,
  seconds = 3,
  children,
}: {
  cx: number;
  cy: number;
  seconds?: number;
  children: ReactNode;
}) {
  const { still } = useContext(AnimCtx);
  return (
    <g>
      {!still && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0 ${cx} ${cy};360 ${cx} ${cy}`}
          dur={`${seconds}s`}
          repeatCount="indefinite"
        />
      )}
      {children}
    </g>
  );
}

/** A dot that travels along a path again and again (hidden in the still frame). */
export function Travel({
  path,
  begin = 0,
  seconds = 2,
  className = 'fill-g1',
  r = 3,
}: {
  path: string;
  begin?: number;
  seconds?: number;
  className?: string;
  r?: number;
}) {
  const { still } = useContext(AnimCtx);
  if (still) return null;
  return (
    <circle r={r} className={className}>
      <animateMotion dur={`${seconds}s`} begin={`${begin}s`} repeatCount="indefinite" path={path} />
    </circle>
  );
}

/** Draw a stroke from nothing to whole between two loop times (use on a path with pathLength 1). */
export const drawKeys = (from: number, to: number): Keys => [
  [0, 1],
  [from, 1],
  [to, 0],
];

export const TONE = {
  ink: 'fill-ink',
  muted: 'fill-muted',
  brand: 'fill-brand',
  ok: 'fill-ok',
  bad: 'fill-bad',
  warn: 'fill-warn',
  surface: 'fill-surface',
  g1: 'fill-g1',
  g2: 'fill-g2',
  g3: 'fill-g3',
} as const;

export function T({
  x,
  y,
  children,
  size = 10,
  tone = 'muted',
  anchor = 'middle',
  mono = false,
  bold = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  tone?: keyof typeof TONE;
  anchor?: 'start' | 'middle' | 'end';
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      textAnchor={anchor}
      fontWeight={bold ? 700 : 500}
      className={cn(TONE[tone], mono && 'font-mono')}
    >
      {children}
    </text>
  );
}

export const BOX = {
  plain: 'fill-surface stroke-line-2',
  soft: 'fill-surface-2 stroke-line',
  brand: 'fill-brand-soft stroke-brand',
  ok: 'fill-ok-bg stroke-ok',
  bad: 'fill-bad-bg stroke-bad',
  warn: 'fill-warn-bg stroke-warn',
  ink: 'fill-ink stroke-ink',
  ring: 'fill-none stroke-brand',
  ringOk: 'fill-none stroke-ok',
  ringBad: 'fill-none stroke-bad',
} as const;

export function Box({
  x,
  y,
  w,
  h,
  r = 8,
  tone = 'plain',
  width = 1.25,
  dashed = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  tone?: keyof typeof BOX;
  width?: number;
  dashed?: boolean;
}) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={r}
      strokeWidth={width}
      strokeDasharray={dashed ? '5 4' : undefined}
      className={BOX[tone]}
    />
  );
}

/** A labelled chip: a small box with centred mono text. */
export function Chip({
  x,
  y,
  w,
  h = 22,
  label,
  tone = 'plain',
  text = 'ink',
  size = 10.5,
}: {
  x: number;
  y: number;
  w: number;
  h?: number;
  label: string;
  tone?: keyof typeof BOX;
  text?: keyof typeof TONE;
  size?: number;
}) {
  return (
    <g>
      <Box x={x} y={y} w={w} h={h} r={6} tone={tone} />
      <T x={x + w / 2} y={y + h / 2 + size * 0.36} size={size} tone={text} mono>
        {label}
      </T>
    </g>
  );
}

export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone = 'muted',
  width = 1.5,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone?: 'muted' | 'brand' | 'bad' | 'ok';
  width?: number;
}) {
  const { uid } = useContext(AnimCtx);
  const stroke = {
    muted: 'stroke-muted',
    brand: 'stroke-brand',
    bad: 'stroke-bad',
    ok: 'stroke-ok',
  }[tone];
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      strokeWidth={width}
      className={stroke}
      markerEnd={`url(#${uid}-${tone})`}
    />
  );
}

export function Markers() {
  const { uid } = useContext(AnimCtx);
  const tones = { muted: 'fill-muted', brand: 'fill-brand', bad: 'fill-bad', ok: 'fill-ok' };
  return (
    <defs>
      {Object.entries(tones).map(([tone, cls]) => (
        <marker
          key={tone}
          id={`${uid}-${tone}`}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className={cls} />
        </marker>
      ))}
    </defs>
  );
}
