/**
 * Data-preparation and statistics explorers (WIDGET sections): flag and treat outliers, fill
 * missing values, scale features for a nearest-neighbour model, and read a p-value. The lesson only
 * fills in the data and presets; the maths is in ../data-explorers.ts and follows pandas, NumPy,
 * scikit-learn and scipy defaults, so the numbers match the code students run.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { useId, useMemo, useState } from 'react';
import {
  asExtreme,
  type FillStrategy,
  impute,
  isOutside,
  nearestNeighbours,
  nullDistribution,
  type OutlierMethod,
  type OutlierTreatment,
  outlierFences,
  type ScalerName,
  type Summary,
  summarize,
  treatOutliers,
  twoSidedPValue,
} from '../data-explorers';
import { Rich } from '../rich';
import { Verdict } from './code-sections';
import { CHART, Choices, fmt, linear, NumSlider, Panel, pathOf, TryThis } from './explorers';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body<W extends WidgetBody['widget']> = Extract<WidgetBody, { widget: W }>;

const W = 320;

/** A row of buttons for named options (the numeric `Choices` works on numbers). */
export function Pick<T extends string>({
  label,
  options,
  value,
  onChange,
  names,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  names: Record<T, string>;
}) {
  if (options.length < 2) return null;
  return (
    <fieldset className="grid min-w-0 content-start gap-1.5">
      <legend className="eyebrow mb-1.5">{label}</legend>
      <div className="flex flex-wrap items-start gap-1.5">
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
    </fieldset>
  );
}

