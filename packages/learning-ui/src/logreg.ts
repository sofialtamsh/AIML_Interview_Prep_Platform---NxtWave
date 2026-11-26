/**
 * The maths behind the logistic regression lab. A model is one weight per feature plus an
 * intercept. It covers the sigmoid, log loss and its gradient, gradient descent and the fitted
 * weights. It also scores a model: the confusion matrix, the ROC curve and the decision boundary.
 * Results match scikit-learn 1.9.1: LogisticRegression, log_loss, roc_curve and roc_auc_score.
 */

/** One row per example, one column per feature. */
export type Rows = readonly (readonly number[])[];

const sum = (xs: readonly number[]) => xs.reduce((a, v) => a + v, 0);
const mean = (xs: readonly number[]) => (xs.length ? sum(xs) / xs.length : 0);
const dot = (a: readonly number[], b: readonly number[]) =>
  a.reduce((acc, v, j) => acc + v * (b[j] ?? 0), 0);

// ───────────── Sigmoid, odds and log-odds ─────────────

/** 1 / (1 + e^−z). Each branch only ever raises e to a negative power, so nothing overflows. */
export const sigmoid = (z: number) =>
  z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));

/** The odds p / (1 − p): how many times likelier "yes" is than "no". */
export const oddsOf = (p: number) => p / (1 - p);

/** The log-odds ln(p / (1 − p)): the inverse of the sigmoid. */
export const logit = (p: number) => Math.log(oddsOf(p));

// ───────────── A model and its predictions ─────────────

export interface Model {
  /** One weight per feature, in the order the columns were given. */
  weights: number[];
  intercept: number;
}

/** The linear score z = b + Σ wⱼ·xⱼ, which is the log-odds the model gives the row. */
export const scoreOf = (model: Model, row: readonly number[]) =>
  model.intercept + dot(model.weights, row);

export const probaOf = (model: Model, row: readonly number[]) => sigmoid(scoreOf(model, row));

export const probas = (model: Model, rows: Rows) => rows.map((row) => probaOf(model, row));

// ───────────── Log loss ─────────────

/**
 * How close to 0 or 1 a probability may sit before its log is taken. This is machine epsilon, the
 * bound scikit-learn's log_loss uses; its early releases used 1e-15. A certain but wrong prediction
 * then costs 36.04 rather than infinity.
 */
const CLIP = Number.EPSILON;
const clip = (p: number) => Math.min(1 - CLIP, Math.max(CLIP, p));

/** −[y·ln p + (1 − y)·ln(1 − p)] for one row. */
export const rowLoss = (y: number, p: number) =>
  -(y * Math.log(clip(p)) + (1 - y) * Math.log(clip(1 - p)));

/** Mean log loss over the rows, as sklearn.metrics.log_loss returns it. */
export const logLoss = (ys: readonly number[], ps: readonly number[]) =>
  mean(ys.map((y, i) => rowLoss(y, ps[i] ?? 0)));

// ───────────── Gradient descent ─────────────

export interface Gradient {
  /** ∂loss/∂wⱼ = mean((p − y)·xⱼ), one entry per weight. */
  gw: number[];
  /** ∂loss/∂b = mean(p − y) */
  gb: number;
}

/** The slope of the mean log loss at this model. */
export function gradient(model: Model, rows: Rows, ys: readonly number[]): Gradient {
  const n = rows.length || 1;
  const errors = rows.map((row, i) => probaOf(model, row) - (ys[i] ?? 0));
  return {
    gw: model.weights.map((_, j) => sum(errors.map((e, i) => e * (rows[i]?.[j] ?? 0))) / n),
    gb: sum(errors) / n,
  };
}

/** One gradient-descent update of every weight and the intercept at once. */
export function gdStep(model: Model, rows: Rows, ys: readonly number[], lr: number): Model {
  const g = gradient(model, rows, ys);
  return {
    weights: model.weights.map((w, j) => w - lr * (g.gw[j] ?? 0)),
    intercept: model.intercept - lr * g.gb,
  };
}

