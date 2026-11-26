/**
 * The lab beyond one feature (WIDGET "linreg-multi"): a guided story beside one live picture, then
 * free play. Its table view carries one weight per column, set by hand or solved exactly, and
 * reports MSE, R² and adjusted R², so a column that pays nothing back can be caught. Its curve
 * view adds powers of x as further columns and scores each degree on points the fit never saw.
 * The lesson supplies the words and the data; the maths is in ../linreg-multi.ts and matches
 * NumPy and scikit-learn.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { type ReactNode, useId, useMemo, useState } from 'react';
import { nf, signed } from '../linreg';
import { adjustedR2, correlation, olsMulti, polyFit, splitHalves } from '../linreg-multi';
import { Choices, linear, pathOf, TryThis } from './explorers';
import {
  ControlStrip,
  Key,
  LabStage,
  niceTicks,
  PictureFrame,
  SliderRow,
  StoryCard,
  useWidth,
} from './lab-kit';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body = Extract<WidgetBody, { widget: 'linreg-multi' }>;
type Step = Body['story'][number];
type View = Step['view'];
type Second = NonNullable<Step['second']>;
type PanelKey = NonNullable<Step['panel']>;

const S = 320;
const PAD = { l: 34, r: 10, t: 10, b: 28 };

const mean = (vs: readonly number[]) => vs.reduce((a, b) => a + b, 0) / (vs.length || 1);

/** MSE and R² for any weights, not only the best ones: the student can set their own. */
function score(ys: readonly number[], preds: readonly number[]) {
  const residuals = ys.map((y, i) => y - (preds[i] ?? 0));
  const sse = residuals.reduce((a, r) => a + r * r, 0);
  const m = mean(ys);
  const sst = ys.reduce((a, y) => a + (y - m) ** 2, 0);
  return { residuals, sse, mse: sse / (ys.length || 1), r2: sst === 0 ? 0 : 1 - sse / sst };
}