/** Before/after summary numbers side by side. */
function StatsTable({
  columns,
}: {
  columns: Array<{ title: string; s: Summary; count?: string }>;
}) {
  const rows: Array<[string, (s: Summary) => string]> = [
    ['Mean', (s) => fmt(s.mean)],
    ['Median', (s) => fmt(s.median)],
    ['Std dev', (s) => (Number.isFinite(s.std) ? fmt(s.std) : '–')],
  ];
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-left text-muted">
          <th className="py-1 pr-2 font-medium" />
          {columns.map((c) => (
            <th key={c.title} className="py-1 pr-2 text-right font-medium">
              {c.title}
              <span className="block text-[11.5px]">{c.count ?? `${c.s.n} values`}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="font-mono">
        {rows.map(([name, get]) => (
          <tr key={name} className="border-t border-line">
            <td className="py-1 pr-2 font-sans text-muted">{name}</td>
            {columns.map((c) => (
              <td key={c.title} className="py-1 pr-2 text-right font-semibold text-ink">
                {get(c.s)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** About five round tick values covering [lo, hi]. */
function ticks(lo: number, hi: number, count = 5): number[] {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(+t.toFixed(6));
  return out;
}

/** Dots on a number line, stacked upwards where they would overlap. */
function stack(xs: number[], gap = 7): number[] {
  const levels: number[] = [];
  const placed: Array<[number, number]> = [];
  for (const x of xs) {
    let level = 0;
    while (placed.some(([px, l]) => l === level && Math.abs(px - x) < gap)) level++;
    placed.push([x, level]);
    levels.push(level);
  }
  return levels;
}

// ───────────── Outlier explorer ─────────────

const METHOD_NAME: Record<OutlierMethod, string> = { iqr: 'IQR rule', zscore: 'Z-score' };
const TREATMENT_NAME: Record<OutlierTreatment, string> = {
  keep: 'Keep',
  remove: 'Remove',
  cap: 'Cap at the fences',
};

export function OutlierExplorer({ body }: { body: Body<'outlier-explorer'> }) {
  const p = body.params;
  const clipId = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [method, setMethod] = useState<OutlierMethod>(p.defaultMethod);
  const [k, setK] = useState(p.iqrK.default);
  const [z, setZ] = useState(p.zThreshold.default);
  const [treatment, setTreatment] = useState<OutlierTreatment>(
    p.treatments.includes('keep') ? 'keep' : (p.treatments[0] as OutlierTreatment),
  );
  const [extra, setExtra] = useState(p.extra?.default ?? 0);

  const values = p.extra ? [...p.values, extra] : [...p.values];
  const fences = outlierFences(values, method, method === 'iqr' ? k : z);
  const before = summarize(values);
  const treated = treatOutliers(values, fences, treatment);
  const after = summarize(treated);
  const outside = values.filter((v) => isOutside(v, fences));
  const showAfter = treatment !== 'keep';

  // A fixed axis, so dragging the extra value moves the dot, not the scale.
  const all = [...p.values, ...(p.extra ? [p.extra.min, p.extra.max] : [])];
  const span = Math.max(...all) - Math.min(...all) || 1;
  const lo = Math.min(...all) - span * 0.04;
  const hi = Math.max(...all) + span * 0.04;
  const PADL = 44;
  const PADR = 12;
  const ax = linear(lo, hi, PADL, W - PADR);
  // Rows: the box on top, then the data, then (after a treatment) the treated data, then the axis.
  const rowBefore = 112;
  const rowAfter = 196;
  const H = showAfter ? 226 : 142;
  const axisY = showAfter ? 206 : 122;
  const inRange = (v: number) => v >= lo && v <= hi;

  const strip = (vals: number[], baseline: number, capped: boolean[]) => {
    const order = vals.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
    const levels = stack(
      order.map(([v]) => ax(v)),
      5.6,
    );
    return order.map(([v, i], j) => {
      const cx = ax(v);
      const cy = baseline - (levels[j] ?? 0) * 5.6;
      const bad = !capped[i] && isOutside(v, fences);
      return (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={2.6}
          strokeWidth={capped[i] ? 1.5 : 0}
          className={cn(capped[i] ? 'fill-surface stroke-bad' : bad ? 'fill-bad' : 'fill-g0')}
        />
      );
    });
  };
  const marker = (v: number, top: number, bottom: number, kind: 'mean' | 'median') =>
    inRange(v) && (
      <line
        x1={ax(v)}
        x2={ax(v)}
        y1={top}
        y2={bottom}
        strokeWidth={1.75}
        strokeDasharray={kind === 'mean' ? '4 3' : undefined}
        className={kind === 'mean' ? 'stroke-g1' : 'stroke-g2'}
      />
    );
  const cappedFlags = values.map((v) => treatment === 'cap' && isOutside(v, fences));
  const fenceText =
    method === 'iqr'
      ? `Q1 − ${fmt(k)}×IQR and Q3 + ${fmt(k)}×IQR`
      : `mean ± ${fmt(z)} standard deviations`;
  const change =
    treatment === 'keep'
      ? `The mean is ${fmt(before.mean)} and the median ${fmt(before.median)}.`
      : `${treatment === 'remove' ? 'Removing' : 'Capping'} them moves the mean from ${fmt(
          before.mean,
        )} to ${fmt(after.mean)}. ${
          Math.abs(after.median - before.median) < 1e-9
            ? `The median stays at ${fmt(before.median)}.`
            : `The median moves from ${fmt(before.median)} to ${fmt(after.median)}.`
        }`;

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Pick
          label="Detect with"
          options={p.methods}
          value={method}
          onChange={setMethod}
          names={METHOD_NAME}
        />
        {method === 'iqr' ? (
          <Choices label="k (times the IQR)" options={p.iqrK.options} value={k} onChange={setK} />
        ) : (
          <Choices label="Threshold |z|" options={p.zThreshold.options} value={z} onChange={setZ} />
        )}
        <Pick
          label="Then"
          options={p.treatments}
          value={treatment}
          onChange={setTreatment}
          names={TREATMENT_NAME}
        />
        {p.extra && (
          <NumSlider
            label={p.extra.label}
            value={extra}
            min={p.extra.min}
            max={p.extra.max}
            step={p.extra.step}
            onChange={setExtra}
          />
        )}
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label={`${p.label}: ${outside.length} of ${values.length} values outside the fences`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PADL} y={0} width={W - PADL - PADR} height={H} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <rect
              x={ax(fences.lo)}
              y={14}
              width={Math.max(0, ax(fences.hi) - ax(fences.lo))}
              height={axisY - 14}
              className="fill-ok/10"
            />
            {[fences.lo, fences.hi].map((f) => (
              <line
                key={f}
                x1={ax(f)}
                x2={ax(f)}
                y1={14}
                y2={axisY}
                strokeDasharray="5 4"
                strokeWidth={1.5}
                className="stroke-bad"
              />
            ))}
          </g>
          {/* The box: the middle half of the data, with the median. */}
          <rect
            x={ax(before.q1)}
            y={18}
            width={Math.max(1, ax(before.q3) - ax(before.q1))}
            height={16}
            rx={3}
            strokeWidth={1.5}
            className="fill-brand-soft stroke-brand"
          />
          <line
            x1={ax(before.median)}
            x2={ax(before.median)}
            y1={18}
            y2={34}
            strokeWidth={2}
            className="stroke-g2"
          />
          <text x={PADL - 6} y={30} fontSize={9} textAnchor="end" className="fill-muted">
            box
          </text>
          <text x={PADL - 6} y={rowBefore - 2} fontSize={9} textAnchor="end" className="fill-muted">
            data
          </text>
          {marker(before.mean, 40, rowBefore + 5, 'mean')}
          {marker(before.median, 40, rowBefore + 5, 'median')}
          {strip(
            values,
            rowBefore,
            values.map(() => false),
          )}
          {showAfter && (
            <>
              <text
                x={PADL - 6}
                y={rowAfter - 2}
                fontSize={9}
                textAnchor="end"
                className="fill-muted"
              >
                after
              </text>
              {marker(after.mean, rowAfter - 66, rowAfter + 5, 'mean')}
              {marker(after.median, rowAfter - 66, rowAfter + 5, 'median')}
              {treatment === 'cap'
                ? strip(treated, rowAfter, cappedFlags)
                : strip(
                    treated,
                    rowAfter,
                    treated.map(() => false),
                  )}
            </>
          )}
          <line x1={PADL} x2={W - PADR} y1={axisY} y2={axisY} className="stroke-line-2" />
          {ticks(lo, hi, 8).map((t) => (
            <text
              key={t}
              x={ax(t)}
              y={axisY + 12}
              fontSize={9}
              textAnchor="middle"
              className="fill-muted font-mono"
            >
              {fmt(t)}
            </text>
          ))}
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>{p.label}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-bad" aria-hidden /> outside the fences
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-g1" aria-hidden /> mean
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-g2" aria-hidden /> median
          </span>
        </figcaption>
      </figure>

      <div className="grid gap-3 sm:grid-cols-2">
        <div aria-live="polite">
          <Verdict
            tone="info"
            text={`${METHOD_NAME[method]}: the fences are ${fmt(fences.lo)} and ${fmt(
              fences.hi,
            )} (${fenceText}). Values outside them: ${outside.length} of ${values.length}. ${change}`}
          />
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-2">
          <StatsTable
            columns={[
              { title: 'Before', s: before },
              ...(showAfter
                ? [{ title: treatment === 'cap' ? 'Capped' : 'Removed', s: after }]
                : []),
            ]}
          />
        </div>
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Imputation explorer ─────────────

const FILL_NAME: Record<FillStrategy, string> = {
  drop: 'Drop rows',
  mean: 'Mean',
  median: 'Median',
  mode: 'Mode',
  ffill: 'Forward fill',
  bfill: 'Backward fill',
  interpolate: 'Interpolate',
};

export function ImputationExplorer({ body }: { body: Body<'imputation-explorer'> }) {
  const p = body.params;
  const [di, setDi] = useState(0);
  const [strategy, setStrategy] = useState<FillStrategy>(p.defaultStrategy);
  const d = p.datasets[di] ?? p.datasets[0];
  const values = d?.values ?? [];
  const r = impute(values, strategy);
  const known = values.filter((v): v is number => v !== null);
  const ks = summarize(known);
  const as = summarize(r.usable);
  const gaps = values.length - known.length;

  const PADL = 34;
  const PADR = 12;
  const H = 188;
  const top = 14;
  const bottom = 156;
  const span = ks.max - ks.min || 1;
  const ylo = ks.min - span * 0.08;
  const yhi = ks.max + span * 0.08;
  const ax = linear(0, values.length - 1, PADL + 8, W - PADR - 8);
  const ay = linear(ylo, yhi, bottom, top);
  const line = d?.ordered
    ? pathOf(r.values.flatMap((v, i) => (v === null ? [] : [[ax(i), ay(v)] as [number, number]])))
    : '';
  const filledSet = new Set(r.filled);
  const xEvery = values.length <= 15 ? 1 : 5;

  let text: string;
  if (strategy === 'drop') {
    text = `Dropped ${r.missing.length} of ${values.length} rows (${Math.round(
      (100 * r.missing.length) / values.length,
    )}%). The rows that stay are unchanged.`;
  } else if (r.fillValue !== null) {
    const moved = as.std < ks.std ? 'fell' : 'rose';
    text = `Filled ${r.filled.length} gaps with ${fmt(r.fillValue)}, the ${
      strategy === 'mean' ? 'mean' : strategy === 'median' ? 'median' : 'most common value'
    } of the known values. The spread ${moved} from ${fmt(ks.std)} to ${fmt(
      as.std,
    )}: every gap got the same value.`;
  } else {
    const how =
      strategy === 'ffill'
        ? 'Each gap copies the known value just before it.'
        : strategy === 'bfill'
          ? 'Each gap copies the known value just after it.'
          : 'Each gap sits on a straight line between its known neighbours.';
    text = `${how}${
      r.missing.length
        ? ` ${r.missing.length} ${r.missing.length === 1 ? 'row has' : 'rows have'} no neighbour to copy from, so ${r.missing.length === 1 ? 'it stays' : 'they stay'} empty.`
        : ''
    }`;
  }

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        {p.datasets.length > 1 && (
          <Choices
            label="Dataset"
            options={p.datasets.map((_, i) => i)}
            value={di}
            onChange={setDi}
            render={(i) => p.datasets[i]?.name ?? ''}
          />
        )}
        <Pick
          label="Fill the gaps with"
          options={p.strategies}
          value={strategy}
          onChange={setStrategy}
          names={FILL_NAME}
        />
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label={`${d?.label ?? ''}: ${gaps} missing values, filled with ${FILL_NAME[strategy]}`}
        >
          {[
            [ks.mean, 'stroke-g1', '4 3'],
            [ks.median, 'stroke-g2', undefined],
          ].map(([v, cls, dash]) => (
            <line
              key={String(cls)}
              x1={PADL}
              x2={W - PADR}
              y1={ay(v as number)}
              y2={ay(v as number)}
              strokeWidth={1.25}
              strokeDasharray={dash as string | undefined}
              className={cls as string}
            />
          ))}
          {line && <path d={line} fill="none" strokeWidth={1.5} className="stroke-line-2" />}
          {r.values.map((v, i) => {
            if (v === null) {
              return (
                <text
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                  key={i}
                  x={ax(i)}
                  y={bottom - 2}
                  fontSize={11}
                  fontWeight={700}
                  textAnchor="middle"
                  className="fill-muted"
                >
                  ×
                </text>
              );
            }
            const isFilled = filledSet.has(i);
            return (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                key={i}
                cx={ax(i)}
                cy={ay(v)}
                r={isFilled ? 4.2 : 3.4}
                strokeWidth={isFilled ? 2 : 0}
                className={isFilled ? 'fill-surface stroke-g1' : 'fill-g0'}
              />
            );
          })}
          <line x1={PADL} x2={W - PADR} y1={bottom + 6} y2={bottom + 6} className="stroke-line-2" />
          {values.map((_, i) =>
            i % xEvery === 0 || i === values.length - 1 ? (
              <text
                // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
                key={i}
                x={ax(i)}
                y={bottom + 18}
                fontSize={8.5}
                textAnchor="middle"
                className="fill-muted font-mono"
              >
                {i + 1}
              </text>
            ) : null,
          )}
          <text
            x={(PADL + W - PADR) / 2}
            y={H - 2}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
          >
            row
          </text>
          {[ks.min, ks.max].map((t) => (
            <text
              key={t}
              x={PADL - 4}
              y={ay(t) + 3}
              fontSize={8.5}
              textAnchor="end"
              className="fill-muted font-mono"
            >
              {fmt(t)}
            </text>
          ))}
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>{d?.label}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-g0" aria-hidden /> known
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border-2 border-g1" aria-hidden /> filled
          </span>
          <span>× missing</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-g1" aria-hidden /> mean of known
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-g2" aria-hidden /> median of known
          </span>
        </figcaption>
      </figure>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-2" aria-live="polite">
          <Verdict tone="info" text={text} />
          {r.filled.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 text-[12px]">
              {r.filled.map((i) => (
                <li
                  key={i}
                  className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono"
                >
                  row {i + 1} → {fmt(r.values[i] as number)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-2">
          <StatsTable
            columns={[
              { title: 'Known only', s: ks, count: `${known.length} of ${values.length} rows` },
              {
                title: strategy === 'drop' ? 'After dropping' : 'After filling',
                s: as,
                count: `${r.usable.length} rows`,
              },
            ]}
          />
        </div>
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Scaling explorer ─────────────

const SCALER_NAME: Record<ScalerName, string> = {
  none: 'No scaling',
  minmax: 'Min-max (0 to 1)',
  standard: 'Standardise (z)',
};

const plain = (v: number) => (Number.isInteger(v) ? String(v) : fmt(v));
const big = (v: number) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : plain(v));
const short = (v: number) => (Math.abs(v) >= 1000 ? `${plain(+(v / 1000).toFixed(1))}k` : plain(v));
const pct = (share: number) => {
  const v = share * 100;
  // Keep tiny shares visible: 0.04% and 99.96%, not 0% and 100%.
  return (v > 0 && v < 1) || (v > 99 && v < 100) ? `${v.toFixed(2)}%` : `${Math.round(v)}%`;
};

export function ScalingExplorer({ body }: { body: Body<'scaling-explorer'> }) {
  const p = body.params;
  const clipId = `clip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [scaler, setScaler] = useState<ScalerName>(p.defaultScaler);
  const [k, setK] = useState(p.k.default);
  const [qx, setQx] = useState(p.queryX.default);
  const [qy, setQy] = useState(p.queryY.default);
  const pts = p.points;
  const r = nearestNeighbours(pts, { x: qx, y: qy }, k, scaler);
  const near = new Set(r.neighbours.map((n) => n.index));
  const radius = r.neighbours[r.neighbours.length - 1]?.distance ?? 0;

  const xs = [...pts.map((q) => q.x), p.queryX.min, p.queryX.max];
  const ys = [...pts.map((q) => q.y), p.queryY.min, p.queryY.max];
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const padX = (x1 - x0) * 0.05 || 1;
  const padY = (y1 - y0) * 0.05 || 1;
  const PADL = 40;
  const PADR = 10;
  const top = 10;
  const H = 206;
  const bottom = H - 30;
  const ax = linear(x0 - padX, x1 + padX, PADL, W - PADR);
  const ay = linear(y0 - padY, y1 + padY, bottom, top);
  const pxPerX = (W - PADR - PADL) / (x1 - x0 + 2 * padX);
  const pxPerY = (bottom - top) / (y1 - y0 + 2 * padY);
  // The neighbourhood: every point within the k-th neighbour's distance, drawn in raw units.
  const rx = radius * r.scaler.scale[0] * pxPerX;
  const ry = radius * r.scaler.scale[1] * pxPerY;
  const [sqx, sqy] = [
    (qx - r.scaler.shift[0]) / r.scaler.scale[0],
    (qy - r.scaler.shift[1]) / r.scaler.scale[1],
  ];
  const pred = p.classes[r.predicted];

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Pick
          label="Scaling"
          options={p.scalers}
          value={scaler}
          onChange={setScaler}
          names={SCALER_NAME}
        />
        <Choices label="k neighbours" options={p.k.options} value={k} onChange={setK} />
        <NumSlider
          label={p.queryX.label}
          value={qx}
          min={p.queryX.min}
          max={p.queryX.max}
          step={p.queryX.step}
          onChange={setQx}
          shown={big(qx)}
        />
        <NumSlider
          label={p.queryY.label}
          value={qy}
          min={p.queryY.min}
          max={p.queryY.max}
          step={p.queryY.step}
          onChange={setQy}
          shown={big(qy)}
        />
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label={`Nearest neighbours with ${SCALER_NAME[scaler]}: predicts ${pred}`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PADL} y={top} width={W - PADL - PADR} height={bottom - top} />
            </clipPath>
          </defs>
          <rect
            x={PADL}
            y={top}
            width={W - PADL - PADR}
            height={bottom - top}
            className="fill-none stroke-line"
          />
          <g clipPath={`url(#${clipId})`}>
            {rx > W - PADL - PADR || ry > bottom - top ? (
              // Far wider (or taller) than the plot: within the plot it is a band.
              <rect
                x={rx > W - PADL - PADR ? PADL : ax(qx) - rx}
                y={ry > bottom - top ? top : ay(qy) - ry}
                width={rx > W - PADL - PADR ? W - PADL - PADR : 2 * rx}
                height={ry > bottom - top ? bottom - top : 2 * ry}
                strokeWidth={1.25}
                strokeDasharray="4 3"
                className="fill-brand/10 stroke-brand"
              />
            ) : (
              <ellipse
                cx={ax(qx)}
                cy={ay(qy)}
                rx={rx}
                ry={ry}
                strokeWidth={1.25}
                strokeDasharray="4 3"
                className="fill-brand/10 stroke-brand"
              />
            )}
            {r.neighbours.map((n) => {
              const q = pts[n.index];
              if (!q) return null;
              return (
                <line
                  key={n.index}
                  x1={ax(qx)}
                  y1={ay(qy)}
                  x2={ax(q.x)}
                  y2={ay(q.y)}
                  strokeWidth={1.25}
                  className="stroke-ink"
                />
              );
            })}
          </g>
          {pts.map((q, i) => {
            const cx = ax(q.x);
            const cy = ay(q.y);
            const ring = near.has(i);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: points are positional
              <g key={i}>
                {q.cls === 1 ? (
                  <circle cx={cx} cy={cy} r={4} className="fill-g0" />
                ) : (
                  <rect x={cx - 3.6} y={cy - 3.6} width={7.2} height={7.2} className="fill-g1" />
                )}
                {ring && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7.5}
                    strokeWidth={1.5}
                    className="fill-none stroke-ink"
                  />
                )}
              </g>
            );
          })}
          <rect
            x={ax(qx) - 5}
            y={ay(qy) - 5}
            width={10}
            height={10}
            transform={`rotate(45 ${ax(qx)} ${ay(qy)})`}
            strokeWidth={1.5}
            className="fill-ink stroke-surface"
          />
          {[x0, (x0 + x1) / 2, x1].map((t) => (
            <text
              key={t}
              x={ax(t)}
              y={bottom + 12}
              fontSize={8.5}
              textAnchor="middle"
              className="fill-muted font-mono"
            >
              {short(t)}
            </text>
          ))}
          {[y0, (y0 + y1) / 2, y1].map((t) => (
            <text
              key={t}
              x={PADL - 4}
              y={ay(t) + 3}
              fontSize={8.5}
              textAnchor="end"
              className="fill-muted font-mono"
            >
              {short(t)}
            </text>
          ))}
          <text
            x={(PADL + W - PADR) / 2}
            y={H - 4}
            fontSize={9}
            textAnchor="middle"
            className="fill-muted"
          >
            {p.xLabel}
          </text>
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>Up: {p.yLabel}</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-g0" aria-hidden /> {p.classes[1]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-g1" aria-hidden /> {p.classes[0]}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rotate-45 bg-ink" aria-hidden /> new point
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-dashed border-brand" aria-hidden />{' '}
            its {k} nearest
          </span>
        </figcaption>
      </figure>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid content-start gap-3">
          <div aria-live="polite">
            <Verdict
              tone="info"
              text={`Prediction: **${pred}**, from ${r.votes[r.predicted]} of ${r.neighbours.length} nearest neighbours.`}
            />
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3">
            <p className="eyebrow">Share of the distance</p>
            <div className="mt-2 flex h-3 overflow-hidden rounded-full" aria-hidden>
              <div className="bg-brand" style={{ width: `${r.xShare * 100}%` }} />
              <div className="flex-1 bg-g1" />
            </div>
            <p className="mt-1.5 flex justify-between text-[12.5px]">
              <span>
                <span className="font-semibold text-brand">{p.xLabel}</span> {pct(r.xShare)}
              </span>
              <span>
                <span className="font-semibold text-g1">{p.yLabel}</span> {pct(1 - r.xShare)}
              </span>
            </p>
            <p className="mt-2 text-[12.5px] text-muted">
              {scaler === 'none'
                ? `The new point stays (${big(qx)}, ${big(qy)}).`
                : `The new point (${big(qx)}, ${big(qy)}) becomes (${fmt(sqx)}, ${fmt(sqy)}).`}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface px-4 py-2">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-left text-muted">
                <th className="py-1 pr-2 font-medium">{p.xLabel}</th>
                <th className="py-1 pr-2 font-medium">{p.yLabel}</th>
                <th className="py-1 pr-2 font-medium">Class</th>
                <th className="py-1 text-right font-medium">Distance</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {r.neighbours.map((n) => {
                const q = pts[n.index];
                if (!q) return null;
                return (
                  <tr key={n.index} className="border-t border-line">
                    <td className="py-1 pr-2">{big(q.x)}</td>
                    <td className="py-1 pr-2">{big(q.y)}</td>
                    <td className="py-1 pr-2 font-sans">{p.classes[q.cls]}</td>
                    <td className="py-1 text-right">{big(n.distance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── p-value explorer ─────────────

const pText = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const pSays = (p: number) => (p < 0.001 ? 'p < 0.001' : `p = ${p.toFixed(3)}`);
const chance = (p: number) => (p * 100 < 0.1 ? 'under 0.1%' : `${(p * 100).toFixed(1)}%`);

export function PValueExplorer({ body }: { body: Body<'pvalue-explorer'> }) {
  const p = body.params;
  const [n, setN] = useState(p.n.default);
  const [h, setH] = useState(Math.round(p.defaultShare * p.n.default));
  const [alpha, setAlpha] = useState(p.alpha.default);
  const dist = useMemo(() => nullDistribution(n), [n]);
  const pv = twoSidedPValue(n, h);
  const changeN = (m: number) => {
    setH(Math.round((h / n) * m));
    setN(m);
  };

  const sd = Math.sqrt(n) / 2;
  const lo = Math.max(0, Math.floor(Math.min(n / 2 - 4.5 * sd, h - 1)));
  const hi = Math.min(n, Math.ceil(Math.max(n / 2 + 4.5 * sd, h + 1)));
  const PADL = 12;
  const PADR = 12;
  const H = 168;
  const top = 12;
  const bottom = 138;
  const ax = linear(lo - 0.5, hi + 0.5, PADL, W - PADR);
  const peak = Math.max(...dist.slice(lo, hi + 1));
  const ay = linear(0, peak, bottom, top);
  const bw = ax(1) - ax(0);
  const gap = bw > 4 ? 1 : 0;
  const reject = pv < alpha;
  const tickSet = [...new Set([lo, Math.round(n / 2), hi])];

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Choices
          label={`Number of ${p.trialsLabel}`}
          options={p.n.options}
          value={n}
          onChange={changeN}
          render={String}
        />
        <NumSlider
          label={p.successLabel}
          value={h}
          min={0}
          max={n}
          step={1}
          onChange={setH}
          shown={`${h} of ${n}`}
        />
        <Choices
          label="Significance level α"
          options={p.alpha.options}
          value={alpha}
          onChange={setAlpha}
        />
        <div className="grid content-center rounded-xl border border-line bg-surface px-3 py-2">
          <p className="eyebrow">p-value</p>
          <p className={cn('font-mono text-[22px] font-bold', reject ? 'text-ok' : 'text-ink')}>
            {pText(pv)}
          </p>
        </div>
      </Panel>

      <figure className="rounded-2xl border border-line bg-surface p-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={CHART}
          role="img"
          aria-label={`If there were no real difference: chance of each count out of ${n}. The shaded tails add up to the p-value, ${pText(pv)}.`}
        >
          {dist.slice(lo, hi + 1).map((v, j) => {
            const kk = lo + j;
            const tail = asExtreme(n, h, kk);
            return (
              <rect
                key={kk}
                x={ax(kk) - bw / 2 + gap / 2}
                y={ay(v)}
                width={Math.max(0.6, bw - gap)}
                height={Math.max(0, bottom - ay(v))}
                strokeWidth={kk === h ? 1.5 : 0}
                className={cn(tail ? 'fill-bad/70' : 'fill-line-2', kk === h && 'stroke-ink')}
              />
            );
          })}
          <line
            x1={ax(n / 2)}
            x2={ax(n / 2)}
            y1={top}
            y2={bottom}
            strokeDasharray="3 3"
            className="stroke-muted"
          />
          <line
            x1={ax(h)}
            x2={ax(h)}
            y1={top - 4}
            y2={bottom}
            strokeWidth={1.5}
            className="stroke-ink"
          />
          <text
            x={ax(h)}
            y={top + 4}
            fontSize={9}
            textAnchor={ax(h) > W - 60 ? 'end' : 'start'}
            dx={ax(h) > W - 60 ? -4 : 4}
            className="fill-ink font-mono"
          >
            {`observed ${h}`}
          </text>
          <line x1={PADL} x2={W - PADR} y1={bottom} y2={bottom} className="stroke-line-2" />
          {tickSet.map((t) => (
            <text
              key={t}
              x={ax(t)}
              y={bottom + 12}
              fontSize={8.5}
              textAnchor="middle"
              className="fill-muted font-mono"
            >
              {t}
            </text>
          ))}
          <text x={W / 2} y={H - 4} fontSize={9} textAnchor="middle" className="fill-muted">
            {`${p.successLabel}, out of ${n}`}
          </text>
        </svg>
        <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          <span>Bars: how likely each count is if there is no real difference (50/50)</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 bg-bad/70" aria-hidden /> at least as far from{' '}
            {Number.isInteger(n / 2) ? n / 2 : fmt(n / 2)}: adds up to p
          </span>
        </figcaption>
      </figure>

      <div aria-live="polite">
        <Verdict
          tone={reject ? 'ok' : 'info'}
          text={
            reject
              ? `${pSays(pv)} is below α = ${fmt(alpha)}. If there were no real difference, a split at least this uneven would happen only ${chance(pv)} of the time, so you **reject** the idea of no difference.`
              : `${pSays(pv)} is not below α = ${fmt(alpha)}. With no real difference, a split at least this uneven still happens ${chance(pv)} of the time, so you **cannot reject** the idea of no difference. That is not proof that there is none.`
          }
        />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}
