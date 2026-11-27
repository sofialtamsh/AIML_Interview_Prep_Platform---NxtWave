/**
 * Moving pictures for the logistic regression unit, drawn from the unit's own example and numbers. Each is
 * registered here and described in @app/content (animations-logreg.ts); see anim-kit.tsx for the
 * helpers and the rules every picture follows.
 *
 * Every number is computed from the same code the unit's labs run (../logreg), on the same ten
 * students, so a picture cannot drift from the slides beside it.
 */
import type { AnimationName } from '@app/content';
import { type ReactNode, useContext } from 'react';
import {
  Anim,
  AnimCtx,
  Arrow,
  Box,
  Chip,
  drawKeys,
  type Keys,
  keyAttrs,
  Move,
  type Pt,
  Show,
  T,
} from '../anim-kit';
import {
  auc,
  confusion,
  fit as fitModel,
  gradient,
  logit,
  oddsOf,
  probas,
  rocCurve,
  rowLoss,
  sigmoid,
} from '../logreg';

// ───────────── The unit's example ─────────────

/** Ten students: hours of practice a week, and whether they cleared the coding test (1) or not (0). */
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const CLEARED = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1] as const;
const ROWS = HOURS.map((h) => [h]);
/** The maximum likelihood fit the unit teaches: z = 0.6767·hours − 3.7219. */
const MODEL = fitModel(ROWS, CLEARED).model;
const W = MODEL.weights[0] ?? 0;
const B = MODEL.intercept;
const P = probas(MODEL, ROWS);
const STUDENTS = HOURS.map((hours, i) => ({
  hours,
  y: CLEARED[i] ?? 0,
  p: P[i] ?? 0,
}));

/** A number as the lesson prints it, with a true minus sign. */
const num = (v: number, digits: number) => v.toFixed(digits).replace('-', '−');

/** A path through points, as an SVG d string. */
const polyline = (pts: ReadonlyArray<Pt>) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/** A stroke drawn from nothing to whole between two loop times. */
function Drawn({
  d,
  from,
  to,
  className,
  width = 2,
}: {
  d: string;
  from: number;
  to: number;
  className: string;
  width?: number;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      strokeDasharray="1"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`fill-none ${className}`}
    >
      <Anim attr="stroke-dashoffset" keys={drawKeys(from, to)} />
    </path>
  );
}

/** Turns its children about (cx, cy) through [time, degrees] keyframes; `at` is the still angle. */
function Turn({
  cx,
  cy,
  keys,
  at,
  children,
}: {
  cx: number;
  cy: number;
  keys: Keys;
  at: number;
  children: ReactNode;
}) {
  const { still, dur } = useContext(AnimCtx);
  return (
    <g transform={`rotate(${at} ${cx} ${cy})`}>
      {!still && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          dur={`${dur}s`}
          repeatCount="indefinite"
          calcMode="linear"
          {...keyAttrs(
            keys.map(([t, a]) => [t, `${a} ${cx} ${cy}`] as const),
            false,
          )}
        />
      )}
      {children}
    </g>
  );
}

/** A student as a token: hours inside a dot, blue when they cleared, grey when they did not. */
function Token({
  x,
  y,
  hours,
  cleared,
}: {
  x: number;
  y: number;
  hours: number;
  cleared: boolean;
}) {
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={8}
        className={cleared ? 'fill-brand stroke-surface' : 'fill-muted stroke-surface'}
        strokeWidth={1}
      />
      <T x={x} y={y + 2.9} size={8} tone="surface" mono bold>
        {hours}
      </T>
    </g>
  );
}

// ───────────── slides.intro · Score, then probability ─────────────

