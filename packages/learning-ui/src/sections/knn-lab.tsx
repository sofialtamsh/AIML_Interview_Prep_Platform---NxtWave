/**
 * The KNN lab (WIDGET "knn-lab"): a guided story beside one live picture, then a free sandbox.
 * Students drag the new point and watch every distance, the K nearest neighbours, the vote with
 * its arithmetic, ties, weighted votes, the decision regions and accuracy against K. The lesson
 * supplies the words and the starting data; the maths is in ../knn.ts and follows scikit-learn.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { type PointerEvent as ReactPointerEvent, useId, useMemo, useRef, useState } from 'react';
import {
  accuracyCurve,
  type DatasetName,
  decisionGrid,
  distanceWorking,
  METRIC_FORMULA,
  type Metric,
  makeDataset,
  type Pt,
  predict,
  rankAll,
  type XY,
} from '../knn';
import { Verdict } from './code-sections';
import { linear, pathOf, TryThis } from './explorers';
import {
  ControlStrip,
  LabStage,
  PanelTabs,
  PickRow,
  SliderRow,
  StoryCard,
  useWidth,
} from './lab-kit';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body = Extract<WidgetBody, { widget: 'knn-lab' }>;
type Step = Body['story'][number];
type Level = Step['show'];
type DatasetKey = Body['params']['datasets'][number];

const LEVELS: Level[] = ['points', 'query', 'distances', 'neighbours', 'vote'];
const at = (level: Level, min: Level) => LEVELS.indexOf(level) >= LEVELS.indexOf(min);

const S = 320;
const PAD = { l: 28, r: 8, t: 8, b: 28 };
const sx = linear(0, 10, PAD.l, S - PAD.r);
const sy = linear(0, 10, S - PAD.b, PAD.t);
const UNIT = (S - PAD.l - PAD.r) / 10;

const FILL = ['fill-brand', 'fill-warn', 'fill-ok'] as const;
const STROKE = ['stroke-brand', 'stroke-warn', 'stroke-ok'] as const;
const BAR = ['bg-brand', 'bg-warn', 'bg-ok'] as const;
const TEXT = ['text-brand', 'text-warn', 'text-ok'] as const;

const METRIC_NAME: Record<Metric, string> = {
  euclidean: 'Euclidean',
  manhattan: 'Manhattan',
  minkowski3: 'Minkowski, p = 3',
};
const DATASET_NAME: Record<DatasetKey, string> = {
  custom: 'Small example',
  blobs: 'Three groups',
  moons: 'Two moons',
  circles: 'Circles',
  xor: 'XOR pattern',
};

const n2 = (v: number) => String(+v.toFixed(2));
const n3 = (v: number) => String(+v.toFixed(3));
const pct = (v: number) => `${+(v * 100).toFixed(1)}%`;

/** One training point: a circle, square or triangle by class, so colour is not the only cue. */
function Marker({ p, big, faded }: { p: Pt; big?: boolean; faded?: boolean }) {
  const x = sx(p.x);
  const y = sy(p.y);
  const r = big ? 5.5 : 4.2;
  const cls = cn(FILL[p.cls % 3], 'stroke-surface');
  const common = { className: cls, strokeWidth: 1, opacity: faded ? 0.3 : 1 };
  if (p.cls === 1)
    return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} rx={1.2} {...common} />;
  if (p.cls === 2) {
    return (
      <polygon
        points={`${x},${y - r - 1} ${x + r + 0.8},${y + r} ${x - r - 0.8},${y + r}`}
        {...common}
      />
    );
  }
  return <circle cx={x} cy={y} r={r} {...common} />;
}

/** The edge of the neighbourhood: a circle, a diamond or a rounded square, by metric. */
function ringPath(q: XY, radius: number, metric: Metric) {
  const p = metric === 'manhattan' ? 1 : metric === 'minkowski3' ? 3 : 2;
  const R = radius * UNIT;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= 72; i++) {
    const t = (2 * Math.PI * i) / 72;
    const c = Math.cos(t);
    const s = Math.sin(t);
    pts.push([
      sx(q.x) + R * Math.sign(c) * Math.abs(c) ** (2 / p),
      sy(q.y) - R * Math.sign(s) * Math.abs(s) ** (2 / p),
    ]);
  }
  return `${pathOf(pts)} Z`;
}

