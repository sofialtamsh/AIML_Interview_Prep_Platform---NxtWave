/**
 * The maths behind the linear regression lab: a line's predictions and residuals, the loss and
 * its metrics, the closed-form least-squares fit with its working, and gradient descent one step
 * at a time (on the raw feature or on a standardised one). Results match NumPy and scikit-learn's
 * LinearRegression, mean_squared_error and r2_score.
 */

export interface P {
  x: number;
  y: number;
}
export interface Line {
  /** Slope. */
  m: number;
  /** Intercept. */
  b: number;
}

const sum = (xs: readonly number[]) => xs.reduce((a, v) => a + v, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : 0);

export const predictAt = (line: Line, x: number) => line.m * x + line.b;

export interface Fit {
  line: Line;
  xbar: number;
  ybar: number;
  /** Σ (x − x̄)(y − ȳ) */
  sxy: number;
  /** Σ (x − x̄)² */
  sxx: number;
}

/** Ordinary least squares for one feature: m = Sxy / Sxx, b = ȳ − m·x̄. */
export function ols(points: readonly P[]): Fit {
  const xbar = mean(points.map((p) => p.x));
  const ybar = mean(points.map((p) => p.y));
  const sxy = sum(points.map((p) => (p.x - xbar) * (p.y - ybar)));
  const sxx = sum(points.map((p) => (p.x - xbar) ** 2));
  const m = sxx === 0 ? 0 : sxy / sxx;
  return { line: { m, b: ybar - m * xbar }, xbar, ybar, sxy, sxx };
}

export interface Evaluation {
  predictions: number[];
  /** y − ŷ for each point. */
  residuals: number[];
  /** Σ residual² */
  sse: number;
  /** Σ (y − ȳ)² */
  sst: number;
  mse: number;
  rmse: number;
  mae: number;
  /** 1 − SSE / SST; negative when the line is worse than predicting the mean. */
  r2: number;
}

export function evaluate(points: readonly P[], line: Line): Evaluation {
  const predictions = points.map((p) => predictAt(line, p.x));
  const residuals = points.map((p, i) => p.y - (predictions[i] ?? 0));
  const ybar = mean(points.map((p) => p.y));
  const sse = sum(residuals.map((r) => r * r));
  const sst = sum(points.map((p) => (p.y - ybar) ** 2));
  const n = points.length || 1;
  return {
    predictions,
    residuals,
    sse,
    sst,
    mse: sse / n,
    rmse: Math.sqrt(sse / n),
    mae: sum(residuals.map(Math.abs)) / n,
    // A target that never varies: 1 for a perfect fit and 0 otherwise, as scikit-learn defines it.
    r2: sst === 0 ? (sse === 0 ? 1 : 0) : 1 - sse / sst,
  };
}

export interface Gradient {
  /** ∂MSE/∂m = −(2/n) Σ x·(y − ŷ) */
  gm: number;
  /** ∂MSE/∂b = −(2/n) Σ (y − ŷ) */
  gb: number;
}

export function gradient(points: readonly P[], line: Line): Gradient {
  const n = points.length || 1;
  const r = points.map((p) => p.y - predictAt(line, p.x));
  return {
    gm: (-2 / n) * sum(points.map((p, i) => p.x * (r[i] ?? 0))),
    gb: (-2 / n) * sum(r),
  };
}

/** One gradient-descent update of both parameters at once. */
export function gdStep(points: readonly P[], line: Line, lr: number): Line {
  const g = gradient(points, line);
  return { m: line.m - lr * g.gm, b: line.b - lr * g.gb };
}

export interface Descent {
  /** The line after each step, starting with the start line itself. */
  lines: Line[];
  /** MSE of each of those lines. */
  mse: number[];
  /** The loss grew past any useful value: the learning rate is too large. */
  diverged: boolean;
}

export function descend(points: readonly P[], start: Line, lr: number, steps: number): Descent {
  const lines = [start];
  const mse = [evaluate(points, start).mse];
  let diverged = false;
  for (let i = 0; i < steps; i++) {
    const next = gdStep(points, lines[lines.length - 1] as Line, lr);
    const loss = evaluate(points, next).mse;
    if (!Number.isFinite(loss) || loss > 1e9) {
      diverged = true;
      break;
    }
    lines.push(next);
    mse.push(loss);
  }
  return { lines, mse, diverged };
}

