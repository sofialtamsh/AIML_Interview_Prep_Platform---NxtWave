/**
 * Moving pictures for the linear regression unit, drawn from the unit's own example and numbers. Each is
 * registered here and described in @app/content (animations-linreg.ts); see anim-kit.tsx for the
 * helpers and the rules every picture follows.
 *
 * Every number printed here is worked out from the labs' own maths (linreg.ts, linreg-multi.ts) on
 * the lesson's own data, so a picture can never disagree with the lab beside it.
 */
import type { AnimationName } from '@app/content';
import type { ReactNode } from 'react';
import { Anim, Arrow, Box, Chip, Show, T } from '../anim-kit';
import { evaluate, makePattern, nf, ols, type P } from '../linreg';
import { adjustedR2, olsMulti, polyFit, scoreDegrees } from '../linreg-multi';

// ───────────── The lesson's data ─────────────

/** Six employees: years of experience and salary in LPA. */
const EMPLOYEES: readonly P[] = [
  { x: 1, y: 6 },
  { x: 2, y: 6 },
  { x: 3, y: 9 },
  { x: 4, y: 11 },
  { x: 5, y: 12 },
  { x: 6, y: 16 },
];
const SALARIES = EMPLOYEES.map((p) => p.y);
/** Their second column, projects shipped. */
const PROJECTS = [0, 1, 1, 3, 2, 4];
/** Months of experience: years × 12 plus a little noise, the column that breaks the weights. */
const MONTHS = [12.5, 23.6, 36.3, 47.4, 60.2, 72.1];
/** The employee the outlier step adds: 7 years, 4 LPA. */
const OUTLIER: P = { x: 7, y: 4 };
/** Least squares on the six: ŷ = 2x + 3, through the means (3.5, 10). */
const FIT = ols(EMPLOYEES);
const BEST = FIT.line;
/** The polynomial lab's sixteen points, and the degrees it offers. */
const CURVE: readonly P[] = [
  { x: 0, y: 3.126 },
  { x: 0.4, y: 2.932 },
  { x: 0.8, y: 3.896 },
  { x: 1.2, y: 3.681 },
  { x: 1.6, y: 3.488 },
  { x: 2, y: 4.962 },
  { x: 2.4, y: 6.608 },
  { x: 2.8, y: 7.083 },
  { x: 3.2, y: 6.392 },
  { x: 3.6, y: 6.919 },
  { x: 4, y: 8.777 },
  { x: 4.4, y: 10.785 },
  { x: 4.8, y: 9.891 },
  { x: 5.2, y: 13.597 },
  { x: 5.6, y: 14.298 },
  { x: 6, y: 16.668 },
];
const DEGREES = [1, 2, 3, 5, 7];
/** The residual-plot lab's plotting range, from which its curved and widening data are drawn. */
const LAB_DOMAIN = { x: [0, 8] as [number, number], y: [0, 20] as [number, number] };

const pathOf = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const sample = (from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => from + ((to - from) * i) / steps);
/** "+ 1.03x" or "− 0.08x²": one term of an equation, sign written as students write it. */
const term = (w: number, power: string, d = 2) =>
  `${w < 0 ? '−' : '+'} ${nf(Math.abs(w), d)}${power}`;

// ───────────── Loss and metrics ─────────────

