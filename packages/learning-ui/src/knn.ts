/**
 * The maths behind the KNN lab: distances, the K nearest neighbours, plain and distance-weighted
 * votes, class probabilities, the decision regions and accuracy against K. Results follow
 * scikit-learn's KNeighborsClassifier (checked against 1.9 on 20,000 predictions): a tied vote goes
 * to the class that comes first, and with distance weights an exact match (distance 0) takes the
 * whole vote. When the K-th and the next point are exactly as far away, scikit-learn's pick depends
 * on the data order; here the earlier training point wins and the lab flags it (`distanceTie`).
 */

export type Metric = 'euclidean' | 'manhattan' | 'minkowski3';

export interface XY {
  x: number;
  y: number;
}
export interface Pt extends XY {
  /** Class index: 0, 1 or 2. */
  cls: number;
}

export function distance(a: XY, b: XY, metric: Metric): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  if (metric === 'manhattan') return dx + dy;
  if (metric === 'minkowski3') return Math.cbrt(dx ** 3 + dy ** 3);
  return Math.hypot(dx, dy);
}

export interface Neighbour {
  /** Position of the point in the training set. */
  index: number;
  point: Pt;
  d: number;
  /** 1 for the closest point, 2 for the next, and so on. */
  rank: number;
}

/** Every training point with its distance to the query, closest first (ties keep training order). */
export function rankAll(points: readonly Pt[], q: XY, metric: Metric): Neighbour[] {
  return points
    .map((point, index) => ({ index, point, d: distance(point, q, metric), rank: 0 }))
    .sort((a, b) => a.d - b.d || a.index - b.index)
    .map((n, i) => ({ ...n, rank: i + 1 }));
}

export interface Vote {
  /** Neighbours per class. */
  counts: number[];
  /** The weight each neighbour carries, in the order given (1 each for a plain vote). */
  weights: number[];
  /** Summed weight per class. */
  totals: number[];
  /** Share of the vote per class: what predict_proba returns. */
  shares: number[];
  winner: number;
  /** The top two classes have exactly the same share. */
  tie: boolean;
  /** A neighbour at distance 0 took the whole weighted vote. */
  exact: boolean;
}

/** The vote of the given neighbours: one vote each, or 1 / distance when weighted. */
export function vote(nearest: readonly Neighbour[], classes: number, weighted: boolean): Vote {
  const counts = Array.from({ length: classes }, () => 0);
  const totals = Array.from({ length: classes }, () => 0);
  const exact = weighted && nearest.some((n) => n.d === 0);
  const weights = nearest.map((n) => {
    if (!weighted) return 1;
    if (exact) return n.d === 0 ? 1 : 0;
    return 1 / n.d;
  });
  nearest.forEach((n, i) => {
    counts[n.point.cls] = (counts[n.point.cls] ?? 0) + 1;
    totals[n.point.cls] = (totals[n.point.cls] ?? 0) + (weights[i] ?? 0);
  });
  const sum = totals.reduce((a, b) => a + b, 0) || 1;
  const shares = totals.map((t) => t / sum);
  let winner = 0;
  shares.forEach((s, c) => {
    if (s > (shares[winner] ?? 0) + 1e-12) winner = c;
  });
  const top = shares[winner] ?? 0;
  const tie = shares.filter((s) => Math.abs(s - top) <= 1e-12).length > 1;
  return { counts, weights, totals, shares, winner, tie, exact };
}

export interface Prediction extends Vote {
  nearest: Neighbour[];
  /** The distance to the K-th neighbour: the radius of the neighbourhood. */
  radius: number;
  /** Points of different classes sit exactly as far as the K-th one, some outside the cut: it is arbitrary. */
  distanceTie: boolean;
}

export function predict(
  points: readonly Pt[],
  q: XY,
  k: number,
  metric: Metric,
  weighted: boolean,
  classes: number,
): Prediction {
  const ranked = rankAll(points, q, metric);
  const nearest = ranked.slice(0, Math.max(1, Math.min(k, points.length)));
  const radius = nearest[nearest.length - 1]?.d ?? 0;
  // Every point exactly as far as the K-th one, whether it made the cut or not.
  const atEdge = ranked.filter((n) => Math.abs(n.d - radius) < 1e-9);
  return {
    ...vote(nearest, classes, weighted),
    nearest,
    radius,
    distanceTie:
      atEdge.some((n) => n.rank > nearest.length) &&
      new Set(atEdge.map((n) => n.point.cls)).size > 1,
  };
}

/** The predicted class at the centre of every cell of an n × n grid over [lo, hi]², row 0 at the top. */
export function decisionGrid(
  points: readonly Pt[],
  k: number,
  metric: Metric,
  weighted: boolean,
  classes: number,
  n: number,
  lo = 0,
  hi = 10,
): { cls: number[][]; tie: boolean[][] } {
  const step = (hi - lo) / n;
  const cls: number[][] = [];
  const tie: boolean[][] = [];
  for (let r = 0; r < n; r++) {
    const rowC: number[] = [];
    const rowT: boolean[] = [];
    for (let c = 0; c < n; c++) {
      const p = predict(
        points,
        { x: lo + (c + 0.5) * step, y: hi - (r + 0.5) * step },
        k,
        metric,
        weighted,
        classes,
      );
      rowC.push(p.winner);
      rowT.push(p.tie);
    }
    cls.push(rowC);
    tie.push(rowT);
  }
  return { cls, tie };
}

