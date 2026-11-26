/**
 * The linear regression lab (WIDGET "linreg-lab"): a guided story beside one live picture, then
 * free play. Students move the line and watch every prediction, residual and squared error, the
 * loss and its metrics, the closed-form least-squares working, gradient descent one step at a
 * time and the residual plot. The lesson supplies the words and the data; the maths is in
 * ../linreg.ts and matches NumPy and scikit-learn.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { type PointerEvent as ReactPointerEvent, useId, useMemo, useRef, useState } from 'react';
import {
  descend,
  equationOf,
  evaluate,
  gdStep,
  gradient,
  type Line,
  makePattern,
  nf,
  ols,
  type P,
  predictAt,
  predictionWorking,
  scalingOf,
  signed,
  standardise,
  toRaw,
  toScaled,
} from '../linreg';
import { Verdict } from './code-sections';
import { Pick } from './data-explorers';
import { Choices, linear, pathOf, TryThis } from './explorers';
import { ControlStrip, LabStage, PanelTabs, SliderRow, StoryCard, useWide } from './lab-kit';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body = Extract<WidgetBody, { widget: 'linreg-lab' }>;
type Step = Body['story'][number];
type Level = Step['show'];
type PanelKey = Body['params']['panels'][number];
type DataKey = Body['params']['datasets'][number];

const LEVELS: Level[] = ['points', 'line', 'residuals', 'squares'];
const at = (level: Level, min: Level) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

const S = 320;
const PAD = { l: 34, r: 10, t: 10, b: 30 };

const PANEL_NAME: Record<PanelKey, string> = {
  calculation: 'Calculation',
  descent: 'Gradient descent',
  ols: 'Least squares',
  'residual-plot': 'Residual plot',
};

const DATASET_NAME: Record<DataKey, string> = {
  custom: 'The example',
  outlier: 'With an outlier',
  curved: 'Curved data',
  funnel: 'Growing spread',
};

/** About five round tick values covering [lo, hi]. */
function ticks(lo: number, hi: number): number[] {
  const raw = (hi - lo) / 5;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export function LinregLab({ body }: { body: Body }) {
  const p = body.params;
  const story = body.story;
  const domain = useMemo(
    () => ({
      x: [p.xRange.min, p.xRange.max] as [number, number],
      y: [p.yRange.min, p.yRange.max] as [number, number],
    }),
    [p.xRange.min, p.xRange.max, p.yRange.min, p.yRange.max],
  );
  const dataFor = (key: DataKey, moved: Record<number, P> = {}): P[] => {
    if (key === 'curved' || key === 'funnel') return makePattern(key, domain);
    const base = p.points.map((pt, i) => moved[i] ?? pt);
    return key === 'outlier' && p.outlier ? [...base, p.outlier] : base;
  };
  /** The full state a story step (or the lab's own start) asks for. */
  const stateOf = (st: Step | undefined) => {
    const dataset = st?.dataset && p.datasets.includes(st.dataset) ? st.dataset : p.defaultDataset;
    const pts = dataFor(dataset);
    const scaled = st?.scaled ?? false;
    const lr =
      st?.learningRate ??
      (scaled ? (p.scaledLearningRates[0] ?? 0.3) : (p.learningRates[0] ?? 0.01));
    let line: Line = st?.best ? ols(pts).line : (st?.line ?? p.line);
    let history: number[] = [];
    if (st?.steps !== undefined) {
      const sc = scalingOf(pts);
      const run = descend(
        scaled ? standardise(pts, sc) : pts,
        scaled ? toScaled(line, sc) : line,
        lr,
        st.steps,
      );
      const last = run.lines[run.lines.length - 1] as Line;
      line = scaled ? toRaw(last, sc) : last;
      history = run.mse;
    }
    return { dataset, scaled, lr, line, history, predict: st?.predict ?? null };
  };

  // Worked out once: a first step may already have run hundreds of gradient-descent steps.
  const [first] = useState(() => stateOf(story[0]));
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<DataKey>(first.dataset);
  const [moved, setMoved] = useState<Record<number, P>>({});
  const [line, setLineRaw] = useState<Line>(first.line);
  const [predict, setPredict] = useState<number | null>(first.predict);
  const [lr, setLr] = useState(first.lr);
  const [scaled, setScaled] = useState(first.scaled);
  const [history, setHistory] = useState<number[]>(first.history);
  const [diverged, setDiverged] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<null | { kind: 'a' | 'b' } | { kind: 'point'; index: number }>(null);
  const clipId = `lin${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const current = story[step];
  const free = !current;
  const level: Level = current?.show ?? 'squares';
  // A story step opens the one panel it is about. In free play every panel is on offer, one
  // tab at a time, so the picture, the controls and the working still share one window.
  const [tab, setTab] = useState<PanelKey>(p.panels[0] ?? 'calculation');
  const panels: PanelKey[] = current
    ? current.panel
      ? [current.panel]
      : []
    : p.panels.includes(tab)
      ? [tab]
      : p.panels.slice(0, 1);

  const points = useMemo(() => {
    if (dataset === 'curved' || dataset === 'funnel') return makePattern(dataset, domain);
    const base = p.points.map((pt, i) => moved[i] ?? pt);
    return dataset === 'outlier' && p.outlier ? [...base, p.outlier] : base;
  }, [dataset, domain, moved, p.points, p.outlier]);
  const fit = useMemo(() => ols(points), [points]);
  const ev = useMemo(() => evaluate(points, line), [points, line]);
  const best = useMemo(() => evaluate(points, fit.line), [points, fit]);
  const sc = useMemo(() => scalingOf(points), [points]);
  const isBest = Math.abs(line.m - fit.line.m) < 0.005 && Math.abs(line.b - fit.line.b) < 0.005;

  const sx = linear(domain.x[0], domain.x[1], PAD.l, S - PAD.r);
  const sy = linear(domain.y[0], domain.y[1], S - PAD.b, PAD.t);

  /** Moving the line by hand ends any gradient-descent run. */
  const setLine = (next: Line) => {
    setLineRaw({ m: round2(next.m), b: round2(next.b) });
    setHistory([]);
    setDiverged(false);
  };
  /** The least-squares line, exactly as fitted (rounding it would leave it just short of the best). */
  const drawBest = () => {
    setLineRaw(fit.line);
    setHistory([]);
    setDiverged(false);
  };
  const goTo = (i: number) => {
    const next = story[i];
    setStep(i);
    if (!next) return;
    const st = stateOf(next);
    setDataset(st.dataset);
    setMoved({});
    setLineRaw(st.line);
    setHistory(st.history);
    setDiverged(false);
    setPredict(st.predict);
    setLr(st.lr);
    setScaled(st.scaled);
  };

  // ── Gradient descent, in the space the student chose ──
  const space = scaled ? standardise(points, sc) : points;
  const inSpace = scaled ? toScaled(line, sc) : line;
  const grad = gradient(space, inSpace);
  const takeSteps = (count: number) => {
    let cur = inSpace;
    const losses = history.length ? [...history] : [ev.mse];
    let broke = false;
    for (let i = 0; i < count; i++) {
      cur = gdStep(space, cur, lr);
      const loss = evaluate(space, cur).mse;
      if (!Number.isFinite(loss) || loss > 1e9) {
        broke = true;
        break;
      }
      losses.push(loss);
    }
    if (broke) {
      setDiverged(true);
      return;
    }
    setLineRaw(scaled ? toRaw(cur, sc) : cur);
    setHistory(losses);
  };
  const restart = () => {
    setLineRaw({ m: 0, b: 0 });
    setHistory([]);
    setDiverged(false);
  };
  const rates = scaled && p.scaledLearningRates.length ? p.scaledLearningRates : p.learningRates;

  // ── Dragging the line's two handles, or a point ──
  const span = domain.x[1] - domain.x[0];
  const xa = domain.x[0] + 0.14 * span;
  const xb = domain.x[1] - 0.14 * span;
  const toData = (e: ReactPointerEvent): P | null => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const px = ((e.clientX - box.left) / box.width) * S;
    const py = ((e.clientY - box.top) / box.height) * S;
    const x = domain.x[0] + ((px - PAD.l) / (S - PAD.l - PAD.r)) * span;
    const y = domain.y[0] + ((S - PAD.b - py) / (S - PAD.t - PAD.b)) * (domain.y[1] - domain.y[0]);
    return {
      x: Math.min(domain.x[1], Math.max(domain.x[0], x)),
      y: Math.min(domain.y[1], Math.max(domain.y[0], y)),
    };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const at2 = toData(e);
    if (!at2) return;
    if (d.kind === 'point') {
      setMoved((m) => ({
        ...m,
        [d.index]: { x: Math.round(at2.x * 2) / 2, y: Math.round(at2.y * 2) / 2 },
      }));
      setHistory([]);
      return;
    }
    const ya = d.kind === 'a' ? at2.y : predictAt(line, xa);
    const yb = d.kind === 'b' ? at2.y : predictAt(line, xb);
    const m = (yb - ya) / (xb - xa);
    setLine({ m, b: ya - m * xa });
  };
  const grab = (what: NonNullable<typeof drag.current>) => (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = what;
  };
  const release = () => {
    drag.current = null;
  };
  const dragProps = {
    onPointerMove: onMove,
    onPointerUp: release,
    onPointerCancel: release,
    style: { touchAction: 'none' as const, cursor: 'grab' },
  };

  const can = (c: Body['params']['controls'][number]) => {
    if (!p.controls.includes(c)) return false;
    if (c === 'dataset' || c === 'move-points') return free;
    if (c === 'best-fit') return free || at(level, 'squares');
    return at(level, 'line');
  };
  const canMovePoints = can('move-points') && (dataset === 'custom' || dataset === 'outlier');
  // "Predict at x" is only useful once a step is about prediction, or in free play.
  const showPredict = can('predict') && (free || predict !== null);

  // ── Words for what the picture shows right now ──
  const worst = ev.residuals.reduce(
    (w, r, i) => (Math.abs(r) > Math.abs(ev.residuals[w] ?? 0) ? i : w),
    0,
  );
  const says = (() => {
    if (diverged) {
      return `With a learning rate of ${nf(lr, 3)} every step overshoots, and the loss grows without limit: gradient descent has **diverged**. Lower the rate and restart.`;
    }
    if (!at(level, 'line')) {
      return `${points.length} points: ${p.yName} against ${p.xName}. No line yet.`;
    }
    const eq = equationOf(line);
    const rising =
      history.length >= 3 &&
      (history[history.length - 1] ?? 0) > (history[history.length - 2] ?? 0) &&
      (history[history.length - 2] ?? 0) > (history[history.length - 3] ?? 0);
    if (rising) {
      return `After ${history.length - 1} steps the MSE is **rising**, to ${nf(ev.mse, 2)}: at a rate of ${nf(lr, 3)} each step overshoots the lowest point. Lower the learning rate and restart.`;
    }
    if (history.length > 1) {
      return `After ${history.length - 1} ${history.length === 2 ? 'step' : 'steps'}: ${eq}, MSE ${nf(ev.mse, 3)}. The lowest possible MSE is ${nf(best.mse, 3)}.`;
    }
    if (!at(level, 'residuals')) {
      const pr =
        predict !== null
          ? ` At x = ${nf(predict)} it predicts ${nf(predictAt(line, predict))}.`
          : '';
      const tilt =
        line.m === 0
          ? 'it is flat'
          : `it ${line.m > 0 ? 'rises' : 'falls'} by ${nf(Math.abs(line.m))} for every 1 on the x-axis`;
      return `The line is ${eq}: ${tilt}, and it is at ${nf(line.b)} when x is 0.${pr}`;
    }
    const wp = points[worst];
    if (!at(level, 'squares')) {
      return `Each dashed stick is a **residual**, y − ŷ. The largest is at (${nf(wp?.x ?? 0)}, ${nf(wp?.y ?? 0)}): ${nf(Math.abs(ev.residuals[worst] ?? 0))} ${(ev.residuals[worst] ?? 0) >= 0 ? 'above' : 'below'} the line.`;
    }
    if (isBest) {
      return `${eq} is the **least-squares line**: MSE ${nf(ev.mse, 3)}, and no other straight line does better on these points. R² is ${nf(ev.r2, 3)}.`;
    }
    return `${eq}: MSE = ${nf(ev.sse, 2)} / ${points.length} = ${nf(ev.mse, 3)}. The lowest possible MSE for these points is ${nf(best.mse, 3)}.`;
  })();

  const [calcRef, calcWide] = useWide(410);
  const [descentRef, descentWide] = useWide(440);
  const [showWorking, setShowWorking] = useState(true);
  const shown = points.slice(0, 8);
  const more = points.length - shown.length;
  const xt = ticks(domain.x[0], domain.x[1]);
  const yt = ticks(domain.y[0], domain.y[1]);
  const y0 = predictAt(line, domain.x[0]);
  const y1 = predictAt(line, domain.x[1]);

  const picture = (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <figure className="rounded-2xl border border-line bg-surface p-2">
        <svg
          ref={svg}
          viewBox={`0 0 ${S} ${S}`}
          className="block h-auto w-full"
          role="img"
          aria-label={says.replaceAll('**', '')}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.l} y={PAD.t} width={S - PAD.l - PAD.r} height={S - PAD.t - PAD.b} />
            </clipPath>
          </defs>
          {xt.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={PAD.t}
                y2={S - PAD.b}
                className="stroke-line"
                strokeWidth={0.6}
              />
              <text
                x={sx(t)}
                y={S - PAD.b + 11}
                fontSize={8.5}
                textAnchor="middle"
                className="fill-muted font-mono"
              >
                {t}
              </text>
            </g>
          ))}
          {yt.map((t) => (
            <g key={`y${t}`}>
              <line
                y1={sy(t)}
                y2={sy(t)}
                x1={PAD.l}
                x2={S - PAD.r}
                className="stroke-line"
                strokeWidth={0.6}
              />
              <text
                x={PAD.l - 5}
                y={sy(t) + 3}
                fontSize={8.5}
                textAnchor="end"
                className="fill-muted font-mono"
              >
                {t}
              </text>
            </g>
          ))}
          <text
            x={(PAD.l + S - PAD.r) / 2}
            y={S - 4}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
          >
            {p.xLabel}
          </text>
          <text
            x={9}
            y={(PAD.t + S - PAD.b) / 2}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
            transform={`rotate(-90 9 ${(PAD.t + S - PAD.b) / 2})`}
          >
            {p.yLabel}
          </text>

          <g clipPath={`url(#${clipId})`}>
            {at(level, 'squares') &&
              points.map((pt, i) => {
                const side = Math.abs(sy(pt.y) - sy(ev.predictions[i] ?? 0));
                // A huge square would cover the dots and the line, so it is drawn as an outline; and
                // one that would run off the right edge is mirrored to the left of its point.
                const plot = S - PAD.l - PAD.r;
                const huge = side > plot * 0.42;
                const left = sx(pt.x) + side > S - PAD.r;
                return (
                  <rect
                    // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
                    key={i}
                    x={left ? sx(pt.x) - side : sx(pt.x)}
                    y={Math.min(sy(pt.y), sy(ev.predictions[i] ?? 0))}
                    width={side}
                    height={side}
                    className="fill-warn stroke-warn"
                    fillOpacity={huge ? 0 : 0.16}
                    strokeWidth={0.8}
                  />
                );
              })}
            {at(level, 'line') && predict !== null && (
              <path
                d={`M${sx(predict)} ${S - PAD.b} L${sx(predict)} ${sy(predictAt(line, predict))} L${PAD.l} ${sy(predictAt(line, predict))}`}
                className="fill-none stroke-ok"
                strokeWidth={1.2}
                strokeDasharray="4 3"
              />
            )}
            {at(level, 'line') && (
              <line
                x1={sx(domain.x[0])}
                y1={sy(y0)}
                x2={sx(domain.x[1])}
                y2={sy(y1)}
                className="stroke-ink"
                strokeWidth={2}
              />
            )}
            {at(level, 'residuals') &&
              points.map((pt, i) => (
                <line
                  // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
                  key={i}
                  x1={sx(pt.x)}
                  x2={sx(pt.x)}
                  y1={sy(pt.y)}
                  y2={sy(ev.predictions[i] ?? 0)}
                  className={(ev.residuals[i] ?? 0) >= 0 ? 'stroke-warn' : 'stroke-bad'}
                  strokeWidth={1.6}
                  strokeDasharray="3 2"
                />
              ))}
          </g>
          {points.map((pt, i) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
              key={i}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={canMovePoints ? 6 : 4.5}
              className="fill-brand stroke-surface"
              strokeWidth={1.2}
              {...(canMovePoints && i < p.points.length
                ? { ...dragProps, onPointerDown: grab({ kind: 'point', index: i }) }
                : {})}
            />
          ))}
          {at(level, 'line') && predict !== null && (
            <>
              <circle
                cx={sx(predict)}
                cy={sy(predictAt(line, predict))}
                r={4.5}
                className="fill-ok stroke-surface"
              />
              <text
                x={Math.min(S - PAD.r - 4, sx(predict) + 7)}
                y={Math.max(PAD.t + 10, sy(predictAt(line, predict)) - 7)}
                fontSize={10}
                textAnchor={sx(predict) > S - 80 ? 'end' : 'start'}
                className="fill-ok stroke-surface font-mono font-bold [paint-order:stroke]"
              >
                ŷ = {nf(predictAt(line, predict))}
              </text>
            </>
          )}
          {at(level, 'line') &&
            can('line') &&
            (
              [
                ['a', xa],
                ['b', xb],
              ] as const
            ).map(([kind, hx]) => {
              const hy = Math.min(S - PAD.b, Math.max(PAD.t, sy(predictAt(line, hx))));
              return (
                // Keyboard users move the line with the slope and intercept sliders.
                <g key={kind} {...dragProps} onPointerDown={grab({ kind })}>
                  <circle cx={sx(hx)} cy={hy} r={16} className="fill-transparent" />
                  <circle
                    cx={sx(hx)}
                    cy={hy}
                    r={6}
                    className="fill-surface stroke-ink"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
        </svg>
        <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand" aria-hidden /> data
          </span>
          {at(level, 'line') && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-ink" aria-hidden /> line
              {can('line') && ' (drag its handles)'}
            </span>
          )}
          {at(level, 'residuals') && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-warn" aria-hidden /> above
                the line
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0 w-4 border-t-2 border-dashed border-bad" aria-hidden /> below
              </span>
            </>
          )}
          {at(level, 'squares') && <span>square = residual²</span>}
        </figcaption>
      </figure>
      <div aria-live="polite">
        <Verdict
          compact
          tone={diverged ? 'bad' : isBest && at(level, 'squares') ? 'ok' : 'info'}
          text={says}
        />
      </div>
    </div>
  );

  const metrics: Array<[string, string, string]> = [
    ['MSE', nf(ev.mse, 3), 'mean of the squared residuals'],
    ['RMSE', nf(ev.rmse, 3), `√MSE, in the units of ${p.yName}`],
    ['MAE', nf(ev.mae, 3), 'mean absolute residual'],
    ['R²', nf(ev.r2, 3), 'share of the variation explained'],
  ];

  const calculation = (
    <>
      {panels.includes('calculation') && at(level, 'line') && (
        <div ref={calcRef} className="rounded-2xl border border-line bg-surface p-3">
          <p className="eyebrow">Live calculation, row by row</p>
          {(() => {
            const cols = at(level, 'squares')
              ? '2rem 2.25rem minmax(0, 1fr) 7rem 3.75rem'
              : at(level, 'residuals')
                ? '2rem 2.25rem minmax(0, 1fr) 7rem'
                : '2rem 2.25rem minmax(0, 1fr)';
            const rowStyle = calcWide ? { gridTemplateColumns: cols } : undefined;
            return (
              <>
                <div
                  style={rowStyle}
                  className={cn(
                    'mt-1.5 gap-x-3 border-b border-line pb-1 text-[12.5px] font-medium text-muted',
                    calcWide ? 'grid' : 'hidden',
                  )}
                >
                  <span>x</span>
                  <span>y</span>
                  <span>ŷ = m × x + b</span>
                  {at(level, 'residuals') && <span>Residual y − ŷ</span>}
                  {at(level, 'squares') && <span>Squared</span>}
                </div>
                {!calcWide && (
                  <button
                    type="button"
                    onClick={() => setShowWorking((v) => !v)}
                    className="mt-2 rounded-lg border border-line-2 bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-ink"
                  >
                    {showWorking ? 'Hide the working' : `Show the working (${shown.length} points)`}
                  </button>
                )}
                <ol
                  className={cn('font-mono text-[12.5px]', !calcWide && !showWorking && 'hidden')}
                >
                  {shown.map((pt, i) => {
                    const res = ev.residuals[i] ?? 0;
                    return (
                      <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
                        key={i}
                        style={rowStyle}
                        className={cn(
                          'grid items-baseline gap-x-3 gap-y-0.5 border-b border-line py-1',
                          !calcWide && 'grid-cols-[auto_1fr]',
                        )}
                      >
                        {calcWide ? (
                          <>
                            <span>{nf(pt.x)}</span>
                            <span>{nf(pt.y)}</span>
                          </>
                        ) : (
                          <span className="col-span-2 font-sans text-muted">
                            {p.xName} {nf(pt.x)}, {p.yName} {nf(pt.y)}
                          </span>
                        )}
                        <span className={cn('break-words', !calcWide && 'col-span-2')}>
                          {!calcWide && 'ŷ = '}
                          {predictionWorking(line, pt.x)}
                        </span>
                        {at(level, 'residuals') && (
                          <span className={cn(!calcWide && 'col-span-2')}>
                            {!calcWide && <span className="font-sans text-muted">residual: </span>}
                            {nf(pt.y)} − {nf(ev.predictions[i] ?? 0)} = {nf(res)}
                          </span>
                        )}
                        {at(level, 'squares') && (
                          <span className={cn(!calcWide && 'col-span-2')}>
                            {!calcWide && <span className="font-sans text-muted">squared: </span>}
                            {nf(res * res)}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            );
          })()}
          {more > 0 && (
            <p className="mt-1.5 text-[12px] text-muted">
              … and {more} more points, all counted below.
            </p>
          )}
          {at(level, 'squares') && (
            <p className="mt-2 break-words font-mono text-[12.5px] text-ink">
              {more === 0 &&
                `Σ squares = ${ev.residuals.map((r) => nf(r * r)).join(' + ')} = ${nf(ev.sse)}   ·   `}
              MSE = {nf(ev.sse)} / {points.length} = {nf(ev.mse, 3)}
              {'   ·   '}R² = 1 − {nf(ev.sse)} / {nf(ev.sst)} = {nf(ev.r2, 3)}
            </p>
          )}
        </div>
      )}
    </>
  );

  // The line, the sliders that set it and the scores it earns, in one card above the working.
  const controls =
    at(level, 'line') || can('dataset') ? (
      <ControlStrip>
        {at(level, 'line') && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-mono text-[18px] leading-tight font-bold text-ink">
              {equationOf(line)}
            </p>
            {can('best-fit') && (
              <button
                type="button"
                onClick={drawBest}
                className="rounded-lg border border-brand bg-brand px-2.5 py-1 text-[12.5px] font-semibold text-white"
              >
                Best line
              </button>
            )}
          </div>
        )}
        {can('line') && (
          <SliderRow
            label="Slope m"
            value={line.m}
            min={p.slope.min}
            max={p.slope.max}
            step={p.slope.step}
            shown={nf(line.m)}
            onChange={(m) => setLine({ ...line, m })}
          />
        )}
        {can('line') && (
          <SliderRow
            label="Intercept b"
            value={line.b}
            min={p.intercept.min}
            max={p.intercept.max}
            step={p.intercept.step}
            shown={nf(line.b)}
            onChange={(b) => setLine({ ...line, b })}
          />
        )}
        {showPredict && (
          <SliderRow
            label="Predict at x"
            value={predict ?? domain.x[0]}
            min={domain.x[0]}
            max={domain.x[1]}
            step={0.5}
            shown={predict === null ? 'off' : nf(predict)}
            onChange={setPredict}
          />
        )}
        {at(level, 'squares') && (
          <dl className="flex flex-wrap gap-x-4 gap-y-1 border-line border-t pt-2">
            {metrics.map(([k, v, what]) => (
              <div key={k} className="flex items-baseline gap-1.5" title={what}>
                <dt className="eyebrow">{k}</dt>
                <dd className="font-mono text-[13.5px] font-bold text-ink">{v}</dd>
              </div>
            ))}
            <div className="flex items-baseline gap-1.5 text-[12.5px] text-muted">
              <dt>lowest possible MSE</dt>
              <dd className="font-mono font-semibold text-ink">
                {nf(best.mse, 3)}
                {isBest && ' (this line)'}
              </dd>
            </div>
          </dl>
        )}
        {can('dataset') && (
          <div className="grid min-w-0 content-start gap-1.5">
            <Pick
              label="Dataset"
              options={p.datasets}
              value={dataset}
              onChange={(d) => {
                setDataset(d);
                setMoved({});
                setHistory([]);
                setDiverged(false);
              }}
              names={DATASET_NAME}
            />
            {canMovePoints && (
              <p className="text-[12.5px] text-muted">
                Drag any point to move it.{' '}
                <button
                  type="button"
                  onClick={() => setMoved({})}
                  className="font-semibold text-brand underline"
                >
                  Put the points back
                </button>
              </p>
            )}
          </div>
        )}
        {!free && can('line') && current?.panel !== 'descent' && (
          <p className="text-[12px] leading-snug text-muted">
            Drag the line or a slider: every number follows. Each step sets them back.
          </p>
        )}
      </ControlStrip>
    ) : (
      // Before there is a line, the numbers behind the dots.
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-[12.5px] tabular-nums">
          <thead>
            <tr className="border-line border-b bg-surface-2 text-left">
              <th scope="col" className="px-3 py-1.5 font-semibold">
                {p.xLabel}
              </th>
              <th scope="col" className="px-3 py-1.5 font-semibold">
                {p.yLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((pt, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
              <tr key={i} className="border-line border-b last:border-0">
                <td className="px-3 py-1.5 font-mono">{nf(pt.x)}</td>
                <td className="px-3 py-1.5 font-mono">{nf(pt.y)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {more > 0 && (
          <p className="border-line border-t px-3 py-1.5 text-[12px] text-muted">
            … and {more} more points.
          </p>
        )}
      </div>
    );

  return (
    <LabStage
      prompt={body.prompt}
      story={
        <StoryCard
          steps={story}
          step={step}
          onStep={goTo}
          freeTitle="Your turn"
          freeBody="Every control is open now. Try these, or explore on your own. Continue when you are done."
          tasks={p.tasks}
        />
      }
      picture={picture}
      controls={controls}
      after={story.length === 0 ? <TryThis tasks={p.tasks} /> : null}
      calc={
        <>
          {free && (
            <PanelTabs
              options={p.panels}
              value={panels[0] ?? tab}
              onChange={setTab}
              names={PANEL_NAME}
            />
          )}
          {calculation}
          {panels.includes('descent') && at(level, 'line') && (
            <div ref={descentRef} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow">Gradient descent, one step at a time</p>
                <span className="font-mono text-[12.5px] text-ink">
                  step {Math.max(0, history.length - 1)} · MSE {nf(ev.mse, 3)}
                </span>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Choices
                  label="Learning rate"
                  options={rates}
                  value={lr}
                  onChange={(v) => {
                    setLr(v);
                    setDiverged(false);
                  }}
                  render={(v) => nf(v, 3)}
                />
                {p.scaledLearningRates.length > 0 && (
                  <Pick
                    label="Feature"
                    options={['raw', 'scaled'] as const}
                    value={scaled ? 'scaled' : 'raw'}
                    onChange={(v) => {
                      const on = v === 'scaled';
                      setScaled(on);
                      setLr((on ? p.scaledLearningRates[0] : p.learningRates[0]) ?? lr);
                      restart();
                    }}
                    names={{ raw: 'x as it is', scaled: 'x standardised' }}
                  />
                )}
              </div>
              <div className="mt-2 grid gap-0.5 rounded-xl bg-surface-2 px-3 py-2 font-mono text-[12.5px] text-ink">
                {scaled && (
                  <span className="font-sans text-muted">
                    Working on z = (x − {nf(sc.mean)}) / {nf(sc.sd)}: slope {nf(inSpace.m, 3)},
                    intercept {nf(inSpace.b, 3)}.
                  </span>
                )}
                <span>
                  ∂MSE/∂{scaled ? 'slope' : 'm'} = −(2/n) Σ {scaled ? 'z' : 'x'}·(y − ŷ) ={' '}
                  {nf(grad.gm, 3)}
                </span>
                <span>
                  ∂MSE/∂{scaled ? 'intercept' : 'b'} = −(2/n) Σ (y − ŷ) = {nf(grad.gb, 3)}
                </span>
                <span>
                  {scaled ? 'slope' : 'm'} ← {nf(inSpace.m, 3)} − {nf(lr, 3)} × {signed(grad.gm, 3)}{' '}
                  = {nf(inSpace.m - lr * grad.gm, 3)}
                </span>
                <span>
                  {scaled ? 'intercept' : 'b'} ← {nf(inSpace.b, 3)} − {nf(lr, 3)} ×{' '}
                  {signed(grad.gb, 3)} = {nf(inSpace.b - lr * grad.gb, 3)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ['Take one step', () => takeSteps(1)],
                    ['Run 20 steps', () => takeSteps(20)],
                  ] as const
                ).map(([name, run]) => (
                  <button
                    key={name}
                    type="button"
                    onClick={run}
                    disabled={diverged}
                    className="rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40"
                  >
                    {name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={restart}
                  className="rounded-lg border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink"
                >
                  Restart from m = 0, b = 0
                </button>
              </div>
              <div
                className="grid gap-x-4"
                style={{
                  gridTemplateColumns:
                    descentWide && history.length > 1
                      ? 'minmax(0, 1fr) minmax(0, 1fr)'
                      : 'minmax(0, 1fr)',
                }}
              >
                <SlopeLossCurve points={points} line={line} slope={p.slope} />
                {history.length > 1 && <LossChart history={history} best={best.mse} />}
              </div>
            </div>
          )}

          {panels.includes('ols') && at(level, 'line') && (
            <div className="rounded-2xl border border-line bg-surface p-3">
              <p className="eyebrow">The exact answer: least squares</p>
              <div className="mt-2 grid gap-1 font-mono text-[12.5px] text-ink">
                <span>
                  x̄ = {nf(fit.xbar, 3)} · ȳ = {nf(fit.ybar, 3)}
                </span>
                {shown.length <= 8 && more === 0 && (
                  <span className="break-words text-muted">
                    Σ (x − x̄)(y − ȳ) ={' '}
                    {points
                      .map((pt) => `${signed(pt.x - fit.xbar)}×${signed(pt.y - fit.ybar)}`)
                      .join(' + ')}
                  </span>
                )}
                <span>Σ (x − x̄)(y − ȳ) = {nf(fit.sxy, 3)}</span>
                <span>Σ (x − x̄)² = {nf(fit.sxx, 3)}</span>
                <span className="font-bold">
                  m = {nf(fit.sxy, 3)} / {nf(fit.sxx, 3)} = {nf(fit.line.m, 3)}
                </span>
                <span className="font-bold">
                  b = ȳ − m·x̄ = {nf(fit.ybar, 3)} − {nf(fit.line.m, 3)} × {nf(fit.xbar, 3)} ={' '}
                  {nf(fit.line.b, 3)}
                </span>
              </div>
              <button
                type="button"
                onClick={drawBest}
                className="mt-3 rounded-lg border border-brand bg-brand px-3 py-1.5 text-[13px] font-semibold text-white"
              >
                Draw this line
              </button>
            </div>
          )}

          {panels.includes('residual-plot') && at(level, 'residuals') && (
            <ResidualPlot
              points={points}
              residuals={ev.residuals}
              domain={domain.x}
              xLabel={p.xLabel}
            />
          )}
        </>
      }
    />
  );
}

/**
 * The loss as a curve: MSE for every slope in the slider's range, with the intercept held where the
 * student left it. The dot is the line on the picture, so moving the slope slider walks the curve.
 */
function SlopeLossCurve({
  points,
  line,
  slope,
}: {
  points: P[];
  line: Line;
  slope: { min: number; max: number; step: number };
}) {
  const W = 320;
  const H = 128;
  const P2 = { l: 40, r: 10, t: 12, b: 24 };
  const curve = useMemo(() => {
    const out: Array<{ m: number; mse: number }> = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const m = slope.min + ((slope.max - slope.min) * i) / steps;
      out.push({ m, mse: evaluate(points, { m, b: line.b }).mse });
    }
    return out;
  }, [points, line.b, slope.min, slope.max]);
  const lowest = curve.reduce(
    (a, c) => (c.mse < a.mse ? c : a),
    curve[0] as { m: number; mse: number },
  );
  const top = Math.max(...curve.map((c) => c.mse));
  const here = evaluate(points, line).mse;
  const ax = linear(slope.min, slope.max, P2.l, W - P2.r);
  const ay = linear(0, top, H - P2.b, P2.t);
  return (
    <figure className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">The loss curve</p>
        <span className="font-mono text-[12px] text-muted">intercept held at b = {nf(line.b)}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block h-auto w-full max-w-[520px]"
        role="img"
        aria-label={`MSE for every slope between ${nf(slope.min)} and ${nf(slope.max)}, with the intercept at ${nf(line.b)}. It is lowest, ${nf(lowest.mse, 3)}, at a slope of ${nf(lowest.m)}. The current slope ${nf(line.m)} scores ${nf(here, 3)}.`}
      >
        <line x1={P2.l} x2={W - P2.r} y1={H - P2.b} y2={H - P2.b} className="stroke-line-2" />
        <line x1={P2.l} x2={P2.l} y1={P2.t} y2={H - P2.b} className="stroke-line-2" />
        <text
          x={P2.l - 5}
          y={P2.t + 4}
          fontSize={8.5}
          textAnchor="end"
          className="fill-muted font-mono"
        >
          {nf(top, 0)}
        </text>
        <text
          x={P2.l - 5}
          y={H - P2.b + 3}
          fontSize={8.5}
          textAnchor="end"
          className="fill-muted font-mono"
        >
          0
        </text>
        <path
          d={pathOf(curve.map((c) => [ax(c.m), ay(c.mse)]))}
          className="fill-none stroke-brand"
          strokeWidth={2}
        />
        <line
          x1={ax(lowest.m)}
          x2={ax(lowest.m)}
          y1={ay(lowest.mse)}
          y2={H - P2.b}
          className="stroke-ok"
          strokeDasharray="3 3"
        />
        <circle cx={ax(lowest.m)} cy={ay(lowest.mse)} r={3} className="fill-ok" />
        <circle cx={ax(line.m)} cy={ay(Math.min(top, here))} r={4.5} className="fill-ink" />
        {[slope.min, slope.max].map((m) => (
          <text
            key={m}
            x={ax(m)}
            y={H - P2.b + 12}
            fontSize={8.5}
            textAnchor={m === slope.min ? 'start' : 'end'}
            className="fill-muted font-mono"
          >
            {nf(m)}
          </text>
        ))}
        <text
          x={Math.min(W - P2.r - 14, Math.max(P2.l + 14, ax(line.m)))}
          y={H - P2.b + 12}
          fontSize={8.5}
          textAnchor="middle"
          className="fill-ink font-mono font-bold"
        >
          {nf(line.m)}
        </text>
        <text
          x={(P2.l + W - P2.r) / 2}
          y={H - 3}
          fontSize={9}
          textAnchor="middle"
          className="fill-muted"
        >
          slope m
        </text>
      </svg>
      <figcaption className="mt-1 text-[12px] text-muted">
        One bowl with one lowest point: at this intercept the best slope is {nf(lowest.m)}, scoring{' '}
        {nf(lowest.mse, 3)}. Gradient descent walks down this curve; the black dot is your line.
      </figcaption>
    </figure>
  );
}

/** MSE after each gradient-descent step, on a log scale so both the fall and the tail are visible. */
function LossChart({ history, best }: { history: number[]; best: number }) {
  const W = 320;
  const H = 130;
  const P2 = { l: 38, r: 10, t: 10, b: 22 };
  const lo = Math.log10(Math.max(1e-6, Math.min(best, ...history) * 0.8));
  const hi = Math.log10(Math.max(...history) * 1.15);
  const ax = linear(0, Math.max(1, history.length - 1), P2.l, W - P2.r);
  const ay = linear(lo, hi, H - P2.b, P2.t);
  const marks = [10 ** hi / 1.15, best];
  return (
    <figure className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full max-w-[520px]"
        role="img"
        aria-label={`MSE after each of ${history.length - 1} steps, from ${nf(history[0] ?? 0, 2)} to ${nf(history[history.length - 1] ?? 0, 3)}. The lowest possible is ${nf(best, 3)}.`}
      >
        <line
          x1={P2.l}
          x2={W - P2.r}
          y1={ay(Math.log10(best))}
          y2={ay(Math.log10(best))}
          className="stroke-ok"
          strokeDasharray="4 3"
        />
        {marks.map((v) => (
          <text
            key={v}
            x={P2.l - 5}
            y={ay(Math.log10(v)) + 3}
            fontSize={8.5}
            textAnchor="end"
            className="fill-muted font-mono"
          >
            {nf(v, v < 10 ? 2 : 0)}
          </text>
        ))}
        <path
          d={pathOf(history.map((v, i) => [ax(i), ay(Math.log10(Math.max(1e-6, v)))]))}
          className="fill-none stroke-brand"
          strokeWidth={2}
        />
        <circle
          cx={ax(history.length - 1)}
          cy={ay(Math.log10(Math.max(1e-6, history[history.length - 1] ?? best)))}
          r={3.5}
          className="fill-brand"
        />
        <text
          x={(P2.l + W - P2.r) / 2}
          y={H - 4}
          fontSize={9}
          textAnchor="middle"
          className="fill-muted"
        >
          steps: 0 to {history.length - 1}
        </text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-brand" aria-hidden /> MSE after each step (log scale)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-ok" aria-hidden /> lowest
          possible
        </span>
      </figcaption>
    </figure>
  );
}

/** Residuals against x: the picture that checks a straight line's assumptions. */
function ResidualPlot({
  points,
  residuals,
  domain,
  xLabel,
}: {
  points: P[];
  residuals: number[];
  domain: [number, number];
  xLabel: string;
}) {
  const W = 320;
  const H = 150;
  const P2 = { l: 34, r: 10, t: 10, b: 26 };
  const top = Math.max(0.5, ...residuals.map(Math.abs)) * 1.15;
  const ax = linear(domain[0], domain[1], P2.l, W - P2.r);
  const ay = linear(-top, top, H - P2.b, P2.t);
  return (
    <figure className="rounded-2xl border border-line bg-surface p-3">
      <p className="eyebrow">Residual plot</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block h-auto w-full max-w-[520px]"
        role="img"
        aria-label="Each point's residual, drawn against x, around a zero line."
      >
        <line
          x1={P2.l}
          x2={W - P2.r}
          y1={ay(0)}
          y2={ay(0)}
          className="stroke-ink"
          strokeWidth={1}
        />
        {[top / 1.15, -top / 1.15].map((v) => (
          <text
            key={v}
            x={P2.l - 5}
            y={ay(v) + 3}
            fontSize={8.5}
            textAnchor="end"
            className="fill-muted font-mono"
          >
            {nf(v, 1)}
          </text>
        ))}
        <text
          x={P2.l - 5}
          y={ay(0) + 3}
          fontSize={8.5}
          textAnchor="end"
          className="fill-muted font-mono"
        >
          0
        </text>
        {points.map((pt, i) => (
          <g
            // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
            key={i}
          >
            <line
              x1={ax(pt.x)}
              x2={ax(pt.x)}
              y1={ay(0)}
              y2={ay(residuals[i] ?? 0)}
              className="stroke-warn"
              strokeWidth={1.2}
            />
            <circle cx={ax(pt.x)} cy={ay(residuals[i] ?? 0)} r={3.4} className="fill-warn" />
          </g>
        ))}
        <text
          x={(P2.l + W - P2.r) / 2}
          y={H - 4}
          fontSize={9}
          textAnchor="middle"
          className="fill-muted"
        >
          {xLabel}
        </text>
      </svg>
      <figcaption className="mt-1.5 text-[12.5px] text-muted">
        A good fit leaves the residuals scattered evenly around zero. A curve means a straight line
        misses the shape. A widening funnel means the errors grow with x.
      </figcaption>
    </figure>
  );
}