/** MSE, RMSE and MAE of ŷ = 2x + 3, on the six employees and then with the outlier added. */
function MseRmseMae() {
  const six = evaluate(EMPLOYEES, BEST);
  const seven = evaluate([...EMPLOYEES, OUTLIER], BEST);
  const miss = seven.residuals[EMPLOYEES.length] ?? 0;
  // One LPA is U px in both directions, so every squared residual is drawn as a true square.
  const U = 6;
  const px = (x: number) => 24 + x * 15;
  const py = (y: number) => 138 - y * U;
  const square = (p: P, r: number) => {
    const side = Math.abs(r) * U;
    return { x: px(p.x) - side, y: py(Math.max(p.y, p.y - r)), side };
  };
  const big = square(OUTLIER, miss);
  const corner: readonly [number, number] = [
    px(OUTLIER.x),
    py(Math.min(OUTLIER.y, OUTLIER.y - miss)),
  ];
  const rows = [
    {
      name: 'MSE',
      sub: 'mean of the squares, LPA²',
      before: nf(six.mse, 2),
      after: nf(seven.mse, 1),
      times: nf(seven.mse / six.mse, 0),
    },
    {
      name: 'RMSE',
      sub: 'square root of MSE, LPA',
      before: nf(six.rmse, 2),
      after: nf(seven.rmse, 2),
      times: nf(seven.rmse / six.rmse, 1),
    },
    {
      name: 'MAE',
      sub: 'mean of the gap sizes, LPA',
      before: nf(six.mae, 2),
      after: nf(seven.mae, 2),
      times: nf(seven.mae / six.mae, 1),
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Six small misses, then one big one
      </T>
      <line x1={24} y1={24} x2={24} y2={138} className="stroke-line-2" strokeWidth={1} />
      <line x1={24} y1={138} x2={142} y2={138} className="stroke-line-2" strokeWidth={1} />
      {[0, 10].map((v) => (
        <T key={v} x={20} y={py(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[2, 4, 6].map((v) => (
        <T key={v} x={px(v)} y={147} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={28} y={26} size={7.5} anchor="start">
        salary
      </T>
      <T x={142} y={147} size={7.5} anchor="end">
        years
      </T>
      <line
        x1={px(0)}
        y1={py(BEST.b)}
        x2={px(7.5)}
        y2={py(BEST.m * 7.5 + BEST.b)}
        className="stroke-g1"
        strokeWidth={2}
        strokeLinecap="round"
      />

      {/* The six residuals of the best line, squared: four squares of 1 and two of 0. */}
      <Show from={0.08}>
        {EMPLOYEES.map((p, i) => {
          const r = six.residuals[i] ?? 0;
          if (Math.abs(r) < 1e-9) return null;
          const s = square(p, r);
          return (
            <rect
              key={p.x}
              x={s.x}
              y={s.y}
              width={s.side}
              height={s.side}
              className="fill-bad stroke-bad"
              fillOpacity={0.2}
              strokeWidth={1}
            />
          );
        })}
      </Show>

      {/* One more employee: 7 years, 4 LPA. The line says 17, a miss of 13, squared 169. */}
      <Show from={0.46}>
        <rect
          x={big.x}
          y={big.y}
          width={big.side}
          height={big.side}
          className="fill-bad stroke-bad"
          fillOpacity={0.12}
          strokeWidth={1.2}
        >
          <Anim
            attr="x"
            keys={[
              [0, corner[0]],
              [0.48, corner[0]],
              [0.58, big.x],
            ]}
          />
          <Anim
            attr="y"
            keys={[
              [0, corner[1]],
              [0.48, corner[1]],
              [0.58, big.y],
            ]}
          />
          <Anim
            attr="width"
            keys={[
              [0, 0],
              [0.48, 0],
              [0.58, big.side],
            ]}
          />
          <Anim
            attr="height"
            keys={[
              [0, 0],
              [0.48, 0],
              [0.58, big.side],
            ]}
          />
        </rect>
      </Show>
      <Show from={0.38}>
        <line
          x1={px(OUTLIER.x)}
          y1={py(OUTLIER.y - miss)}
          x2={px(OUTLIER.x)}
          y2={py(OUTLIER.y)}
          className="stroke-bad"
          strokeWidth={1.6}
          strokeDasharray="3 2"
        />
        <T
          x={px(OUTLIER.x) + 4}
          y={py(OUTLIER.y - miss / 2) + 3}
          size={9}
          anchor="start"
          mono
          bold
          tone="bad"
        >
          {nf(miss, 0)}
        </T>
      </Show>
      {EMPLOYEES.map((p) => (
        <circle
          key={p.x}
          cx={px(p.x)}
          cy={py(p.y)}
          r={3.4}
          className="fill-brand stroke-surface"
          strokeWidth={1}
        />
      ))}
      <Show from={0.38}>
        <circle
          cx={px(OUTLIER.x)}
          cy={py(OUTLIER.y)}
          r={3.8}
          className="fill-bad stroke-surface"
          strokeWidth={1}
        />
      </Show>
      <Show from={0.6}>
        <T x={big.x + big.side / 2} y={130} size={8} mono bold tone="bad">
          {`${nf(Math.abs(miss), 0)}² = ${nf(miss * miss, 0)}`}
        </T>
      </Show>

      {/* The three metrics: the six employees, then with the seventh. */}
      <Show from={0.14}>
        <T x={250} y={34} size={7.5} anchor="end">
          6 rows
        </T>
      </Show>
      <Show from={0.38}>
        <T x={310} y={34} size={7.5} anchor="end" tone="bad">
          7 rows
        </T>
      </Show>
      {rows.map((row, i) => {
        const y = 56 + i * 34;
        return (
          <g key={row.name}>
            <T x={158} y={y} size={9.5} anchor="start" mono bold tone="ink">
              {row.name}
            </T>
            <T x={158} y={y + 11} size={7.5} anchor="start">
              {row.sub}
            </T>
            <Show from={0.14 + i * 0.06}>
              <T x={250} y={y} size={9.5} anchor="end" mono tone="ink">
                {row.before}
              </T>
            </Show>
            <Show from={0.66 + i * 0.06}>
              <T x={265} y={y} size={8.5} mono>
                →
              </T>
              <T x={310} y={y} size={9.5} anchor="end" mono bold tone="bad">
                {row.after}
              </T>
              <T x={310} y={y + 11} size={8} anchor="end" mono tone="bad">
                {`×${row.times}`}
              </T>
            </Show>
          </g>
        );
      })}
      <Show from={0.86}>
        <T x={160} y={166} size={8.5} tone="ink">
          {`Squared, the miss of ${nf(Math.abs(miss), 0)} counts ${nf(miss * miss, 0)}; MAE counts it as ${nf(Math.abs(miss), 0)}`}
        </T>
      </Show>
    </>
  );
}

/** SST: squared gaps to the mean salary; SSE: squared gaps to the fitted line; R² = 1 − SSE/SST. */
function RSquaredGaps() {
  const mean = FIT.ybar;
  const flat = evaluate(EMPLOYEES, { m: 0, b: mean });
  const fitted = evaluate(EMPLOYEES, BEST);
  const px = (x: number) => 40 + (x - 0.5) * 44;
  const py = (s: number) => 112 - (s - 4) * 6.4;
  const lineAt = (x: number) => BEST.m * x + BEST.b;
  // Each employee gets two gaps side by side: to the mean (left, grey) and to the line (right, red).
  const GAP = 5;
  // Both bars share one scale, so SSE is drawn as the share of SST it really is.
  const X0 = 66;
  const k = 238 / flat.sst;
  const segments = (squares: number[]) => {
    let at = X0;
    return squares.map((v) => {
      const seg = { x: at, w: v * k, v };
      at += v * k;
      return seg;
    });
  };
  const sst = segments(flat.residuals.map((r) => r * r));
  const sse = segments(fitted.residuals.map((r) => r * r));
  const tilt = (x: number) =>
    [
      [0, py(mean)],
      [0.46, py(mean)],
      [0.6, py(lineAt(x))],
    ] as const;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Gaps to the mean, then gaps to the line
      </T>
      {/* Legend: the flat line at the mean, and the fitted line. */}
      <line
        x1={44}
        y1={30}
        x2={58}
        y2={30}
        className="stroke-muted"
        strokeWidth={1.4}
        strokeDasharray="3 2"
      />
      <T x={62} y={33} size={7.5} anchor="start">
        {`always predict the mean, ${nf(mean)}`}
      </T>
      <Show from={0.6}>
        <line x1={44} y1={42} x2={58} y2={42} className="stroke-g1" strokeWidth={2} />
        <T x={62} y={45} size={7.5} anchor="start" mono tone="ink">
          {`ŷ = ${nf(BEST.m)}x + ${nf(BEST.b)}`}
        </T>
      </Show>
      <line
        x1={px(0.5)}
        y1={py(mean)}
        x2={px(6.5)}
        y2={py(mean)}
        className="stroke-muted"
        strokeWidth={1.2}
        strokeDasharray="3 2"
      />
      {/* The gap from the mean to each salary: what there is to explain. */}
      {EMPLOYEES.map((p, i) => (
        <Show key={p.x} from={0.06 + i * 0.04}>
          <line
            x1={px(p.x) - GAP}
            y1={py(mean)}
            x2={px(p.x) - GAP}
            y2={py(p.y)}
            className="stroke-muted"
            strokeWidth={2.4}
          />
        </Show>
      ))}
      {/* The line starts flat at the mean, then tilts onto the least-squares fit. */}
      <line
        x1={px(0.5)}
        y1={py(lineAt(0.5))}
        x2={px(6.5)}
        y2={py(lineAt(6.5))}
        className="stroke-g1"
        strokeWidth={2.2}
        strokeLinecap="round"
      >
        <Anim attr="y1" keys={tilt(0.5)} />
        <Anim attr="y2" keys={tilt(6.5)} />
      </line>
      {/* What the line still misses: the residuals. */}
      <Show from={0.62}>
        {EMPLOYEES.map((p) => (
          <line
            key={p.x}
            x1={px(p.x) + GAP}
            y1={py(lineAt(p.x))}
            x2={px(p.x) + GAP}
            y2={py(p.y)}
            className="stroke-bad"
            strokeWidth={2.4}
          />
        ))}
      </Show>
      {EMPLOYEES.map((p) => (
        <g key={p.x}>
          <circle
            cx={px(p.x)}
            cy={py(p.y)}
            r={3.2}
            className="fill-brand stroke-surface"
            strokeWidth={1}
          />
          <T x={px(p.x)} y={123} size={7.5} mono>
            {p.x}
          </T>
        </g>
      ))}
      <T x={312} y={123} size={7.5} anchor="end">
        years
      </T>

      {/* The squared gaps, laid end to end on one scale. */}
      <T x={X0} y={138} size={7.5} anchor="start">
        squared gaps to the mean
      </T>
      <T x={X0 - 6} y={150} size={9} anchor="end" mono bold tone="ink">
        {`SST ${nf(flat.sst)}`}
      </T>
      {sst.map((s, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: one segment per employee, in order
        <Show key={i} from={0.1 + i * 0.05}>
          <rect
            x={s.x}
            y={142}
            width={s.w}
            height={12}
            className="fill-surface-3 stroke-muted"
            strokeWidth={0.8}
          />
          {s.w > 18 && (
            <T x={s.x + s.w / 2} y={151} size={7.5} mono tone="ink">
              {nf(s.v)}
            </T>
          )}
        </Show>
      ))}
      <Show from={0.66}>
        <T x={X0} y={170} size={7.5} anchor="start">
          squared gaps to the line
        </T>
        <T x={X0 - 6} y={182} size={9} anchor="end" mono bold tone="bad">
          {`SSE ${nf(fitted.sse)}`}
        </T>
        {sse.map((s, i) =>
          s.w > 0 ? (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: one segment per employee, in order
              key={i}
              x={s.x}
              y={174}
              width={s.w}
              height={12}
              className="fill-bad-bg stroke-bad"
              strokeWidth={0.8}
            />
          ) : null,
        )}
        <T x={X0 + fitted.sse * k + 6} y={183} size={7.5} anchor="start">
          what the line leaves unexplained
        </T>
      </Show>
      <Show from={0.8}>
        <T x={160} y={204} size={9.5} mono bold tone="ok">
          {`R² = 1 − ${nf(fitted.sse)} / ${nf(flat.sst)} = ${nf(fitted.r2, 3)}`}
        </T>
      </Show>
    </>
  );
}

// ───────────── Multiple regression ─────────────

/** Change one feature, hold the other: the prediction moves by exactly that feature's weight. */
function CoefficientHeldFixed() {
  const fit = olsMulti(
    EMPLOYEES.map((p, i) => [p.x, PROJECTS[i] ?? 0]),
    SALARIES,
  );
  const [wYears = 0, wProjects = 0] = fit.weights;
  const b = fit.intercept;
  const X0 = 92;
  const k = 13;
  const at = (v: number) => X0 + v * k;
  const base = fit.predict([4, 3]);
  const rows = [
    { years: 4, projects: 3, top: 44, from: 0, grow: null },
    { years: 5, projects: 3, top: 90, from: 0.26, grow: 'years' },
    { years: 4, projects: 4, top: 136, from: 0.58, grow: 'projects' },
  ] as const;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Change one feature, hold the other: the gap is its weight
      </T>
      {/* Legend for the three parts of every prediction. */}
      <rect x={X0} y={24} width={8} height={8} rx={2} className="fill-surface-3 stroke-line-2" />
      <T x={X0 + 11} y={31} size={7.5} anchor="start" mono>
        {`b ${nf(b, 3)}`}
      </T>
      <rect x={146} y={24} width={8} height={8} rx={2} className="fill-brand-soft stroke-brand" />
      <T x={157} y={31} size={7.5} anchor="start" mono>
        {`${nf(wYears, 3)} per year`}
      </T>
      <rect x={224} y={24} width={8} height={8} rx={2} className="fill-warn-bg stroke-warn" />
      <T x={235} y={31} size={7.5} anchor="start" mono>
        {`${nf(wProjects, 3)} per project`}
      </T>

      <Show from={0.26}>
        <line
          x1={at(base)}
          y1={40}
          x2={at(base)}
          y2={160}
          className="stroke-line-2"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      </Show>
      {rows.map((row) => {
        const total = fit.predict([row.years, row.projects]);
        // Every row starts as the first one; a changed feature adds one piece at the end, in that
        // feature's colour, and that piece is exactly the feature's weight.
        const yearsW = wYears * 4 * k;
        const projectsW = wProjects * 3 * k;
        const extraW = at(total) - at(base);
        const g0 = row.from + 0.08;
        const g1 = row.from + 0.18;
        const y = row.top;
        return (
          <Show key={row.top} from={row.from}>
            <T
              x={86}
              y={y + 6}
              size={8}
              anchor="end"
              tone={row.grow === 'years' ? 'ok' : 'ink'}
              bold={row.grow === 'years'}
            >
              {`${row.years} years`}
            </T>
            <T
              x={86}
              y={y + 17}
              size={8}
              anchor="end"
              tone={row.grow === 'projects' ? 'ok' : 'ink'}
              bold={row.grow === 'projects'}
            >
              {`${row.projects} projects`}
            </T>
            <rect
              x={X0}
              y={y}
              width={b * k}
              height={18}
              className="fill-surface-3 stroke-line-2"
              strokeWidth={1}
            />
            <T x={X0 + (b * k) / 2} y={y + 12} size={7.5} mono>
              b
            </T>
            <rect
              x={at(b)}
              y={y}
              width={yearsW}
              height={18}
              className="fill-brand-soft stroke-brand"
              strokeWidth={1}
            />
            <T x={at(b) + yearsW / 2} y={y + 12} size={7.5} mono tone="brand">
              {`${nf(wYears, 3)} × 4`}
            </T>
            <rect
              x={at(b) + yearsW}
              y={y}
              width={projectsW}
              height={18}
              className="fill-warn-bg stroke-warn"
              strokeWidth={1}
            />
            {row.grow && (
              <rect
                x={at(base)}
                y={y}
                width={extraW}
                height={18}
                className={
                  row.grow === 'years' ? 'fill-brand-soft stroke-brand' : 'fill-warn-bg stroke-warn'
                }
                strokeWidth={1}
              >
                <Anim
                  attr="width"
                  keys={[
                    [0, 0],
                    [g0, 0],
                    [g1, extraW],
                  ]}
                />
              </rect>
            )}
            <Show from={row.grow ? g1 + 0.02 : 0.04}>
              <T x={at(total) + 5} y={y + 12.5} size={8.5} anchor="start" mono bold tone="ink">
                {nf(total, 3)}
              </T>
            </Show>
            {row.grow && (
              <Show from={g1 + 0.04}>
                <rect
                  x={at(base) - 1}
                  y={y - 3}
                  width={extraW + 2}
                  height={24}
                  rx={3}
                  className="fill-none stroke-ok"
                  strokeWidth={1.6}
                />
                <T x={at(total) + 2} y={y + 33} size={8} anchor="end" tone="ok">
                  {row.grow === 'years' ? 'one more year: ' : 'one more project: '}
                  <tspan className="font-mono" fontWeight={700} fontSize={8.5}>
                    {`+${nf(total - base, 3)}`}
                  </tspan>
                </T>
              </Show>
            )}
          </Show>
        );
      })}
      <Show from={0.86}>
        <T x={160} y={186} size={8.5} tone="ink">
          {`Projects held at 3, one more year adds exactly ${nf(wYears, 3)} LPA`}
        </T>
      </Show>
    </>
  );
}

/** R² edges up when projects is added; adjusted R² charges for the extra feature and falls. */
function AdjustedR2Penalty() {
  const n = EMPLOYEES.length;
  const one = olsMulti(
    EMPLOYEES.map((p) => [p.x]),
    SALARIES,
  ).r2;
  const two = olsMulti(
    EMPLOYEES.map((p, i) => [p.x, PROJECTS[i] ?? 0]),
    SALARIES,
  ).r2;
  const models = [
    { name: 'years only', p: 1, r2: one, adj: adjustedR2(one, n, 1) },
    { name: 'years + projects', p: 2, r2: two, adj: adjustedR2(two, n, 2) },
  ];
  const adj1 = adjustedR2(one, n, 1);
  const adj2 = adjustedR2(two, n, 2);
  // Left: a slope chart on 0.91–0.96.
  const sy = (v: number) => 132 - (v - 0.91) * 1900;
  const XL = 56;
  const XR = 122;
  // Right: what is left unexplained (1 − R²), then that share charged (n − 1)/(n − p − 1) times.
  const X0 = 172;
  const k = 1500;
  const mark = (v: number) => nf(v, 3);
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Add projects: R² edges up, adjusted R² falls
      </T>
      {[XL, XR].map((x) => (
        <line key={x} x1={x} y1={30} x2={x} y2={136} className="stroke-line" strokeWidth={1} />
      ))}
      <T x={XL} y={147} size={8} tone="ink">
        years
      </T>
      <T x={XR} y={147} size={8} tone="ink">
        + projects
      </T>
      {/* R²: up a little. */}
      <line x1={XL} y1={sy(one)} x2={XR} y2={sy(two)} className="stroke-ink" strokeWidth={1.8}>
        <Anim
          attr="y2"
          keys={[
            [0, sy(one)],
            [0.1, sy(one)],
            [0.24, sy(two)],
          ]}
        />
      </line>
      <circle cx={XL} cy={sy(one)} r={3.2} className="fill-ink" />
      <T x={XL - 6} y={sy(one) + 3} size={8} anchor="end" mono tone="ink">
        {mark(one)}
      </T>
      <Show from={0.24}>
        <circle cx={XR} cy={sy(two)} r={3.2} className="fill-ink" />
        <T x={XR + 6} y={sy(two) + 3} size={8} anchor="start" mono tone="ink">
          {mark(two)}
        </T>
        <T x={(XL + XR) / 2} y={sy((one + two) / 2) - 8} size={8} bold tone="ink">
          R²
        </T>
      </Show>
      {/* Adjusted R²: down. */}
      <Show from={0.34}>
        <line x1={XL} y1={sy(adj1)} x2={XR} y2={sy(adj2)} className="stroke-bad" strokeWidth={1.8}>
          <Anim
            attr="y2"
            keys={[
              [0, sy(adj1)],
              [0.36, sy(adj1)],
              [0.5, sy(adj2)],
            ]}
          />
        </line>
        <circle cx={XL} cy={sy(adj1)} r={3.2} className="fill-bad" />
        <T x={XL - 6} y={sy(adj1) + 3} size={8} anchor="end" mono tone="bad">
          {mark(adj1)}
        </T>
      </Show>
      <Show from={0.5}>
        <circle cx={XR} cy={sy(adj2)} r={3.2} className="fill-bad" />
        <T x={XR + 6} y={sy(adj2) + 3} size={8} anchor="start" mono tone="bad">
          {mark(adj2)}
        </T>
        <T x={(XL + XR) / 2} y={sy((adj1 + adj2) / 2) + 16} size={8} bold tone="bad">
          adjusted R²
        </T>
      </Show>

      {/* Why: the share left unexplained, charged more for every feature on six rows. */}
      <T x={X0} y={32} size={8} anchor="start" tone="ink" bold>
        Why: the leftover is charged
      </T>
      {models.map((m, i) => {
        const y = 52 + i * 46;
        const left = 1 - m.r2;
        const charged = 1 - m.adj;
        const factor = `${n - 1}/${n - m.p - 1}`;
        const from = 0.58 + i * 0.14;
        return (
          <g key={m.name}>
            <T x={X0} y={y - 4} size={7.5} anchor="start">
              {`${m.name}, p = ${m.p}`}
            </T>
            <Show from={from}>
              <rect
                x={X0}
                y={y}
                width={charged * k}
                height={11}
                className="fill-bad-bg stroke-bad"
                strokeWidth={1}
              >
                <Anim
                  attr="width"
                  keys={[
                    [0, left * k],
                    [from + 0.03, left * k],
                    [from + 0.1, charged * k],
                  ]}
                />
              </rect>
              <rect
                x={X0}
                y={y}
                width={left * k}
                height={11}
                className="fill-surface-3 stroke-muted"
                strokeWidth={1}
              />
              <T x={X0 + (left * k) / 2} y={y + 8.5} size={7} mono>
                1 − R²
              </T>
              <T x={X0} y={y + 22} size={7.5} anchor="start" mono tone="ink">
                {`${mark(left)} × ${factor} = ${mark(charged)}`}
              </T>
            </Show>
          </g>
        );
      })}
      <Show from={0.86}>
        <T x={X0} y={145} size={7.5} anchor="start">
          adjusted R² = 1 − the charged share
        </T>
        <T x={160} y={166} size={8.5} tone="ink">
          Projects shrank the leftover a little; the charge grew more
        </T>
      </Show>
    </>
  );
}

/** Years and its near-copy, months: the weights swing wildly while the predictions hold. */
function CollinearWeights() {
  const alone = olsMulti(
    EMPLOYEES.map((p) => [p.x]),
    SALARIES,
  );
  const both = olsMulti(
    EMPLOYEES.map((p, i) => [p.x, MONTHS[i] ?? 0]),
    SALARIES,
  );
  const wAlone = alone.weights[0] ?? 0;
  const [wYears = 0, wMonths = 0] = both.weights;
  const moved = Math.max(
    ...alone.predictions.map((v, i) => Math.abs((both.predictions[i] ?? 0) - v)),
  );
  // Left: the weights as bars around zero.
  const Z = 66;
  const U = 5.6;
  const bar = (w: number) => ({ y: w >= 0 ? Z - w * U : Z, h: Math.abs(w) * U });
  const a = bar(wAlone);
  const by = bar(wYears);
  const bm = bar(wMonths);
  // Right: the six predictions on one salary axis.
  const sx = (s: number) => 180 + (s - 4) * 10.5;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Months ≈ 12 × years: weights swing, predictions hold
      </T>
      <T x={80} y={30} size={8} bold tone="ink">
        weights
      </T>
      <line x1={14} y1={Z} x2={150} y2={Z} className="stroke-line-2" strokeWidth={1} />
      <T x={12} y={Z + 3} size={7.5} anchor="end" mono>
        0
      </T>
      {/* Years alone: weight 2. */}
      <rect x={30} y={a.y} width={22} height={a.h} rx={2} className="fill-brand" />
      <T x={41} y={a.y - 4} size={8.5} mono bold tone="ink">
        {nf(wAlone, 2)}
      </T>
      <T x={41} y={130} size={7.5} tone="brand">
        years
      </T>
      <T x={41} y={142} size={8} bold tone="ink">
        alone
      </T>
      {/* Years with months beside it: the same weight swings far below zero. */}
      <Show from={0.3}>
        <rect x={90} y={by.y} width={22} height={by.h} rx={2} className="fill-brand">
          <Anim
            attr="y"
            keys={[
              [0, a.y],
              [0.34, a.y],
              [0.42, Z],
            ]}
          />
          <Anim
            attr="height"
            keys={[
              [0, a.h],
              [0.34, a.h],
              [0.42, 0],
              [0.54, by.h],
            ]}
          />
        </rect>
        <rect x={120} y={bm.y} width={22} height={bm.h} rx={2} className="fill-g1" />
        <T x={101} y={130} size={7.5} tone="brand">
          years
        </T>
        <T x={131} y={130} size={7.5} tone="g1">
          months
        </T>
        <T x={116} y={142} size={8} bold tone="ink">
          with months
        </T>
      </Show>
      <Show from={0.54}>
        <T x={86} y={by.y + by.h - 4} size={8.5} anchor="end" mono bold tone="bad">
          {nf(wYears, 2)}
        </T>
        <T x={131} y={bm.y - 4} size={8.5} mono bold tone="ink">
          {nf(wMonths, 2)}
        </T>
      </Show>

      <T x={240} y={30} size={8} bold tone="ink">
        predicted salary, six employees
      </T>
      <line x1={sx(4)} y1={112} x2={sx(16)} y2={112} className="stroke-line-2" strokeWidth={1} />
      {[4, 8, 12, 16].map((v) => (
        <T key={v} x={sx(v)} y={122} size={7.5} mono>
          {v}
        </T>
      ))}
      <T x={sx(4) - 4} y={57} size={7.5} anchor="end">
        alone
      </T>
      {alone.predictions.map((v, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: one dot per employee, in order
          key={i}
          cx={sx(v)}
          cy={54}
          r={3.4}
          className="fill-brand stroke-surface"
          strokeWidth={1}
        />
      ))}
      <Show from={0.3}>
        <T x={sx(4) - 4} y={89} size={7.5} anchor="end">
          + months
        </T>
        {both.predictions.map((v, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one dot per employee, in order
          <g key={i}>
            <line
              x1={sx(alone.predictions[i] ?? 0)}
              y1={58}
              x2={sx(v)}
              y2={82}
              className="stroke-line-2"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle cx={sx(v)} cy={86} r={3.4} className="fill-g1 stroke-surface" strokeWidth={1}>
              <Anim
                attr="cx"
                keys={[
                  [0, sx(alone.predictions[i] ?? 0)],
                  [0.34, sx(alone.predictions[i] ?? 0)],
                  [0.54, sx(v)],
                ]}
              />
            </circle>
          </g>
        ))}
      </Show>
      <Show from={0.66}>
        <T x={240} y={138} size={8} tone="ok">
          {`no prediction moves more than ${nf(moved, 2)}`}
        </T>
      </Show>
      <Show from={0.84}>
        <T x={160} y={164} size={8.5} tone="ink">
          {`The years weight swings from ${nf(wAlone, 2)} to ${nf(wYears, 2)}: neither weight can be read`}
        </T>
      </Show>
    </>
  );
}

// ───────────── Polynomial regression ─────────────

/** One column x becomes x, x², x³; least squares on those columns draws a curve. */
function PolynomialColumns() {
  // Left: the three columns against x = 1 … 4, as the slide's table lists them.
  const lx = (x: number) => 30 + (x - 1) * 30;
  const ly = (v: number) => 126 - v * 1.45;
  const columns = [
    { label: 'x', power: 1, tone: 'stroke-brand', dot: 'fill-brand', from: 0.04 },
    { label: 'x²', power: 2, tone: 'stroke-g1', dot: 'fill-g1', from: 0.18 },
    { label: 'x³', power: 3, tone: 'stroke-g3', dot: 'fill-g3', from: 0.32 },
  ] as const;
  // Right: the lab's sixteen points and a degree 3 fit on them.
  const fit = polyFit(
    CURVE.map((p) => p.x),
    CURVE.map((p) => p.y),
    3,
  );
  const rx = (x: number) => 194 + x * 19;
  const ry = (y: number) => 126 - (y - 2) * 6.2;
  const curve = pathOf(sample(0, 6, 60).map((x) => [rx(x), ry(fit.at(x))] as const));
  const [w1 = 0, w2 = 0, w3 = 0] = fit.weights;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        One feature becomes three columns; their fit bends
      </T>
      <line x1={26} y1={30} x2={26} y2={126} className="stroke-line-2" strokeWidth={1} />
      <line x1={26} y1={126} x2={126} y2={126} className="stroke-line-2" strokeWidth={1} />
      {[0, 32, 64].map((v) => (
        <T key={v} x={22} y={ly(v) + 3} size={7.5} anchor="end" mono>
          {v}
        </T>
      ))}
      {[1, 2, 3, 4].map((x) => (
        <T key={x} x={lx(x)} y={136} size={7.5} mono>
          {x}
        </T>
      ))}
      <T x={76} y={148} size={7.5}>
        x
      </T>
      {columns.map((c) => {
        const d = pathOf(sample(1, 4, 30).map((x) => [lx(x), ly(x ** c.power)] as const));
        return (
          <Show key={c.label} from={c.from}>
            <path
              d={d}
              pathLength={1}
              strokeDasharray="1"
              className={`fill-none ${c.tone}`}
              strokeWidth={2}
            >
              <Anim
                attr="stroke-dashoffset"
                keys={[
                  [0, 1],
                  [c.from, 1],
                  [c.from + 0.1, 0],
                ]}
              />
            </path>
            {[1, 2, 3, 4].map((x) => (
              <circle
                key={x}
                cx={lx(x)}
                cy={ly(x ** c.power)}
                r={2.6}
                className={`${c.dot} stroke-surface`}
                strokeWidth={0.8}
              />
            ))}
            <T
              x={lx(4) + 6}
              y={ly(4 ** c.power) + 3}
              size={8.5}
              anchor="start"
              mono
              bold
              tone="ink"
            >
              {`${c.label} ${4 ** c.power}`}
            </T>
          </Show>
        );
      })}

      <Show from={0.48}>
        <Arrow x1={150} y1={78} x2={180} y2={78} />
        <T x={165} y={71} size={7.5}>
          fit
        </T>
      </Show>
      <Show from={0.54}>
        <line x1={190} y1={30} x2={190} y2={126} className="stroke-line-2" strokeWidth={1} />
        <line x1={190} y1={126} x2={310} y2={126} className="stroke-line-2" strokeWidth={1} />
        {[0, 3, 6].map((x) => (
          <T key={x} x={rx(x)} y={136} size={7.5} mono>
            {x}
          </T>
        ))}
        <T x={250} y={148} size={7.5}>
          the lab’s sixteen points
        </T>
        {CURVE.map((p) => (
          <circle key={p.x} cx={rx(p.x)} cy={ry(p.y)} r={2.4} className="fill-muted" />
        ))}
      </Show>
      <Show from={0.62}>
        <path
          d={curve}
          pathLength={1}
          strokeDasharray="1"
          className="fill-none stroke-ok"
          strokeWidth={2.2}
          strokeLinejoin="round"
        >
          <Anim
            attr="stroke-dashoffset"
            keys={[
              [0, 1],
              [0.62, 1],
              [0.76, 0],
            ]}
          />
        </path>
      </Show>
      <Show from={0.8}>
        <T x={160} y={166} size={9} mono bold tone="ink">
          {`ŷ = ${nf(fit.intercept, 2)} ${term(w1, 'x')} ${term(w2, 'x²')} ${term(w3, 'x³')}`}
        </T>
      </Show>
    </>
  );
}

/** Choosing the degree: each half of the points is held back once, the two scores averaged. */
function DegreeCrossValidation() {
  const xs = CURVE.map((p) => p.x);
  const ys = CURVE.map((p) => p.y);
  // Round 1 is the lab's own split: even points fit, odd points held back. Round 2 swaps them,
  // which is the same split on the list shifted by one.
  const shift = <V,>(v: readonly V[]) => [...v.slice(1), ...v.slice(0, 1)];
  const first = scoreDegrees(xs, ys, DEGREES);
  const second = scoreDegrees(shift(xs), shift(ys), DEGREES);
  const rows = DEGREES.map((degree, i) => {
    const a = first[i]?.testR2 ?? 0;
    const b = second[i]?.testR2 ?? 0;
    return { degree, a, b, mean: (a + b) / 2 };
  });
  const best = rows.reduce((top, r) => (r.mean > top.mean ? r : top));
  // A table reads best with its decimals lined up: 0.910, not 0.91.
  const show = (v: number) => v.toFixed(v < -1 ? 2 : 3).replace('-', '−');
  // Left: the sixteen points in their two halves.
  const sx = (x: number) => 20 + x * 19.5;
  const sy = (y: number) => 120 - (y - 2) * 5.8;
  const halves = [
    { fill: 'fill-brand', stroke: 'stroke-brand', held: [0.44, 0.76] },
    { fill: 'fill-g1', stroke: 'stroke-g1', held: [0.06, 0.4] },
  ] as const;
  const cols = [
    { x: 214, half: 1, from: 0.1 },
    { x: 258, half: 0, from: 0.48 },
  ] as const;
  const rowY = (i: number) => 60 + i * 16;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Hold back each half once, then average the scores
      </T>
      <line x1={16} y1={124} x2={142} y2={124} className="stroke-line-2" strokeWidth={1} />
      <Show from={0.06} to={0.4} final={false}>
        <T x={14} y={30} anchor="start" size={8} tone="g1" bold>
          round 1: orange held back
        </T>
      </Show>
      <Show from={0.44} to={0.76} final={false}>
        <T x={14} y={30} anchor="start" size={8} tone="brand" bold>
          round 2: blue held back
        </T>
      </Show>
      <Show from={0.8}>
        <T x={14} y={30} anchor="start" size={8} tone="ink" bold>
          each half held back once
        </T>
      </Show>
      {CURVE.map((p, i) => {
        const h = halves[i % 2];
        if (!h) return null;
        return (
          <g key={p.x}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={3.2} className={h.fill} />
            <Show from={h.held[0]} to={h.held[1]} final={false}>
              <circle
                cx={sx(p.x)}
                cy={sy(p.y)}
                r={3.2}
                className={`fill-surface ${h.stroke}`}
                strokeWidth={1.4}
              />
            </Show>
          </g>
        );
      })}
      <T x={80} y={136} size={7.5}>
        the lab’s sixteen points
      </T>

      {/* The score table: held-back R² per degree, each round, and their mean. */}
      <T x={170} y={44} size={7.5} bold>
        degree
      </T>
      {cols.map((c) => (
        <g key={c.x}>
          <circle
            cx={c.x}
            cy={29}
            r={3.2}
            className={`fill-surface ${halves[c.half].stroke}`}
            strokeWidth={1.4}
          />
          <T x={c.x} y={44} size={7.5}>
            held back
          </T>
        </g>
      ))}
      <T x={300} y={44} size={7.5} bold tone="ink">
        mean
      </T>
      {rows.map((r, i) => (
        <g key={r.degree}>
          <T x={170} y={rowY(i)} size={8.5} mono tone="ink">
            {r.degree}
          </T>
          <Show from={0.1 + i * 0.05}>
            <T x={214} y={rowY(i)} size={8} mono tone={r.a < 0 ? 'bad' : 'ink'}>
              {show(r.a)}
            </T>
          </Show>
          <Show from={0.48 + i * 0.05}>
            <T x={258} y={rowY(i)} size={8} mono tone={r.b < 0 ? 'bad' : 'ink'}>
              {show(r.b)}
            </T>
          </Show>
          <Show from={0.8}>
            <T x={300} y={rowY(i)} size={8.5} mono bold tone={r.mean < 0 ? 'bad' : 'ink'}>
              {show(r.mean)}
            </T>
          </Show>
        </g>
      ))}
      <Show from={0.88}>
        <Box
          x={156}
          y={rowY(DEGREES.indexOf(best.degree)) - 11}
          w={160}
          h={15}
          r={4}
          tone="ringOk"
          width={1.6}
        />
        <T x={236} y={rowY(DEGREES.length) + 8} size={8.5} bold tone="ok">
          {`Keep degree ${best.degree}: the best mean`}
        </T>
      </Show>
      <T x={160} y={164} size={8.5}>
        Held-back R² for each degree, fitted on one half, scored on the other
      </T>
    </>
  );
}

// ───────────── Assumptions in practice ─────────────

/** A city column as dummy variables, and why one city must be left out. */
function DummyColumns() {
  const cities = ['Chennai', 'Hyderabad', 'Pune'] as const;
  const kept = ['Hyderabad', 'Pune'] as const;
  const rowY = (i: number) => 46 + i * 24;
  const colX = { city: 14, Hyderabad: 96, Pune: 148, Chennai: 212, ones: 276 } as const;
  const W = 46;
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        A city column becomes two 0/1 columns
      </T>
      <T x={colX.city + 33} y={38} size={7.5} mono bold>
        city
      </T>
      {cities.map((c, i) => (
        <Chip key={c} x={colX.city} y={rowY(i)} w={66} h={18} label={c} size={8.5} />
      ))}
      {kept.map((k, j) => (
        <Show key={k} from={0.08 + j * 0.14}>
          <T x={colX[k] + W / 2} y={38} size={7.5} mono bold tone="ink">
            {k}
          </T>
          {cities.map((c, i) => (
            <Show key={c} from={0.1 + j * 0.14 + i * 0.03}>
              <Chip
                x={colX[k]}
                y={rowY(i)}
                w={W}
                h={18}
                label={c === k ? '1' : '0'}
                size={9}
                tone={c === k ? 'brand' : 'plain'}
              />
            </Show>
          ))}
        </Show>
      ))}

      {/* What a third column would do: every row would add up to 1, a copy of the intercept. */}
      <Show from={0.42}>
        <g opacity={0.6}>
          <Anim
            attr="opacity"
            keys={[
              [0, 1],
              [0.74, 1],
              [0.8, 0.6],
            ]}
          />
          <T x={colX.Chennai + W / 2} y={38} size={7.5} mono bold tone="bad">
            Chennai
          </T>
          {cities.map((c, i) => (
            <g key={c}>
              <Box x={colX.Chennai} y={rowY(i)} w={W} h={18} r={6} tone="bad" dashed />
              <T x={colX.Chennai + W / 2} y={rowY(i) + 12.3} size={9} mono tone="bad">
                {c === 'Chennai' ? '1' : '0'}
              </T>
            </g>
          ))}
        </g>
      </Show>
      <Show from={0.52}>
        <T x={colX.ones + 17} y={38} size={7.5} mono bold>
          ones
        </T>
        {cities.map((c, i) => (
          <Chip key={c} x={colX.ones} y={rowY(i)} w={34} h={18} label="1" size={9} tone="soft" />
        ))}
        <T x={colX.ones + 17} y={rowY(3) + 4} size={7}>
          intercept
        </T>
      </Show>
      <Show from={0.6}>
        <path
          d={`M${colX.Hyderabad} 120 V126 H${colX.Chennai + W} V120`}
          className="fill-none stroke-bad"
          strokeWidth={1.2}
        />
        <T x={(colX.Hyderabad + colX.Chennai + W) / 2} y={138} size={8} tone="bad">
          all three add up to 1 in every row, just like the ones
        </T>
      </Show>
      <Show from={0.8}>
        <T x={colX.Chennai + W / 2} y={27} size={7.5} bold tone="bad">
          left out
        </T>
      </Show>
      <Show from={0.86}>
        <Box
          x={colX.Hyderabad - 3}
          y={rowY(0) - 3}
          w={colX.Pune + W - colX.Hyderabad + 6}
          h={24}
          r={7}
          tone="ringOk"
          width={1.6}
        />
        <T x={160} y={160} size={8.5} tone="ok">
          Leave Chennai out: it is (0, 0), and each weight is a gap from it
        </T>
      </Show>
    </>
  );
}

/** Residual plots: the example scatters evenly; curved data leaves a U; growing spread, a fan. */
function ResidualPatterns() {
  const Y0 = 70;
  const U = 6;
  const W = 96;
  const panels = [
    {
      name: 'The example',
      pts: EMPLOYEES,
      range: [0.3, 6.7] as const,
      verdict: 'even, no pattern',
      fix: 'a line suits it',
      good: true,
      from: 0.04,
    },
    {
      name: 'Curved data',
      pts: makePattern('curved', LAB_DOMAIN),
      range: LAB_DOMAIN.x,
      verdict: 'a U: it bends',
      fix: 'add a squared term',
      good: false,
      from: 0.22,
    },
    {
      name: 'Growing spread',
      pts: makePattern('funnel', LAB_DOMAIN),
      range: LAB_DOMAIN.x,
      verdict: 'a fan: it widens',
      fix: 'try a log on y',
      good: false,
      from: 0.44,
    },
  ];
  return (
    <>
      <T x={160} y={13} size={9.5} tone="ink">
        Residuals against x: even, bending, widening
      </T>
      {panels.map((panel, k) => {
        const left = 9 + k * 104;
        const sx = (x: number) =>
          left + 4 + ((x - panel.range[0]) / (panel.range[1] - panel.range[0])) * (W - 8);
        const sy = (r: number) => Y0 - Math.max(-7.5, Math.min(7.5, r)) * U;
        const line = ols(panel.pts).line;
        const res = evaluate(panel.pts, line).residuals;
        const xs = panel.pts.map((p) => p.x);
        const step = (0.16 / panel.pts.length) * 0.9;
        // The pattern, drawn from the residuals themselves.
        let overlay: ReactNode = null;
        if (k === 0) {
          overlay = (
            <rect
              x={left + 2}
              y={sy(1.4)}
              width={W - 4}
              height={sy(-1.4) - sy(1.4)}
              className="fill-ok stroke-ok"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="3 2"
            />
          );
        } else if (k === 1) {
          const u = polyFit(xs, res, 2);
          const lo = Math.min(...xs);
          const hi = Math.max(...xs);
          overlay = (
            <path
              d={pathOf(sample(lo, hi, 30).map((x) => [sx(x), sy(u.at(x))] as const))}
              className="fill-none stroke-bad"
              strokeWidth={1.8}
              strokeDasharray="4 3"
            />
          );
        } else {
          const spread = ols(panel.pts.map((p, i) => ({ x: p.x, y: Math.abs(res[i] ?? 0) }))).line;
          const lo = Math.min(...xs);
          const hi = Math.max(...xs);
          const h = (x: number) => Math.max(0.3, 1.5 * (spread.m * x + spread.b));
          overlay = (
            <path
              d={`${pathOf([
                [sx(lo), sy(h(lo))],
                [sx(hi), sy(h(hi))],
              ])} ${pathOf([
                [sx(lo), sy(-h(lo))],
                [sx(hi), sy(-h(hi))],
              ])}`}
              className="fill-none stroke-bad"
              strokeWidth={1.8}
              strokeDasharray="4 3"
            />
          );
        }
        return (
          <g key={panel.name}>
            <rect
              x={left}
              y={24}
              width={W}
              height={92}
              rx={6}
              className="fill-surface stroke-line"
              strokeWidth={1}
            />
            <line
              x1={left + 2}
              y1={Y0}
              x2={left + W - 2}
              y2={Y0}
              className="stroke-line-2"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <Show from={0.68}>{overlay}</Show>
            {panel.pts.map((p, i) => (
              <Show key={p.x} from={panel.from + i * step}>
                <circle
                  cx={sx(p.x)}
                  cy={sy(res[i] ?? 0)}
                  r={2.5}
                  className="fill-brand stroke-surface"
                  strokeWidth={0.8}
                />
              </Show>
            ))}
            <T x={left + W / 2} y={130} size={8.5} bold tone="ink">
              {panel.name}
            </T>
            <Show from={0.78 + k * 0.03}>
              <T x={left + W / 2} y={143} size={8} bold tone={panel.good ? 'ok' : 'bad'}>
                {panel.verdict}
              </T>
              <T x={left + W / 2} y={155} size={7.5}>
                {panel.fix}
              </T>
            </Show>
          </g>
        );
      })}
    </>
  );
}

// `satisfies`, not a Partial annotation: the keys stay exact, so the full library in animations.tsx
// sees every entry as present rather than possibly undefined.
export const LINREG_LIBRARY = {
  'mse-rmse-mae': { viewBox: '0 0 320 174', dur: 11, Draw: MseRmseMae },
  'r-squared-gaps': { viewBox: '0 0 320 212', dur: 11, Draw: RSquaredGaps },
  'coefficient-held-fixed': { viewBox: '0 0 320 194', dur: 11, Draw: CoefficientHeldFixed },
  'adjusted-r2-penalty': { viewBox: '0 0 320 174', dur: 11, Draw: AdjustedR2Penalty },
  'collinear-weights': { viewBox: '0 0 320 172', dur: 11, Draw: CollinearWeights },
  'polynomial-columns': { viewBox: '0 0 320 176', dur: 11, Draw: PolynomialColumns },
  'degree-cross-validation': { viewBox: '0 0 320 172', dur: 12, Draw: DegreeCrossValidation },
  'dummy-columns': { viewBox: '0 0 320 170', dur: 10, Draw: DummyColumns },
  'residual-patterns': { viewBox: '0 0 320 164', dur: 10, Draw: ResidualPatterns },
} satisfies Partial<Record<AnimationName, { viewBox: string; dur: number; Draw: () => ReactNode }>>;