export interface Descent {
  /** The model after each step, starting with the start model itself. */
  models: Model[];
  /** Mean log loss of each of those models. */
  loss: number[];
}

/**
 * Runs gradient descent and keeps every model on the way. Log loss cannot explode the way squared
 * error does, so there is no divergence flag. A run ends early only if the loss stops being a
 * number.
 */
export function descend(
  start: Model,
  rows: Rows,
  ys: readonly number[],
  lr: number,
  steps: number,
): Descent {
  const models = [start];
  const loss = [logLoss(ys, probas(start, rows))];
  for (let i = 0; i < steps; i++) {
    const next = gdStep(models[models.length - 1] as Model, rows, ys, lr);
    const cost = logLoss(ys, probas(next, rows));
    if (!Number.isFinite(cost)) break;
    models.push(next);
    loss.push(cost);
  }
  return { models, loss };
}

// ───────────── Standardising the features ─────────────

export interface Standardised {
  /** Every value rewritten as (x − mean) / sd of its column. */
  rows: number[][];
  means: number[];
  /** Population standard deviation per column, as StandardScaler uses. A constant column gets 1. */
  sds: number[];
}

export function standardiseRows(rows: Rows): Standardised {
  const width = rows[0]?.length ?? 0;
  const means: number[] = [];
  const sds: number[] = [];
  for (let j = 0; j < width; j++) {
    const column = rows.map((row) => row[j] ?? 0);
    const first = column[0] ?? 0;
    // Compared value by value: rounding in a mean can leave a constant column a false spread.
    const constant = column.every((v) => v === first);
    const mu = constant ? first : mean(column);
    means.push(mu);
    sds.push(constant ? 1 : Math.sqrt(mean(column.map((v) => (v - mu) ** 2))) || 1);
  }
  return {
    rows: rows.map((row) => means.map((mu, j) => ((row[j] ?? 0) - mu) / (sds[j] ?? 1))),
    means,
    sds,
  };
}

/**
 * A model fitted on standardised features, written for the raw ones. Each weight becomes wⱼ / sdⱼ
 * and the intercept becomes b − Σ wⱼ·meanⱼ / sdⱼ.
 */
export function toRawModel(model: Model, means: readonly number[], sds: readonly number[]): Model {
  const weights = model.weights.map((w, j) => w / (sds[j] || 1));
  return { weights, intercept: model.intercept - dot(weights, means) };
}

// ───────────── Fitting the weights ─────────────

/** A pivot this small is rounding dust left by a repeated column, never real information. */
const TINY = 1e-12;

/**
 * Solves A·z = b for a symmetric A with no negative curvature, by Cholesky factors. Rows and
 * columns are first divided by √A[j][j], so one tolerance judges every pivot. A direction with no
 * usable pivot gets a zero step: the data say nothing about it.
 */
function solve(a: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = b.length;
  const d = Array.from({ length: n }, (_, j) => Math.sqrt(Math.abs(a[j]?.[j] ?? 0)) || 1);
  const scale = (j: number) => d[j] ?? 1;
  const l: number[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => 0));
  const at = (i: number, j: number) => l[i]?.[j] ?? 0;
  for (let j = 0; j < n; j++) {
    for (let i = j; i < n; i++) {
      let v = (a[i]?.[j] ?? 0) / (scale(i) * scale(j));
      for (let k = 0; k < j; k++) v -= at(i, k) * at(j, k);
      const row = l[i];
      if (!row) continue;
      if (i === j) row[j] = v > TINY ? Math.sqrt(v) : 0;
      else row[j] = at(j, j) ? v / at(j, j) : 0;
    }
  }
  // Forward through L, then back through Lᵀ; a dropped pivot leaves its unknown at zero.
  const y = Array.from({ length: n }, () => 0);
  for (let i = 0; i < n; i++) {
    if (!at(i, i)) continue;
    let rest = (b[i] ?? 0) / scale(i);
    for (let k = 0; k < i; k++) rest -= at(i, k) * (y[k] ?? 0);
    y[i] = rest / at(i, i);
  }
  const z = Array.from({ length: n }, () => 0);
  for (let i = n - 1; i >= 0; i--) {
    if (!at(i, i)) continue;
    let rest = y[i] ?? 0;
    for (let k = i + 1; k < n; k++) rest -= at(k, i) * (z[k] ?? 0);
    z[i] = rest / at(i, i);
  }
  return z.map((v, j) => v / scale(j));
}