export function LinregMultiLab({ body }: { body: Body }) {
  const p = body.params;
  const story = body.story;
  const ys = useMemo(() => p.rows.map((r) => r.y), [p.rows]);
  const first = p.columns[0] as { label: string; name: string };
  const extra = p.columns[1] as { label: string; name: string };

  /** The second column in the model: the one that adds information, or the one that repeats. */
  const secondOf = (second: Second) =>
    second === 'extra'
      ? extra
      : { label: p.duplicateLabel ?? extra.label, name: p.duplicateName ?? extra.name };
  const matrixOf = (features: number, second: Second) =>
    p.rows.map((r, i) =>
      features === 1 ? [r.x1] : [r.x1, second === 'extra' ? r.x2 : (p.duplicate?.[i] ?? r.x2)],
    );

  /** The full state a story step (or the lab's own start) asks for. */
  const stateOf = (st: Step | undefined) => {
    const view: View = st?.view ?? 'features';
    const features = st?.features ?? 2;
    const second: Second = st?.second ?? 'extra';
    const exact = olsMulti(matrixOf(features, second), ys);
    const weights = st?.best
      ? exact.weights
      : [st?.weights?.[0] ?? 0, st?.weights?.[1] ?? 0].slice(0, 2);
    return {
      view,
      features,
      second,
      weights: [weights[0] ?? 0, weights[1] ?? 0] as [number, number],
      intercept: st?.best ? exact.intercept : (st?.intercept ?? 0),
      degree: st?.degree ?? p.degrees[0] ?? 1,
      holdOut: st?.holdOut ?? false,
      row: st?.row ?? null,
      panel: (st?.panel ?? 'table') as PanelKey,
    };
  };

  const [start] = useState(() => stateOf(story[0]));
  const [step, setStep] = useState(0);
  const [view, setView] = useState<View>(start.view);
  const [features, setFeatures] = useState(start.features);
  const [second, setSecond] = useState<Second>(start.second);
  const [weights, setWeights] = useState<[number, number]>(start.weights);
  const [intercept, setIntercept] = useState(start.intercept);
  const [degree, setDegree] = useState(start.degree);
  const [holdOut, setHoldOut] = useState(start.holdOut);
  const [row, setRow] = useState<number | null>(start.row);
  const [panel, setPanel] = useState<PanelKey>(start.panel);

  const free = step >= story.length;
  // A lab whose story never leaves one view is about that view: free play does not offer the other.
  const oneView = story.length > 0 && new Set(story.map((st) => st.view)).size === 1;
  const goto = (i: number) => {
    setStep(i);
    const to = story[i];
    if (!to) {
      // Free play: start from a fit worth exploring, not from zeros. The table view opens on
      // the best weights for the real second column; the curve view stays as the story left it.
      if (view === 'features') {
        const fit = olsMulti(matrixOf(2, 'extra'), ys);
        setFeatures(2);
        setSecond('extra');
        setWeights([fit.weights[0] ?? 0, fit.weights[1] ?? 0]);
        setIntercept(fit.intercept);
        setRow(null);
        setPanel('scores');
      }
      return;
    }
    const st = stateOf(to);
    setView(st.view);
    setFeatures(st.features);
    setSecond(st.second);
    setWeights(st.weights);
    setIntercept(st.intercept);
    setDegree(st.degree);
    setHoldOut(st.holdOut);
    setRow(st.row);
    setPanel(st.panel);
  };

  // ── the table view ──────────────────────────────────────────────────────────
  const cols = features === 1 ? [first] : [first, secondOf(second)];
  const matrix = matrixOf(features, second);
  const exact = useMemo(() => olsMulti(matrix, ys), [matrix, ys]);
  const used = weights.slice(0, features);
  const preds = matrix.map((r) => r.reduce((acc, v, j) => acc + v * (used[j] ?? 0), intercept));
  const { residuals, mse, r2 } = score(ys, preds);
  const adj = adjustedR2(r2, p.rows.length, features);
  const snap = () => {
    setWeights([exact.weights[0] ?? 0, exact.weights[1] ?? weights[1] ?? 0]);
    setIntercept(exact.intercept);
  };
  const equation = `ŷ = ${nf(intercept)}${used
    .map((w, j) => ` ${w < 0 ? '−' : '+'} ${nf(Math.abs(w), 3)}·${cols[j]?.name ?? 'x'}`)
    .join('')}`;

  // ── the curve view ──────────────────────────────────────────────────────────
  const domain = useMemo(
    () => ({
      x: [p.xRange.min, p.xRange.max] as [number, number],
      y: [p.yRange.min, p.yRange.max] as [number, number],
    }),
    [p.xRange.min, p.xRange.max, p.yRange.min, p.yRange.max],
  );
  const curve = p.curve;
  const split = useMemo(() => splitHalves(curve.length), [curve.length]);
  const trainIdx = holdOut ? split.train : curve.map((_, i) => i);
  const fit = useMemo(
    () =>
      polyFit(
        trainIdx.map((i) => curve[i]?.x ?? 0),
        trainIdx.map((i) => curve[i]?.y ?? 0),
        degree,
      ),
    [curve, trainIdx, degree],
  );
  const scoreOn = (idx: readonly number[]) =>
    score(
      idx.map((i) => curve[i]?.y ?? 0),
      idx.map((i) => fit.at(curve[i]?.x ?? 0)),
    ).r2;
  const trainR2 = scoreOn(trainIdx);
  const testR2 = holdOut ? scoreOn(split.test) : trainR2;

  const picture =
    view === 'features' ? (
      <PredictedVsActual
        ys={ys}
        preds={preds}
        highlight={row}
        yLabel={p.yLabel}
        lo={p.yRange.min}
        hi={p.yRange.max}
      />
    ) : (
      <CurvePlot
        curve={curve}
        split={split}
        holdOut={holdOut}
        at={(x) => fit.at(x)}
        domain={domain}
        degree={degree}
      />
    );

  const current = story[step];
  const controls =
    view === 'features' ? (
      <ControlStrip>
        <SliderRow
          label={`Weight on ${first.name}`}
          value={weights[0]}
          min={p.weight.min}
          max={p.weight.max}
          step={p.weight.step}
          onChange={(v) => setWeights([v, weights[1]])}
          shown={nf(weights[0], 3)}
        />
        {features === 2 && (
          <SliderRow
            label={`Weight on ${cols[1]?.name ?? 'the second column'}`}
            value={weights[1]}
            min={p.weight.min}
            max={p.weight.max}
            step={p.weight.step}
            onChange={(v) => setWeights([weights[0], v])}
            shown={nf(weights[1], 3)}
          />
        )}
        <SliderRow
          label="Intercept b"
          value={intercept}
          min={p.intercept.min}
          max={p.intercept.max}
          step={p.intercept.step}
          onChange={setIntercept}
          shown={nf(intercept, 2)}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={snap}
            className="rounded-lg border border-brand bg-brand px-2.5 py-1 text-[12.5px] font-semibold text-white"
          >
            Best weights
          </button>
          {free && (
            <Toggle on={features === 2} onClick={() => setFeatures(features === 2 ? 1 : 2)}>
              {features === 2 ? 'Two columns' : 'One column'}
            </Toggle>
          )}
          {free && p.duplicate && features === 2 && (
            <Toggle
              on={second === 'duplicate'}
              onClick={() => setSecond(second === 'duplicate' ? 'extra' : 'duplicate')}
            >
              {second === 'duplicate' ? p.duplicateLabel : extra.label}
            </Toggle>
          )}
          {free && !oneView && (
            <Toggle on={false} onClick={() => setView('curve')}>
              Fit a curve instead
            </Toggle>
          )}
          {!free && (
            <span className="min-w-[9rem] flex-1 text-[12px] leading-snug text-muted">
              Drag a slider: the picture and the numbers follow. Each step sets them back.
            </span>
          )}
        </div>
      </ControlStrip>
    ) : (
      <ControlStrip>
        <Choices
          label="Degree"
          options={[...p.degrees]}
          value={degree}
          onChange={setDegree}
          render={(d) => String(d)}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Toggle on={holdOut} onClick={() => setHoldOut(!holdOut)}>
            {holdOut ? 'Half held back' : 'Fit on every point'}
          </Toggle>
          {free && !oneView && (
            <Toggle on={false} onClick={() => setView('features')}>
              Back to the table
            </Toggle>
          )}
        </div>
      </ControlStrip>
    );
  return (
    <LabStage
      prompt={body.prompt}
      picture={picture}
      controls={controls}
      story={
        story.length > 0 ? (
          <StoryCard
            steps={story.map((s) => ({ kicker: s.kicker, title: s.title, body: s.body }))}
            step={step}
            onStep={goto}
            freeTitle="Your turn"
            freeBody="Every control is open now. Try these, or explore on your own. Continue when you are done."
            tasks={p.tasks}
          />
        ) : null
      }
      calc={
        view === 'features' ? (
          <>
            <Readout
              panel={free ? 'scores' : (current?.panel ?? panel)}
              equation={equation}
              mse={mse}
              r2={r2}
              adj={adj}
              features={features}
              cols={cols}
              matrix={matrix}
              ys={ys}
              preds={preds}
              row={row}
              weights={used}
              intercept={intercept}
              duplicateOn={second === 'duplicate'}
            />
            <FeatureTable
              cols={cols}
              yLabel={p.yLabel}
              yName={p.yName}
              rows={matrix}
              ys={ys}
              preds={preds}
              residuals={residuals}
              highlight={row}
            />
          </>
        ) : (
          <CurveScores degree={degree} trainR2={trainR2} testR2={testR2} holdOut={holdOut} />
        )
      }
      after={story.length === 0 ? <TryThis tasks={[...p.tasks]} /> : null}
    />
  );
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'rounded-lg border px-2.5 py-1 text-[12.5px] font-semibold transition-colors',
        on
          ? 'border-brand bg-brand text-white'
          : 'border-line-2 bg-surface text-ink hover:border-brand',
      )}
    >
      {children}
    </button>
  );
}

