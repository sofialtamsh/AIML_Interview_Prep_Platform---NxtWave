/**
 * The maths behind the interactive explorers (WIDGET sections): real computations, run in the
 * browser, so what a student sees when they move a slider is what the algorithm really does.
 * Pure functions, no React, so they can be tested on their own.
 */

// ───────────── Seeded randomness (every student sees the same data) ─────────────

/** mulberry32: a small, fast, seedable generator of numbers in [0, 1). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal sample (Box–Muller). */
export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ───────────── Training explorer ─────────────

export interface TrainingData {
  xTrain: number[];
  yTrain: number[];
  xVal: number[];
  yVal: number[];
}

/** The true pattern behind the data: one wave of a sine. */
export const truth = (x: number) => Math.sin(Math.PI * x);

/** Training points spread evenly over [−0.95, 0.95] with a little jitter; 50 validation points. */
export function trainingData(seed: number, points: number, noise: number): TrainingData {
  const rand = seededRandom(seed);
  const xTrain = Array.from({ length: points }, (_, i) => {
    const base = -0.95 + (1.9 * i) / Math.max(1, points - 1);
    return Math.min(1, Math.max(-1, base + (rand() - 0.5) * 0.08));
  });
  const yTrain = xTrain.map((x) => truth(x) + noise * gaussian(rand));
  const xVal = Array.from({ length: 50 }, (_, i) => -0.95 + (1.9 * i) / 49);
  const yVal = xVal.map((x) => truth(x) + noise * gaussian(rand));
  return { xTrain, yTrain, xVal, yVal };
}

/**
 * Polynomial features of degree d, in the Legendre basis scaled to unit variance on [−1, 1].
 * The same polynomials as 1, x, x², …, but far better conditioned, so gradient descent behaves
 * the way it does on real models: the smooth shape is learned first, the wiggles later.
 */
export function polyFeatures(x: number, degree: number): number[] {
  const p = [1, x];
  for (let k = 1; k < degree; k++) {
    p.push(((2 * k + 1) * x * (p[k] as number) - k * (p[k - 1] as number)) / (k + 1));
  }
  return p.slice(0, degree + 1).map((v, k) => v * Math.sqrt(2 * k + 1));
}

export interface TrainingRun {
  /** Mean squared error per epoch (index 0 is after epoch 1). */
  train: number[];
  val: number[];
  /** Weights after each epoch, flattened: epoch e (1-based) starts at (e − 1) × (degree + 1). */
  weights: Float64Array;
  degree: number;
  /** The epoch at which the weights blew up, or null if training stayed stable. */
  divergedAt: number | null;
}

/** Full-batch gradient descent on the MSE, with an optional L2 penalty λ‖w‖². */
export function trainPolynomial(
  data: TrainingData,
  opts: { degree: number; learningRate: number; l2: number; epochs: number },
): TrainingRun {
  const { degree, learningRate: lr, l2, epochs } = opts;
  const k = degree + 1;
  const A = data.xTrain.map((x) => polyFeatures(x, degree));
  const B = data.xVal.map((x) => polyFeatures(x, degree));
  const n = A.length;
  const w = new Array<number>(k).fill(0);
  const train: number[] = [];
  const val: number[] = [];
  const weights = new Float64Array(epochs * k);
  const mse = (rows: number[][], ys: number[]) =>
    rows.reduce((s, r, i) => {
      const e = r.reduce((a, v, j) => a + v * (w[j] as number), 0) - (ys[i] as number);
      return s + e * e;
    }, 0) / rows.length;

  for (let epoch = 1; epoch <= epochs; epoch++) {
    const grad = new Array<number>(k).fill(0);
    for (let i = 0; i < n; i++) {
      const row = A[i] as number[];
      const err = row.reduce((a, v, j) => a + v * (w[j] as number), 0) - (data.yTrain[i] as number);
      for (let j = 0; j < k; j++)
        grad[j] = (grad[j] as number) + (2 * err * (row[j] as number)) / n;
    }
    for (let j = 0; j < k; j++) {
      w[j] = (w[j] as number) - lr * ((grad[j] as number) + 2 * l2 * (w[j] as number));
    }
    if (w.some((v) => !Number.isFinite(v) || Math.abs(v) > 1e6)) {
      return { train, val, weights: weights.slice(0, (epoch - 1) * k), degree, divergedAt: epoch };
    }
    weights.set(w, (epoch - 1) * k);
    train.push(mse(A, data.yTrain));
    val.push(mse(B, data.yVal));
  }
  return { train, val, weights, degree, divergedAt: null };
}

