/**
 * The logistic regression lab (WIDGET "logreg-lab"): a guided story beside one live picture, then
 * free play. Its curve view turns a linear score into a probability, works every row's score,
 * probability and log loss out in a table, runs gradient descent one step at a time, and counts
 * the confusion matrix as the threshold moves. Its plane view draws the decision boundary of a
 * two-feature model. The lesson supplies the words and the data; the maths is in ../logreg.ts and
 * matches scikit-learn.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { type ReactNode, useMemo, useState } from 'react';
import { nf, ols } from '../linreg';
import {
  auc,
  boundary1d,
  boundary2d,
  confusion,
  descend,
  fitL2,
  fit as fitLikelihood,
  gradient,
  logLoss,
  type Model,
  probaOf,
  probas,
  rocCurve,
  rowLoss,
  scoreOf,
} from '../logreg';
import { Choices, linear, pathOf, TryThis } from './explorers';
import {
  ControlStrip,
  Key,
  LabStage,
  niceTicks,
  PanelTabs,
  PictureFrame,
  SliderRow,
  StoryCard,
  useWidth,
} from './lab-kit';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body = Extract<WidgetBody, { widget: 'logreg-lab' }>;
type Step = Body['story'][number];
type View = Step['view'];
type Show = NonNullable<Step['show']>;
type PanelKey = NonNullable<Step['panel']>;

const LEVELS: Show[] = ['points', 'line', 'sigmoid', 'threshold'];
const at = (level: Show, min: Show) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

const S = 320;
const PAD = { l: 38, r: 10, t: 14, b: 32 };
/** The probability axis runs a little past 0 and 1, so a straight line can be seen leaving them. */
const P_LO = -0.25;
const P_HI = 1.25;

const PANEL_NAME: Record<PanelKey, string> = {
  table: 'Row by row',
  descent: 'Gradient descent',
  confusion: 'Confusion matrix',
  roc: 'ROC curve',
};

/** The rows and labels a view works on: one feature for the curve, two for the plane. */
function dataOf(p: Body['params'], view: View) {
  return view === 'curve' || p.plane.length === 0
    ? { rows: p.points.map((q) => [q.x]), ys: p.points.map((q) => q.y as number) }
    : { rows: p.plane.map((q) => [q.x1, q.x2]), ys: p.plane.map((q) => q.y as number) };
}