/**
 * Predicted against actual: with any number of features this one picture still works. A model
 * that was right every time would put all the dots on the dashed diagonal; the coloured stick
 * from each dot to the diagonal is that row's miss.
 */
function PredictedVsActual({
  ys,
  preds,
  highlight,
  yLabel,
  lo,
  hi,
}: {
  ys: number[];
  preds: number[];
  highlight: number | null;
  yLabel: string;
  lo: number;
  hi: number;
}) {
  const sx = linear(lo, hi, PAD.l, S - PAD.r);
  const sy = linear(lo, hi, S - PAD.b, PAD.t);
  const inside = (v: number) => Math.min(hi, Math.max(lo, v));
  const marks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(lo + f * (hi - lo)));
  return (
    <PictureFrame
      legend={
        <>
          <Key mark="dot" tone="bg-brand">
            one row of the table
          </Key>
          <Key mark="stick" tone="bg-warn">
            predicted too low
          </Key>
          <Key mark="stick" tone="bg-bad">
            predicted too high
          </Key>
          {highlight !== null && (
            <Key mark="dot" tone="bg-ink">
              the row worked out
            </Key>
          )}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Predicted salary against actual salary, one dot per row"
      >
        <title>Predicted against actual: dots on the dashed line are predicted exactly</title>
        <line x1={PAD.l} y1={S - PAD.b} x2={S - PAD.r} y2={S - PAD.b} className="stroke-line-2" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={S - PAD.b} className="stroke-line-2" />
        {marks.map((m) => (
          <g key={m}>
            <text
              x={sx(m)}
              y={S - PAD.b + 12}
              textAnchor="middle"
              className="fill-muted text-[9px]"
            >
              {m}
            </text>
            <text x={PAD.l - 5} y={sy(m) + 3} textAnchor="end" className="fill-muted text-[9px]">
              {m}
            </text>
          </g>
        ))}
        <line
          x1={sx(lo)}
          y1={sy(lo)}
          x2={sx(hi)}
          y2={sy(hi)}
          className="stroke-ink-2"
          strokeWidth={1.2}
          strokeDasharray="5 4"
        />
        <text
          x={sx(hi) - 6}
          y={sy(hi) + 16}
          textAnchor="end"
          className="fill-ink-2 text-[9.5px] font-semibold"
        >
          predicted = actual
        </text>
        {ys.map((y, i) => {
          const pred = inside(preds[i] ?? 0);
          const miss = y - (preds[i] ?? 0);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per row, in row order
            <g key={i}>
              <line
                x1={sx(y)}
                y1={sy(y)}
                x2={sx(y)}
                y2={sy(pred)}
                className={miss < 0 ? 'stroke-bad' : 'stroke-warn'}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
              <circle
                cx={sx(y)}
                cy={sy(pred)}
                r={i === highlight ? 6.5 : 5}
                className={cn('stroke-surface', i === highlight ? 'fill-ink' : 'fill-brand')}
                strokeWidth={1.5}
              />
            </g>
          );
        })}
        <text
          x={(PAD.l + S - PAD.r) / 2}
          y={S - 3}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          Actual {yLabel.toLowerCase()}
        </text>
        <text
          x={10}
          y={(PAD.t + S - PAD.b) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(PAD.t + S - PAD.b) / 2})`}
          className="fill-muted text-[10px]"
        >
          Predicted
        </text>
      </svg>
    </PictureFrame>
  );
}

/** The rows themselves: the columns in the model, the target, the prediction and the miss. */
function FeatureTable({
  cols,
  yLabel,
  yName,
  rows,
  ys,
  preds,
  residuals,
  highlight,
}: {
  cols: Array<{ label: string; name: string }>;
  yLabel: string;
  yName: string;
  rows: number[][];
  ys: number[];
  preds: number[];
  residuals: number[];
  highlight: number | null;
}) {
  const worst = Math.max(1e-9, ...residuals.map((r) => Math.abs(r)));
  // Beside a story card the table has about 350px: there the headings shorten and the bars go,
  // so every column still fits without a sideways scroll.
  const [ref, width] = useWidth();
  const tight = width > 0 && width < 420;
  const pad = tight ? 'px-1.5 py-1' : 'px-2.5 py-1.5';
  return (
    <div ref={ref} className="overflow-x-auto rounded-2xl border border-line bg-surface">
      <table
        className={cn(
          'w-full border-collapse tabular-nums',
          tight ? 'text-[11.5px]' : 'text-[12.5px]',
        )}
      >
        <thead>
          <tr className="border-line border-b bg-surface-2 text-left">
            {cols.map((c) => (
              <th key={c.name} scope="col" className={cn(pad, 'font-semibold')}>
                {tight ? c.name : c.label}
              </th>
            ))}
            <th scope="col" className={cn(pad, 'font-semibold')}>
              {tight ? yName : yLabel}
            </th>
            <th scope="col" className={cn(pad, 'font-semibold')}>
              ŷ
            </th>
            <th scope="col" className={cn(pad, 'font-semibold')}>
              Miss
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const miss = residuals[i] ?? 0;
            return (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
                key={i}
                className={cn(
                  'border-line border-b last:border-0',
                  i === highlight && 'bg-brand-soft/50',
                )}
              >
                {r.map((v, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: one cell per column, fixed order
                  <td key={j} className={cn(pad, 'font-mono')}>
                    {nf(v)}
                  </td>
                ))}
                <td className={cn(pad, 'font-mono')}>{nf(ys[i] ?? 0)}</td>
                <td className={cn(pad, 'font-mono text-ink-2')}>{nf(preds[i] ?? 0)}</td>
                <td className={pad}>
                  <span className="flex items-center gap-1.5">
                    <span className={cn('font-mono', miss < 0 ? 'text-bad' : 'text-warn')}>
                      {miss > 0 ? `+${nf(miss)}` : nf(miss)}
                    </span>
                    {!tight && (
                      <span
                        aria-hidden
                        className={cn('h-1.5 rounded-full', miss < 0 ? 'bg-bad' : 'bg-warn')}
                        style={{ width: `${(Math.abs(miss) / worst) * 36}px` }}
                      />
                    )}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The equation, the scores, and one row's prediction worked out in full. */
function Readout({
  panel,
  equation,
  mse,
  r2,
  adj,
  features,
  cols,
  matrix,
  ys,
  preds,
  row,
  weights,
  intercept,
  duplicateOn,
}: {
  panel: PanelKey;
  equation: string;
  mse: number;
  r2: number;
  adj: number;
  features: number;
  cols: Array<{ label: string; name: string }>;
  matrix: number[][];
  ys: number[];
  preds: number[];
  row: number | null;
  weights: number[];
  intercept: number;
  duplicateOn: boolean;
}) {
  const i = row ?? 0;
  const cells = matrix[i] ?? [];
  const working = `${nf(intercept)}${cells
    .map((v, j) => ` + ${signed(weights[j] ?? 0, 3)} × ${nf(v)} ${cols[j]?.name ?? ''}`)
    .join('')} = ${nf(preds[i] ?? 0)}`;
  const pair =
    features === 2
      ? correlation(
          matrix.map((r) => r[0] ?? 0),
          matrix.map((r) => r[1] ?? 0),
        )
      : 0;
  return (
    <div className="grid gap-2 rounded-2xl border border-line bg-surface px-3.5 py-3">
      <p className="break-words font-mono text-[14px] font-bold text-ink">{equation}</p>
      {panel === 'working' && (
        <p className="text-[13px] text-ink-2">
          Row {i + 1}: <span className="font-mono text-ink">{working}</span>, against{' '}
          <span className="font-mono text-ink">{nf(ys[i] ?? 0)}</span>.
        </p>
      )}
      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
        <Score inline label="MSE" value={nf(mse, 3)} />
        <Score inline label="R²" value={nf(r2, 3)} />
        <Score inline label="Adjusted R²" value={nf(adj, 3)} />
        {features === 2 && (
          <Score
            inline
            label="Correlation"
            value={nf(pair, 4)}
            tone={duplicateOn || Math.abs(pair) > 0.95 ? 'bad' : undefined}
          />
        )}
      </dl>
    </div>
  );
}

function Score({
  label,
  value,
  tone,
  inline = false,
}: {
  label: string;
  value: string;
  tone?: 'bad';
  /** The name and the number on one line, where height is short. */
  inline?: boolean;
}) {
  return (
    <div className={inline ? 'flex items-baseline gap-1.5' : 'grid gap-0.5'}>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={cn('font-mono text-[15px] font-bold', tone === 'bad' ? 'text-bad' : 'text-ink')}
      >
        {value}
      </dd>
    </div>
  );
}

function CurveScores({
  degree,
  trainR2,
  testR2,
  holdOut,
}: {
  degree: number;
  trainR2: number;
  testR2: number;
  holdOut: boolean;
}) {
  const gap = trainR2 - testR2;
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
        <Score label="Degree" value={String(degree)} />
        <Score
          label={holdOut ? 'R² on the fitted half' : 'R² on every point'}
          value={nf(trainR2, 3)}
        />
        {holdOut && (
          <Score
            label="R² on the held-back half"
            value={nf(testR2, 3)}
            tone={gap > 0.05 ? 'bad' : undefined}
          />
        )}
      </dl>
      {holdOut && gap > 0.05 && (
        <p className="text-[13px] text-ink-2">
          The fitted half scores {nf(gap, 3)} higher than the half held back. The curve is following
          points it was given, not the pattern behind them.
        </p>
      )}
    </div>
  );
}

/**
 * The bending data, the half held back, and the curve the current degree fits. Both axes carry
 * numbers and a name, and the key says which dots the curve was fitted on and which only score it.
 */
function CurvePlot({
  curve,
  split,
  holdOut,
  at,
  domain,
  degree,
}: {
  curve: Array<{ x: number; y: number }>;
  split: { train: number[]; test: number[] };
  holdOut: boolean;
  at: (x: number) => number;
  domain: { x: [number, number]; y: [number, number] };
  degree: number;
}) {
  const clipId = `curve${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const sx = linear(domain.x[0], domain.x[1], PAD.l, S - PAD.r);
  const sy = linear(domain.y[0], domain.y[1], S - PAD.b, PAD.t);
  const line: Array<[number, number]> = [];
  for (let k = 0; k <= 120; k++) {
    const x = domain.x[0] + ((domain.x[1] - domain.x[0]) * k) / 120;
    // A high degree can shoot far off the axes between points. It is drawn where it goes and
    // cut at the frame, so it visibly leaves the picture instead of running along its edge.
    line.push([sx(x), Math.min(S * 3, Math.max(-S * 2, sy(at(x))))]);
  }
  const held = new Set(split.test);
  const xt = niceTicks(Math.max(0, domain.x[0]), domain.x[1]);
  const yt = niceTicks(domain.y[0], domain.y[1]);
  return (
    <PictureFrame
      legend={
        <>
          <Key mark="dot" tone="bg-ink-2">
            {holdOut ? 'fitted on these points' : 'data: every point is fitted'}
          </Key>
          {holdOut && (
            <Key mark="hollow" tone="border-ink-2">
              held back: only used to score
            </Key>
          )}
          <Key mark="line" tone="bg-brand">
            the degree {degree} curve
          </Key>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`A degree ${degree} curve fitted to the points${holdOut ? ', with every second point held back' : ''}`}
      >
        <title>A polynomial fitted to bending data, with half the points held back</title>
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
              y={S - PAD.b + 12}
              textAnchor="middle"
              className="fill-muted text-[9px]"
            >
              {t}
            </text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line
              x1={PAD.l}
              x2={S - PAD.r}
              y1={sy(t)}
              y2={sy(t)}
              className="stroke-line"
              strokeWidth={0.6}
            />
            <text x={PAD.l - 5} y={sy(t) + 3} textAnchor="end" className="fill-muted text-[9px]">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.l} y1={S - PAD.b} x2={S - PAD.r} y2={S - PAD.b} className="stroke-line-2" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={S - PAD.b} className="stroke-line-2" />
        <path
          d={pathOf(line)}
          fill="none"
          className="stroke-brand"
          strokeWidth={2.5}
          clipPath={`url(#${clipId})`}
        />
        {curve.map((pt, i) => {
          const out = holdOut && held.has(i);
          return (
            <circle
              key={`${pt.x}-${pt.y}`}
              cx={sx(pt.x)}
              cy={sy(pt.y)}
              r={4}
              className={out ? 'fill-surface stroke-ink-2' : 'fill-ink-2 stroke-ink-2'}
              strokeWidth={1.5}
            />
          );
        })}
        <text
          x={(PAD.l + S - PAD.r) / 2}
          y={S - 3}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          x (the feature)
        </text>
        <text
          x={10}
          y={(PAD.t + S - PAD.b) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(PAD.t + S - PAD.b) / 2})`}
          className="fill-muted text-[10px]"
        >
          y (the target)
        </text>
      </svg>
    </PictureFrame>
  );
}
