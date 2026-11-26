/**
 * Interactive explorers (WIDGET sections): students change a setting and watch real training,
 * optimizers and activations respond. The lesson only fills in the presets; the maths is in
 * ../explorers.ts. Each explorer pairs its picture with a short "Try this" practice list.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { Check } from 'lucide-react';
import { type ReactNode, useId, useMemo, useState } from 'react';
import {
  type ActivationName,
  activation,
  bestEpoch,
  type OptimizerName,
  optimizerPath,
  predictAt,
  trainingData,
  trainPolynomial,
  truth,
  VALLEY_START,
  valleyLoss,
} from '../explorers';
import { Rich } from '../rich';
import { Verdict } from './code-sections';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body<W extends WidgetBody['widget']> = Extract<WidgetBody, { widget: W }>;

// ───────────── Shared controls ─────────────

export const fmt = (v: number) =>
  Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : String(+v.toFixed(3));

export function Choices({
  label,
  options,
  value,
  onChange,
  render = fmt,
}: {
  label: string;
  options: number[];
  value: number;
  onChange: (v: number) => void;
  render?: (v: number) => string;
}) {
  if (options.length < 2) return null;
  return (
    <fieldset className="grid min-w-0 gap-1.5">
      <legend className="eyebrow mb-1.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className={cn(
              'rounded-lg border px-2.5 py-1 font-mono text-[12.5px] font-semibold transition-colors',
              o === value
                ? 'border-brand bg-brand text-white'
                : 'border-line-2 bg-surface text-ink hover:border-brand',
            )}
          >
            {render(o)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function NumSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  shown,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  shown?: string;
}) {
  const id = useId();
  return (
    <div className="grid min-w-0 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
        <span className="font-mono text-[14px] font-bold text-ink">{shown ?? fmt(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
      />
    </div>
  );
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-4 rounded-2xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

export function TryThis({ tasks }: { tasks: string[] }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  if (tasks.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="eyebrow">Try this</p>
      <ul className="mt-2 grid gap-2">
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
                className="flex w-full items-start gap-2.5 text-left text-[14px]"
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
    </div>
  );
}

// ───────────── Small SVG chart helpers ─────────────

/**
 * An explorer's chart: as wide as its card, but never so tall that the controls above it and
 * the reading below it are pushed out of a short window (a laptop browser that is not full
 * screen). There the picture shrinks to fit and stays centred; in a tall window it is unchanged.
 */
export const CHART = 'mx-auto block h-auto max-h-[max(11rem,calc(100svh-21rem))] w-full';

const W = 320;
const H = 190;
const PAD = { l: 34, r: 10, t: 12, b: 26 };
type Scale = (v: number) => number;

