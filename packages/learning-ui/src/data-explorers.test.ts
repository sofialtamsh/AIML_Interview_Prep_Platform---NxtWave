// The expected numbers below were computed with pandas 3.1, NumPy 2.5 and scipy 1.18, so the
// explorers show students exactly what their lesson code prints.
import { describe, expect, it } from 'vitest';
import {
  impute,
  isOutside,
  modeOf,
  nearestNeighbours,
  outlierFences,
  summarize,
  treatOutliers,
  twoSidedPValue,
} from './data-explorers';

const DELIVERIES = [22, 24, 25, 27, 28, 29, 30, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 44, 95];
const flagged = (values: number[], method: 'iqr' | 'zscore', k: number) => {
  const f = outlierFences(values, method, k);
  return values.filter((v) => isOutside(v, f));
};

describe('summaries and outliers', () => {
  it('matches pandas quantiles, mean and sample std', () => {
    const s = summarize([...DELIVERIES, 160]);
    expect(s.q1).toBe(28.75);
    expect(s.q3).toBe(38.5);
    expect(s.median).toBe(32.5);
    expect(s.mean).toBeCloseTo(41.75, 2);
    expect(s.std).toBeCloseTo(31.7, 2);
  });

  it('IQR fences ignore how extreme the last value is; z-score fences do not', () => {
    for (const last of [100, 160, 300]) {
      const f = outlierFences([...DELIVERIES, last], 'iqr', 1.5);
      expect(f.lo).toBeCloseTo(14.125, 3);
      expect(f.hi).toBeCloseTo(53.125, 3);
      expect(flagged([...DELIVERIES, last], 'iqr', 1.5)).toEqual([95, last]);
    }
  });

  it('one big outlier hides another from the z-score rule (masking)', () => {
    expect(flagged([...DELIVERIES, 45], 'zscore', 3)).toEqual([95]);
    expect(flagged([...DELIVERIES, 160], 'zscore', 3)).toEqual([160]);
    expect(flagged([...DELIVERIES, 100], 'zscore', 3)).toEqual([]);
  });

  it('capping and removing match pandas clip and a boolean filter', () => {
    const values = [...DELIVERIES, 160];
    const f = outlierFences(values, 'iqr', 1.5);
    const capped = summarize(treatOutliers(values, f, 'cap'));
    expect(capped.mean).toBeCloseTo(34.31, 2);
    expect(capped.std).toBeCloseTo(8.68, 2);
    const removed = summarize(treatOutliers(values, f, 'remove'));
    expect(removed.n).toBe(18);
    expect(removed.mean).toBeCloseTo(32.22, 2);
  });
});

describe('filling missing values', () => {
  const N = null;
  const salary = [28, 32, N, 35, 30, N, 41, 33, 250, N, 29, 36];
  const rating = [5, 4, N, 5, 3, 5, N, 4, 5, 2, N, 4];
  const temp = [24, 25, N, 27, 28, N, N, 31, 32, 31, N, 29];

  it('mean, median and mode fills use the known values', () => {
    expect(impute(salary, 'mean').fillValue).toBeCloseTo(57.11, 2);
    expect(impute(salary, 'median').fillValue).toBe(33);
    expect(impute(rating, 'mode').fillValue).toBe(5);
    expect(impute(rating, 'mean').fillValue).toBeCloseTo(4.11, 2);
    expect(summarize(impute(salary, 'mean').usable).std).toBeCloseTo(61.78, 2);
  });

  it('ffill and bfill copy the neighbour, as pandas does', () => {
    expect(impute(salary, 'ffill').values[9]).toBe(250);
    expect(impute(temp, 'bfill').values.slice(5, 7)).toEqual([31, 31]);
  });

  it('interpolate draws a line between neighbours and copies forward at the end', () => {
    expect(impute(temp, 'interpolate').values).toEqual([
      24, 25, 26, 27, 28, 29, 30, 31, 32, 31, 30, 29,
    ]);
    const edge = impute([N, 1, N, 3, N, N], 'interpolate');
    expect(edge.values).toEqual([N, 1, 2, 3, 3, 3]);
    expect(edge.missing).toEqual([0]);
  });

  it('drop removes the rows; a forward fill cannot fill the first row', () => {
    expect(impute(salary, 'drop').usable).toHaveLength(9);
    expect(impute([N, 2, N], 'ffill').missing).toEqual([0]);
    expect(modeOf([3, 1, 3, 1, 2])).toBe(1);
  });
});

describe('scaling and nearest neighbours', () => {
  const pts: Array<{ x: number; y: number; cls: 0 | 1 }> = [
    [23, 38000, 1],
    [25, 45000, 1],
    [27, 61000, 1],
    [29, 58000, 1],
    [24, 66000, 1],
    [31, 72000, 1],
    [22, 30000, 0],
    [35, 95000, 1],
    [41, 88000, 0],
    [48, 51000, 0],
    [52, 53500, 0],
    [55, 50500, 0],
    [58, 47000, 0],
    [45, 64000, 0],
  ].map(([x, y, cls]) => ({ x: x as number, y: y as number, cls: cls as 0 | 1 }));
  const q = { x: 26, y: 52000 };

  it('without scaling, income decides everything', () => {
    const r = nearestNeighbours(pts, q, 3, 'none');
    expect(r.neighbours.map((n) => pts[n.index]?.x)).toEqual([48, 52, 55]);
    expect(r.predicted).toBe(0);
    expect(r.xShare).toBeLessThan(0.001);
    // Changing the age alone never changes the answer.
    expect(nearestNeighbours(pts, { x: 50, y: 52000 }, 3, 'none').predicted).toBe(0);
  });

  it('after scaling, age counts and the prediction flips', () => {
    for (const s of ['minmax', 'standard'] as const) {
      const r = nearestNeighbours(pts, q, 3, s);
      expect(r.neighbours.map((n) => pts[n.index]?.x)).toEqual([25, 29, 27]);
      expect(r.predicted).toBe(1);
    }
    expect(nearestNeighbours(pts, { x: 50, y: 52000 }, 3, 'standard').predicted).toBe(0);
  });
});

describe('p-values', () => {
  it('matches scipy.stats.binomtest (two-sided, p = 0.5)', () => {
    const cases: Array<[number, number, number]> = [
      [10, 6, 0.75391],
      [10, 8, 0.10938],
      [10, 9, 0.02148],
      [100, 60, 0.05689],
      [100, 62, 0.02098],
      [200, 120, 0.00569],
      [50, 32, 0.06491],
      [500, 270, 0.08103],
    ];
    for (const [n, h, p] of cases) expect(twoSidedPValue(n, h)).toBeCloseTo(p, 4);
    expect(twoSidedPValue(100, 50)).toBe(1);
  });
});