function ScoreToProbability() {
  const hours = 8;
  const z = W * hours + B;
  const p = sigmoid(z);
  const px = (s: number) => 60 + ((s + 4) / 8) * 240;
  const py = (v: number) => 166 - v * 102;
  const curve = polyline(
    Array.from({ length: 81 }, (_, i) => {
      const s = -4 + (8 * i) / 80;
      return [px(s), py(sigmoid(s))] as const;
    }),
  );
  const zx = px(z);
  const zy = py(p);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One student, 8 hours: a score, then a probability
      </T>
      <Show from={0.03}>
        <Chip x={8} y={22} w={62} label={`x = ${hours} hours`} size={8.5} />
      </Show>
      <Show from={0.12}>
        <Arrow x1={72} y1={33} x2={85} y2={33} />
        <Chip
          x={88}
          y={22}
          w={130}
          label={`z = ${num(W, 4)} × ${hours} − ${num(-B, 4)}`}
          size={8.5}
        />
      </Show>
      <Show from={0.22}>
        <Arrow x1={220} y1={33} x2={233} y2={33} />
        <Chip x={236} y={22} w={76} label={`z = ${num(z, 3)}`} size={8.5} tone="brand" />
      </Show>

      {/* The sigmoid over the score: z across, p up. */}
      {[0, 0.5, 1].map((v) => (
        <g key={v}>
          <line
            x1={60}
            y1={py(v)}
            x2={300}
            y2={py(v)}
            className="stroke-line-2"
            strokeWidth={1}
            strokeDasharray={v === 0.5 ? '2 4' : undefined}
          />
          <T x={55} y={py(v) + 3} size={7.5} anchor="end" mono>
            {v}
          </T>
        </g>
      ))}
      <line
        x1={px(0)}
        y1={py(1)}
        x2={px(0)}
        y2={py(0)}
        className="stroke-line-2"
        strokeWidth={1}
        strokeDasharray="2 4"
      />
      {[-4, -2, 0, 2, 4].map((v) => (
        <T key={v} x={px(v)} y={177} size={7.5} mono>
          {num(v, 0)}
        </T>
      ))}
      <T x={300} y={160} size={8} anchor="end">
        score z
      </T>
      <T x={62} y={58} size={8} anchor="start">
        probability p = σ(z)
      </T>
      <path d={curve} className="fill-none stroke-g1" strokeWidth={2.4} strokeLinejoin="round" />

      {/* The score drops onto the z axis, rises to the curve, and is read across as p. */}
      <Drawn
        d={`M${zx} ${py(0)} V${zy}`}
        from={0.36}
        to={0.48}
        className="stroke-brand"
        width={1.4}
      />
      <Drawn
        d={`M${zx} ${zy} H${px(-4)}`}
        from={0.54}
        to={0.66}
        className="stroke-brand"
        width={1.4}
      />
      <Show from={0.3}>
        <circle cx={zx} cy={zy} r={4.4} className="fill-brand stroke-surface" strokeWidth={1.2}>
          <Anim
            attr="cy"
            keys={[
              [0, py(0)],
              [0.36, py(0)],
              [0.48, zy],
            ]}
          />
        </circle>
        <T x={zx - 7} y={160} size={8.5} anchor="end" mono bold tone="brand">
          {num(z, 3)}
        </T>
      </Show>
      <Show from={0.66}>
        <T x={55} y={zy + 3} size={8.5} anchor="end" mono bold tone="brand">
          {num(p, 3)}
        </T>
      </Show>
      <Show from={0.72}>
        <T x={160} y={194} size={9} tone="ink">
          {`σ(${num(z, 3)}) = ${num(p, 3)}: an ${Math.round(p * 100)}% chance of clearing`}
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.intro · Odds and log-odds ─────────────

function OddsScales() {
  const rows = [0.2, 0.5, 0.8, 0.9].map((p) => ({ p, odds: oddsOf(p), lo: logit(p) }));
  const Y = { p: 42, odds: 94, lo: 146 };
  const xp = (p: number) => 66 + p * 240;
  const xo = (o: number) => 66 + o * 24;
  const xl = (l: number) => 186 + l * 40;
  const short = (v: number) => String(Number(v.toFixed(2)));
  const logText = (v: number) => (Math.abs(v) < 1e-9 ? '0' : num(v, 3));
  const scales = [
    { y: Y.p, name: 'probability', range: '0 to 1' },
    { y: Y.odds, name: 'odds', range: '0 to ∞' },
    { y: Y.lo, name: 'log-odds', range: '−∞ to ∞' },
  ];
  const low = rows[0];
  const high = rows[2];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The same four chances on three scales
      </T>
      {scales.map((s) => (
        <g key={s.name}>
          <T x={6} y={s.y} size={8.5} anchor="start" tone="ink" bold>
            {s.name}
          </T>
          <T x={6} y={s.y + 11} size={7.5} anchor="start">
            {s.range}
          </T>
          <line x1={66} y1={s.y} x2={306} y2={s.y} className="stroke-line-2" strokeWidth={1.2} />
        </g>
      ))}

      {rows.map((r, k) => {
        const mid = r.p === 0.5;
        const a = `M${xp(r.p)} ${Y.p + 17} L${xo(r.odds)} ${Y.odds - 6}`;
        const b = `M${xo(r.odds)} ${Y.odds + 17} L${xl(r.lo)} ${Y.lo - 6}`;
        const dot = mid ? 'fill-brand stroke-surface' : 'fill-ink stroke-surface';
        const tone = mid ? 'brand' : 'ink';
        return (
          <g key={r.p}>
            <Drawn
              d={a}
              from={0.16 + k * 0.03}
              to={0.26 + k * 0.03}
              className="stroke-muted"
              width={1}
            />
            <Drawn
              d={b}
              from={0.42 + k * 0.03}
              to={0.52 + k * 0.03}
              className="stroke-muted"
              width={1}
            />
            <Show from={0.03 + k * 0.03}>
              <circle cx={xp(r.p)} cy={Y.p} r={3.8} className={dot} strokeWidth={1} />
              <T x={xp(r.p)} y={Y.p + 13} size={7.5} mono bold={mid} tone={tone}>
                {String(r.p)}
              </T>
            </Show>
            <Show from={0.26 + k * 0.03}>
              <circle cx={xo(r.odds)} cy={Y.odds} r={3.8} className={dot} strokeWidth={1} />
              <T x={xo(r.odds)} y={Y.odds + 13} size={7.5} mono bold={mid} tone={tone}>
                {short(r.odds)}
              </T>
            </Show>
            <Show from={0.52 + k * 0.03}>
              <circle cx={xl(r.lo)} cy={Y.lo} r={3.8} className={dot} strokeWidth={1} />
              <T x={xl(r.lo)} y={Y.lo + 13} size={7.5} mono bold={mid} tone={tone}>
                {logText(r.lo)}
              </T>
            </Show>
            {/* The even chance, traced through all three scales. */}
            {mid && (
              <Show from={0.68}>
                <path
                  d={`${a} ${b}`}
                  className="fill-none stroke-brand"
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              </Show>
            )}
          </g>
        );
      })}
      <Show from={0.7}>
        <T x={160} y={177} size={9} tone="ink" bold>
          Even chances: p 0.5, odds 1, log-odds 0
        </T>
      </Show>
      {low && high && (
        <Show from={0.8}>
          <path
            d={`M${xl(low.lo)} ${Y.lo + 16} V${Y.lo + 20} H${xl(high.lo)} V${Y.lo + 16}`}
            className="fill-none stroke-muted"
            strokeWidth={1}
          />
          <T x={160} y={190} size={8.5}>
            {`Log-odds is symmetric: 0.2 and 0.8 sit at −${num(high.lo, 3)} and +${num(high.lo, 3)}`}
          </T>
        </Show>
      )}
    </>
  );
}

// ───────────── slides.loss · Why not squared error ─────────────

