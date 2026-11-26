/**
 * Every number the "more than one feature" lab shows comes from here, so these tests pin the
 * ones the lesson prints. They were checked against scikit-learn 1.9.1 (LinearRegression, and
 * PolynomialFeatures in a pipeline) on the same data: the weights, the scores and the degree
 * ladder below are what sklearn returns, to the digits shown.
 */
import { describe, expect, it } from 'vitest';
import { evaluate, ols } from './linreg';
import {
  adjustedR2,
  correlation,
  olsMulti,
  polyFeatures,
  polyFit,
  scoreDegrees,
  splitHalves,
  vif,
} from './linreg-multi';

/** Six employees: years of experience, projects shipped, salary in LPA. */
const ROWS = [
  [1, 0],
  [2, 1],
  [3, 1],
  [4, 3],
  [5, 2],
  [6, 4],
];
const SALARY = [6, 6, 9, 11, 12, 16];
const YEARS = [1, 2, 3, 4, 5, 6];
/** Years × 12 plus a little noise: the same fact wearing different units. */
const MONTHS = [12.5, 23.6, 36.3, 47.4, 60.2, 72.1];

/** The curved data the lesson fits, and the data its code sample prints scores for. */
const CURVE_X = [0, 0.4, 0.8, 1.2, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 4.4, 4.8, 5.2, 5.6, 6];
const CURVE_Y = [
  3.126, 2.932, 3.896, 3.681, 3.488, 4.962, 6.608, 7.083, 6.392, 6.919, 8.777, 10.785, 9.891,
  13.597, 14.298, 16.668,
];

describe('olsMulti', () => {
  it('fits both weights and the intercept at once', () => {
    const fit = olsMulti(ROWS, SALARY);
    expect(fit.weights[0]).toBeCloseTo(1.625, 10);
    expect(fit.weights[1]).toBeCloseTo(0.525, 10);
    expect(fit.intercept).toBeCloseTo(3.35, 10);
    expect(fit.r2).toBeCloseTo(0.953, 3);
    expect(fit.predict([4, 2])).toBeCloseTo(10.9, 10);
  });

  it('agrees with the single-feature fit when given one column', () => {
    const single = olsMulti(
      YEARS.map((y) => [y]),
      SALARY,
    );
    const points = YEARS.map((x, i) => ({ x, y: SALARY[i] as number }));
    const line = ols(points);
    expect(single.weights[0]).toBeCloseTo(line.line.m, 10);
    expect(single.intercept).toBeCloseTo(line.line.b, 10);
    expect(single.r2).toBeCloseTo(evaluate(points, line.line).r2, 10);
  });

  it('leaves residuals that sum to zero and add up to the SSE', () => {
    const fit = olsMulti(ROWS, SALARY);
    expect(fit.residuals.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
    expect(fit.sse).toBeCloseTo(
      fit.residuals.reduce((a, r) => a + r * r, 0),
      10,
    );
  });
});

describe('adjustedR2', () => {
  it('falls when the extra column pays nothing back', () => {
    const one = olsMulti(
      YEARS.map((y) => [y]),
      SALARY,
    );
    const two = olsMulti(ROWS, SALARY);
    expect(two.r2).toBeGreaterThan(one.r2);
    expect(adjustedR2(one.r2, 6, 1)).toBeCloseTo(0.932, 3);
    expect(adjustedR2(two.r2, 6, 2)).toBeCloseTo(0.922, 3);
    expect(adjustedR2(two.r2, 6, 2)).toBeLessThan(adjustedR2(one.r2, 6, 1));
  });

  it('is undefined when the features leave no degrees of freedom', () => {
    expect(adjustedR2(0.9, 3, 2)).toBeNaN();
  });
});

describe('correlation and vif', () => {
  it('spots two columns carrying one fact', () => {
    expect(correlation(YEARS, MONTHS)).toBeCloseTo(0.9998, 4);
    const [a, b] = vif([YEARS, MONTHS]);
    expect(a).toBeCloseTo(b as number, 6);
    expect(a as number).toBeGreaterThan(1000);
  });

  it('leaves the weights unreadable while the predictions stay put', () => {
    const both = olsMulti(
      YEARS.map((y, i) => [y, MONTHS[i] as number]),
      SALARY,
    );
    expect(both.weights[0]).toBeCloseTo(-8.75, 2);
    expect(both.weights[1]).toBeCloseTo(0.9, 2);
    // The fit is no better for it: R² barely moves from the one-column fit.
    const one = olsMulti(
      YEARS.map((y) => [y]),
      SALARY,
    );
    expect(both.r2 - one.r2).toBeLessThan(0.02);
  });

  it('is 0 for a column that never moves', () => {
    expect(correlation([1, 1, 1], [2, 5, 9])).toBe(0);
  });
});

describe('polynomial fitting', () => {
  it('builds one column per power', () => {
    expect(polyFeatures([2, 3], 3)).toEqual([
      [2, 4, 8],
      [3, 9, 27],
    ]);
  });

  it('recovers a polynomial it was given exactly', () => {
    const xs = [-3, -2, -1, 0, 1, 2, 3, 4];
    const ys = xs.map((x) => 5 - 2 * x + 0.5 * x ** 2);
    const fit = polyFit(xs, ys, 2);
    expect(fit.r2).toBeCloseTo(1, 10);
    expect(fit.intercept).toBeCloseTo(5, 8);
    expect(fit.weights[0]).toBeCloseTo(-2, 8);
    expect(fit.weights[1]).toBeCloseTo(0.5, 8);
    expect(fit.at(10)).toBeCloseTo(5 - 20 + 50, 6);
  });

  it('matches the single-feature line at degree 1', () => {
    const fit = polyFit(YEARS, SALARY, 1);
    const line = ols(YEARS.map((x, i) => ({ x, y: SALARY[i] as number })));
    expect(fit.weights[0]).toBeCloseTo(line.line.m, 8);
    expect(fit.intercept).toBeCloseTo(line.line.b, 8);
  });

  it('stays steady at a high degree, where raw powers lose their digits', () => {
    // Raw x⁹ against x would cost most of the available digits; a centred fit keeps its footing.
    const fit = polyFit(CURVE_X, CURVE_Y, 9);
    expect(fit.r2).toBeGreaterThan(0.97);
    for (const x of CURVE_X) {
      expect(Number.isFinite(fit.at(x))).toBe(true);
      expect(fit.at(x)).toBeGreaterThan(0);
      expect(fit.at(x)).toBeLessThan(20);
    }
  });
});

describe('scoring held-back points', () => {
  it('holds every second point back, and keeps both halves across the range', () => {
    expect(splitHalves(16)).toEqual({
      train: [0, 2, 4, 6, 8, 10, 12, 14],
      test: [1, 3, 5, 7, 9, 11, 13, 15],
    });
  });

  it('reproduces the degree ladder the lesson prints', () => {
    const scores = scoreDegrees(CURVE_X, CURVE_Y, [1, 2, 3, 5]);
    expect(scores.map((s) => [s.degree, +s.trainR2.toFixed(3), +s.testR2.toFixed(3)])).toEqual([
      [1, 0.893, 0.869],
      [2, 0.96, 0.957],
      [3, 0.965, 0.964],
      [5, 0.977, 0.91],
    ]);
  });

  it('passes through every training point at the degree that can, and collapses on the rest', () => {
    // Eight training points leave degree 7 one weight per point: a perfect fit, and useless.
    const [seven] = scoreDegrees(CURVE_X, CURVE_Y, [7]);
    expect(seven?.trainR2).toBeCloseTo(1, 6);
    expect(seven?.testR2).toBeLessThan(0);
  });
});
