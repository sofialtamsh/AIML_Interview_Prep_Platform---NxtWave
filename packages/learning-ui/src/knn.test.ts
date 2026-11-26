import { describe, expect, it } from 'vitest';
import {
  accuracyCurve,
  decisionGrid,
  distance,
  distanceWorking,
  makeDataset,
  type Pt,
  predict,
  rankAll,
} from './knn';

// Expected values come from scikit-learn 1.9.1 (KNeighborsClassifier, algorithm="brute").
const SIX: Pt[] = [
  { x: 1, y: 1, cls: 0 },
  { x: 2, y: 1, cls: 0 },
  { x: 1, y: 3, cls: 0 },
  { x: 5, y: 5, cls: 1 },
  { x: 6, y: 5, cls: 1 },
  { x: 5, y: 7, cls: 1 },
];
const Q = { x: 3, y: 3 };

describe('distances', () => {
  it('matches the three metrics', () => {
    expect(distance(Q, { x: 1, y: 3 }, 'euclidean')).toBe(2);
    expect(rankAll(SIX, Q, 'euclidean').map((n) => +n.d.toFixed(3))).toEqual([
      2, 2.236, 2.828, 2.828, 3.606, 4.472,
    ]);
    expect(
      rankAll(SIX, Q, 'manhattan')
        .slice(0, 3)
        .map((n) => n.d),
    ).toEqual([2, 3, 4]);
    expect(
      rankAll(SIX, Q, 'minkowski3')
        .slice(0, 3)
        .map((n) => +n.d.toFixed(4)),
    ).toEqual([2, 2.0801, 2.5198]);
  });

  it('ranks equal distances in training order', () => {
    expect(rankAll(SIX, Q, 'euclidean').map((n) => n.index)).toEqual([2, 1, 0, 3, 4, 5]);
  });

  it('writes the working out with its numbers', () => {
    expect(distanceWorking(Q, { x: 2, y: 1 }, 'euclidean')).toBe(
      '√((3 − 2)² + (3 − 1)²) = √(1 + 4) = 2.24',
    );
    expect(distanceWorking(Q, { x: 2, y: 1 }, 'manhattan')).toBe('|3 − 2| + |3 − 1| = 1 + 2 = 3');
  });
});

describe('votes', () => {
  it('gives scikit-learn’s predictions and probabilities', () => {
    expect(predict(SIX, Q, 3, 'euclidean', false, 2).shares).toEqual([1, 0]);
    const four = predict(SIX, Q, 4, 'euclidean', false, 2);
    expect(four.winner).toBe(0);
    expect(four.shares).toEqual([0.75, 0.25]);
    expect(four.counts).toEqual([3, 1]);
    const weighted = predict(SIX, Q, 4, 'euclidean', true, 2);
    expect(weighted.shares.map((s) => +s.toFixed(4))).toEqual([0.7863, 0.2137]);
    expect(weighted.weights.map((w) => +w.toFixed(3))).toEqual([0.5, 0.447, 0.354, 0.354]);
  });

  it('breaks a tied vote in favour of the first class, and says it was a tie', () => {
    const square: Pt[] = [
      { x: 0, y: 0, cls: 1 },
      { x: 2, y: 0, cls: 0 },
      { x: 0, y: 2, cls: 1 },
      { x: 2, y: 2, cls: 0 },
    ];
    const p = predict(square, { x: 1, y: 1 }, 4, 'euclidean', false, 2);
    expect(p.shares).toEqual([0.5, 0.5]);
    expect(p.tie).toBe(true);
    expect(p.winner).toBe(0);
  });

  it('lets an exact match take the whole weighted vote', () => {
    const p = predict(SIX, { x: 5, y: 5 }, 3, 'euclidean', true, 2);
    expect(p.exact).toBe(true);
    expect(p.shares).toEqual([0, 1]);
  });

  it('flags a K-th neighbour that is exactly as far as the next one', () => {
    // Points 0 (class 0) and 3 (class 1) are both 2.828 away: K = 3 cuts between them.
    expect(predict(SIX, Q, 3, 'euclidean', false, 2).distanceTie).toBe(true);
    expect(predict(SIX, Q, 2, 'euclidean', false, 2).distanceTie).toBe(false);
  });
});

