/**
 * The maths behind the multiple regression lab: least squares for many features at once, solved by
 * elimination rather than by inverting anything, the metrics that say whether an extra feature
 * earned its place, the correlation and variance inflation that expose features carrying the same
 * information, and polynomial fits scored on a held-out half so under- and overfitting show.
 * Results match scikit-learn's LinearRegression and r2_score.
 */

const sum = (xs: readonly number[]) => xs.reduce((a, v) => a + v, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : 0);

/** 1 − SSE / SST, exactly as scikit-learn's r2_score defines it, constant target included. */
function r2Of(ys: readonly number[], predictions: readonly number[]): number {
  const ybar = mean(ys);
  const sse = sum(ys.map((y, i) => (y - (predictions[i] ?? 0)) ** 2));
  const sst = sum(ys.map((y) => (y - ybar) ** 2));
  // A target that never varies: 1 for a perfect fit and 0 otherwise, as scikit-learn defines it.
  return sst === 0 ? (sse === 0 ? 1 : 0) : 1 - sse / sst;
}

/** A pivot this small is rounding dust left by a repeated column, never real information. */
const TINY = 1e-12;

/**
 * Solves A·z = b by Gaussian elimination with partial pivoting: the largest candidate becomes the
 * pivot, which keeps every division well behaved. Inverting A would cost more and lose more digits.
 *
 * Each row and column is first divided by √A[j][j], which puts 1 down the diagonal. That leaves the
 * answer unchanged but steadies the elimination, and it lets one fixed tolerance decide what counts
 * as a zero pivot whatever units the features came in. A column repeating what the others already
 * say leaves no usable pivot: its weight is then zero and the rest still fit the data as well.
 */
function solve(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = b.length;
  const d = Array.from({ length: n }, (_, j) => Math.sqrt(Math.abs(a[j]?.[j] ?? 0)) || 1);
  const scale = (j: number) => d[j] ?? 1;
  // Elimination runs on a scaled copy of [A | b], so the caller's normal equations survive.
  const m: number[][] = Array.from({ length: n }, (_, j) => [
    ...Array.from({ length: n }, (_, k) => (a[j]?.[k] ?? 0) / (scale(j) * scale(k))),
    (b[j] ?? 0) / scale(j),
  ]);
  for (let c = 0; c < n; c++) {
    let best = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r]?.[c] ?? 0) > Math.abs(m[best]?.[c] ?? 0)) best = r;
    }
    const pivotRow = m[best];
    const here = m[c];
    if (!pivotRow || !here) continue;
    m[best] = here;
    m[c] = pivotRow;
    const pivot = pivotRow[c] ?? 0;
    if (Math.abs(pivot) <= TINY) continue;
    for (let r = c + 1; r < n; r++) {
      const below = m[r];
      if (!below) continue;
      const factor = (below[c] ?? 0) / pivot;
      if (factor === 0) continue;
      for (let k = c; k <= n; k++) below[k] = (below[k] ?? 0) - factor * (pivotRow[k] ?? 0);
    }
  }
  const z = Array.from({ length: n }, () => 0);
  for (let i = n - 1; i >= 0; i--) {
    const row = m[i];
    if (!row) continue;
    const pivot = row[i] ?? 0;
    if (Math.abs(pivot) <= TINY) continue;
    let rest = row[n] ?? 0;
    for (let j = i + 1; j < n; j++) rest -= (row[j] ?? 0) * (z[j] ?? 0);
    z[i] = rest / pivot;
  }
  return z.map((v, i) => v / scale(i));
}

export interface MultiFit {
  /** One weight per feature, in the order the columns were given. */
  weights: number[];
  intercept: number;
  predict(row: readonly number[]): number;
  predictions: number[];
  /** y − ŷ for each row. */
  residuals: number[];
  /** Σ residual² */
  sse: number;
  r2: number;
}

/**
 * Least squares for p features: the normal equations XᵀX w = Xᵀy, where X carries a column of ones
 * so the intercept is simply another weight to solve for.
 */
export function olsMulti(rows: readonly (readonly number[])[], ys: readonly number[]): MultiFit {
  const p = rows[0]?.length ?? 0;
  const size = p + 1;
  const a: number[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 0));
  const b: number[] = Array.from({ length: size }, () => 0);
  const count = Math.min(rows.length, ys.length);
  for (let i = 0; i < count; i++) {
    const row = [1, ...(rows[i] ?? [])];
    const y = ys[i] ?? 0;
    for (let j = 0; j < size; j++) {
      const rj = row[j] ?? 0;
      b[j] = (b[j] ?? 0) + rj * y;
      const aj = a[j];
      if (!aj) continue;
      for (let k = 0; k < size; k++) aj[k] = (aj[k] ?? 0) + rj * (row[k] ?? 0);
    }
  }
  const z = solve(a, b);
  const intercept = z[0] ?? 0;
  const weights = z.slice(1);
  const predict = (row: readonly number[]) =>
    weights.reduce((acc, w, j) => acc + w * (row[j] ?? 0), intercept);
  const predictions = rows.map(predict);
  const residuals = ys.map((y, i) => y - (predictions[i] ?? 0));
  return {
    weights,
    intercept,
    predict,
    predictions,
    residuals,
    sse: sum(residuals.map((r) => r * r)),
    r2: r2Of(ys, predictions),
  };
}

/**
 * R² never falls when a feature is added, so it cannot say whether the feature helped. This one
 * charges for each feature and does fall when the new column pays nothing back.
 */
export const adjustedR2 = (r2: number, n: number, p: number) =>
  n - p - 1 <= 0 ? Number.NaN : 1 - ((1 - r2) * (n - 1)) / (n - p - 1);