export function KnnLab({ body }: { body: Body }) {
  const p = body.params;
  const story = body.story;
  const first = story[0];
  const [step, setStep] = useState(0);
  const [dataset, setDataset] = useState<DatasetKey>(first?.dataset ?? p.defaultDataset);
  const [added, setAdded] = useState<Pt[]>([]);
  const [q, setQ] = useState<XY>(first?.query ?? p.query);
  const [k, setK] = useState(first?.k ?? p.k.default);
  const [metric, setMetric] = useState<Metric>(first?.metric ?? p.defaultMetric);
  const [weighted, setWeighted] = useState(first?.weighted ?? p.weighted);
  const [boundary, setBoundary] = useState(first?.boundary ?? p.boundary);
  const [adding, setAdding] = useState<'off' | '0' | '1' | '2'>('off');
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  // Several labs can share a page, so each needs its own clip-path id.
  const clipId = `knn${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const current = story[step];
  const free = !current;
  const level: Level = current?.show ?? 'vote';

  const base = useMemo(
    () =>
      dataset === 'custom'
        ? { classes: p.classes.length, train: p.points as Pt[], validation: [] as Pt[] }
        : makeDataset(dataset as DatasetName),
    [dataset, p.points, p.classes.length],
  );
  const train = useMemo(() => [...base.train, ...added], [base, added]);
  const names =
    dataset === 'custom' ? p.classes : ['Class A', 'Class B', 'Class C'].slice(0, base.classes);
  const letter = (c: number) => (dataset === 'custom' ? (names[c]?.[0] ?? '?') : 'ABC'[c]);
  const snap = dataset === 'custom' ? 0.5 : 0.1;
  const kMax = Math.min(p.k.max, train.length);
  const kNow = Math.min(k, kMax);

  const ranked = useMemo(() => rankAll(train, q, metric), [train, q, metric]);
  const pred = useMemo(
    () => predict(train, q, kNow, metric, weighted, base.classes),
    [train, q, kNow, metric, weighted, base.classes],
  );
  const showBoundary = boundary && at(level, 'vote');
  const grid = useMemo(
    () => (showBoundary ? decisionGrid(train, kNow, metric, weighted, base.classes, 30) : null),
    [showBoundary, train, kNow, metric, weighted, base.classes],
  );
  const wantsAccuracy =
    p.panels.includes('accuracy') && base.validation.length > 0 && at(level, 'vote');
  const curve = useMemo(
    () =>
      wantsAccuracy
        ? accuracyCurve(
            train,
            base.validation,
            Array.from({ length: kMax }, (_, i) => i + 1),
            metric,
            weighted,
            base.classes,
          )
        : [],
    [wantsAccuracy, train, base, kMax, metric, weighted],
  );

  const goTo = (i: number) => {
    const next = story[i];
    setStep(i);
    if (!next) return;
    // A step states exact numbers, so it must also restore the exact state they were written for:
    // whatever the step does not set goes back to the lab's own starting value.
    setK(next.k ?? p.k.default);
    setWeighted(next.weighted ?? p.weighted);
    setBoundary(next.boundary ?? p.boundary);
    setMetric(next.metric ?? p.defaultMetric);
    setQ(next.query ?? p.query);
    const data = next.dataset ?? p.defaultDataset;
    if (data !== dataset && p.datasets.includes(data)) {
      setDataset(data);
      setAdded([]);
    }
    setAdding('off');
  };
  const reset = () => {
    setAdded([]);
    setQ(current?.query ?? p.query);
    setK(current?.k ?? p.k.default);
    setMetric(current?.metric ?? p.defaultMetric);
    setWeighted(current?.weighted ?? p.weighted);
    setBoundary(current?.boundary ?? p.boundary);
    setAdding('off');
  };

  const toData = (e: ReactPointerEvent): XY | null => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const px = ((e.clientX - box.left) / box.width) * S;
    const py = ((e.clientY - box.top) / box.height) * S;
    const clamp = (v: number) => Math.min(10, Math.max(0, Math.round(v / snap) * snap));
    return {
      x: +clamp(((px - PAD.l) / (S - PAD.l - PAD.r)) * 10).toFixed(2),
      y: +clamp(((S - PAD.b - py) / (S - PAD.t - PAD.b)) * 10).toFixed(2),
    };
  };

  const can = (c: Body['params']['controls'][number]) => {
    if (!p.controls.includes(c)) return false;
    if (c === 'dataset' || c === 'add-points') return free || at(level, 'vote');
    if (c === 'boundary') return at(level, 'vote');
    return at(level, 'neighbours');
  };

  // ── Words for what the picture shows right now ──
  const tally = names
    .map((n, c) => `${pred.counts[c] ?? 0} for ${n}`)
    .filter((_, c) => (pred.counts[c] ?? 0) > 0)
    .join(', ');
  const winner = names[pred.winner] ?? '';
  const says = (() => {
    if (!at(level, 'query')) {
      return `${train.length} labelled points: ${names
        .map((n, c) => `${train.filter((t) => t.cls === c).length} ${n}`)
        .join(', ')}. Storing them is all the training KNN does.`;
    }
    if (!at(level, 'distances')) {
      return `The new point is at (${n2(q.x)}, ${n2(q.y)}). Its class is unknown. Drag it, or use the sliders.`;
    }
    const nearest = ranked[0];
    if (!at(level, 'neighbours')) {
      return `${train.length} distances, one per training point. The closest point is (${n2(nearest?.point.x ?? 0)}, ${n2(nearest?.point.y ?? 0)}), ${n2(nearest?.d ?? 0)} away.`;
    }
    const cut = pred.distanceTie
      ? ' Another point is exactly as far away as the K-th neighbour, with a different class. Which one counts depends on the data order, so scikit-learn may answer differently.'
      : '';
    if (!at(level, 'vote')) {
      return `The ${kNow} nearest ${kNow === 1 ? 'point is' : 'points are'} within ${n2(pred.radius)} of the new point: ${tally}.${cut}`;
    }
    if (pred.exact && !pred.tie) {
      return `The new point sits exactly on a training point, so that point takes the whole weighted vote: **${winner}**.`;
    }
    if (pred.tie && weighted) {
      return `K = ${kNow}, weighted by 1 / distance: a **tie**, ${names
        .map((n, c) => `${n} ${pct(pred.shares[c] ?? 0)}`)
        .join(
          ', ',
        )}. Shown as ${winner}, the first class. With equal weights, scikit-learn’s answer can hang on rounding.${cut}`;
    }
    if (pred.tie) {
      return `K = ${kNow}: a **tie**, ${tally}. scikit-learn would answer ${winner}, only because that class comes first. ${base.classes === 2 ? 'An odd K avoids this with two classes.' : 'With three or more classes, even an odd K can tie.'}${cut}`;
    }
    if (weighted) {
      return `K = ${kNow}, weighted by 1 / distance: ${names
        .map((n, c) => `${n} ${pct(pred.shares[c] ?? 0)}`)
        .join(', ')}. Prediction: **${winner}**.${cut}`;
    }
    return `K = ${kNow}: ${tally}. Prediction: **${winner}**, with ${pct(pred.shares[pred.winner] ?? 0)} of the votes.${cut}`;
  })();

  const showWeights = weighted && at(level, 'vote');
  // The calculation is a table when its panel is wide enough for a whole formula on one line;
  // otherwise each neighbour's working drops to its own line.
  const [calcRef, calcWidth] = useWidth();
  const calcWide = calcWidth >= (showWeights ? 560 : 480);
  const rowStyle = calcWide
    ? {
        gridTemplateColumns: showWeights
          ? '1.25rem 4.75rem 4.5rem minmax(0, 1fr) 7.5rem'
          : '1.25rem 4.75rem 4.5rem minmax(0, 1fr)',
      }
    : undefined;
  const shownRows = at(level, 'neighbours')
    ? ranked.slice(0, Math.min(ranked.length, kNow + 2))
    : ranked.slice(0, Math.min(ranked.length, 8));
  const hidden = ranked.length - shownRows.length;
  const here = curve.find((c) => c.k === kNow);

  // Where the calculation and the accuracy chart are both on offer they share one place, by tab,
  // so the picture, the controls and the working stay in one window.
  const showCalc = p.panels.includes('calculation') && at(level, 'distances');
  const showAccuracy = wantsAccuracy && curve.length > 1;
  const [tab, setTab] = useState<'accuracy' | 'calculation'>(
    story.length > 0 && p.panels.includes('accuracy') ? 'accuracy' : 'calculation',
  );
  const xName = dataset === 'custom' ? p.xLabel : 'Feature 1';
  const yName = dataset === 'custom' ? p.yLabel : 'Feature 2';

  const picture = (
    <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <figure className="rounded-2xl border border-line bg-surface p-2">
        <svg
          ref={svg}
          viewBox={`0 0 ${S} ${S}`}
          className={cn('block h-auto w-full', adding !== 'off' && 'cursor-crosshair')}
          role="img"
          aria-label={says.replaceAll('**', '')}
          onPointerDown={(e) => {
            if (adding === 'off' || added.length >= 25 || Number(adding) >= base.classes) return;
            const at2 = toData(e);
            if (at2) setAdded((a) => [...a, { ...at2, cls: Number(adding) }]);
          }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD.l} y={PAD.t} width={S - PAD.l - PAD.r} height={S - PAD.t - PAD.b} />
            </clipPath>
          </defs>
          {grid?.cls.map((row, r) =>
            row.map((c, col) => {
              const cell = (S - PAD.l - PAD.r) / 30;
              return (
                <rect
                  // biome-ignore lint/suspicious/noArrayIndexKey: grid cells are positional
                  key={`${r}-${col}`}
                  x={PAD.l + col * cell}
                  y={PAD.t + r * cell}
                  width={cell + 0.4}
                  height={cell + 0.4}
                  className={FILL[c % 3]}
                  opacity={grid.tie[r]?.[col] ? 0.07 : 0.18}
                />
              );
            }),
          )}
          {[0, 2, 4, 6, 8, 10].map((t) => (
            <g key={t}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={PAD.t}
                y2={S - PAD.b}
                className="stroke-line"
                strokeWidth={0.6}
              />
              <line
                y1={sy(t)}
                y2={sy(t)}
                x1={PAD.l}
                x2={S - PAD.r}
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
            y={S - 3}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
          >
            {dataset === 'custom' ? p.xLabel : 'Feature 1'}
          </text>
          <text
            x={8}
            y={(PAD.t + S - PAD.b) / 2}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
            transform={`rotate(-90 8 ${(PAD.t + S - PAD.b) / 2})`}
          >
            {dataset === 'custom' ? p.yLabel : 'Feature 2'}
          </text>

          <g clipPath={`url(#${clipId})`}>
            {at(level, 'distances') &&
              !at(level, 'neighbours') &&
              ranked.map((n) => (
                <line
                  key={n.index}
                  x1={sx(q.x)}
                  y1={sy(q.y)}
                  x2={sx(n.point.x)}
                  y2={sy(n.point.y)}
                  className="stroke-muted"
                  strokeWidth={0.7}
                  strokeDasharray="3 3"
                  opacity={0.7}
                />
              ))}
            {at(level, 'neighbours') && (
              <>
                <path
                  d={ringPath(q, pred.radius, metric)}
                  className="fill-none stroke-ink"
                  strokeWidth={1.2}
                  strokeDasharray="5 4"
                  opacity={0.55}
                />
                {pred.nearest.map((n, i) => {
                  const top = Math.max(...pred.weights, 1e-9);
                  const w =
                    weighted && at(level, 'vote') ? 1 + 3.5 * ((pred.weights[i] ?? 0) / top) : 1.8;
                  return (
                    <line
                      key={n.index}
                      x1={sx(q.x)}
                      y1={sy(q.y)}
                      x2={sx(n.point.x)}
                      y2={sy(n.point.y)}
                      className={STROKE[n.point.cls % 3]}
                      strokeWidth={w}
                    />
                  );
                })}
              </>
            )}
          </g>
          {at(level, 'query') && (
            // Keyboard users move the same point with the two sliders beside the picture.
            <g
              style={{ touchAction: 'none', cursor: 'grab' }}
              onPointerDown={(e) => {
                if (adding !== 'off') return;
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = true;
              }}
              onPointerMove={(e) => {
                if (!dragging.current) return;
                const next = toData(e);
                if (next) setQ(next);
              }}
              onPointerUp={() => {
                dragging.current = false;
              }}
              onPointerCancel={() => {
                dragging.current = false;
              }}
            >
              <circle cx={sx(q.x)} cy={sy(q.y)} r={18} className="fill-transparent" />
              <circle
                cx={sx(q.x)}
                cy={sy(q.y)}
                r={10.5}
                strokeWidth={2}
                className={cn(
                  'stroke-ink',
                  at(level, 'vote') && !pred.tie ? FILL[pred.winner % 3] : 'fill-surface',
                )}
              />
            </g>
          )}
          <g style={{ pointerEvents: 'none' }}>
            {train.map((t, i) => {
              const near = at(level, 'neighbours') && pred.nearest.some((n) => n.index === i);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
                <Marker key={i} p={t} big={near} faded={at(level, 'neighbours') && !near} />
              );
            })}
            {at(level, 'neighbours') &&
              pred.nearest.slice(0, 9).map((n) => (
                <text
                  key={n.index}
                  x={sx(n.point.x) + 7}
                  y={sy(n.point.y) - 6}
                  fontSize={8.5}
                  className="fill-ink font-mono font-bold"
                >
                  #{n.rank}
                </text>
              ))}
          </g>
          {at(level, 'query') && (
            <text
              x={sx(q.x)}
              y={sy(q.y) + 4}
              fontSize={11.5}
              textAnchor="middle"
              className={cn(
                'pointer-events-none stroke-surface font-mono font-bold [paint-order:stroke]',
                at(level, 'vote') && !pred.tie ? 'fill-white' : 'fill-ink',
              )}
            >
              {!at(level, 'vote') ? '?' : pred.tie ? '=' : letter(pred.winner)}
            </text>
          )}
        </svg>
        <figcaption className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 px-1 text-[12px] text-muted">
          {names.map((n, c) => (
            <span key={n} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  'size-2.5',
                  BAR[c % 3],
                  c === 0 && 'rounded-full',
                  c === 2 && 'rotate-45',
                )}
                aria-hidden
              />
              {n}
            </span>
          ))}
          {at(level, 'query') && <span>? the new point</span>}
          {at(level, 'neighbours') && <span>dashed edge: the K nearest</span>}
        </figcaption>
      </figure>
      <div aria-live="polite">
        <Verdict compact tone={at(level, 'vote') && pred.tie ? 'bad' : 'info'} text={says} />
      </div>
    </div>
  );

  const anyPick =
    can('weighted') || can('metric') || can('boundary') || can('dataset') || can('add-points');
  const controls =
    at(level, 'query') || can('k') || anyPick ? (
      <ControlStrip>
        {can('k') && kMax > 1 && (
          <SliderRow
            label="K (neighbours)"
            value={kNow}
            min={1}
            max={kMax}
            step={1}
            shown={String(kNow)}
            onChange={setK}
          />
        )}
        {at(level, 'query') && (
          <>
            <p className="text-[12px] leading-snug text-muted">
              The new point <b className="text-ink">?</b>: drag it on the picture, or set it here.
              {!free && ' Each step sets it back.'}
            </p>
            <div
              className="grid gap-x-5 gap-y-2"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(13.5rem, 1fr))' }}
            >
              <SliderRow
                tight
                label={xName}
                value={q.x}
                min={0}
                max={10}
                step={snap}
                shown={n2(q.x)}
                onChange={(x) => setQ({ ...q, x })}
              />
              <SliderRow
                tight
                label={yName}
                value={q.y}
                min={0}
                max={10}
                step={snap}
                shown={n2(q.y)}
                onChange={(y) => setQ({ ...q, y })}
              />
            </div>
          </>
        )}
        {anyPick && (
          <div className="grid gap-2 border-line border-t pt-2">
            {can('weighted') && (
              <PickRow
                label="Each vote"
                options={['plain', 'weighted'] as const}
                value={weighted ? 'weighted' : 'plain'}
                onChange={(v) => setWeighted(v === 'weighted')}
                names={{ plain: 'One vote each', weighted: 'Weighted: 1 / distance' }}
              />
            )}
            {can('metric') && (
              <PickRow
                label="Distance"
                options={p.metrics}
                value={metric}
                onChange={setMetric}
                names={METRIC_NAME}
                // The calculation's own heading shows the formula while that panel is open.
                note={
                  showCalc && (!showAccuracy || tab === 'calculation')
                    ? undefined
                    : METRIC_FORMULA[metric]
                }
              />
            )}
            {can('boundary') && (
              <PickRow
                label="Decision regions"
                options={['off', 'on'] as const}
                value={boundary ? 'on' : 'off'}
                onChange={(v) => setBoundary(v === 'on')}
                names={{ off: 'Hidden', on: 'Shown' }}
              />
            )}
            {can('dataset') && (
              <PickRow
                label="Dataset"
                options={p.datasets}
                value={dataset}
                onChange={(d) => {
                  setDataset(d);
                  setAdded([]);
                  setAdding('off');
                }}
                names={DATASET_NAME}
              />
            )}
            {can('add-points') && (
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <div className="min-w-0 flex-1">
                  <PickRow
                    label="Add a point"
                    options={(['off', '0', '1', '2'] as const).slice(0, base.classes + 1)}
                    value={adding}
                    onChange={setAdding}
                    names={{
                      off: 'Off',
                      '0': names[0] ?? 'A',
                      '1': names[1] ?? 'B',
                      '2': names[2] ?? 'C',
                    }}
                    note={adding === 'off' ? undefined : 'Click the picture to place it.'}
                  />
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-line-2 bg-surface px-2.5 py-1 text-[12.5px] font-semibold text-ink hover:border-brand"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </ControlStrip>
    ) : (
      // Before there is a new point, the numbers behind the dots.
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full border-collapse text-[12.5px] tabular-nums">
          <thead>
            <tr className="border-line border-b bg-surface-2 text-left">
              <th scope="col" className="px-3 py-1.5 font-semibold">
                {xName}
              </th>
              <th scope="col" className="px-3 py-1.5 font-semibold">
                {yName}
              </th>
              <th scope="col" className="px-3 py-1.5 font-semibold">
                Label
              </th>
            </tr>
          </thead>
          <tbody>
            {train.slice(0, 12).map((t, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
              <tr key={i} className="border-line border-b last:border-0">
                <td className="px-3 py-1 font-mono">{n2(t.x)}</td>
                <td className="px-3 py-1 font-mono">{n2(t.y)}</td>
                <td className={cn('px-3 py-1 font-semibold', TEXT[t.cls % 3])}>{names[t.cls]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {train.length > 12 && (
          <p className="border-line border-t px-3 py-1.5 text-[12px] text-muted">
            … and {train.length - 12} more points.
          </p>
        )}
      </div>
    );

  return (
    <LabStage
      prompt={body.prompt}
      story={
        story.length > 0 ? (
          <StoryCard
            steps={story}
            step={step}
            onStep={goTo}
            freeTitle="Your turn"
            freeBody="Every control is open now. Try these, or explore on your own. Continue when you are done."
            tasks={p.tasks}
          />
        ) : (
          <TryThis tasks={p.tasks} />
        )
      }
      picture={picture}
      controls={controls}
      calc={
        <>
          {showCalc && showAccuracy && (
            <PanelTabs
              options={['accuracy', 'calculation'] as const}
              value={tab}
              onChange={setTab}
              names={{ accuracy: 'Accuracy against K', calculation: 'Calculation' }}
            />
          )}
          {at(level, 'vote') && (!showAccuracy || !showCalc || tab === 'calculation') && (
            <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="eyebrow">
                  {weighted ? 'Weighted vote' : 'Majority vote'} · K = {kNow}
                </p>
                <p className="text-[13px] text-muted">
                  Predicted:{' '}
                  <span className={cn('font-bold', pred.tie ? 'text-ink' : TEXT[pred.winner % 3])}>
                    {pred.tie ? `a tie (${winner} by label order)` : winner}
                  </span>
                  {!pred.tie && !weighted && ` · confidence ${pct(pred.shares[pred.winner] ?? 0)}`}
                </p>
              </div>
              <div className="mt-1.5 grid gap-1">
                {names.map((n, c) => (
                  <div
                    key={n}
                    className="grid grid-cols-[minmax(0,6.5rem)_1fr_auto] items-center gap-2 text-[13px]"
                  >
                    <span className="truncate text-ink">{n}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-line">
                      <span
                        className={cn('block h-full rounded-full', BAR[c % 3])}
                        style={{ width: `${(pred.shares[c] ?? 0) * 100}%` }}
                      />
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-ink">
                      {weighted ? pct(pred.shares[c] ?? 0) : `${pred.counts[c] ?? 0} of ${kNow}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {showAccuracy && (!showCalc || tab === 'accuracy') && (
            <AccuracyChart curve={curve} k={kNow} held={base.validation.length} here={here} />
          )}
          {showCalc && (!showAccuracy || tab === 'calculation') && (
            <div ref={calcRef} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="eyebrow">Live calculation, nearest first</p>
                <span className="font-mono text-[12px] text-muted">{METRIC_FORMULA[metric]}</span>
              </div>
              <div
                style={rowStyle}
                className={cn(
                  'mt-2 gap-x-3 border-b border-line pb-1 text-[12.5px] font-medium text-muted',
                  calcWide ? 'grid' : 'hidden',
                )}
              >
                <span>#</span>
                <span>Point</span>
                <span>Class</span>
                <span>Distance to the new point</span>
                {showWeights && <span>Weight = 1 / d</span>}
              </div>
              <ol className="font-mono text-[12.5px]">
                {shownRows.map((n, i) => {
                  const inK = at(level, 'neighbours') && i < kNow;
                  return (
                    <li
                      key={n.index}
                      style={rowStyle}
                      className={cn(
                        'grid items-baseline gap-x-3 gap-y-0.5 border-b border-line py-1',
                        !calcWide && 'grid-cols-[1.5rem_auto_1fr]',
                        at(level, 'neighbours') && !inK && 'text-muted/70',
                      )}
                    >
                      <span className={cn(inK && 'font-bold text-ink')}>{n.rank}</span>
                      <span className="whitespace-nowrap">
                        ({n2(n.point.x)}, {n2(n.point.y)})
                      </span>
                      <span
                        className={cn(
                          'font-sans font-semibold whitespace-nowrap',
                          TEXT[n.point.cls % 3],
                        )}
                      >
                        {names[n.point.cls]}
                      </span>
                      <span className={cn('break-words', !calcWide && 'col-span-3')}>
                        {distanceWorking(q, n.point, metric)}
                      </span>
                      {showWeights && (
                        <span className={calcWide ? 'whitespace-nowrap' : 'col-span-3'}>
                          {!calcWide && <span className="font-sans text-muted">weight: </span>}
                          {inK
                            ? pred.exact
                              ? n.d === 0
                                ? 'exact match: all'
                                : '0'
                              : `1 / ${n3(n.d)} = ${n2(pred.weights[i] ?? 0)}`
                            : 'not counted'}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
              {hidden > 0 && (
                <p className="mt-1.5 text-[12px] text-muted">
                  {at(level, 'neighbours')
                    ? `${kNow === 1 ? 'Row 1 votes' : `Rows 1 to ${kNow} vote`}. ${hidden} more points are farther away and are not counted.`
                    : `… and ${hidden} more: KNN measures the distance to every training point.`}
                </p>
              )}
              {at(level, 'vote') && (
                <p className="mt-2 font-mono text-[12.5px] text-ink">
                  {weighted && pred.exact
                    ? names
                        .map(
                          (nm, c) =>
                            `${nm}: ${(pred.totals[c] ?? 0) > 0 ? 'exact match' : '0'} → ${pct(pred.shares[c] ?? 0)}`,
                        )
                        .join('   ·   ')
                    : weighted
                      ? names
                          .map((n, c) => {
                            const ws = pred.nearest
                              .map((nb, i) =>
                                nb.point.cls === c ? n2(pred.weights[i] ?? 0) : null,
                              )
                              .filter(Boolean);
                            return ws.length
                              ? `${n}: ${ws.length > 1 ? `${ws.join(' + ')} = ` : ''}${n2(pred.totals[c] ?? 0)} → ${pct(pred.shares[c] ?? 0)}`
                              : `${n}: 0`;
                          })
                          .join('   ·   ')
                      : names
                          .map(
                            (n, c) =>
                              `P(${n}) = ${pred.counts[c] ?? 0} / ${kNow} = ${pct((pred.counts[c] ?? 0) / kNow)}`,
                          )
                          .join('   ·   ')}
                </p>
              )}
            </div>
          )}
        </>
      }
    />
  );
}

function AccuracyChart({
  curve,
  k,
  held,
  here,
}: {
  curve: Array<{ k: number; train: number; validation: number }>;
  k: number;
  held: number;
  here?: { train: number; validation: number };
}) {
  const W = 320;
  const H = 150;
  const P = { l: 32, r: 10, t: 10, b: 24 };
  const lowest = Math.min(...curve.flatMap((c) => [c.train, c.validation]));
  const floor = Math.max(0, Math.floor((lowest - 0.05) * 10) / 10);
  const ax = linear(1, Math.max(2, curve[curve.length - 1]?.k ?? 2), P.l, W - P.r);
  const ay = linear(floor, 1, H - P.b, P.t);
  const ticks = [floor, (floor + 1) / 2, 1];
  return (
    <figure className="rounded-2xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="eyebrow">Accuracy against K</p>
        {here && (
          <span className="font-mono text-[12.5px] text-ink">
            K = {k}: training {pct(here.train)} · unseen {pct(here.validation)}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1 block h-auto w-full max-w-[440px]"
        role="img"
        aria-label={`Accuracy for each K. At K = ${k}: training ${here ? pct(here.train) : ''}, unseen points ${here ? pct(here.validation) : ''}.`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={P.l}
              x2={W - P.r}
              y1={ay(t)}
              y2={ay(t)}
              className="stroke-line"
              strokeWidth={0.6}
            />
            <text
              x={P.l - 5}
              y={ay(t) + 3}
              fontSize={8.5}
              textAnchor="end"
              className="fill-muted font-mono"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}
        {curve
          .filter((c) => c.k % 2 === 1)
          .map((c) => (
            <text
              key={c.k}
              x={ax(c.k)}
              y={H - P.b + 11}
              fontSize={8.5}
              textAnchor="middle"
              className="fill-muted font-mono"
            >
              {c.k}
            </text>
          ))}
        <text
          x={(P.l + W - P.r) / 2}
          y={H - 2}
          fontSize={9}
          textAnchor="middle"
          className="fill-muted"
        >
          K
        </text>
        <line
          x1={ax(k)}
          x2={ax(k)}
          y1={P.t}
          y2={H - P.b}
          className="stroke-ink"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <path
          d={pathOf(curve.map((c) => [ax(c.k), ay(c.train)]))}
          className="fill-none stroke-muted"
          strokeWidth={1.6}
          strokeDasharray="4 3"
        />
        <path
          d={pathOf(curve.map((c) => [ax(c.k), ay(c.validation)]))}
          className="fill-none stroke-brand"
          strokeWidth={2}
        />
        {curve.map((c) => (
          <circle
            key={c.k}
            cx={ax(c.k)}
            cy={ay(c.validation)}
            r={c.k === k ? 3.6 : 2}
            className="fill-brand"
          />
        ))}
      </svg>
      <figcaption className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-brand" aria-hidden /> unseen points ({held} held out)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0 w-4 border-t-2 border-dashed border-muted" aria-hidden /> the
          training points themselves
        </span>
      </figcaption>
    </figure>
  );
}