describe('distance ties at the cut', () => {
  // The lesson's films: 7 liked (class 0), then 6 skipped (class 1).
  const FILMS: Pt[] = [
    [7, 3, 0],
    [8, 5, 0],
    [6, 4, 0],
    [9, 2, 0],
    [7, 6, 0],
    [5, 2, 0],
    [4, 6, 0],
    [2, 7, 1],
    [3, 5, 1],
    [1, 4, 1],
    [4, 8, 1],
    [2, 2, 1],
    [5, 7, 1],
  ].map(([x, y, cls]) => ({ x, y, cls }) as Pt);

  it('flags a tie even when the next point shares the K-th point’s class', () => {
    // (6, 4) liked, (4, 6) liked and (3, 5) skipped are all 1.58 from (4.5, 4.5): scikit-learn's
    // K = 1 answer depends on the row order, so the lab must say so.
    expect(predict(FILMS, { x: 4.5, y: 4.5 }, 1, 'euclidean', false, 2).distanceTie).toBe(true);
    // (4, 6) liked, (4, 8) skipped and (5, 7) skipped are all 1 from (4, 7).
    expect(predict(FILMS, { x: 4, y: 7 }, 2, 'euclidean', false, 2).distanceTie).toBe(true);
  });

  it('does not flag a cut between points of one class, or a clean cut', () => {
    // At (6, 6) the 3rd and 4th films are both 2 away, and both were liked.
    expect(predict(FILMS, { x: 6, y: 6 }, 3, 'euclidean', false, 2).distanceTie).toBe(false);
    expect(predict(FILMS, { x: 4, y: 6.5 }, 3, 'euclidean', false, 2).distanceTie).toBe(false);
  });
});

describe('datasets', () => {
  it('are the same for every student, on the 0–10 square with one decimal', () => {
    const a = makeDataset('blobs');
    expect(a).toEqual(makeDataset('blobs'));
    expect(a.classes).toBe(3);
    expect(a.train).toHaveLength(45);
    expect(a.validation).toHaveLength(45);
    for (const name of ['blobs', 'moons', 'circles', 'xor'] as const) {
      for (const p of makeDataset(name).train) {
        expect(p.x).toBeGreaterThanOrEqual(0.3);
        expect(p.x).toBeLessThanOrEqual(9.7);
        expect(Math.round(p.y * 10) / 10).toBe(p.y);
      }
    }
  });

  it('shows overfitting at K = 1 and underfitting at a large K', () => {
    const blobs = makeDataset('blobs');
    const curve = accuracyCurve(
      blobs.train,
      blobs.validation,
      [1, 3, 5, 15],
      'euclidean',
      false,
      3,
    );
    // scikit-learn: train 1.000 / 0.956 / 0.933 / 0.933, validation 0.844 / 0.933 / 0.933 / 0.933
    expect(curve.map((c) => +c.train.toFixed(3))).toEqual([1, 0.956, 0.933, 0.933]);
    expect(curve.map((c) => +c.validation.toFixed(3))).toEqual([0.844, 0.933, 0.933, 0.933]);
    const circles = makeDataset('circles');
    const big = accuracyCurve(circles.train, circles.validation, [1, 15], 'euclidean', false, 2);
    expect(big.map((c) => +c.validation.toFixed(3))).toEqual([1, 0.523]);
  });
});

describe('decision regions', () => {
  it('colours every cell with the class predicted at its centre', () => {
    const grid = decisionGrid(SIX, 1, 'euclidean', false, 2, 10);
    expect(grid.cls).toHaveLength(10);
    // Bottom-left is class 0 territory, top-right class 1.
    expect(grid.cls[9]?.[0]).toBe(0);
    expect(grid.cls[0]?.[9]).toBe(1);
  });
});