function SquaredVsLog() {
  const px = (p: number) => 46 + p * 256;
  const py = (loss: number) => 148 - (loss / 5) * 108;
  // Both curves are drawn from p = 1 leftwards: the story is what happens as p falls towards 0.
  const squared = polyline(
    Array.from({ length: 81 }, (_, i) => {
      const p = 1 - i / 80;
      return [px(p), py((1 - p) ** 2)] as const;
    }),
  );
  const logLoss = polyline(
    Array.from({ length: 121 }, (_, i) => {
      const p = Math.exp(-5 * (i / 120));
      return [px(p), py(-Math.log(p))] as const;
    }),
  );
  const at = 0.01;
  const sq = (1 - at) ** 2;
  const lg = -Math.log(at);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        True label 1: what each prediction costs
      </T>
      <line x1={46} y1={148} x2={302} y2={148} className="stroke-line-2" strokeWidth={1} />
      <line x1={46} y1={36} x2={46} y2={148} className="stroke-line-2" strokeWidth={1} />
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <T key={v} x={41} y={py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((v) => (
        <T key={v} x={px(v)} y={159} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={174} y={171} size={8}>
        predicted probability p
      </T>
      <T x={50} y={31} size={8} anchor="start">
        cost of the row
      </T>
      <line x1={196} y1={38} x2={211} y2={38} className="stroke-g1" strokeWidth={2.4} />
      <T x={215} y={41} size={8} anchor="start" tone="ink">
        log loss −ln p
      </T>
      <line x1={196} y1={51} x2={211} y2={51} className="stroke-g3" strokeWidth={2.4} />
      <T x={215} y={54} size={8} anchor="start" tone="ink">
        squared error (1 − p)²
      </T>

      <Drawn d={squared} from={0.05} to={0.28} className="stroke-g3" width={2.4} />
      <Show from={0.3}>
        <line
          x1={46}
          y1={py(1)}
          x2={302}
          y2={py(1)}
          className="stroke-line-2"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <T x={300} y={py(1) - 5} size={7.5} anchor="end">
          squared error never passes 1
        </T>
      </Show>
      <Drawn d={logLoss} from={0.36} to={0.6} className="stroke-g1" width={2.4} />

      {/* Confident and wrong: p = 0.01 for a row that really is 1. */}
      <Show from={0.64}>
        <circle cx={px(at)} cy={py(lg)} r={4} className="fill-g1 stroke-surface" strokeWidth={1} />
        <circle cx={px(at)} cy={py(sq)} r={4} className="fill-g3 stroke-surface" strokeWidth={1} />
        <T x={56} y={py(lg) + 4} size={9} anchor="start" mono bold tone="ink">
          {`${num(lg, 1)} at p = ${at}`}
        </T>
        <T x={56} y={py(sq) - 6} size={9} anchor="start" mono bold tone="ink">
          {num(sq, 2)}
        </T>
      </Show>
      <Show from={0.72}>
        <T x={160} y={187} size={8.5}>
          {`Confident and wrong at p = ${at}: squared error ${num(sq, 2)}, log loss ${num(lg, 1)}`}
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.loss · Maximum likelihood ─────────────

function LikelihoodBars() {
  const rows = STUDENTS.map((s) => ({
    ...s,
    chance: s.y === 1 ? s.p : 1 - s.p,
    loss: rowLoss(s.y, s.p),
  }));
  const likelihood = rows.reduce((acc, r) => acc * r.chance, 1);
  const total = rows.reduce((acc, r) => acc + r.loss, 0);
  const mean = total / rows.length;
  const cx = (i: number) => 30 + i * 29;
  const base = 90;
  const tall = 54;
  const top = 108;
  const perLoss = 34;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The chance the model gave each real outcome
      </T>
      <line x1={14} y1={base} x2={306} y2={base} className="stroke-line-2" strokeWidth={1} />
      <line x1={14} y1={top} x2={306} y2={top} className="stroke-line-2" strokeWidth={1} />
      {rows.map((r, i) => {
        const h = r.chance * tall;
        const d = r.loss * perLoss;
        const wrong = r.chance < 0.5;
        const t = 0.03 + i * 0.025;
        const u = 0.44 + i * 0.02;
        return (
          <g key={r.hours}>
            <rect
              x={cx(i) - 7}
              y={base - h}
              width={14}
              height={h}
              rx={2}
              className={wrong ? 'fill-bad' : 'fill-brand'}
            >
              <Anim
                attr="height"
                keys={[
                  [0, 0],
                  [t, 0],
                  [t + 0.06, h],
                ]}
              />
              <Anim
                attr="y"
                keys={[
                  [0, base],
                  [t, base],
                  [t + 0.06, base - h],
                ]}
              />
            </rect>
            <Show from={t + 0.06}>
              <T x={cx(i)} y={base - h - 3} size={7} mono tone={wrong ? 'bad' : 'ink'}>
                {r.chance.toFixed(2)}
              </T>
            </Show>
            <T x={cx(i)} y={top - 7} size={7.5} mono>
              {`${r.hours}h`}
            </T>
            <rect
              x={cx(i) - 7}
              y={top}
              width={14}
              height={d}
              rx={2}
              className={wrong ? 'fill-bad' : 'fill-g1'}
            >
              <Anim
                attr="height"
                keys={[
                  [0, 0],
                  [u, 0],
                  [u + 0.06, d],
                ]}
              />
            </rect>
            <Show from={u + 0.06}>
              <T x={cx(i)} y={top + d + 9} size={7} mono tone={wrong ? 'bad' : 'ink'}>
                {r.loss.toFixed(2)}
              </T>
            </Show>
          </g>
        );
      })}
      <Show from={0.44}>
        <T x={14} y={150} size={8} anchor="start" tone="ink" bold>
          −ln of each: its loss
        </T>
      </Show>

      {/* Multiply the ten chances; −ln turns that product into the sum of the losses. */}
      <Show from={0.34}>
        <Chip x={4} y={176} w={94} h={20} label={`likelihood ${likelihood.toFixed(4)}`} size={8} />
      </Show>
      <Show from={0.7}>
        <Arrow x1={100} y1={186} x2={113} y2={186} />
        <T x={106} y={172} size={7.5} mono>
          −ln
        </T>
        <Chip x={116} y={176} w={94} h={20} label={`total loss ${total.toFixed(3)}`} size={8} />
      </Show>
      <Show from={0.8}>
        <Arrow x1={212} y1={186} x2={225} y2={186} />
        <T x={218} y={172} size={7.5} mono>
          ÷ 10
        </T>
        <Chip
          x={228}
          y={176}
          w={88}
          h={20}
          label={`log loss ${mean.toFixed(4)}`}
          size={8}
          tone="brand"
        />
      </Show>
    </>
  );
}

// ───────────── slides.loss · Gradient of the log loss ─────────────

function GradientPushes() {
  const start = { weights: [0], intercept: 0 };
  const slope = gradient(start, ROWS, CLEARED);
  const gw = slope.gw[0] ?? 0;
  const lr = 0.1;
  const next = 0 - lr * gw;
  const rows = STUDENTS.map((s) => {
    const error = sigmoid(0) - s.y;
    return { ...s, error, push: error * s.hours };
  });
  const zero = 98;
  const unit = 9;
  const cx = (i: number) => 44 + i * 28;
  const grow = 0.42;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Start at w = 0, b = 0: every student gets p = 0.5
      </T>
      <Show to={0.4} final={false}>
        <T x={160} y={29} size={8.5} tone="ink">
          Error p − y: +0.5 if not cleared, −0.5 if cleared
        </T>
        <T x={160} y={41} size={8.5}>
          {`They cancel: mean(p − y) = ${num(Math.abs(slope.gb) < 1e-9 ? 0 : slope.gb, 0)}, so b stays at 0`}
        </T>
      </Show>
      <Show from={grow}>
        <T x={160} y={29} size={8.5} tone="ink">
          × hours: more hours, a bigger push
        </T>
        <T x={160} y={41} size={8.5}>
          {`mean((p − y) × hours) = ${num(gw, 2)}`}
        </T>
      </Show>

      <line x1={30} y1={zero} x2={306} y2={zero} className="stroke-line-2" strokeWidth={1.2} />
      <T x={26} y={zero + 3} size={7.5} anchor="end" mono>
        0
      </T>
      {rows.map((r, i) => {
        const small = Math.abs(r.error) * unit;
        const big = Math.abs(r.push) * unit;
        const up = r.push > 0;
        const cls = r.y === 1 ? 'fill-brand' : 'fill-muted';
        return (
          <g key={r.hours}>
            <rect
              x={cx(i) - 7}
              y={up ? zero - big : zero}
              width={14}
              height={big}
              rx={2}
              className={cls}
            >
              <Anim
                attr="height"
                keys={[
                  [0, small],
                  [grow, small],
                  [grow + 0.12, big],
                ]}
              />
              {up && (
                <Anim
                  attr="y"
                  keys={[
                    [0, zero - small],
                    [grow, zero - small],
                    [grow + 0.12, zero - big],
                  ]}
                />
              )}
            </rect>
            <Show from={0.04} to={0.4} final={false}>
              <T x={cx(i)} y={up ? zero - small - 4 : zero + small + 10} size={7.5} mono>
                {`${r.error > 0 ? '+' : '−'}${Math.abs(r.error)}`}
              </T>
            </Show>
            <Show from={grow + 0.12}>
              <T
                x={cx(i)}
                y={up ? zero - big - 4 : zero + big + 10}
                size={7.5}
                mono
                bold
                tone={r.y === 1 ? 'brand' : 'ink'}
              >
                {num(r.push, Number.isInteger(r.push) ? 0 : 1)}
              </T>
            </Show>
            <T x={cx(i)} y={166} size={7.5} mono>
              {`${r.hours}h`}
            </T>
          </g>
        );
      })}
      <T x={306} y={80} size={7.5} anchor="end">
        did not clear:
      </T>
      <T x={306} y={90} size={7.5} anchor="end">
        pushes w down
      </T>
      <T x={32} y={142} size={7.5} anchor="start" tone="brand">
        cleared: pulls w up
      </T>

      {/* The mean of the pushes is the slope; gradient descent steps against it. */}
      <Show from={0.62}>
        <line
          x1={30}
          y1={zero - gw * unit}
          x2={306}
          y2={zero - gw * unit}
          className="stroke-bad"
          strokeWidth={1.4}
          strokeDasharray="4 3"
        />
        <T x={32} y={zero - gw * unit + 13} size={8.5} anchor="start" mono bold tone="bad">
          {`mean ${num(gw, 2)}`}
        </T>
      </Show>
      <Show from={0.74}>
        <T x={160} y={183} size={8.5}>
          A negative slope, so gradient descent raises w
        </T>
        <T x={160} y={197} size={9} mono bold tone="ink">
          {`w = 0 − ${lr} × (${num(gw, 2)}) = ${num(next, 3)}`}
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.metrics · The confusion matrix ─────────────

/** The four boxes, laid out as the slide's table: actual down the side, predicted across. */
const MATRIX = {
  colX: { yes: 62, no: 192 },
  colW: 126,
  rowY: { yes: 76, no: 138 },
  rowH: 58,
};

function ConfusionDrop() {
  const counts = confusion(CLEARED, P, 0.5);
  const order = [...STUDENTS].sort((a, b) => b.p - a.p);
  const startX = (k: number) => (k < 5 ? 70 + k * 26 : 206 + (k - 5) * 26);
  const boxes = [
    { key: 'tp', actual: 1, called: true, label: 'true positives', n: counts.tp, ok: true },
    { key: 'fn', actual: 1, called: false, label: 'false negative', n: counts.fn, ok: false },
    { key: 'fp', actual: 0, called: true, label: 'false positive', n: counts.fp, ok: false },
    { key: 'tn', actual: 0, called: false, label: 'true negatives', n: counts.tn, ok: true },
  ] as const;
  const boxOf = (s: (typeof STUDENTS)[number]) => {
    const called = s.p >= 0.5;
    return {
      x: called ? MATRIX.colX.yes : MATRIX.colX.no,
      y: s.y === 1 ? MATRIX.rowY.yes : MATRIX.rowY.no,
    };
  };
  // Where each student lands: side by side in its box.
  const landing = order.map((s) => {
    const mates = order.filter((o) => o.p >= 0.5 === s.p >= 0.5 && o.y === s.y);
    const j = mates.indexOf(s);
    const at = boxOf(s);
    return [at.x + MATRIX.colW / 2 + (j - (mates.length - 1) / 2) * 24, at.y + 38] as const;
  });
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Ten students, threshold 0.5: four boxes
      </T>
      <T x={6} y={37} size={7.5} anchor="start">
        hours
      </T>
      <T x={6} y={56} size={7.5} anchor="start">
        p
      </T>
      <line
        x1={190}
        y1={22}
        x2={190}
        y2={58}
        className="stroke-ink"
        strokeWidth={1.2}
        strokeDasharray="3 3"
      />
      {order.map((s, k) => (
        <g key={s.hours}>
          <circle
            cx={startX(k)}
            cy={34}
            r={8}
            className="fill-none stroke-line-2"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
          <T x={startX(k)} y={54} size={7} mono>
            {s.p.toFixed(2)}
          </T>
        </g>
      ))}
      <T x={125} y={70} size={7.5} tone="ink">
        predicted cleared · p ≥ 0.5
      </T>
      <T x={254} y={70} size={7.5} tone="ink">
        predicted not · p &lt; 0.5
      </T>
      <T x={6} y={70} size={7.5} anchor="start">
        actual
      </T>
      <T x={6} y={104} size={8.5} anchor="start" tone="ink" bold>
        cleared
      </T>
      <T x={6} y={115} size={7.5} anchor="start">
        (5)
      </T>
      <T x={6} y={166} size={8.5} anchor="start" tone="ink" bold>
        did not
      </T>
      <T x={6} y={177} size={7.5} anchor="start">
        (5)
      </T>
      {boxes.map((b) => {
        const x = b.called ? MATRIX.colX.yes : MATRIX.colX.no;
        const y = b.actual === 1 ? MATRIX.rowY.yes : MATRIX.rowY.no;
        const w = b.called ? MATRIX.colW : MATRIX.colW - 2;
        return (
          <g key={b.key}>
            <Box x={x} y={y} w={w} h={MATRIX.rowH} tone={b.ok ? 'ok' : 'bad'} />
            <T x={x + 8} y={y + 14} size={7.5} anchor="start" tone={b.ok ? 'ok' : 'bad'} bold>
              {b.label}
            </T>
            <Show from={0.66}>
              <T x={x + w - 8} y={y + 16} size={12} anchor="end" mono bold tone="ink">
                {b.n}
              </T>
            </Show>
          </g>
        );
      })}

      {/* Each student falls from its place in the sorted row into its box. */}
      {order.map((s, k) => {
        const [fx, fy] = landing[k] ?? [0, 0];
        const t = 0.1 + k * 0.05;
        const lift: Pt = [startX(k) - fx, 34 - fy];
        return (
          <Move
            key={s.hours}
            keys={[
              [0, lift],
              [t, lift],
              [t + 0.07, [0, 0]],
            ]}
          >
            <Token x={fx} y={fy} hours={s.hours} cleared={s.y === 1} />
          </Move>
        );
      })}
      <Show from={0.76}>
        <T x={160} y={212} size={8.5}>
          Two mistakes: a false alarm at 7 hours, a miss at 4 hours
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.metrics · Accuracy, precision and recall ─────────────

function MetricBoxes() {
  const c = confusion(CLEARED, P, 0.5);
  const colX = { yes: 66, no: 190 };
  const rowY = { yes: 42, no: 92 };
  const w = 120;
  const h = 46;
  const cells = [
    { key: 'TP', x: colX.yes, y: rowY.yes, n: c.tp },
    { key: 'FN', x: colX.no, y: rowY.yes, n: c.fn },
    { key: 'FP', x: colX.yes, y: rowY.no, n: c.fp },
    { key: 'TN', x: colX.no, y: rowY.no, n: c.tn },
  ];
  const fill = (key: string, from: number, to?: number) => {
    const cell = cells.find((k) => k.key === key);
    if (!cell) return null;
    return (
      <Show from={from} to={to} final={to === undefined}>
        <rect x={cell.x} y={cell.y} width={w} height={h} rx={8} className="fill-brand-soft" />
      </Show>
    );
  };
  const lines = [
    {
      key: 'accuracy',
      cls: 'fill-g3',
      from: 0.04,
      text: `accuracy: TP + TN over all ten, ${c.tp + c.tn} / ${c.tp + c.tn + c.fp + c.fn} = ${c.accuracy.toFixed(2)}`,
    },
    {
      key: 'precision',
      cls: 'fill-g1',
      from: 0.34,
      text: `precision: TP over the predicted-cleared column, ${c.tp} / ${c.tp + c.fp} = ${c.precision.toFixed(2)}`,
    },
    {
      key: 'recall',
      cls: 'fill-g2',
      from: 0.64,
      text: `recall: TP over the actually-cleared row, ${c.tp} / ${c.tp + c.fn} = ${c.recall.toFixed(2)}`,
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Same four counts, three different denominators
      </T>
      <T x={126} y={29} size={8} tone="ink">
        predicted cleared
      </T>
      <T x={250} y={29} size={8} tone="ink">
        predicted not
      </T>
      <T x={54} y={29} size={7.5} anchor="end">
        actual
      </T>
      <T x={54} y={rowY.yes + 26} size={8.5} anchor="end" tone="ink" bold>
        cleared
      </T>
      <T x={54} y={rowY.no + 26} size={8.5} anchor="end" tone="ink" bold>
        did not
      </T>
      {cells.map((k) => (
        <Box key={k.key} x={k.x} y={k.y} w={w} h={h} tone="soft" />
      ))}
      {fill('TP', 0.04)}
      {fill('TN', 0.04, 0.31)}
      {cells.map((k) => (
        <g key={k.key}>
          <T x={k.x + w / 2} y={k.y + 25} size={16} mono bold tone="ink">
            {k.n}
          </T>
          <T x={k.x + w / 2} y={k.y + 39} size={7.5} mono>
            {k.key}
          </T>
        </g>
      ))}

      {/* What each metric divides by, outlined in turn: everything, the column, the row. */}
      <Show from={0.04} to={0.31} final={false}>
        <rect
          x={61}
          y={37}
          width={254}
          height={106}
          rx={10}
          className="fill-none stroke-g3"
          strokeWidth={2.6}
        />
      </Show>
      <Show from={0.34}>
        <rect
          x={62.5}
          y={38.5}
          width={127}
          height={103}
          rx={10}
          className="fill-none stroke-g1"
          strokeWidth={2.6}
        />
      </Show>
      <Show from={0.64}>
        <rect
          x={59}
          y={35}
          width={258}
          height={60}
          rx={11}
          className="fill-none stroke-g2"
          strokeWidth={2.6}
        />
      </Show>
      {lines.map((l, i) => (
        <Show key={l.key} from={l.from}>
          <rect x={12} y={157 + i * 14} width={12} height={4} rx={1} className={l.cls} />
          <T x={30} y={162 + i * 14} size={8.5} anchor="start" tone="ink">
            {l.text}
          </T>
        </Show>
      ))}
    </>
  );
}

// ───────────── slides.metrics · Precision against recall ─────────────

function PrecisionRecall() {
  const px = (t: number) => 44 + t * 256;
  const py = (v: number) => 150 - v * 110;
  const levels = [...new Set(P)].sort((a, b) => a - b);
  // Between two neighbouring probabilities, the rows called positive are those at or above the
  // upper one: so each metric is a step, flat between students and jumping at each one.
  const step = (pick: (c: ReturnType<typeof confusion>) => number) =>
    levels
      .map((u, k) => {
        const v = py(pick(confusion(CLEARED, P, u))).toFixed(1);
        return `${k === 0 ? `M${px(0)} ${v}` : `V${v}`} H${px(u).toFixed(1)}`;
      })
      .join(' ');
  const precision = step((c) => c.precision);
  const recall = step((c) => c.recall);
  const marks = [0.3, 0.5, 0.7].map((t, k) => ({
    t,
    c: confusion(CLEARED, P, t),
    from: [0.42, 0.58, 0.74][k] ?? 0.42,
  }));
  const [m3, m5, m7] = marks;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Precision and recall as the threshold rises
      </T>
      <line x1={44} y1={150} x2={300} y2={150} className="stroke-line-2" strokeWidth={1} />
      <line x1={44} y1={36} x2={44} y2={150} className="stroke-line-2" strokeWidth={1} />
      {[0, 0.5, 1].map((v) => (
        <T key={v} x={39} y={py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      <T x={px(0)} y={161} size={7.5} mono>
        0
      </T>
      <T x={px(1)} y={161} size={7.5} mono>
        1
      </T>
      <T x={172} y={173} size={8}>
        threshold
      </T>
      {marks.map((m) => (
        <g key={m.t}>
          <line
            x1={px(m.t)}
            y1={36}
            x2={px(m.t)}
            y2={150}
            className="stroke-line-2"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <T x={px(m.t)} y={161} size={7.5} mono bold tone="ink">
            {m.t}
          </T>
        </g>
      ))}
      <Drawn d={recall} from={0.04} to={0.36} className="stroke-g1" width={2.4} />
      <Drawn d={precision} from={0.04} to={0.36} className="stroke-brand" width={2.4} />
      <T x={48} y={py(1) - 5} size={8.5} anchor="start" tone="ink" bold>
        recall
      </T>
      <T x={48} y={py(0.5) + 13} size={8.5} anchor="start" tone="brand" bold>
        precision
      </T>

      {/* The table's three thresholds, visited in turn. */}
      <Show from={0.38} to={0.96} final={false}>
        <line x1={0} y1={30} x2={0} y2={150} className="stroke-ink" strokeWidth={1.6}>
          {(['x1', 'x2'] as const).map((attr) => (
            <Anim
              key={attr}
              attr={attr}
              keys={[
                [0, px(0.3)],
                [0.5, px(0.3)],
                [0.56, px(0.5)],
                [0.66, px(0.5)],
                [0.72, px(0.7)],
              ]}
            />
          ))}
        </line>
      </Show>
      {marks.map((m) => (
        <Show key={m.t} from={m.from}>
          <circle
            cx={px(m.t)}
            cy={py(m.c.recall)}
            r={4}
            className="fill-g1 stroke-surface"
            strokeWidth={1}
          />
          <circle
            cx={px(m.t)}
            cy={py(m.c.precision)}
            r={m.c.precision === m.c.recall ? 2.4 : 4}
            className="fill-brand stroke-surface"
            strokeWidth={1}
          />
        </Show>
      ))}
      {m3 && (
        <Show from={m3.from}>
          <T x={px(0.3) + 4} y={py(m3.c.recall) - 5} size={8} anchor="start" mono bold tone="ink">
            {m3.c.recall.toFixed(2)}
          </T>
          <T
            x={px(0.3) + 4}
            y={py(m3.c.precision) + 12}
            size={8}
            anchor="start"
            mono
            bold
            tone="brand"
          >
            {m3.c.precision.toFixed(2)}
          </T>
        </Show>
      )}
      {m5 && (
        <Show from={m5.from}>
          <T x={px(0.5)} y={py(m5.c.recall) - 6} size={8} mono bold tone="ink">
            {`both ${m5.c.recall.toFixed(2)}`}
          </T>
        </Show>
      )}
      {m7 && (
        <Show from={m7.from}>
          <T
            x={px(0.7) - 5}
            y={py(m7.c.precision) - 5}
            size={8}
            anchor="end"
            mono
            bold
            tone="brand"
          >
            {m7.c.precision.toFixed(2)}
          </T>
          <T x={px(0.7) - 5} y={py(m7.c.recall) + 12} size={8} anchor="end" mono bold tone="ink">
            {m7.c.recall.toFixed(2)}
          </T>
        </Show>
      )}
      <Show from={0.84}>
        <T x={160} y={189} size={8.5}>
          Higher threshold: recall falls, precision mostly climbs
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.metrics · Accuracy on imbalanced data ─────────────

function ImbalanceGrid() {
  const total = 100;
  const fraud = 46;
  const correct = total - 1;
  const cell = (i: number) => ({ x: 14 + (i % 10) * 15, y: 24 + Math.floor(i / 10) * 15 });
  const f = cell(fraud);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        100 transactions, 1 fraud, a model that always says no
      </T>
      {Array.from({ length: total }, (_, i) => {
        const { x, y } = cell(i);
        const row = Math.floor(i / 10);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the hundred cells never reorder
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={13}
              height={13}
              rx={2}
              className={i === fraud ? 'fill-bad' : 'fill-surface-2 stroke-line'}
              strokeWidth={0.8}
            />
            {i !== fraud && (
              <Show from={0.08 + row * 0.035}>
                <rect
                  x={x}
                  y={y}
                  width={13}
                  height={13}
                  rx={2}
                  className="fill-ok-bg stroke-ok"
                  strokeWidth={0.8}
                />
              </Show>
            )}
          </g>
        );
      })}
      <Show from={0.08 + Math.floor(fraud / 10) * 0.035}>
        <circle
          cx={f.x + 6.5}
          cy={f.y + 6.5}
          r={10.5}
          className="fill-none stroke-bad"
          strokeWidth={2}
        />
      </Show>

      <T x={178} y={36} size={8.5} anchor="start" tone="ink" bold>
        Model: always "not fraud"
      </T>
      <Show from={0.08}>
        <rect x={178} y={47} width={9} height={9} rx={2} className="fill-ok-bg stroke-ok" />
        <T x={192} y={55} size={8} anchor="start">
          {`${correct} called right`}
        </T>
      </Show>
      <Show from={0.08 + Math.floor(fraud / 10) * 0.035}>
        <rect x={178} y={62} width={9} height={9} rx={2} className="fill-bad" />
        <T x={192} y={70} size={8} anchor="start">
          1 fraud, missed
        </T>
      </Show>
      <Show from={0.5}>
        <T x={178} y={98} size={8} anchor="start">
          accuracy
        </T>
        <T x={178} y={118} size={13} anchor="start" mono bold tone="ok">
          {`${correct} / ${total} = ${correct}%`}
        </T>
      </Show>
      <Show from={0.66}>
        <T x={178} y={142} size={8} anchor="start">
          recall: fraud caught
        </T>
        <T x={178} y={162} size={13} anchor="start" mono bold tone="bad">
          0 / 1 = 0
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.metrics · ROC curve and AUC ─────────────

function RocPairs() {
  const roc = rocCurve(CLEARED, P);
  const area = auc(CLEARED, P);
  const pos = STUDENTS.filter((s) => s.y === 1).sort((a, b) => b.p - a.p);
  const neg = STUDENTS.filter((s) => s.y === 0).sort((a, b) => b.p - a.p);
  const x0 = 70;
  const y0 = 184;
  const size = 150;
  const cw = size / neg.length;
  const ch = size / pos.length;
  const right = pos.reduce((acc, a) => acc + neg.filter((b) => a.p > b.p).length, 0);
  const pairs = pos.length * neg.length;
  const pts = roc.map((r) => [x0 + r.fpr * size, y0 - r.tpr * size] as const);
  const times = pts.map((_, k) => 0.08 + (k * 0.4) / (pts.length - 1));
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        The ROC curve of the ten students
      </T>
      {/* Each square is one pair: a student who cleared (row) against one who did not (column). */}
      {pos.map((a, r) =>
        neg.map((b, c) => {
          const x = x0 + c * cw;
          const y = y0 - (r + 1) * ch;
          const won = a.p > b.p;
          return (
            <g key={`${a.hours}-${b.hours}`}>
              <rect
                x={x}
                y={y}
                width={cw}
                height={ch}
                className="fill-none stroke-line"
                strokeWidth={1}
              />
              <Show from={won ? 0.52 + c * 0.03 : 0.68}>
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={cw - 2}
                  height={ch - 2}
                  rx={2}
                  className={won ? 'fill-brand' : 'fill-bad-bg stroke-bad'}
                  fillOpacity={won ? 0.2 : 1}
                  strokeWidth={1}
                  strokeDasharray={won ? undefined : '3 2'}
                />
              </Show>
            </g>
          );
        }),
      )}
      <line
        x1={x0}
        y1={y0}
        x2={x0 + size}
        y2={y0 - size}
        className="stroke-muted"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      {pos.map((a, r) => (
        <T
          key={a.hours}
          x={x0 - 5}
          y={y0 - (r + 0.5) * ch + 3}
          size={7.5}
          anchor="end"
          mono
          bold
          tone="brand"
        >
          {`${a.hours}h`}
        </T>
      ))}
      {neg.map((b, c) => (
        <T key={b.hours} x={x0 + (c + 0.5) * cw} y={y0 + 11} size={7.5} mono bold>
          {`${b.hours}h`}
        </T>
      ))}
      <T x={x0 - 5} y={y0 - size - 5} size={8} anchor="end" tone="ink">
        recall
      </T>
      <T x={x0 + size / 2} y={y0 + 24} size={8} tone="ink">
        false positive rate
      </T>

      <Drawn d={polyline(pts)} from={0.08} to={0.48} className="stroke-ink" width={2.2} />
      {pts.map(([x, y], k) => (
        <Show key={`${x}-${y}`} from={times[k] ?? 0}>
          <circle cx={x} cy={y} r={2.6} className="fill-ink" />
        </Show>
      ))}
      <Show from={0.06} to={0.5} final={false}>
        <circle r={4.6} className="fill-g1 stroke-surface" strokeWidth={1.2} cx={x0} cy={y0}>
          <Anim attr="cx" keys={[[0, x0], ...pts.map(([x], k) => [times[k] ?? 0, x] as const)]} />
          <Anim attr="cy" keys={[[0, y0], ...pts.map(([, y], k) => [times[k] ?? 0, y] as const)]} />
        </circle>
      </Show>

      <T x={230} y={48} size={8} anchor="start" tone="ink" bold>
        Each square:
      </T>
      <T x={230} y={60} size={7.5} anchor="start">
        one who cleared
      </T>
      <T x={230} y={70} size={7.5} anchor="start">
        vs one who did not
      </T>
      <Show from={0.52}>
        <rect
          x={230}
          y={84}
          width={10}
          height={10}
          rx={2}
          className="fill-brand"
          fillOpacity={0.2}
        />
        <T x={245} y={92} size={7.5} anchor="start">
          {`ranked right: ${right}`}
        </T>
      </Show>
      <Show from={0.68}>
        <rect
          x={230}
          y={100}
          width={10}
          height={10}
          rx={2}
          className="fill-bad-bg stroke-bad"
          strokeWidth={1}
        />
        <T x={245} y={108} size={7.5} anchor="start">
          {`ranked wrong: ${pairs - right}`}
        </T>
      </Show>
      <Show from={0.78}>
        <T x={230} y={134} size={8} anchor="start">
          AUC
        </T>
        <T x={230} y={152} size={12} anchor="start" mono bold tone="ink">
          {`${right} / ${pairs}`}
        </T>
        <T x={230} y={168} size={12} anchor="start" mono bold tone="ink">
          {`= ${area.toFixed(2)}`}
        </T>
      </Show>
      <line
        x1={230}
        y1={184}
        x2={242}
        y2={184}
        className="stroke-muted"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <T x={246} y={187} size={7.5} anchor="start">
        guessing: 0.5
      </T>
    </>
  );
}

// ───────────── slides.boundary · The decision boundary ─────────────

function BoundaryPoint() {
  const px = (h: number) => 56 + (h - 0.5) * 25;
  const cut = -B / W;
  const lane = (y: number) => (y === 1 ? 62 : 86);
  const zTicks = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One feature: the boundary is a single point
      </T>
      <Show from={0.45}>
        <rect x={px(0.5)} y={24} width={px(cut) - px(0.5)} height={88} className="fill-surface-2" />
        <rect
          x={px(cut)}
          y={24}
          width={px(10.5) - px(cut)}
          height={88}
          className="fill-brand-soft"
        />
        <T x={(px(0.5) + px(cut)) / 2} y={37} size={8.5} tone="ink" bold>
          predict 0
        </T>
        <T x={(px(cut) + px(10.5)) / 2} y={37} size={8.5} tone="brand" bold>
          predict 1
        </T>
      </Show>
      <T x={50} y={65} size={8} anchor="end" tone="brand">
        cleared
      </T>
      <T x={50} y={89} size={8} anchor="end">
        did not
      </T>
      {STUDENTS.map((s) => (
        <circle
          key={s.hours}
          cx={px(s.hours)}
          cy={lane(s.y)}
          r={4.4}
          className={s.y === 1 ? 'fill-brand stroke-surface' : 'fill-muted stroke-surface'}
          strokeWidth={1}
        />
      ))}

      {/* The hours axis, and beneath it the score z = w·hours + b on the same ruler. */}
      <line
        x1={px(0.5)}
        y1={112}
        x2={px(10.5)}
        y2={112}
        className="stroke-line-2"
        strokeWidth={1.2}
      />
      {HOURS.map((h) => (
        <T key={h} x={px(h)} y={123} size={7.5} mono>
          {h}
        </T>
      ))}
      <T x={50} y={123} size={8} anchor="end">
        hours
      </T>
      <Show from={0.1}>
        <line
          x1={px(0.5)}
          y1={146}
          x2={px(10.5)}
          y2={146}
          className="stroke-line-2"
          strokeWidth={1.2}
        />
        {zTicks.map((z) => {
          const h = (z - B) / W;
          return (
            <g key={z}>
              <line
                x1={px(h)}
                y1={143}
                x2={px(h)}
                y2={149}
                className="stroke-muted"
                strokeWidth={1}
              />
              <T x={px(h)} y={158} size={7.5} mono bold={z === 0} tone={z === 0 ? 'ink' : 'muted'}>
                {num(z, 0)}
              </T>
            </g>
          );
        })}
        <T x={50} y={158} size={8} anchor="end">
          score z
        </T>
      </Show>

      <Drawn d={`M${px(cut)} 24 V150`} from={0.3} to={0.42} className="stroke-ink" width={1.8} />
      <Show from={0.42}>
        <T x={px(cut) + 5} y={104} size={8} anchor="start" mono bold tone="ink">
          {`${num(cut, 1)} h: z = 0, p = 0.5`}
        </T>
      </Show>
      <Show from={0.6}>
        {STUDENTS.filter((s) => (s.p >= 0.5 ? 1 : 0) !== s.y).map((s) => (
          <g key={s.hours}>
            <circle
              cx={px(s.hours)}
              cy={lane(s.y)}
              r={8}
              className="fill-none stroke-bad"
              strokeWidth={1.6}
            />
            <T
              x={px(s.hours) + (s.hours < cut ? -11 : 11)}
              y={lane(s.y) + 3}
              size={7.5}
              anchor={s.hours < cut ? 'end' : 'start'}
              tone="bad"
            >
              wrong side
            </T>
          </g>
        ))}
      </Show>
      <Show from={0.72}>
        <T x={160} y={176} size={8.5} tone="ink">
          {`z rises ${num(W, 4)} per hour and crosses 0 at ${num(cut, 1)} hours`}
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.boundary · Only straight boundaries ─────────────

type Dot = { u: number; v: number; one: boolean };

/** Two classes a straight line can split. */
const SPLIT: Dot[] = [
  [0.62, 0.8],
  [0.8, 0.62],
  [0.86, 0.86],
  [0.5, 0.9],
  [0.9, 0.42],
  [0.7, 0.66],
].map(([u = 0, v = 0]) => ({ u, v, one: true }));
const SPLIT_NEG: Dot[] = [
  [0.14, 0.3],
  [0.3, 0.12],
  [0.36, 0.42],
  [0.12, 0.62],
  [0.55, 0.2],
  [0.26, 0.56],
].map(([u = 0, v = 0]) => ({ u, v, one: false }));

/** One class inside, the other in a ring around it, as (radius, degrees) about the centre. */
const RING: Array<{ r: number; deg: number; one: boolean }> = [
  { r: 0.06, deg: 0, one: true },
  { r: 0.13, deg: 150, one: true },
  { r: 0.17, deg: 60, one: true },
  { r: 0.2, deg: 230, one: true },
  { r: 0.22, deg: 320, one: true },
  ...[0.38, 0.42, 0.4, 0.44, 0.37, 0.41, 0.43, 0.39, 0.42, 0.43].map((r, k) => ({
    r,
    deg: 10 + 36 * k,
    one: false,
  })),
];
/** The new feature x₁² + x₂² runs 0 to this up the third panel, so every point stays inside it. */
const S_MAX = 0.24;
/** Where a straight line splits the new feature: x₁² + x₂² = 0.1, a circle of radius 0.32. */
const S_CUT = 0.1;

function RingFeatures() {
  const panels = [8, 112, 216];
  const size = 96;
  const top = 26;
  const at = (k: number, u: number, v: number): Pt => [
    (panels[k] ?? 0) + 6 + u * 84,
    top + 90 - v * 84,
  ];
  const ring = RING.map((d) => {
    const a = (d.deg * Math.PI) / 180;
    const du = d.r * Math.cos(a);
    const dv = d.r * Math.sin(a);
    return {
      ...d,
      ring: at(1, 0.5 + du, 0.5 + dv),
      sq: at(2, 0.5 + du, (du ** 2 + dv ** 2) / S_MAX),
    };
  });
  const [cx, cy] = at(1, 0.5, 0.5);
  const cut = S_CUT / S_MAX;
  const dot = (one: boolean) => (one ? 'fill-brand stroke-surface' : 'fill-muted stroke-surface');
  const captions = [
    ['A line splits', 'these two classes'],
    ['No straight line', 'splits a ring'],
    ['Add x₁² + x₂²:', 'now a line does'],
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A ring needs squared features before a line can split it
      </T>
      {panels.map((x, k) => (
        <g key={x}>
          <rect
            x={x}
            y={top}
            width={size}
            height={size}
            rx={8}
            className="fill-surface stroke-line-2"
            strokeWidth={1}
          />
          {captions[k]?.map((line, j) => (
            <T
              key={line}
              x={x + size / 2}
              y={top + size + 12 + j * 10}
              size={7.5}
              tone={j === 0 ? 'ink' : 'muted'}
            >
              {line}
            </T>
          ))}
        </g>
      ))}
      <T x={(panels[1] ?? 0) + 91} y={top + 92} size={7.5} anchor="end" mono>
        x₁
      </T>
      <T x={(panels[1] ?? 0) + 5} y={top + 10} size={7.5} anchor="start" mono>
        x₂
      </T>
      <T x={(panels[2] ?? 0) + 91} y={top + 92} size={7.5} anchor="end" mono>
        x₁
      </T>
      <T x={(panels[2] ?? 0) + 5} y={top + 10} size={7.5} anchor="start" mono>
        x₁² + x₂²
      </T>

      {/* One: a straight line splits them. */}
      {[...SPLIT, ...SPLIT_NEG].map((d) => {
        const [x, y] = at(0, d.u, d.v);
        return (
          <circle
            key={`${d.u}-${d.v}`}
            cx={x}
            cy={y}
            r={3.4}
            className={dot(d.one)}
            strokeWidth={1}
          />
        );
      })}
      <Drawn
        d={polyline([at(0, 0.15, 0.9), at(0, 0.9, 0.15)])}
        from={0.06}
        to={0.16}
        className="stroke-ok"
        width={2}
      />

      {/* Two: a ring. Any straight line through it leaves points of both kinds on each side. */}
      {ring.map((d) => (
        <circle
          key={`${d.r}-${d.deg}`}
          cx={d.ring[0]}
          cy={d.ring[1]}
          r={3.4}
          className={dot(d.one)}
          strokeWidth={1}
        />
      ))}
      <Show from={0.2} to={0.52} final={false}>
        <Turn
          cx={cx}
          cy={cy}
          at={-20}
          keys={[
            [0, -20],
            [0.22, -20],
            [0.3, 35],
            [0.38, 80],
            [0.46, 140],
            [0.52, 160],
          ]}
        >
          <line
            x1={cx - 44}
            y1={cy}
            x2={cx + 44}
            y2={cy}
            className="stroke-bad"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Turn>
      </Show>

      {/* Three: the same points with x₁² + x₂² up the side. They fly across, and a line splits them. */}
      {ring.map((d) => {
        const lift: Pt = [d.ring[0] - d.sq[0], d.ring[1] - d.sq[1]];
        return (
          <Show key={`${d.r}-${d.deg}`} from={0.54}>
            <Move
              keys={[
                [0, lift],
                [0.56, lift],
                [0.68, [0, 0]],
              ]}
            >
              <circle cx={d.sq[0]} cy={d.sq[1]} r={3.4} className={dot(d.one)} strokeWidth={1} />
            </Move>
          </Show>
        );
      })}
      <Drawn
        d={polyline([at(2, 0.02, cut), at(2, 0.98, cut)])}
        from={0.72}
        to={0.8}
        className="stroke-ok"
        width={2}
      />
      <Show from={0.84}>
        <circle
          cx={cx}
          cy={cy}
          r={Math.sqrt(S_CUT) * 84}
          className="fill-none stroke-ok"
          strokeWidth={1.8}
          strokeDasharray="4 3"
        />
        <T x={160} y={168} size={8.5} tone="ink">
          That straight line is a circle back in x₁ and x₂
        </T>
      </Show>
    </>
  );
}

// ───────────── slides.boundary · Multiclass classification ─────────────

function Softmax() {
  const classes = [
    { name: 'did not clear', z: 1, fill: 'fill-muted' },
    { name: 'cleared', z: 2, fill: 'fill-brand' },
    { name: 'distinction', z: 0, fill: 'fill-g3' },
  ].map((c) => ({ ...c, ez: Math.exp(c.z) }));
  const sum = classes.reduce((acc, c) => acc + c.ez, 0);
  const rows = classes.map((c) => ({ ...c, p: c.ez / sum }));
  const best = rows.reduce((a, b) => (b.p > a.p ? b : a));
  const rowY = (k: number) => 48 + k * 26;
  const per = 13;
  const barX = 20;
  const barW = 280;
  let acc = 0;
  const stack = rows.map((r) => {
    const x = barX + acc * barW;
    acc += r.p;
    return { ...r, x, w: r.p * barW };
  });
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One score per class, turned into probabilities
      </T>
      <T x={92} y={31} size={8}>
        score z
      </T>
      <T x={126} y={31} size={8} anchor="start">
        eᶻ
      </T>
      <T x={287} y={31} size={8}>
        p = eᶻ ÷ sum
      </T>
      {rows.map((r, k) => {
        const y = rowY(k);
        const t = 0.2 + k * 0.05;
        const w = r.ez * per;
        return (
          <g key={r.name}>
            <Show from={0.03 + k * 0.04}>
              <T x={8} y={y + 3} size={8.5} anchor="start" tone="ink">
                {r.name}
              </T>
              <Chip x={70} y={y - 10} w={44} h={20} label={`z = ${r.z}`} size={8.5} />
            </Show>
            <rect x={126} y={y - 6} width={w} height={12} rx={2} className={r.fill}>
              <Anim
                attr="width"
                keys={[
                  [0, 0],
                  [t, 0],
                  [t + 0.08, w],
                ]}
              />
            </rect>
            <Show from={t + 0.08}>
              <T x={126 + w + 4} y={y + 3} size={8} anchor="start" mono>
                {r.ez.toFixed(2)}
              </T>
            </Show>
            <Show from={0.52 + k * 0.05}>
              <Chip
                x={262}
                y={y - 10}
                w={50}
                h={20}
                label={r.p.toFixed(3)}
                size={8.5}
                tone={r === best ? 'brand' : 'plain'}
              />
            </Show>
          </g>
        );
      })}
      <Show from={0.42}>
        <line x1={126} y1={118} x2={232} y2={118} className="stroke-line-2" strokeWidth={1} />
        <T x={126} y={130} size={8.5} anchor="start" mono bold tone="ink">
          {`sum = ${sum.toFixed(2)}`}
        </T>
      </Show>

      {/* The three probabilities laid end to end fill exactly one bar. */}
      <rect
        x={barX}
        y={140}
        width={barW}
        height={14}
        rx={3}
        className="fill-none stroke-line-2"
        strokeWidth={1}
      />
      {stack.map((s, k) => {
        const t = 0.7 + k * 0.05;
        return (
          <g key={s.name}>
            <rect x={s.x} y={140} width={s.w} height={14} className={s.fill}>
              <Anim
                attr="width"
                keys={[
                  [0, 0],
                  [t, 0],
                  [t + 0.05, s.w],
                ]}
              />
            </rect>
            <Show from={t + 0.05}>
              <T x={s.x + s.w / 2} y={165} size={7.5} mono>
                {s.p.toFixed(3)}
              </T>
            </Show>
          </g>
        );
      })}
      <Show from={0.86}>
        <T x={barX + barW + 4} y={151} size={9} anchor="start" mono bold tone="ink">
          = 1
        </T>
        <T x={160} y={182} size={8.5}>
          {`They add to 1; the largest, ${best.name}, is the prediction`}
        </T>
      </Show>
    </>
  );
}

// `satisfies`, not a Partial annotation: the entries must stay required when the shared library
// spreads them into its Record of every animation name.
export const LOGREG_LIBRARY = {
  'logreg-score-to-p': { viewBox: '0 0 320 200', dur: 11, Draw: ScoreToProbability },
  'logreg-odds-scales': { viewBox: '0 0 320 196', dur: 11, Draw: OddsScales },
  'logreg-squared-vs-log': { viewBox: '0 0 320 194', dur: 11, Draw: SquaredVsLog },
  'logreg-likelihood-bars': { viewBox: '0 0 320 200', dur: 12, Draw: LikelihoodBars },
  'logreg-gradient-pushes': { viewBox: '0 0 320 204', dur: 12, Draw: GradientPushes },
  'logreg-confusion-drop': { viewBox: '0 0 320 220', dur: 12, Draw: ConfusionDrop },
  'logreg-metric-boxes': { viewBox: '0 0 320 202', dur: 12, Draw: MetricBoxes },
  'logreg-precision-recall': { viewBox: '0 0 320 196', dur: 12, Draw: PrecisionRecall },
  'logreg-imbalance-grid': { viewBox: '0 0 320 180', dur: 10, Draw: ImbalanceGrid },
  'logreg-roc-pairs': { viewBox: '0 0 320 214', dur: 12, Draw: RocPairs },
  'logreg-boundary-point': { viewBox: '0 0 320 184', dur: 10, Draw: BoundaryPoint },
  'logreg-ring-features': { viewBox: '0 0 320 176', dur: 12, Draw: RingFeatures },
  'logreg-softmax': { viewBox: '0 0 320 190', dur: 11, Draw: Softmax },
} satisfies Partial<Record<AnimationName, { viewBox: string; dur: number; Draw: () => ReactNode }>>;