export function linear(d0: number, d1: number, r0: number, r1: number): Scale {
  return (v) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

export function pathOf(points: Array<[number, number]>) {
  return points
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
}

const clampY = (y: number) => Math.min(H - PAD.b + 6, Math.max(PAD.t - 6, y));

// ───────────── Training explorer ─────────────

export function TrainingExplorer({ body }: { body: Body<'training-explorer'> }) {
  const p = body.params;
  const [degree, setDegree] = useState(p.degree.default);
  const [lr, setLr] = useState(p.learningRate.default);
  const [l2, setL2] = useState(p.l2.default);
  const [epochs, setEpochs] = useState(p.epochs.default);
  const data = useMemo(() => trainingData(p.seed, p.points, p.noise), [p.seed, p.points, p.noise]);
  const run = useMemo(
    () => trainPolynomial(data, { degree, learningRate: lr, l2, epochs: p.epochs.max }),
    [data, degree, lr, l2, p.epochs.max],
  );
  const shown = Math.min(epochs, run.train.length);
  const best = shown > 0 ? bestEpoch(run, shown) : 0;

  // Epochs on a log scale: the quick early fit and the slow overfit both stay visible.
  const lx = linear(0, Math.log10(p.epochs.max), PAD.l, W - PAD.r);
  const ex = (e: number) => lx(Math.log10(Math.max(1, e)));
  const firstLoss = Math.max(run.train[0] ?? 1, run.val[0] ?? 1);
  const yMax = Math.min(1.5, Math.max(0.6, firstLoss * 1.1));
  const ly = linear(0, yMax, H - PAD.b, PAD.t);
  const curve = (series: number[]) =>
    pathOf(series.slice(0, shown).map((v, i) => [ex(i + 1), clampY(ly(v))]));
  const trainNow = run.train[shown - 1];
  const valNow = run.val[shown - 1];
  const valBest = run.val[best - 1];

  // The fit over the data.
  const fx = linear(-1, 1, PAD.l, W - PAD.r);
  const fy = linear(-2, 2, H - PAD.b, PAD.t);
  const xs = Array.from({ length: 121 }, (_, i) => -1 + i / 60);
  // After a divergence the weights are huge: say so instead of drawing a clipped mess.
  const blownUp = run.divergedAt !== null && epochs >= run.divergedAt;
  const fitPath =
    shown > 0 && !blownUp
      ? pathOf(xs.map((x) => [fx(x), clampY(fy(predictAt(run, shown, x)))]))
      : '';
  const truthPath = pathOf(xs.map((x) => [fx(x), fy(truth(x))]));

  const overfitting =
    !run.divergedAt &&
    valNow !== undefined &&
    valBest !== undefined &&
    shown > best * 1.5 &&
    valNow > valBest * 1.3;
  const underfit = !run.divergedAt && trainNow !== undefined && trainNow > 0.2 && shown >= 100;
  const verdict = run.divergedAt
    ? {
        tone: 'bad' as const,
        text: `Training **diverged** at epoch ${run.divergedAt}: each step overshot the bottom and the loss blew up. Lower the learning rate.`,
      }
    : overfitting
      ? {
          tone: 'bad' as const,
          text: `**Overfitting.** Training loss keeps falling, but validation loss rose from ${fmt(valBest as number)} at epoch ${best} to ${fmt(valNow as number)}. Stop at epoch ${best}, use a simpler model or add L2.`,
        }
      : underfit
        ? {
            tone: 'info' as const,
            text: '**Underfitting.** Both losses stay high: the model is too simple for the pattern. Try a higher degree.',
          }
        : {
            tone: 'ok' as const,
            text: `Epoch ${shown}: training loss ${fmt(trainNow ?? 0)}, validation loss ${fmt(valNow ?? 0)}. The best validation loss so far is at epoch ${best}.`,
          };
  const ticks = [1, 10, 100, 1000, 10000].filter((t) => t <= p.epochs.max);

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Choices
          label="Model degree"
          options={p.degree.options}
          value={degree}
          onChange={setDegree}
          render={(v) => `degree ${v}`}
        />
        <Choices
          label="Learning rate"
          options={p.learningRate.options}
          value={lr}
          onChange={setLr}
        />
        <Choices label="L2 penalty" options={p.l2.options} value={l2} onChange={setL2} />
        <NumSlider
          label="Epochs"
          // 1,000 slider positions on a log scale, so the last one is exactly the maximum.
          value={Math.round((Math.log10(Math.max(1, epochs)) / Math.log10(p.epochs.max)) * 1000)}
          min={0}
          max={1000}
          step={1}
          shown={String(epochs)}
          onChange={(v) =>
            setEpochs(Math.max(1, Math.round(10 ** ((v / 1000) * Math.log10(p.epochs.max)))))
          }
        />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <figure className="rounded-2xl border border-line bg-surface p-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={CHART}
            role="img"
            aria-label="Training and validation loss by epoch"
          >
            <line
              x1={PAD.l}
              y1={H - PAD.b}
              x2={W - PAD.r}
              y2={H - PAD.b}
              className="stroke-line-2"
            />
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} className="stroke-line-2" />
            {ticks.map((t) => (
              <text
                key={t}
                x={ex(t)}
                y={H - 8}
                fontSize={9}
                textAnchor="middle"
                className="fill-muted font-mono"
              >
                {t >= 1000 ? `${t / 1000}k` : t}
              </text>
            ))}
            <text
              x={PAD.l - 4}
              y={PAD.t + 4}
              fontSize={9}
              textAnchor="end"
              className="fill-muted font-mono"
            >
              {fmt(yMax)}
            </text>
            <text
              x={PAD.l - 4}
              y={H - PAD.b}
              fontSize={9}
              textAnchor="end"
              className="fill-muted font-mono"
            >
              0
            </text>
            {overfitting && (
              <rect
                x={ex(best)}
                y={PAD.t}
                width={Math.max(0, ex(shown) - ex(best))}
                height={H - PAD.b - PAD.t}
                className="fill-bad/10"
              />
            )}
            <path d={curve(run.train)} fill="none" strokeWidth={2.5} className="stroke-g0" />
            <path d={curve(run.val)} fill="none" strokeWidth={2.5} className="stroke-g1" />
            {best > 0 && valBest !== undefined && !run.divergedAt && (
              <g>
                <line
                  x1={ex(best)}
                  y1={PAD.t}
                  x2={ex(best)}
                  y2={H - PAD.b}
                  strokeDasharray="4 3"
                  className="stroke-ok"
                />
                <circle cx={ex(best)} cy={clampY(ly(valBest))} r={4.5} className="fill-ok" />
              </g>
            )}
          </svg>
          <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-4 rounded bg-g0" aria-hidden /> training loss
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1 w-4 rounded bg-g1" aria-hidden /> validation loss
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ok" aria-hidden /> best validation
            </span>
            <span>epochs on a log scale</span>
          </figcaption>
        </figure>

        <figure className="rounded-2xl border border-line bg-surface p-3">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className={CHART}
            role="img"
            aria-label={`The model after epoch ${shown}, drawn over the data`}
          >
            <line x1={PAD.l} y1={fy(0)} x2={W - PAD.r} y2={fy(0)} className="stroke-line" />
            <path
              d={truthPath}
              fill="none"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              className="stroke-muted"
            />
            {data.xVal.map((x, i) => (
              <circle
                key={`v${x}`}
                cx={fx(x)}
                cy={clampY(fy(data.yVal[i] as number))}
                r={2}
                className="fill-g1"
                opacity={0.55}
              />
            ))}
            {data.xTrain.map((x, i) => (
              <circle
                key={`t${x}`}
                cx={fx(x)}
                cy={clampY(fy(data.yTrain[i] as number))}
                r={3.5}
                className="fill-g0"
              />
            ))}
            {fitPath && <path d={fitPath} fill="none" strokeWidth={2.5} className="stroke-ink" />}
            {blownUp && (
              <text
                x={W / 2}
                y={PAD.t + 14}
                fontSize={11}
                textAnchor="middle"
                className="fill-bad font-semibold"
              >
                {`The model blew up at epoch ${run.divergedAt}`}
              </text>
            )}
          </svg>
          <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-g0" aria-hidden /> training points
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-g1 opacity-60" aria-hidden /> validation
              points
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-ink" aria-hidden /> the model
            </span>
            <span>dashed: the true pattern</span>
          </figcaption>
        </figure>
      </div>

      <div aria-live="polite">
        <Verdict tone={verdict.tone} text={verdict.text} />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Optimizer race ─────────────

const RACE: Record<OptimizerName, { label: string; stroke: string; fill: string }> = {
  sgd: { label: 'SGD', stroke: 'stroke-g0', fill: 'fill-g0' },
  momentum: { label: 'Momentum', stroke: 'stroke-g1', fill: 'fill-g1' },
  adam: { label: 'Adam', stroke: 'stroke-g2', fill: 'fill-g2' },
};

export function OptimizerRace({ body }: { body: Body<'optimizer-race'> }) {
  const p = body.params;
  const [lr, setLr] = useState(p.learningRate.default);
  const [beta, setBeta] = useState(p.momentum.default);
  const [steps, setSteps] = useState(p.steps.default);
  const [noisy, setNoisy] = useState(false);
  const paths = useMemo(
    () =>
      p.optimizers.map((name) => ({
        name,
        path: optimizerPath(name, {
          learningRate: lr,
          momentum: beta,
          steps,
          noise: noisy ? 0.4 : 0,
        }),
      })),
    [p.optimizers, lr, beta, steps, noisy],
  );

  const sx = linear(-10.5, 4.5, PAD.l - 24, W - PAD.r);
  const sy = linear(-2.4, 2.4, H - PAD.b + 14, PAD.t);
  const inside = ([x, y]: [number, number]) => Math.abs(x) < 50 && Math.abs(y) < 50;
  const levels = [0.05, 0.3, 1, 2.5, 5];
  const final = paths.map(({ name, path }) => {
    const last = path.at(-1) as [number, number];
    const blown = !inside(last);
    return { name, loss: blown ? Number.POSITIVE_INFINITY : valleyLoss(last[0], last[1]), blown };
  });
  const winner = final.filter((f) => !f.blown).sort((a, b) => a.loss - b.loss)[0];

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Choices
          label="Learning rate"
          options={p.learningRate.options}
          value={lr}
          onChange={setLr}
        />
        {p.optimizers.includes('momentum') && (
          <Choices
            label="Momentum β"
            options={p.momentum.options}
            value={beta}
            onChange={setBeta}
          />
        )}
        <NumSlider
          label="Steps"
          value={steps}
          min={1}
          max={p.steps.max}
          step={1}
          onChange={setSteps}
        />
        {p.allowNoise && (
          <label className="flex items-center gap-2 self-end text-[14px]">
            <input
              type="checkbox"
              checked={noisy}
              onChange={(e) => setNoisy(e.target.checked)}
              className="size-4 accent-[var(--brand)]"
            />
            Mini-batch noise in every gradient
          </label>
        )}
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label="Optimizer paths across a narrow valley"
        >
          {levels.map((c) => (
            <ellipse
              key={c}
              cx={sx(0)}
              cy={sy(0)}
              rx={sx(Math.sqrt(20 * c)) - sx(0)}
              ry={sy(0) - sy(Math.sqrt(c))}
              fill="none"
              strokeWidth={1}
              className="stroke-line-2"
            />
          ))}
          <text x={sx(0)} y={sy(0) + 4} fontSize={12} textAnchor="middle" className="fill-ok">
            ★
          </text>
          {paths.map(({ name, path }) => {
            const steps = path
              .map((pt, step) => ({ pt, step }))
              .filter(({ pt }) => inside(pt))
              .map(({ pt: [x, y], step }) => ({ x: sx(x), y: clampY(sy(y)), step }));
            const lastStep = steps.at(-1)?.step;
            return (
              <g key={name}>
                <path
                  d={pathOf(steps.map((s) => [s.x, s.y]))}
                  fill="none"
                  strokeWidth={2}
                  className={RACE[name].stroke}
                />
                {steps.map((s) => (
                  <circle
                    key={`${name}-${s.step}`}
                    cx={s.x}
                    cy={s.y}
                    r={s.step === lastStep ? 3.6 : 1.6}
                    className={RACE[name].fill}
                  />
                ))}
              </g>
            );
          })}
          <circle cx={sx(VALLEY_START[0])} cy={sy(VALLEY_START[1])} r={4} className="fill-ink" />
          <text
            x={sx(VALLEY_START[0])}
            y={sy(VALLEY_START[1]) - 8}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
          >
            start
          </text>
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {final.map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1.5">
              <span
                className={cn('h-1 w-4 rounded', RACE[f.name].fill.replace('fill-', 'bg-'))}
                aria-hidden
              />
              {RACE[f.name].label}: {f.blown ? 'diverged' : `loss ${fmt(f.loss)}`}
            </span>
          ))}
          <span>★ is the lowest point</span>
        </figcaption>
      </figure>

      <div aria-live="polite">
        <Verdict
          tone={final.some((f) => f.blown) ? 'bad' : 'info'}
          text={
            final.some((f) => f.blown)
              ? `${final
                  .filter((f) => f.blown)
                  .map((f) => RACE[f.name].label)
                  .join(
                    ' and ',
                  )} diverged: at this learning rate each step overshoots across the steep side of the valley.`
              : `After ${steps} steps, ${winner ? RACE[winner.name].label : 'none'} is closest to the bottom.`
          }
        />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Activation explorer ─────────────