/** Pearson's r: covariance over the two spreads, 0 when either column never moves. */
export function correlation(a: readonly number[], b: readonly number[]): number {
  const abar = mean(a);
  const bbar = mean(b);
  const sab = sum(a.map((v, i) => (v - abar) * ((b[i] ?? 0) - bbar)));
  const saa = sum(a.map((v) => (v - abar) ** 2));
  const sbb = sum(b.map((v) => (v - bbar) ** 2));
  const spread = Math.sqrt(saa * sbb);
  return spread === 0 ? 0 : sab / spread;
}

/**
 * Variance inflation per column: fit each column from all the others and take 1 / (1 − R²). It
 * answers a question correlation cannot, since three columns can each look innocent in pairs while
 * together one of them is redundant. Above about 10 the weights stop meaning anything on their own.
 */
export function vif(columns: readonly (readonly number[])[]): number[] {
  return columns.map((target, j) => {
    const others = columns.filter((_, k) => k !== j);
    const rows = target.map((_, i) => others.map((col) => col[i] ?? 0));
    const r2 = olsMulti(rows, target).r2;
    return 1 - r2 <= 1e-12 ? Number.POSITIVE_INFINITY : 1 / (1 - r2);
  });
}

/** One row per x holding [x, x², … x^degree]: a curve fitted as a straight-line problem. */
export const polyFeatures = (xs: readonly number[], degree: number): number[][] =>
  xs.map((x) => Array.from({ length: Math.max(0, degree) }, (_, k) => x ** (k + 1)));

export interface PolyFit extends MultiFit {
  /** ŷ at any x, including between the points: this is what draws the curve. */
  at(x: number): number;
  degree: number;
}

/** Pascal's triangle entry C(n, k), for rewriting the centred fit in the powers of x. */
function binomial(n: number, k: number): number {
  let out = 1;
  for (let i = 0; i < k; i++) out = (out * (n - i)) / (i + 1);
  return Math.round(out);
}

/**
 * Polynomial least squares. Raw powers are hopeless at high degree: x and x⁹ differ by orders of
 * magnitude, so XᵀX loses most of its digits and degree 9 returns noise. The fit therefore runs on
 * t = (x − x̄) / sd, whose powers all stay near 1, and every prediction here comes back through t.
 * The returned weights are that fit rewritten in the powers of x students actually write, so the
 * equation reads normally, and y was never transformed: predictions are in the original units.
 */
export function polyFit(xs: readonly number[], ys: readonly number[], degree: number): PolyFit {
  const d = Math.max(0, degree);
  const centre = mean(xs);
  const sd = Math.sqrt(mean(xs.map((x) => (x - centre) ** 2)));
  const scale = sd || 1;
  const centred = olsMulti(
    polyFeatures(
      xs.map((x) => (x - centre) / scale),
      d,
    ),
    ys,
  );
  const at = (x: number) => {
    const t = (x - centre) / scale;
    return centred.weights.reduce((acc, w, k) => acc + w * t ** (k + 1), centred.intercept);
  };
  // t^k expanded by the binomial theorem gives the coefficient of each plain power of x.
  const raw = Array.from({ length: d + 1 }, () => 0);
  for (let k = 0; k <= d; k++) {
    const wk = k === 0 ? centred.intercept : (centred.weights[k - 1] ?? 0);
    for (let j = 0; j <= k; j++) {
      raw[j] = (raw[j] ?? 0) + (wk * binomial(k, j) * (-centre) ** (k - j)) / scale ** k;
    }
  }
  const predictions = xs.map(at);
  const residuals = ys.map((y, i) => y - (predictions[i] ?? 0));
  const weights = raw.slice(1);
  const intercept = raw[0] ?? 0;
  return {
    degree: d,
    weights,
    intercept,
    // Takes a row of plain powers, as polyFeatures builds them; `at` is the steadier route.
    predict: (row) => weights.reduce((acc, w, j) => acc + w * (row[j] ?? 0), intercept),
    at,
    predictions,
    residuals,
    sse: sum(residuals.map((r) => r * r)),
    r2: r2Of(ys, predictions),
  };
}

export interface Split {
  /** Indices of the rows the model learns from. */
  train: number[];
  /** Indices it is scored on, which it never sees while fitting. */
  test: number[];
}

/**
 * Every other point is held back: index 0, 2, 4 … train and 1, 3, 5 … test. Alternating keeps both
 * halves spread over the whole range, and nothing is shuffled, so the lesson's numbers never move.
 */
export function splitHalves(n: number): Split {
  const train: number[] = [];
  const test: number[] = [];
  for (let i = 0; i < n; i++) (i % 2 === 0 ? train : test).push(i);
  return { train, test };
}

export interface DegreeScore {
  degree: number;
  /** R² on the half the curve was fitted to. */
  trainR2: number;
  /** R² on the half held back, which is where overfitting finally shows. */
  testR2: number;
}

/**
 * Fits each degree on the training half and scores both halves. A low degree scores poorly on both;
 * a high one chases the training points while its test score collapses.
 */
export function scoreDegrees(
  xs: readonly number[],
  ys: readonly number[],
  degrees: readonly number[],
): DegreeScore[] {
  const { train, test } = splitHalves(Math.min(xs.length, ys.length));
  const pick = (vs: readonly number[], at: readonly number[]) => at.map((i) => vs[i] ?? 0);
  const testXs = pick(xs, test);
  const testYs = pick(ys, test);
  return degrees.map((degree) => {
    const fit = polyFit(pick(xs, train), pick(ys, train), degree);
    return {
      degree,
      trainR2: fit.r2,
      testR2: r2Of(
        testYs,
        testXs.map((x) => fit.at(x)),
      ),
    };
  });
}