/** How many steps gradient descent needs to come within `tolerance` of the best MSE (null: over the limit). */
export function stepsToFit(
  points: readonly P[],
  start: Line,
  lr: number,
  tolerance = 0.01,
  limit = 5000,
): number | null {
  const best = evaluate(points, ols(points).line).mse;
  let line = start;
  for (let i = 1; i <= limit; i++) {
    line = gdStep(points, line, lr);
    const loss = evaluate(points, line).mse;
    if (!Number.isFinite(loss) || loss > 1e9) return null;
    if (loss <= best * (1 + tolerance) + 1e-12) return i;
  }
  return null;
}

// ───────────── Standardising the feature ─────────────

export interface Scaling {
  mean: number;
  /** Population standard deviation, as StandardScaler uses. */
  sd: number;
}

export function scalingOf(points: readonly P[]): Scaling {
  const mu = mean(points.map((p) => p.x));
  const sd = Math.sqrt(mean(points.map((p) => (p.x - mu) ** 2))) || 1;
  return { mean: mu, sd };
}

/** The points with x replaced by z = (x − mean) / sd. */
export const standardise = (points: readonly P[], s: Scaling): P[] =>
  points.map((p) => ({ x: (p.x - s.mean) / s.sd, y: p.y }));

/** A line fitted on z, written for the raw x: m = w / sd, b = c − w·mean / sd. */
export const toRaw = (line: Line, s: Scaling): Line => ({
  m: line.m / s.sd,
  b: line.b - (line.m * s.mean) / s.sd,
});

/** A line on the raw x, written for z. */
export const toScaled = (line: Line, s: Scaling): Line => ({
  m: line.m * s.sd,
  b: line.b + line.m * s.mean,
});

// ───────────── Generated patterns (fixed seeds: the same points for every student) ─────────────

export type Pattern = 'curved' | 'funnel';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export interface Domain {
  x: [number, number];
  y: [number, number];
}

/**
 * Thirteen points across the domain that break one assumption each. "curved": the true shape
 * bends, so a straight line leaves a U-shaped pattern in the residuals. "funnel": the spread of
 * the errors grows with x (heteroscedasticity).
 */
export function makePattern(pattern: Pattern, domain: Domain): P[] {
  const rand = mulberry32(pattern === 'curved' ? 17 : 141);
  const [x0, x1] = domain.x;
  const [y0, y1] = domain.y;
  const h = y1 - y0;
  const out: P[] = [];
  for (let i = 0; i < 13; i++) {
    const u = 0.08 + (0.84 * i) / 12;
    const x = x0 + u * (x1 - x0);
    const y =
      pattern === 'curved'
        ? y0 + h * (0.12 + 0.72 * u * u) + normal(rand) * 0.025 * h
        : y0 + h * (0.14 + 0.6 * u) + normal(rand) * (0.004 + 0.17 * u) * h;
    out.push({
      x: Math.round(x * 10) / 10,
      y: Math.round(Math.min(y1, Math.max(y0, y)) * 10) / 10,
    });
  }
  return out;
}

// ───────────── Words for the live calculation ─────────────

/** A number as students write it: up to `d` decimals, no trailing zeros. */
export const nf = (v: number, d = 2) => String(+v.toFixed(d)).replace('-', '−');
/** The same, with brackets round a negative value: for use inside a product or a sum. */
export const signed = (v: number, d = 2) => (v < 0 ? `(${nf(v, d)})` : nf(v, d));
const plus = (v: number, d = 2) => (v < 0 ? `− ${nf(-v, d)}` : `+ ${nf(v, d)}`);

/** "2 × 4 + 3 = 11": one prediction, written out. */
export const predictionWorking = (line: Line, x: number) =>
  `${nf(line.m)} × ${signed(x)} ${plus(line.b)} = ${nf(predictAt(line, x))}`;

/** The line's equation with its numbers: "ŷ = 2x + 3". */
export const equationOf = (line: Line) => `ŷ = ${nf(line.m)}x ${plus(line.b)}`;