const ACT_LABEL: Record<ActivationName, string> = {
  sigmoid: 'Sigmoid',
  tanh: 'Tanh',
  relu: 'ReLU',
  'leaky-relu': 'Leaky ReLU',
};
const ACT_RANGE: Record<ActivationName, [number, number]> = {
  sigmoid: [-0.2, 1.2],
  tanh: [-1.2, 1.2],
  relu: [-1.5, 5],
  'leaky-relu': [-1.5, 5],
};

export function ActivationExplorer({ body }: { body: Body<'activation-explorer'> }) {
  const p = body.params;
  const [fn, setFn] = useState<ActivationName>(p.default);
  const [w, setW] = useState(1);
  const [b, setB] = useState(0);
  const [x, setX] = useState(1);
  const [leak, setLeak] = useState(0.1);
  const [lo, hi] = ACT_RANGE[fn];
  const ax = linear(-5, 5, PAD.l, W - PAD.r);
  const ay = linear(lo, hi, H - PAD.b, PAD.t);
  const xs = Array.from({ length: 201 }, (_, i) => -5 + i / 20);
  const at = (v: number) => activation(fn, w * v + b, leak);
  const out = pathOf(xs.map((v) => [ax(v), clampY(ay(at(v).a))]));
  const slope = pathOf(xs.map((v) => [ax(v), clampY(ay(at(v).slope))]));
  // Where the slope is almost zero, gradients vanish: shade those stretches.
  const flat: Array<[number, number]> = [];
  let open: number | null = null;
  for (const v of xs) {
    const isFlat = at(v).slope < 0.05;
    if (isFlat && open === null) open = v;
    if (!isFlat && open !== null) {
      flat.push([open, v]);
      open = null;
    }
  }
  if (open !== null) flat.push([open, 5]);
  const z = w * x + b;
  const now = activation(fn, z, leak);
  const fnIndex = (p.functions as ActivationName[]).indexOf(fn);

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Choices
          label="Activation"
          options={(p.functions as ActivationName[]).map((_, i) => i)}
          value={fnIndex}
          onChange={(i) => setFn((p.functions as ActivationName[])[i] as ActivationName)}
          render={(i) => ACT_LABEL[(p.functions as ActivationName[])[i] as ActivationName]}
        />
        <NumSlider label="Input x" value={x} min={-5} max={5} step={0.1} onChange={setX} />
        <NumSlider label="Weight w" value={w} min={-3} max={3} step={0.1} onChange={setW} />
        <NumSlider label="Bias b" value={b} min={-3} max={3} step={0.1} onChange={setB} />
        {fn === 'leaky-relu' && (
          <NumSlider
            label="Leak for negatives"
            value={leak}
            min={0.01}
            max={0.3}
            step={0.01}
            onChange={setLeak}
          />
        )}
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label={`${ACT_LABEL[fn]} of w times x plus b`}
        >
          {p.showSlope &&
            flat.map(([a, c]) => (
              <rect
                key={a}
                x={ax(a)}
                y={PAD.t}
                width={ax(c) - ax(a)}
                height={H - PAD.b - PAD.t}
                className="fill-warn/10"
              />
            ))}
          <line x1={PAD.l} y1={ay(0)} x2={W - PAD.r} y2={ay(0)} className="stroke-line-2" />
          <line x1={ax(0)} y1={PAD.t} x2={ax(0)} y2={H - PAD.b} className="stroke-line-2" />
          {p.showSlope && (
            <path
              d={slope}
              fill="none"
              strokeWidth={1.75}
              strokeDasharray="5 4"
              className="stroke-g1"
            />
          )}
          <path d={out} fill="none" strokeWidth={2.75} className="stroke-g0" />
          <line
            x1={ax(x)}
            y1={PAD.t}
            x2={ax(x)}
            y2={H - PAD.b}
            strokeDasharray="2 3"
            className="stroke-muted"
          />
          <circle cx={ax(x)} cy={clampY(ay(now.a))} r={4.5} className="fill-ink" />
          {[-5, 0, 5].map((t) => (
            <text
              key={t}
              x={ax(t)}
              y={H - 8}
              fontSize={9}
              textAnchor="middle"
              className="fill-muted font-mono"
            >
              {t}
            </text>
          ))}
          {[...new Set([0, 1, Math.ceil(lo), Math.floor(hi)])]
            .filter((t) => t >= lo && t <= hi)
            .map((t) => (
              <text
                key={`y${t}`}
                x={PAD.l - 6}
                y={ay(t) + 3}
                fontSize={9}
                textAnchor="end"
                className="fill-muted font-mono"
              >
                {t}
              </text>
            ))}
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-4 rounded bg-g0" aria-hidden /> output a(w·x + b)
          </span>
          {p.showSlope && (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-g1" aria-hidden /> slope a′(z)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-[3px] bg-warn/20" aria-hidden /> slope almost 0
              </span>
            </>
          )}
        </figcaption>
      </figure>

      <div aria-live="polite">
        <Verdict
          tone={now.slope < 0.05 ? 'bad' : 'info'}
          text={`z = w·x + b = ${fmt(z)}. Output ${fmt(now.a)}, slope ${fmt(now.slope)}.${
            now.slope < 0.05
              ? ' The slope is almost zero here, so almost no gradient flows back: learning stalls.'
              : ''
          }`}
        />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}