export function LogregLab({ body }: { body: Body }) {
  const p = body.params;
  const story = body.story;
  const hasPlane = p.plane.length > 0;

  /** The full state a story step (or the lab's own start) asks for. */
  const stateOf = (st: Step | undefined) => {
    const view: View = st?.view === 'plane' && hasPlane ? 'plane' : 'curve';
    const { rows, ys } = dataOf(p, view);
    const n = view === 'curve' ? 1 : 2;
    let model: Model = st?.best
      ? fitLikelihood(rows, ys).model
      : st?.penalised
        ? fitL2(rows, ys, 1).model
        : {
            weights: Array.from({ length: n }, (_, j) => st?.weights?.[j] ?? 0),
            intercept: st?.intercept ?? 0,
          };
    const lr = st?.learningRate ?? p.learningRates[0] ?? 0.1;
    let history: number[] = [];
    if (st?.steps !== undefined) {
      const run = descend(model, rows, ys, lr, st.steps);
      model = run.models[run.models.length - 1] as Model;
      history = run.loss;
    }
    return {
      view,
      show: (st?.show ?? 'threshold') as Show,
      weights: [model.weights[0] ?? 0, model.weights[1] ?? 0] as [number, number],
      intercept: model.intercept,
      threshold: st?.threshold ?? 0.5,
      panel: (st?.panel ?? 'table') as PanelKey,
      row: st?.row ?? null,
      lr,
      history,
    };
  };

  // Worked out once: a first step may already have run thousands of gradient-descent steps.
  const [first] = useState(() => stateOf(story[0]));
  const [step, setStep] = useState(0);
  const [view, setView] = useState<View>(first.view);
  const [show, setShow] = useState<Show>(first.show);
  const [weights, setWeights] = useState<[number, number]>(first.weights);
  const [intercept, setIntercept] = useState(first.intercept);
  const [threshold, setThreshold] = useState(first.threshold);
  const [panel, setPanel] = useState<PanelKey>(first.panel);
  const [row, setRow] = useState<number | null>(first.row);
  const [lr, setLr] = useState(first.lr);
  const [history, setHistory] = useState<number[]>(first.history);

  const free = step >= story.length;
  const oneView = !hasPlane || (story.length > 0 && new Set(story.map((st) => st.view)).size === 1);
  const goto = (i: number) => {
    setStep(i);
    if (!story[i]) {
      // Free play: everything on show, starting from the fitted model of the view the story
      // ended on. A flat line at zero weights would be a strange place to begin exploring.
      setShow('threshold');
      setWeights([best.model.weights[0] ?? 0, best.model.weights[1] ?? 0]);
      setIntercept(best.model.intercept);
      setHistory([]);
      setRow(null);
      return;
    }
    const st = stateOf(story[i]);
    setView(st.view);
    setShow(st.show);
    setWeights(st.weights);
    setIntercept(st.intercept);
    setThreshold(st.threshold);
    setPanel(st.panel);
    setRow(st.row);
    setLr(st.lr);
    setHistory(st.history);
  };

  const { rows, ys } = useMemo(() => dataOf(p, view), [p, view]);
  const n = view === 'curve' ? 1 : 2;
  const model: Model = useMemo(
    () => ({ weights: weights.slice(0, n), intercept }),
    [weights, intercept, n],
  );
  const ps = probas(model, rows);
  const loss = logLoss(ys, ps);
  const conf = confusion(ys, ps, threshold);
  const best = useMemo(() => fitLikelihood(rows, ys), [rows, ys]);
  const grad = gradient(model, rows, ys);

  /** Setting a weight by hand ends any gradient-descent run. */
  const setByHand = (w: [number, number], b: number) => {
    setWeights(w);
    setIntercept(b);
    setHistory([]);
  };
  const snap = () =>
    setByHand([best.model.weights[0] ?? 0, best.model.weights[1] ?? 0], best.model.intercept);
  const run = (count: number) => {
    const out = descend(model, rows, ys, lr, count);
    const last = out.models[out.models.length - 1] as Model;
    setWeights([last.weights[0] ?? 0, last.weights[1] ?? 0]);
    setIntercept(last.intercept);
    setHistory(history.length ? [...history, ...out.loss.slice(1)] : out.loss);
  };
  const restart = () => {
    setWeights([0, 0]);
    setIntercept(0);
    setHistory([]);
  };

  const names = view === 'curve' ? [p.xName] : [p.xName, p.x2Name ?? 'x2'];
  const equation = `z = ${nf(intercept, 3)}${weights
    .slice(0, n)
    .map((w, j) => ` ${w < 0 ? '−' : '+'} ${nf(Math.abs(w), 3)}·${names[j]}`)
    .join('')}`;
  const edge = view === 'curve' ? boundary1d(model, threshold) : null;

  const picture =
    view === 'curve' ? (
      <CurvePicture
        points={p.points}
        model={model}
        show={show}
        threshold={threshold}
        row={row}
        xRange={p.xRange}
        xLabel={p.xLabel}
        positive={p.positive}
        negative={p.negative}
        ps={ps}
      />
    ) : (
      <PlanePicture
        rows={p.plane}
        model={model}
        threshold={threshold}
        xRange={p.xRange}
        x2Range={p.x2Range ?? { min: 0, max: 1 }}
        xLabel={p.xLabel}
        x2Label={p.x2Label ?? ''}
        positive={p.positive}
        negative={p.negative}
        ps={ps}
      />
    );

  const current = story[step];
  const shownPanel = free ? panel : (current?.panel ?? panel);
  const canThreshold = free || view === 'plane' || at(show, 'threshold');
  // The model has a curve to move once the story reaches the sigmoid (always, in the plane view).
  const open = free || at(show, 'sigmoid') || view === 'plane';

  // The equation, the sliders that set it and the scores it earns, in one card above the working.
  const controls = open ? (
    <ControlStrip>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="break-words font-mono text-[13.5px] leading-snug font-bold text-ink">
          {equation}
          <span className="font-normal text-ink-2"> · p = 1 / (1 + e⁻ᶻ)</span>
        </p>
        <button
          type="button"
          onClick={snap}
          className="rounded-lg border border-brand bg-brand px-2.5 py-1 text-[12.5px] font-semibold text-white"
        >
          Best fit
        </button>
      </div>
      <SliderRow
        label={`Weight on ${names[0]}`}
        value={weights[0]}
        min={p.weight.min}
        max={p.weight.max}
        step={p.weight.step}
        onChange={(v) => setByHand([v, weights[1]], intercept)}
        shown={nf(weights[0], 3)}
      />
      {n === 2 && (
        <SliderRow
          label={`Weight on ${names[1]}`}
          value={weights[1]}
          min={p.weight.min}
          max={p.weight.max}
          step={p.weight.step}
          onChange={(v) => setByHand([weights[0], v], intercept)}
          shown={nf(weights[1], 3)}
        />
      )}
      <SliderRow
        label="Intercept b"
        value={intercept}
        min={p.intercept.min}
        max={p.intercept.max}
        step={p.intercept.step}
        onChange={(v) => setByHand(weights, v)}
        shown={nf(intercept, 3)}
      />
      {canThreshold && (
        <SliderRow
          label="Threshold"
          value={threshold}
          min={0.05}
          max={0.95}
          step={0.05}
          onChange={setThreshold}
          shown={nf(threshold, 2)}
        />
      )}
      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-line border-t pt-2 text-[13px]">
        <Score inline label="Log loss" value={nf(loss, 4)} />
        <Score inline label="Lowest possible" value={nf(best.loss, 4)} />
        {canThreshold && <Score inline label="Accuracy" value={nf(conf.accuracy, 2)} />}
        {canThreshold && edge !== null && (
          <Score inline label={`p = ${nf(threshold, 2)} at`} value={`${nf(edge, 2)} ${p.xName}`} />
        )}
      </dl>
      {free && !oneView && (
        <div className="flex flex-wrap gap-1.5">
          <Toggle
            on={false}
            onClick={() => {
              const next: View = view === 'curve' ? 'plane' : 'curve';
              setView(next);
              restart();
            }}
          >
            {view === 'curve' ? 'Switch to two features' : 'Switch to one feature'}
          </Toggle>
        </div>
      )}
      {!free && (
        <p className="text-[12px] leading-snug text-muted">
          Drag a slider: the picture and the numbers follow. Each step sets them back.
        </p>
      )}
    </ControlStrip>
  ) : (
    // Before there is a curve, the rows behind the dots.
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <table className="w-full border-collapse text-[12.5px] tabular-nums">
        <thead>
          <tr className="border-line border-b bg-surface-2 text-left">
            <th scope="col" className="px-3 py-1.5 font-semibold">
              {p.xLabel}
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              Label y
            </th>
            <th scope="col" className="px-3 py-1.5 font-semibold">
              Meaning
            </th>
          </tr>
        </thead>
        <tbody>
          {p.points.map((q, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
            <tr key={i} className="border-line border-b last:border-0">
              <td className="px-3 py-1 font-mono">{nf(q.x)}</td>
              <td className="px-3 py-1 font-mono">{q.y}</td>
              <td
                className={cn('px-3 py-1', q.y === 1 ? 'font-semibold text-brand' : 'text-ink-2')}
              >
                {q.y === 1 ? p.positive : p.negative}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        ) : (
          <TryThis tasks={[...p.tasks]} />
        )
      }
      calc={
        <>
          {free && (
            <PanelTabs
              options={Object.keys(PANEL_NAME) as PanelKey[]}
              value={panel}
              onChange={setPanel}
              names={PANEL_NAME}
            />
          )}
          {open && shownPanel === 'table' && (
            <RowsTable
              names={view === 'curve' ? [p.xLabel] : [p.xLabel, p.x2Label ?? '']}
              short={names as string[]}
              rows={rows}
              ys={ys}
              model={model}
              highlight={row}
              loss={loss}
            />
          )}
          {shownPanel === 'descent' && (
            <DescentPanel
              names={names as string[]}
              model={model}
              gw={grad.gw}
              gb={grad.gb}
              lr={lr}
              rates={[...p.learningRates]}
              onRate={setLr}
              loss={loss}
              lowest={best.loss}
              history={history}
              onRun={run}
              onRestart={restart}
            />
          )}
          {shownPanel === 'confusion' && (
            <ConfusionPanel
              conf={conf}
              total={ys.length}
              positive={p.positive}
              negative={p.negative}
              threshold={threshold}
            />
          )}
          {shownPanel === 'roc' && <RocPanel ys={ys} ps={ps} conf={conf} />}
        </>
      }
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
        className={cn(
          'font-mono font-bold',
          inline ? 'text-[13.5px]' : 'text-[15px]',
          tone === 'bad' ? 'text-bad' : 'text-ink',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** One feature across, probability up: the labels at 0 and 1, and the curve between them. */
function CurvePicture({
  points,
  model,
  show,
  threshold,
  row,
  xRange,
  xLabel,
  positive,
  negative,
  ps,
}: {
  points: Array<{ x: number; y: number }>;
  model: Model;
  show: Show;
  threshold: number;
  row: number | null;
  xRange: { min: number; max: number };
  xLabel: string;
  positive: string;
  negative: string;
  ps: number[];
}) {
  const sx = linear(xRange.min, xRange.max, PAD.l, S - PAD.r);
  const sy = linear(P_LO, P_HI, S - PAD.b, PAD.t);
  const straight = useMemo(() => ols(points.map((q) => ({ x: q.x, y: q.y }))).line, [points]);
  const curve: Array<[number, number]> = [];
  for (let k = 0; k <= 96; k++) {
    const x = xRange.min + ((xRange.max - xRange.min) * k) / 96;
    curve.push([sx(x), sy(probaOf(model, [x]))]);
  }
  const edge = boundary1d(model, threshold);
  const rising = (model.weights[0] ?? 0) >= 0;
  const inRange = edge !== null && edge > xRange.min && edge < xRange.max;
  const ticks = niceTicks(xRange.min, xRange.max);
  return (
    <PictureFrame
      legend={
        <>
          <Key mark="dot" tone="bg-brand">
            {positive} (y = 1)
          </Key>
          <Key mark="dot" tone="bg-muted">
            {negative} (y = 0)
          </Key>
          {show === 'line' && (
            <Key mark="line" tone="bg-bad">
              a straight-line fit
            </Key>
          )}
          {at(show, 'sigmoid') && (
            <Key mark="line" tone="bg-brand">
              probability p
            </Key>
          )}
          {at(show, 'threshold') && (
            <>
              <Key mark="dash" tone="border-ink-2">
                threshold
              </Key>
              <Key mark="ring" tone="border-bad">
                predicted wrongly
              </Key>
            </>
          )}
        </>
      }
    >
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Probability of ${positive} against ${xLabel.toLowerCase()}`}
      >
        <title>Each row sits at 0 or 1; the curve is the model's probability</title>
        {/* Outside 0 to 1 no probability can live: a straight line strays there, a sigmoid cannot. */}
        <rect
          x={PAD.l}
          y={sy(P_HI)}
          width={S - PAD.r - PAD.l}
          height={sy(1) - sy(P_HI)}
          className="fill-bad"
          fillOpacity={show === 'line' ? 0.08 : 0}
        />
        <rect
          x={PAD.l}
          y={sy(0)}
          width={S - PAD.r - PAD.l}
          height={sy(P_LO) - sy(0)}
          className="fill-bad"
          fillOpacity={show === 'line' ? 0.08 : 0}
        />
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              y1={sy(v)}
              x2={S - PAD.r}
              y2={sy(v)}
              className="stroke-line-2"
              strokeDasharray={v === 0.5 ? '2 4' : undefined}
            />
            <text x={PAD.l - 5} y={sy(v) + 3} textAnchor="end" className="fill-muted text-[9.5px]">
              {v}
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text
            key={t}
            x={sx(t)}
            y={S - PAD.b + 13}
            textAnchor="middle"
            className="fill-muted text-[9.5px]"
          >
            {t}
          </text>
        ))}

        {at(show, 'threshold') && inRange && edge !== null && (
          <>
            {/* Everything on this side of the boundary is predicted positive. */}
            <rect
              x={rising ? sx(edge) : PAD.l}
              y={sy(1)}
              width={rising ? S - PAD.r - sx(edge) : sx(edge) - PAD.l}
              height={sy(0) - sy(1)}
              className="fill-brand"
              fillOpacity={0.07}
            />
            <line
              x1={sx(edge)}
              y1={sy(1)}
              x2={sx(edge)}
              y2={sy(0)}
              className="stroke-brand"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
            <text
              x={sx(edge) + (rising ? 5 : -5)}
              y={sy(1) - 4}
              textAnchor={rising ? 'start' : 'end'}
              className="fill-brand text-[9.5px] font-semibold"
            >
              predict {positive}
            </text>
          </>
        )}
        {at(show, 'threshold') && (
          <line
            x1={PAD.l}
            y1={sy(threshold)}
            x2={S - PAD.r}
            y2={sy(threshold)}
            className="stroke-ink-2"
            strokeWidth={1.2}
            strokeDasharray="5 4"
          />
        )}

        {show === 'line' && (
          <>
            <path
              d={pathOf([
                [sx(xRange.min), sy(straight.m * xRange.min + straight.b)],
                [sx(xRange.max), sy(straight.m * xRange.max + straight.b)],
              ])}
              fill="none"
              className="stroke-bad"
              strokeWidth={2.5}
            />
            <text
              x={S - PAD.r - 4}
              y={sy(P_HI) + 12}
              textAnchor="end"
              className="fill-bad text-[9.5px]"
            >
              above 1: not a probability
            </text>
            <text x={PAD.l + 4} y={sy(P_LO) - 5} className="fill-bad text-[9.5px]">
              below 0: not a probability
            </text>
          </>
        )}
        {at(show, 'sigmoid') && (
          <path d={pathOf(curve)} fill="none" className="stroke-brand" strokeWidth={2.5} />
        )}

        {points.map((q, i) => {
          const wrong = at(show, 'threshold') && (ps[i] ?? 0) >= threshold !== (q.y === 1);
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per row, in row order
            <g key={i}>
              {i === row && at(show, 'sigmoid') && (
                <>
                  <line
                    x1={sx(q.x)}
                    y1={sy(q.y)}
                    x2={sx(q.x)}
                    y2={sy(ps[i] ?? 0)}
                    className="stroke-ink-2"
                    strokeDasharray="2 3"
                  />
                  <circle cx={sx(q.x)} cy={sy(ps[i] ?? 0)} r={3.5} className="fill-ink" />
                  <text
                    x={sx(q.x) + 6}
                    y={sy(ps[i] ?? 0) + 3}
                    className="fill-ink text-[10px] font-semibold"
                  >
                    p = {nf(ps[i] ?? 0, 3)}
                  </text>
                </>
              )}
              <circle
                cx={sx(q.x)}
                cy={sy(q.y)}
                r={i === row ? 6.5 : 5}
                className={cn(
                  q.y === 1 ? 'fill-brand' : 'fill-muted',
                  wrong ? 'stroke-bad' : 'stroke-surface',
                )}
                strokeWidth={wrong ? 2.5 : 1.5}
              />
            </g>
          );
        })}
        <text
          x={(PAD.l + S - PAD.r) / 2}
          y={S - 4}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {xLabel}
        </text>
        <text
          x={10}
          y={(PAD.t + S - PAD.b) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(PAD.t + S - PAD.b) / 2})`}
          className="fill-muted text-[10px]"
        >
          Probability of {positive}
        </text>
      </svg>
    </PictureFrame>
  );
}

/** Two features: every row as a dot, the plane tinted by probability, and the boundary line. */
function PlanePicture({
  rows,
  model,
  threshold,
  xRange,
  x2Range,
  xLabel,
  x2Label,
  positive,
  negative,
  ps,
}: {
  rows: Array<{ x1: number; x2: number; y: number }>;
  model: Model;
  threshold: number;
  xRange: { min: number; max: number };
  x2Range: { min: number; max: number };
  xLabel: string;
  x2Label: string;
  positive: string;
  negative: string;
  ps: number[];
}) {
  const sx = linear(xRange.min, xRange.max, PAD.l, S - PAD.r);
  const sy = linear(x2Range.min, x2Range.max, S - PAD.b, PAD.t);
  const G = 18;
  const cw = (S - PAD.r - PAD.l) / G;
  const ch = (S - PAD.b - PAD.t) / G;
  const cells: Array<{ x: number; y: number; p: number }> = [];
  for (let i = 0; i < G; i++) {
    for (let j = 0; j < G; j++) {
      const x1 = xRange.min + ((i + 0.5) / G) * (xRange.max - xRange.min);
      const x2 = x2Range.max - ((j + 0.5) / G) * (x2Range.max - x2Range.min);
      cells.push({ x: PAD.l + i * cw, y: PAD.t + j * ch, p: probaOf(model, [x1, x2]) });
    }
  }
  const line = boundary2d(model, threshold);
  const ends: Array<[number, number]> | null = !line
    ? null
    : 'vertical' in line
      ? [
          [sx(line.vertical), sy(x2Range.min)],
          [sx(line.vertical), sy(x2Range.max)],
        ]
      : [
          [sx(xRange.min), sy(line.slope * xRange.min + line.intercept)],
          [sx(xRange.max), sy(line.slope * xRange.max + line.intercept)],
        ];
  const xt = niceTicks(xRange.min, xRange.max);
  const yt = niceTicks(Math.max(0, x2Range.min), x2Range.max);
  return (
    <PictureFrame
      legend={
        <>
          <Key mark="dot" tone="bg-brand">
            {positive}
          </Key>
          <Key mark="hollow" tone="border-ink-2">
            {negative}
          </Key>
          <Key mark="dash" tone="border-ink">
            decision boundary
          </Key>
          <Key mark="area" tone="bg-brand/25">
            predicted {positive}
          </Key>
          <Key mark="ring" tone="border-bad">
            predicted wrongly
          </Key>
        </>
      }
    >
      <svg
        viewBox={`0 0 ${S} ${S}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Two features with the decision boundary"
      >
        <title>The line is where the probability equals the threshold</title>
        <defs>
          <clipPath id="logreg-plane">
            <rect x={PAD.l} y={PAD.t} width={S - PAD.r - PAD.l} height={S - PAD.b - PAD.t} />
          </clipPath>
        </defs>
        {cells.map((c) => (
          <rect
            key={`${c.x}-${c.y}`}
            x={c.x}
            y={c.y}
            width={cw + 0.5}
            height={ch + 0.5}
            className={c.p >= threshold ? 'fill-brand' : 'fill-muted'}
            fillOpacity={Math.min(0.3, Math.abs(c.p - threshold) * 0.5 + 0.03)}
          />
        ))}
        <line x1={PAD.l} y1={S - PAD.b} x2={S - PAD.r} y2={S - PAD.b} className="stroke-line-2" />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={S - PAD.b} className="stroke-line-2" />
        {xt.map((t) => (
          <text
            key={t}
            x={sx(t)}
            y={S - PAD.b + 13}
            textAnchor="middle"
            className="fill-muted text-[9.5px]"
          >
            {t}
          </text>
        ))}
        {yt.map((t) => (
          <text
            key={t}
            x={PAD.l - 5}
            y={sy(t) + 3}
            textAnchor="end"
            className="fill-muted text-[9.5px]"
          >
            {t}
          </text>
        ))}
        {ends && (
          <path
            d={pathOf(ends)}
            fill="none"
            className="stroke-ink"
            strokeWidth={2}
            strokeDasharray="6 4"
            clipPath="url(#logreg-plane)"
          />
        )}
        {rows.map((q, i) => {
          const wrong = (ps[i] ?? 0) >= threshold !== (q.y === 1);
          return (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: one dot per row, in row order
              key={i}
              cx={sx(q.x1)}
              cy={sy(q.x2)}
              r={5.5}
              className={cn(
                q.y === 1 ? 'fill-brand' : 'fill-surface',
                wrong ? 'stroke-bad' : q.y === 1 ? 'stroke-surface' : 'stroke-ink-2',
              )}
              strokeWidth={wrong ? 2.5 : 1.5}
            />
          );
        })}
        <text
          x={(PAD.l + S - PAD.r) / 2}
          y={S - 4}
          textAnchor="middle"
          className="fill-muted text-[10px]"
        >
          {xLabel}
        </text>
        <text
          x={10}
          y={(PAD.t + S - PAD.b) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(PAD.t + S - PAD.b) / 2})`}
          className="fill-muted text-[10px]"
        >
          {x2Label}
        </text>
      </svg>
    </PictureFrame>
  );
}

/** Every row worked out: the score, the probability it becomes, and what that costs. */
function RowsTable({
  names,
  short,
  rows,
  ys,
  model,
  highlight,
  loss,
}: {
  names: string[];
  short: string[];
  rows: number[][];
  ys: number[];
  model: Model;
  highlight: number | null;
  loss: number;
}) {
  const [ref, width] = useWidth();
  const tight = width > 0 && width < 460;
  const pad = tight ? 'px-1.5 py-1' : 'px-2.5 py-1';
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
            {names.map((c, j) => (
              <th key={c} scope="col" className={cn(pad, 'font-semibold')}>
                {tight ? short[j] : c}
              </th>
            ))}
            <th scope="col" className={cn(pad, 'font-semibold')}>
              Actual y
            </th>
            <th scope="col" className={cn(pad, 'font-semibold')}>
              Score z
            </th>
            <th scope="col" className={cn(pad, 'font-semibold')}>
              Probability p
            </th>
            <th scope="col" className={cn(pad, 'font-semibold')}>
              Log loss
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const prob = probaOf(model, r);
            const cost = rowLoss(ys[i] ?? 0, prob);
            return (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional and never reorder
                key={i}
                className={cn('border-line border-b', i === highlight && 'bg-brand-soft/50')}
              >
                {r.map((v, j) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: one cell per column, fixed order
                  <td key={j} className={cn(pad, 'font-mono')}>
                    {nf(v)}
                  </td>
                ))}
                <td className={cn(pad, 'font-mono')}>{ys[i]}</td>
                <td className={cn(pad, 'font-mono text-ink-2')}>{nf(scoreOf(model, r), 2)}</td>
                <td className={cn(pad, 'font-mono')}>{nf(prob, 3)}</td>
                <td className={cn(pad, 'font-mono', cost > 1 ? 'font-bold text-bad' : 'text-ink')}>
                  {nf(cost, 3)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-2">
            <td colSpan={names.length + 3} className={cn(pad, 'font-semibold')}>
              Mean log loss
            </td>
            <td className={cn(pad, 'font-mono font-bold')}>{nf(loss, 4)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** The gradient with its numbers, one update written out, and the loss falling step by step. */
function DescentPanel({
  names,
  model,
  gw,
  gb,
  lr,
  rates,
  onRate,
  loss,
  lowest,
  history,
  onRun,
  onRestart,
}: {
  names: string[];
  model: Model;
  gw: number[];
  gb: number;
  lr: number;
  rates: number[];
  onRate: (v: number) => void;
  loss: number;
  lowest: number;
  history: number[];
  onRun: (count: number) => void;
  onRestart: () => void;
}) {
  const w = model.weights[0] ?? 0;
  const g = gw[0] ?? 0;
  const taken = Math.max(0, history.length - 1);
  return (
    <div className="grid gap-2.5 rounded-2xl border border-line bg-surface p-3">
      <p className="eyebrow">Gradient descent, one step at a time</p>
      <div className="grid gap-1 font-mono text-[12.5px] text-ink">
        {gw.map((v, j) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one line per weight, fixed order
          <p key={j}>
            ∂L/∂w{gw.length > 1 ? j + 1 : ''} = mean((p − y)·{names[j]}) = {nf(v, 4)}
          </p>
        ))}
        <p>∂L/∂b = mean(p − y) = {nf(gb, 4)}</p>
        <p className="text-ink-2">
          next w{gw.length > 1 ? '1' : ''} = {nf(w, 4)} − {nf(lr, 2)} × ({nf(g, 4)}) ={' '}
          <b className="text-ink">{nf(w - lr * g, 4)}</b>
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Choices label="Learning rate" options={rates} value={lr} onChange={onRate} />
        <div className="flex flex-wrap gap-1.5">
          <Toggle on={false} onClick={() => onRun(1)}>
            Take one step
          </Toggle>
          <Toggle on={false} onClick={() => onRun(100)}>
            Run 100 steps
          </Toggle>
          <Toggle on={false} onClick={onRestart}>
            Restart from zero
          </Toggle>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-x-6 gap-y-2 text-[13px]">
        <Score label="Steps taken" value={String(taken)} />
        <Score label="Log loss now" value={nf(loss, 4)} />
        <Score label="Lowest possible" value={nf(lowest, 4)} />
      </dl>
      {history.length > 1 && <LossSpark history={history} lowest={lowest} />}
    </div>
  );
}

/** The loss after each step so far, with the floor it is heading for. */
function LossSpark({ history, lowest }: { history: number[]; lowest: number }) {
  const W = 320;
  const H = 70;
  const top = Math.max(...history, lowest) * 1.02;
  const bottom = Math.min(lowest * 0.9, ...history);
  const sx = linear(0, Math.max(1, history.length - 1), 4, W - 4);
  const sy = linear(bottom, top, H - 6, 6);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Log loss after each step"
    >
      <title>Log loss after each gradient-descent step</title>
      <line
        x1={4}
        y1={sy(lowest)}
        x2={W - 4}
        y2={sy(lowest)}
        className="stroke-ok"
        strokeDasharray="4 4"
      />
      <path
        d={pathOf(history.map((v, i) => [sx(i), sy(v)] as [number, number]))}
        fill="none"
        className="stroke-brand"
        strokeWidth={2}
      />
    </svg>
  );
}

/** The four counts at this threshold, and the four scores built from them. */
function ConfusionPanel({
  conf,
  total,
  positive,
  negative,
  threshold,
}: {
  conf: ReturnType<typeof confusion>;
  total: number;
  positive: string;
  negative: string;
  threshold: number;
}) {
  const cell = (name: string, long: string, value: number, good: boolean) => (
    <div
      className={cn(
        'grid rounded-xl border px-2 py-1.5 text-center',
        good ? 'border-ok/40 bg-ok/10' : 'border-bad/40 bg-bad/10',
      )}
    >
      <span className="font-mono text-[18px] leading-tight font-bold text-ink">{value}</span>
      <span className="text-[11.5px] leading-snug text-ink-2">
        <b className="font-semibold text-ink">{name}</b> · {long}
      </span>
    </div>
  );
  const frac = (top: number, bottom: number, value: number) =>
    `${top} / ${bottom} = ${bottom === 0 ? '0' : nf(value, 3)}`;
  return (
    <div className="grid gap-2.5 rounded-2xl border border-line bg-surface p-3">
      <p className="eyebrow">Confusion matrix at threshold {nf(threshold, 2)}</p>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-[12px]">
        <span />
        <span className="text-center font-semibold text-ink-2">Predicted {positive}</span>
        <span className="text-center font-semibold text-ink-2">Predicted {negative}</span>
        <span className="font-semibold text-ink-2">Actually {positive}</span>
        {cell('True positive', 'found correctly', conf.tp, true)}
        {cell('False negative', 'missed', conf.fn, false)}
        <span className="font-semibold text-ink-2">Actually {negative}</span>
        {cell('False positive', 'false alarm', conf.fp, false)}
        {cell('True negative', 'rejected correctly', conf.tn, true)}
      </div>
      <div
        className="grid gap-x-5 gap-y-1 font-mono text-[12.5px] text-ink"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(17rem, 1fr))' }}
      >
        <p>Accuracy = (TP + TN) / all = {frac(conf.tp + conf.tn, total, conf.accuracy)}</p>
        <p>Precision = TP / (TP + FP) = {frac(conf.tp, conf.tp + conf.fp, conf.precision)}</p>
        <p>Recall = TP / (TP + FN) = {frac(conf.tp, conf.tp + conf.fn, conf.recall)}</p>
        <p>F1 = 2 × P × R / (P + R) = {nf(conf.f1, 3)}</p>
      </div>
    </div>
  );
}

/** Every threshold at once: recall against false alarms, with today's threshold marked. */
function RocPanel({
  ys,
  ps,
  conf,
}: {
  ys: number[];
  ps: number[];
  conf: ReturnType<typeof confusion>;
}) {
  const R = 220;
  const pad = { l: 34, r: 8, t: 8, b: 28 };
  const sx = linear(0, 1, pad.l, R - pad.r);
  const sy = linear(0, 1, R - pad.b, pad.t);
  const curve = rocCurve(ys, ps);
  const area = auc(ys, ps);
  const fpr = conf.fp + conf.tn === 0 ? 0 : conf.fp / (conf.fp + conf.tn);
  return (
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[220px_minmax(0,1fr)]">
      <svg
        viewBox={`0 0 ${R} ${R}`}
        className="w-full max-w-[220px]"
        role="img"
        aria-label="ROC curve"
      >
        <title>Recall against the false positive rate, for every threshold</title>
        <line x1={pad.l} y1={R - pad.b} x2={R - pad.r} y2={R - pad.b} className="stroke-line-2" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={R - pad.b} className="stroke-line-2" />
        <line
          x1={sx(0)}
          y1={sy(0)}
          x2={sx(1)}
          y2={sy(1)}
          className="stroke-line-2"
          strokeDasharray="4 4"
        />
        <path
          d={pathOf(curve.map((c) => [sx(c.fpr), sy(c.tpr)] as [number, number]))}
          fill="none"
          className="stroke-brand"
          strokeWidth={2.2}
        />
        <circle
          cx={sx(fpr)}
          cy={sy(conf.recall)}
          r={5}
          className="fill-ink stroke-surface"
          strokeWidth={1.5}
        />
        <text
          x={(pad.l + R - pad.r) / 2}
          y={R - 6}
          textAnchor="middle"
          className="fill-muted text-[9.5px]"
        >
          False positive rate
        </text>
        <text
          x={9}
          y={(pad.t + R - pad.b) / 2}
          textAnchor="middle"
          transform={`rotate(-90 9 ${(pad.t + R - pad.b) / 2})`}
          className="fill-muted text-[9.5px]"
        >
          Recall (true positive rate)
        </text>
      </svg>
      <div className="grid content-start gap-2 text-[13px] text-ink-2">
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2">
          <Score label="AUC" value={nf(area, 3)} />
          <Score label="Recall" value={nf(conf.recall, 2)} />
          <Score label="False pos. rate" value={nf(fpr, 2)} />
        </dl>
        <p>
          The curve is every threshold at once. The dot is the threshold you have set: move it and
          the dot slides along the curve. The dashed diagonal is a model that guesses.
        </p>
      </div>
    </div>
  );
}