/** ln(1 + e^t), the log loss of one row written from its score, safe for any t. */
const softplus = (t: number) => Math.max(t, 0) + Math.log1p(Math.exp(-Math.abs(t)));

/** No row's log-odds moves by more than this: the fit has arrived. */
const SETTLED = 1e-10;
/** A move this large in some row's log-odds is a real change, not a finishing touch. */
const BOLD = 0.1;
/** A mean loss, or a promised drop in it, below this leaves nothing to win. */
const NOTHING = 1e-9;

interface Solved {
  /** Intercept first, then one weight per column. */
  beta: number[];
  iterations: number;
  converged: boolean;
  separable: boolean;
}

/**
 * Newton's method on Σ log loss + ½ Σ ridgeⱼ·βⱼ², from all zeros. Each step solves H·s = −g, the
 * system iteratively reweighted least squares solves. A bold step is halved until the loss falls
 * far enough. A small one is taken whole: the curvature barely changes across it.
 *
 * Separable classes have no best weights: the loss keeps falling as the weights grow. Two signs
 * give that away. The loss itself reaches zero, or it has nothing left to gain while Newton still
 * asks for a bold move. The second covers classes that only touch along the boundary.
 */
function newton(
  design: Rows,
  ys: readonly number[],
  ridge: readonly number[],
  limit: number,
): Solved {
  const n = design.length || 1;
  const lossOf = (beta: readonly number[]) =>
    sum(
      design.map((row, i) => {
        const s = dot(row, beta);
        const y = ys[i] ?? 0;
        return y * softplus(-s) + (1 - y) * softplus(s);
      }),
    );
  const penaltyOf = (beta: readonly number[]) =>
    sum(ridge.map((r, j) => 0.5 * r * (beta[j] ?? 0) ** 2));
  let beta = ridge.map(() => 0);
  let iterations = 0;
  let converged = false;
  let separable = false;
  let lastGain = Number.POSITIVE_INFINITY;
  for (;;) {
    const dataLoss = lossOf(beta);
    const cost = dataLoss + penaltyOf(beta);
    if (!Number.isFinite(cost)) break;
    const g = ridge.map((r, j) => r * (beta[j] ?? 0));
    const h = ridge.map((r, j) => ridge.map((_, k) => (j === k ? r : 0)));
    design.forEach((row, i) => {
      const p = sigmoid(dot(row, beta));
      const error = p - (ys[i] ?? 0);
      const curve = p * (1 - p);
      row.forEach((xj, j) => {
        g[j] = (g[j] ?? 0) + error * xj;
        const hj = h[j];
        if (!hj) return;
        for (let k = 0; k < row.length; k++) hj[k] = (hj[k] ?? 0) + curve * xj * (row[k] ?? 0);
      });
    });
    const step = solve(
      h,
      g.map((v) => -v),
    );
    // Measured in log-odds per row, so the tests below read the same in any units.
    const move = design.reduce((most, row) => Math.max(most, Math.abs(dot(row, step))), 0);
    // Twice the drop in loss a full step promises.
    const gain = -dot(g, step);
    const small = move <= BOLD;
    // Each small step promises a tiny fraction of the one before. One that does not is rounding.
    if (move <= SETTLED || (small && gain > lastGain / 4)) {
      converged = true;
      break;
    }
    if (dataLoss / n < NOTHING || (!small && gain / n < NOTHING)) {
      separable = true;
      break;
    }
    // Checked last, so a model that arrives on its final allowed step still reports as converged.
    if (iterations >= limit) break;
    let t = 1;
    let next = beta.map((v, j) => v + (step[j] ?? 0));
    // Armijo's rule: accept the step once it delivers a sliver of the drop it promised.
    while (
      !small &&
      t > Number.EPSILON &&
      lossOf(next) + penaltyOf(next) > cost - 1e-4 * t * gain
    ) {
      t /= 2;
      next = beta.map((v, j) => v + t * (step[j] ?? 0));
    }
    beta = next;
    lastGain = small ? gain : Number.POSITIVE_INFINITY;
    iterations++;
  }
  return { beta, iterations, converged, separable };
}

