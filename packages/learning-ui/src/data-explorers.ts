/**
 * The maths behind the data-preparation and statistics explorers (WIDGET sections): outliers,
 * filling missing values, feature scaling with a nearest-neighbour model, and a p-value. Each
 * function follows what pandas, NumPy or scikit-learn do by default, so what students see here
 * matches the code in their lessons. Pure functions, no React, so they can be tested on their own.
 */

// ───────────── Describing a column ─────────────

/** The q-quantile of sorted values with linear interpolation (NumPy and pandas default). */
export function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return Number.NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] as number;
  const b = sorted[hi] as number;
  return a + (b - a) * (pos - lo);
}

export interface Summary {
  n: number;
  mean: number;
  median: number;
  /** Sample standard deviation (ddof = 1), as pandas `Series.std()` computes it. */
  std: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
}

export function summarize(values: readonly number[]): Summary {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  const mean = n ? xs.reduce((s, v) => s + v, 0) / n : Number.NaN;
  const variance = n > 1 ? xs.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1) : Number.NaN;
  const q1 = quantile(xs, 0.25);
  const q3 = quantile(xs, 0.75);
  return {
    n,
    mean,
    median: quantile(xs, 0.5),
    std: Math.sqrt(variance),
    q1,
    q3,
    iqr: q3 - q1,
    min: xs[0] ?? Number.NaN,
    max: xs[n - 1] ?? Number.NaN,
  };
}

// ───────────── Outliers ─────────────

export const OUTLIER_METHODS = ['iqr', 'zscore'] as const;
export type OutlierMethod = (typeof OUTLIER_METHODS)[number];
export const OUTLIER_TREATMENTS = ['keep', 'remove', 'cap'] as const;
export type OutlierTreatment = (typeof OUTLIER_TREATMENTS)[number];

/**
 * The fences outside which a value counts as an outlier.
 * IQR rule: Q1 − k·IQR and Q3 + k·IQR. Z-score rule: mean ± k·std (|z| > k).
 */
export function outlierFences(
  values: readonly number[],
  method: OutlierMethod,
  k: number,
): { lo: number; hi: number } {
  const s = summarize(values);
  return method === 'iqr'
    ? { lo: s.q1 - k * s.iqr, hi: s.q3 + k * s.iqr }
    : { lo: s.mean - k * s.std, hi: s.mean + k * s.std };
}

export const isOutside = (v: number, f: { lo: number; hi: number }) => v < f.lo || v > f.hi;

/** Keep the values, drop the ones outside the fences, or cap them at the fences (like `clip`). */
export function treatOutliers(
  values: readonly number[],
  fences: { lo: number; hi: number },
  treatment: OutlierTreatment,
): number[] {
  if (treatment === 'remove') return values.filter((v) => !isOutside(v, fences));
  if (treatment === 'cap') return values.map((v) => Math.min(fences.hi, Math.max(fences.lo, v)));
  return [...values];
}

// ───────────── Missing values ─────────────

export const FILL_STRATEGIES = [
  'drop',
  'mean',
  'median',
  'mode',
  'ffill',
  'bfill',
  'interpolate',
] as const;
export type FillStrategy = (typeof FILL_STRATEGIES)[number];

/** The most frequent value; ties go to the smallest, as pandas `mode()[0]` does. */
export function modeOf(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = Number.NaN;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount || (c === bestCount && v < best)) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

export interface Imputed {
  /** One entry per original row: the known value, the filled value, or null if still missing. */
  values: Array<number | null>;
  /** Rows whose value was filled in. */
  filled: number[];
  /** Rows removed (drop) or still empty (a forward fill with nothing before it). */
  missing: number[];
  /** The single value used for mean, median and mode fills. */
  fillValue: number | null;
  /** The values that would go to a model: kept and filled rows only. */
  usable: number[];
}

/**
 * Fill gaps the way pandas does: dropna, fillna(mean/median/mode), ffill, bfill and
 * interpolate() (a straight line between the known neighbours; gaps after the last known value
 * copy it, and gaps before the first stay empty, as pandas' default does).
 */
export function impute(values: ReadonlyArray<number | null>, strategy: FillStrategy): Imputed {
  const known = values.filter((v): v is number => v !== null);
  const out: Array<number | null> = [...values];
  const filled: number[] = [];
  const missing: number[] = [];
  let fillValue: number | null = null;
  if (strategy === 'interpolate') {
    let prev = -1;
    values.forEach((v, i) => {
      if (v === null) return;
      for (let j = prev + 1; j < i; j++) {
        if (prev < 0) continue;
        const a = values[prev] as number;
        out[j] = a + ((v - a) * (j - prev)) / (i - prev);
        filled.push(j);
      }
      prev = i;
    });
    values.forEach((v, i) => {
      if (v !== null || filled.includes(i)) return;
      if (prev >= 0 && i > prev) {
        out[i] = values[prev] as number;
        filled.push(i);
      } else missing.push(i);
    });
    filled.sort((a, b) => a - b);
  } else if (strategy === 'mean' || strategy === 'median' || strategy === 'mode') {
    const s = summarize(known);
    fillValue = strategy === 'mean' ? s.mean : strategy === 'median' ? s.median : modeOf(known);
    values.forEach((v, i) => {
      if (v === null) {
        out[i] = fillValue;
        filled.push(i);
      }
    });
  } else if (strategy === 'ffill' || strategy === 'bfill') {
    const order = values.map((_, i) => i);
    if (strategy === 'bfill') order.reverse();
    let last: number | null = null;
    for (const i of order) {
      const v = values[i] ?? null;
      if (v !== null) last = v;
      else if (last !== null) {
        out[i] = last;
        filled.push(i);
      } else missing.push(i);
    }
    filled.sort((a, b) => a - b);
    missing.sort((a, b) => a - b);
  } else {
    values.forEach((v, i) => {
      if (v === null) missing.push(i);
    });
  }
  return {
    values: out,
    filled,
    missing,
    fillValue,
    usable: out.filter((v): v is number => v !== null),
  };
}