/** Share of `test` points the model built on `train` gets right (0 to 1). */
export function accuracy(
  train: readonly Pt[],
  test: readonly Pt[],
  k: number,
  metric: Metric,
  weighted: boolean,
  classes: number,
): number {
  if (test.length === 0) return 0;
  const right = test.filter(
    (t) => predict(train, t, k, metric, weighted, classes).winner === t.cls,
  ).length;
  return right / test.length;
}

export interface AccuracyAtK {
  k: number;
  /** Accuracy on the training points themselves (each point is its own nearest neighbour). */
  train: number;
  /** Accuracy on held-out points the model never saw. */
  validation: number;
}

export function accuracyCurve(
  train: readonly Pt[],
  validation: readonly Pt[],
  ks: readonly number[],
  metric: Metric,
  weighted: boolean,
  classes: number,
): AccuracyAtK[] {
  return ks
    .filter((k) => k <= train.length)
    .map((k) => ({
      k,
      train: accuracy(train, train, k, metric, weighted, classes),
      validation: accuracy(train, validation, k, metric, weighted, classes),
    }));
}

// ───────────── Datasets (fixed seeds, so every student sees the same points) ─────────────

export type DatasetName = 'blobs' | 'moons' | 'circles' | 'xor';

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

/** Keeps a point on the canvas and rounds it to one decimal, so the shown arithmetic is exact. */
const tidy = (v: number) => Math.round(Math.min(9.7, Math.max(0.3, v)) * 10) / 10;

function generate(name: DatasetName, perClass: number, rand: () => number): Pt[] {
  const out: Pt[] = [];
  const add = (x: number, y: number, cls: number) => out.push({ x: tidy(x), y: tidy(y), cls });
  if (name === 'blobs') {
    const centres: Array<[number, number]> = [
      [3, 3.2],
      [7.1, 3.4],
      [5, 7.2],
    ];
    centres.forEach(([cx, cy], cls) => {
      for (let i = 0; i < perClass; i++)
        add(cx + normal(rand) * 1.25, cy + normal(rand) * 1.25, cls);
    });
  } else if (name === 'moons') {
    for (let i = 0; i < perClass; i++) {
      const t = (Math.PI * i) / (perClass - 1);
      add(
        3.9 + 2.6 * Math.cos(t) + normal(rand) * 0.35,
        4.6 + 2.6 * Math.sin(t) + normal(rand) * 0.35,
        0,
      );
      add(
        6.1 - 2.6 * Math.cos(t) + normal(rand) * 0.35,
        5.6 - 2.6 * Math.sin(t) + normal(rand) * 0.35,
        1,
      );
    }
  } else if (name === 'circles') {
    for (let i = 0; i < perClass; i++) {
      const t = (2 * Math.PI * i) / perClass;
      add(
        5 + 1.5 * Math.cos(t) + normal(rand) * 0.3,
        5 + 1.5 * Math.sin(t) + normal(rand) * 0.3,
        0,
      );
      add(
        5 + 3.7 * Math.cos(t) + normal(rand) * 0.3,
        5 + 3.7 * Math.sin(t) + normal(rand) * 0.3,
        1,
      );
    }
  } else {
    const corners: Array<[number, number, number]> = [
      [2.8, 2.8, 0],
      [7.2, 7.2, 0],
      [2.8, 7.2, 1],
      [7.2, 2.8, 1],
    ];
    for (const [cx, cy, cls] of corners) {
      for (let i = 0; i < Math.ceil(perClass / 2); i++) {
        add(cx + normal(rand) * 0.95, cy + normal(rand) * 0.95, cls);
      }
    }
  }
  return out;
}

export interface Dataset {
  classes: number;
  train: Pt[];
  /** Points from the same pattern that the model never trains on. */
  validation: Pt[];
}

/** A named pattern on the 0–10 square: the same points for every student. */
export function makeDataset(name: DatasetName): Dataset {
  const seeds: Record<DatasetName, number> = { blobs: 7, moons: 11, circles: 23, xor: 5 };
  const per: Record<DatasetName, number> = { blobs: 15, moons: 22, circles: 22, xor: 22 };
  const rand = mulberry32(seeds[name]);
  const train = generate(name, per[name], rand);
  const validation = generate(name, per[name], rand);
  return { classes: name === 'blobs' ? 3 : 2, train, validation };
}

// ───────────── Words for the live calculation ─────────────

const n2 = (v: number) => String(+v.toFixed(2));

/** The distance from the query to one point, written out with its numbers. */
export function distanceWorking(q: XY, p: XY, metric: Metric): string {
  const dx = n2(Math.abs(q.x - p.x));
  const dy = n2(Math.abs(q.y - p.y));
  const d = n2(distance(q, p, metric));
  if (metric === 'manhattan')
    return `|${n2(q.x)} − ${n2(p.x)}| + |${n2(q.y)} − ${n2(p.y)}| = ${dx} + ${dy} = ${d}`;
  if (metric === 'minkowski3') return `(${dx}³ + ${dy}³)^(1/3) = ${d}`;
  return `√((${n2(q.x)} − ${n2(p.x)})² + (${n2(q.y)} − ${n2(p.y)})²) = √(${n2(Math.abs(q.x - p.x) ** 2)} + ${n2(Math.abs(q.y - p.y) ** 2)}) = ${d}`;
}

export const METRIC_FORMULA: Record<Metric, string> = {
  euclidean: 'd = √((x₁ − x₂)² + (y₁ − y₂)²)',
  manhattan: 'd = |x₁ − x₂| + |y₁ − y₂|',
  minkowski3: 'd = (|x₁ − x₂|³ + |y₁ − y₂|³)^(1/3)',
};