export interface Fit {
  model: Model;
  /** Mean log loss of that model on the rows it was fitted to. */
  loss: number;
  /** Newton steps taken. */
  iterations: number;
  /** The steps shrank to nothing, so these weights are the best there are. */
  converged: boolean;
  /**
   * Some boundary leaves no row on its wrong side, so no best weights exist. Larger weights always
   * score better, and the search stops once the loss has nothing left to give. The model returned
   * is where it stopped. An overlap too slight for the loss to register counts as none.
   */
  separable: boolean;
}

export interface FitOptions {
  /** Newton steps allowed. A real fit needs well under 30, so the default of 100 is generous. */
  maxIterations?: number;
}

/**
 * The search runs on standardised columns, where Newton's sums keep their digits whatever the
 * units. Centring leaves any penalty alone because the intercept is never penalised. Scaling does
 * not, so each weight's penalty is divided by its column's variance to compensate.
 */
function fitWith(rows: Rows, ys: readonly number[], strength: number, limit: number): Fit {
  const scaled = standardiseRows(rows);
  const design = scaled.rows.map((row) => [1, ...row]);
  const ridge = [0, ...scaled.sds.map((sd) => strength / sd ** 2)];
  const solved = newton(design, ys, ridge, limit);
  const model = toRawModel(
    { weights: solved.beta.slice(1), intercept: solved.beta[0] ?? 0 },
    scaled.means,
    scaled.sds,
  );
  return {
    model,
    loss: logLoss(ys, probas(model, rows)),
    iterations: solved.iterations,
    converged: solved.converged,
    separable: solved.separable,
  };
}

/**
 * Maximum likelihood with no penalty: the weights that make the observed labels most probable.
 * Matches LogisticRegression(C=np.inf) once that is run with a tight tolerance. Import it under
 * another name in tests: Biome reads a call spelled `fit(` there as a focused test.
 */
export const fit = (rows: Rows, ys: readonly number[], opts: FitOptions = {}): Fit =>
  fitWith(rows, ys, 0, opts.maxIterations ?? 100);

/**
 * scikit-learn's default fit: minimise ½‖w‖² + C·Σ log loss, with the intercept left unpenalised.
 * A smaller C shrinks the weights harder. The penalty depends on each feature's units, exactly as
 * it does in scikit-learn.
 */
export const fitL2 = (rows: Rows, ys: readonly number[], C = 1): Fit =>
  // The floor keeps a zero or negative C from dividing by nothing.
  fitWith(rows, ys, 1 / Math.max(C, 1e-12), 100);

// ───────────── Judging the predictions ─────────────

export interface Confusion {
  /** Actual 1, predicted 1. */
  tp: number;
  /** Actual 0, predicted 1. */
  fp: number;
  /** Actual 0, predicted 0. */
  tn: number;
  /** Actual 1, predicted 0. */
  fn: number;
  accuracy: number;
  /** tp / (tp + fp): of the rows called positive, the share that were. */
  precision: number;
  /** tp / (tp + fn): of the rows that were positive, the share found. */
  recall: number;
  f1: number;
}

/**
 * Counts at one threshold: a row is called positive when p >= threshold. Precision, recall and F1
 * are 0 when their denominator is 0. That is what scikit-learn reports, alongside a warning.
 */