// ───────────── Scaling and nearest neighbours ─────────────

export const SCALERS = ['none', 'minmax', 'standard'] as const;
export type ScalerName = (typeof SCALERS)[number];

export interface Scaler {
  name: ScalerName;
  /** Per feature: subtract `shift`, then divide by `scale`. */
  shift: [number, number];
  scale: [number, number];
}

/**
 * Learns a scaler from the training points only (never the new point), as scikit-learn's
 * MinMaxScaler and StandardScaler do. StandardScaler uses the population std (ddof = 0).
 */
export function fitScaler(
  points: ReadonlyArray<{ x: number; y: number }>,
  name: ScalerName,
): Scaler {
  const cols = [points.map((p) => p.x), points.map((p) => p.y)];
  if (name === 'none') return { name, shift: [0, 0], scale: [1, 1] };
  const fit = cols.map((c) => {
    if (name === 'minmax') {
      const lo = Math.min(...c);
      const hi = Math.max(...c);
      return [lo, hi - lo || 1] as const;
    }
    const mean = c.reduce((s, v) => s + v, 0) / c.length;
    const sd = Math.sqrt(c.reduce((s, v) => s + (v - mean) ** 2, 0) / c.length);
    return [mean, sd || 1] as const;
  });
  return {
    name,
    shift: [fit[0]?.[0] ?? 0, fit[1]?.[0] ?? 0],
    scale: [fit[0]?.[1] ?? 1, fit[1]?.[1] ?? 1],
  };
}

export const applyScaler = (s: Scaler, p: { x: number; y: number }): [number, number] => [
  (p.x - s.shift[0]) / s.scale[0],
  (p.y - s.shift[1]) / s.scale[1],
];

export interface Neighbour {
  index: number;
  distance: number;
  /** Share of the squared distance that comes from the first feature (x). */
  xShare: number;
}

export interface KnnResult {
  scaler: Scaler;
  neighbours: Neighbour[];
  /** Votes per class among the k nearest. */
  votes: [number, number];
  predicted: 0 | 1;
  /** Share of the squared distance from x, averaged over the k nearest. */
  xShare: number;
}

/** k-nearest neighbours with Euclidean distance after the chosen scaling. */
export function nearestNeighbours(
  points: ReadonlyArray<{ x: number; y: number; cls: 0 | 1 }>,
  query: { x: number; y: number },
  k: number,
  scalerName: ScalerName,
): KnnResult {
  const scaler = fitScaler(points, scalerName);
  const [qx, qy] = applyScaler(scaler, query);
  const all = points.map((p, index) => {
    const [px, py] = applyScaler(scaler, p);
    const dx2 = (px - qx) ** 2;
    const dy2 = (py - qy) ** 2;
    const d2 = dx2 + dy2;
    return { index, distance: Math.sqrt(d2), xShare: d2 === 0 ? 0.5 : dx2 / d2 };
  });
  // Ties on distance go to the earlier point, so the result never depends on sort stability.
  all.sort((a, b) => a.distance - b.distance || a.index - b.index);
  const neighbours = all.slice(0, Math.min(k, all.length));
  const votes: [number, number] = [0, 0];
  for (const n of neighbours) votes[(points[n.index] as { cls: 0 | 1 }).cls] += 1;
  const nearestCls = (points[neighbours[0]?.index ?? 0] as { cls: 0 | 1 }).cls;
  const predicted: 0 | 1 = votes[1] > votes[0] ? 1 : votes[0] > votes[1] ? 0 : nearestCls;
  const xShare = neighbours.reduce((s, n) => s + n.xShare, 0) / (neighbours.length || 1);
  return { scaler, neighbours, votes, predicted, xShare };
}

// ───────────── A p-value for "is this better than a coin flip?" ─────────────

/** log(n!) by summing logs: exact enough for n up to a few thousand. */
function logFactorial(n: number): number {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log(i);
  return s;
}

/** P(X = k) for X ~ Binomial(n, 1/2). */
export function binomialHalf(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  const logC = logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  return Math.exp(logC - n * Math.LN2);
}

/** Every outcome's probability when there is no real effect (each trial is 50/50). */
export function nullDistribution(n: number): number[] {
  return Array.from({ length: n + 1 }, (_, k) => binomialHalf(n, k));
}

/** Outcomes at least as far from n/2 as the observed count: the ones the p-value adds up. */
export const asExtreme = (n: number, observed: number, k: number) =>
  Math.abs(k - n / 2) >= Math.abs(observed - n / 2) - 1e-9;

/**
 * Two-sided p-value of an exact binomial test against 1/2 (scipy.stats.binomtest's default):
 * the chance of a result at least this far from an even split if there were no real difference.
 */
export function twoSidedPValue(n: number, observed: number): number {
  let p = 0;
  for (let k = 0; k <= n; k++) if (asExtreme(n, observed, k)) p += binomialHalf(n, k);
  return Math.min(1, p);
}