/** The model's prediction at x after the given epoch (1-based). */
export function predictAt(run: TrainingRun, epoch: number, x: number): number {
  const k = run.degree + 1;
  const start = (Math.min(epoch, run.train.length) - 1) * k;
  if (start < 0) return 0;
  return polyFeatures(x, run.degree).reduce(
    (a, v, j) => a + v * (run.weights[start + j] as number),
    0,
  );
}

/** The epoch (1-based) with the lowest validation loss among the first `upTo` epochs. */
export function bestEpoch(run: TrainingRun, upTo: number): number {
  let best = 0;
  const last = Math.min(upTo, run.val.length);
  for (let i = 1; i < last; i++) if ((run.val[i] as number) < (run.val[best] as number)) best = i;
  return best + 1;
}

// ───────────── Optimizer race ─────────────

export type OptimizerName = 'sgd' | 'momentum' | 'adam';

/**
 * A narrow valley: gentle along x, steep along y. Its lowest point is (0, 0). Plain gradient
 * descent zig-zags across it and creeps along it; momentum and Adam deal with it differently.
 */
export const valleyLoss = (x: number, y: number) => (x * x) / 20 + y * y;
const valleyGrad = (x: number, y: number): [number, number] => [x / 10, 2 * y];

export const VALLEY_START: [number, number] = [-9, 1.6];

/** The path an optimizer takes over the valley: the start plus one point per step. */
export function optimizerPath(
  name: OptimizerName,
  opts: { learningRate: number; momentum: number; steps: number; noise?: number; seed?: number },
): Array<[number, number]> {
  const { learningRate: lr, momentum: beta, steps } = opts;
  const rand = seededRandom(opts.seed ?? 7);
  let [x, y] = VALLEY_START;
  const path: Array<[number, number]> = [[x, y]];
  let vx = 0;
  let vy = 0;
  let mx = 0;
  let my = 0;
  let sx = 0;
  let sy = 0;
  for (let t = 1; t <= steps; t++) {
    let [gx, gy] = valleyGrad(x, y);
    if (opts.noise) {
      gx += opts.noise * gaussian(rand);
      gy += opts.noise * gaussian(rand);
    }
    if (name === 'sgd') {
      x -= lr * gx;
      y -= lr * gy;
    } else if (name === 'momentum') {
      vx = beta * vx - lr * gx;
      vy = beta * vy - lr * gy;
      x += vx;
      y += vy;
    } else {
      // Adam with the usual β₁ = 0.9, β₂ = 0.999 and bias correction.
      mx = 0.9 * mx + 0.1 * gx;
      my = 0.9 * my + 0.1 * gy;
      sx = 0.999 * sx + 0.001 * gx * gx;
      sy = 0.999 * sy + 0.001 * gy * gy;
      const c1 = 1 - 0.9 ** t;
      const c2 = 1 - 0.999 ** t;
      x -= (lr * (mx / c1)) / (Math.sqrt(sx / c2) + 1e-8);
      y -= (lr * (my / c1)) / (Math.sqrt(sy / c2) + 1e-8);
    }
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e4 || Math.abs(y) > 1e4) {
      path.push([Math.sign(x) * 1e4 || 1e4, Math.sign(y) * 1e4 || 1e4]);
      break;
    }
    path.push([x, y]);
  }
  return path;
}

// ───────────── Activation explorer ─────────────

export type ActivationName = 'sigmoid' | 'tanh' | 'relu' | 'leaky-relu';

/** The activation and its slope at z. `leak` is leaky ReLU's slope for negative inputs. */
export function activation(
  name: ActivationName,
  z: number,
  leak = 0.1,
): { a: number; slope: number } {
  switch (name) {
    case 'sigmoid': {
      const s = 1 / (1 + Math.exp(-z));
      return { a: s, slope: s * (1 - s) };
    }
    case 'tanh': {
      const t = Math.tanh(z);
      return { a: t, slope: 1 - t * t };
    }
    case 'relu':
      return { a: Math.max(0, z), slope: z > 0 ? 1 : 0 };
    case 'leaky-relu':
      return { a: z > 0 ? z : leak * z, slope: z > 0 ? 1 : leak };
  }
}