export function confusion(
  ys: readonly number[],
  ps: readonly number[],
  threshold = 0.5,
): Confusion {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  ys.forEach((y, i) => {
    const called = (ps[i] ?? 0) >= threshold;
    if (y === 1 && called) tp++;
    else if (y === 1) fn++;
    else if (called) fp++;
    else tn++;
  });
  const over = (top: number, bottom: number) => (bottom === 0 ? 0 : top / bottom);
  return {
    tp,
    fp,
    tn,
    fn,
    accuracy: over(tp + tn, ys.length),
    precision: over(tp, tp + fp),
    recall: over(tp, tp + fn),
    f1: over(2 * tp, 2 * tp + fp + fn),
  };
}

export interface RocPoint {
  /** fp / (fp + tn): the share of real negatives called positive. */
  fpr: number;
  /** tp / (tp + fn): recall under its ROC name. */
  tpr: number;
  /** Rows with p >= threshold are called positive at this point. */
  threshold: number;
}

/**
 * One point per distinct probability, highest threshold first, from (0, 0) to (1, 1). The first
 * threshold is Infinity, where nothing is called positive. This is roc_curve with
 * drop_intermediate=False. A rate is NaN when its class has no rows.
 */
export function rocCurve(ys: readonly number[], ps: readonly number[]): RocPoint[] {
  const positives = ys.filter((y) => y === 1).length;
  const negatives = ys.length - positives;
  const thresholds = [...new Set(ys.map((_, i) => ps[i] ?? 0))].sort((a, b) => b - a);
  return [Number.POSITIVE_INFINITY, ...thresholds].map((threshold) => {
    const c = confusion(ys, ps, threshold);
    return { fpr: c.fp / negatives, tpr: c.tp / positives, threshold };
  });
}

/**
 * Area under the ROC curve, counted as what it means. Take every positive row with every negative
 * row: it is the share of those pairs ranked the right way round. A tied pair counts half, which
 * is how roc_auc_score scores it. NaN when either class has no rows.
 */
export function auc(ys: readonly number[], ps: readonly number[]): number {
  const scores = ys.map((_, i) => ps[i] ?? 0);
  const positives = scores.filter((_, i) => ys[i] === 1);
  const negatives = scores.filter((_, i) => ys[i] !== 1);
  if (!positives.length || !negatives.length) return Number.NaN;
  let won = 0;
  for (const p of positives) {
    for (const q of negatives) won += p > q ? 1 : p === q ? 0.5 : 0;
  }
  return won / (positives.length * negatives.length);
}

// ───────────── The decision boundary ─────────────

/** Division can leave −0, which prints and compares oddly; adding 0 makes it plain 0. */
const unsigned = (v: number) => v + 0;

/**
 * The x where a one-feature model's probability crosses the threshold: (logit(threshold) − b) / w.
 * Null when the curve never crosses it, as with a zero weight.
 */
export function boundary1d(model: Model, threshold = 0.5): number | null {
  const x = (logit(threshold) - model.intercept) / (model.weights[0] ?? 0);
  return Number.isFinite(x) ? unsigned(x) : null;
}

export type Boundary2d =
  /** x2 = slope·x1 + intercept */
  | { slope: number; intercept: number }
  /** x1 = vertical: the second feature has no weight, so the line stands upright. */
  | { vertical: number };

/**
 * The line in the (x1, x2) plane where a two-feature model's probability equals the threshold.
 * Null when neither feature has a weight, so no line exists.
 */
export function boundary2d(model: Model, threshold = 0.5): Boundary2d | null {
  const [w1 = 0, w2 = 0] = model.weights;
  const level = logit(threshold) - model.intercept;
  const slope = unsigned(-w1 / w2);
  const intercept = unsigned(level / w2);
  if (Number.isFinite(slope) && Number.isFinite(intercept)) return { slope, intercept };
  const vertical = unsigned(level / w1);
  return Number.isFinite(vertical) ? { vertical } : null;
}
