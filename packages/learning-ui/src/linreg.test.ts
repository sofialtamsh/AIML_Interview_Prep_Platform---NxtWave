import { describe, expect, it } from 'vitest';
import {
  descend,
  equationOf,
  evaluate,
  gdStep,
  gradient,
  makePattern,
  ols,
  type P,
  predictionWorking,
  scalingOf,
  standardise,
  stepsToFit,
  toRaw,
  toScaled,
} from './linreg';

// Expected values come from NumPy 2.5 and scikit-learn 1.9.1 (LinearRegression, r2_score,
// mean_squared_error, mean_absolute_error) on the lesson's six alumni records.
const SALARY: P[] = [
  [1, 6],
  [2, 6],
  [3, 9],
  [4, 11],
  [5, 12],
  [6, 16],
].map(([x, y]) => ({ x, y }) as P);
const r = (v: number, d = 4) => +v.toFixed(d);

describe('least squares', () => {
  it('finds scikit-learn’s line and shows its working', () => {
    const fit = ols(SALARY);
    expect(fit.line).toEqual({ m: 2, b: 3 });
    expect([fit.xbar, fit.ybar, fit.sxy, fit.sxx]).toEqual([3.5, 10, 35, 17.5]);
  });

  it('is pulled hard by one outlier', () => {
    const fit = ols([...SALARY, { x: 7, y: 4 }]);
    expect([r(fit.line.m, 3), r(fit.line.b, 3)]).toEqual([0.607, 6.714]);
    expect(r(evaluate([...SALARY, { x: 7, y: 4 }], fit.line).r2, 3)).toBe(0.098);
  });
});

describe('loss and metrics', () => {
  it('matches scikit-learn for the best line', () => {
    const e = evaluate(SALARY, { m: 2, b: 3 });
    expect(e.residuals).toEqual([1, -1, 0, 0, -1, 1]);
    expect([e.sse, e.sst]).toEqual([4, 74]);
    expect([r(e.mse), r(e.rmse), r(e.mae), r(e.r2)]).toEqual([0.6667, 0.8165, 0.6667, 0.9459]);
  });

  it('matches for a poor line', () => {
    const e = evaluate(SALARY, { m: 1, b: 5 });
    expect(e.residuals).toEqual([0, -1, 1, 2, 2, 5]);
    expect([e.sse, r(e.mse), r(e.mae), r(e.r2, 3)]).toEqual([35, 5.8333, 1.8333, 0.527]);
  });
});

describe('gradient descent', () => {
  it('computes the gradient and the first updates by the textbook formulas', () => {
    const g0 = gradient(SALARY, { m: 0, b: 0 });
    expect([r(g0.gm), r(g0.gb)]).toEqual([-81.6667, -20]);
    const one = gdStep(SALARY, { m: 0, b: 0 }, 0.01);
    expect([r(one.m), r(one.b)]).toEqual([0.8167, 0.2]);
    const run = descend(SALARY, { m: 0, b: 0 }, 0.01, 2);
    expect(run.mse.map((v) => r(v))).toEqual([112.3333, 52.9375, 25.4431]);
    expect(run.diverged).toBe(false);
  });

  it('diverges when the learning rate is too large', () => {
    const run = descend(SALARY, { m: 0, b: 0 }, 0.07, 3);
    expect(run.mse.map((v) => r(v))).toEqual([112.3333, 171.1064, 261.1863, 399.2303]);
    expect(descend(SALARY, { m: 0, b: 0 }, 0.07, 500).diverged).toBe(true);
    expect(stepsToFit(SALARY, { m: 0, b: 0 }, 0.07)).toBeNull();
  });

  it('needs far fewer steps once the feature is standardised', () => {
    expect(stepsToFit(SALARY, { m: 0, b: 0 }, 0.01)).toBe(700);
    expect(stepsToFit(SALARY, { m: 0, b: 0 }, 0.05)).toBe(139);
    const s = scalingOf(SALARY);
    expect(r(s.sd)).toBe(1.7078);
    const z = standardise(SALARY, s);
    expect(stepsToFit(z, { m: 0, b: 0 }, 0.3)).toBe(6);
    // With mean 0 and variance 1 the bowl is round: a rate of 0.5 lands on the answer in one step.
    expect(stepsToFit(z, { m: 0, b: 0 }, 0.5)).toBe(1);
    const fitted = toRaw(gdStep(z, { m: 0, b: 0 }, 0.5), s);
    expect([r(fitted.m), r(fitted.b)]).toEqual([2, 3]);
    const back = toScaled({ m: 2, b: 3 }, s);
    expect([r(back.m, 3), r(back.b, 3)]).toEqual([3.416, 10]);
  });
});

describe('patterns and words', () => {
  it('generates the same points for every student, inside the domain', () => {
    const domain = { x: [0, 8] as [number, number], y: [0, 18] as [number, number] };
    for (const pattern of ['curved', 'funnel'] as const) {
      const a = makePattern(pattern, domain);
      expect(a).toEqual(makePattern(pattern, domain));
      expect(a).toHaveLength(13);
      for (const p of a) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(8);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(18);
      }
    }
  });

  it('writes predictions and equations with their numbers', () => {
    expect(predictionWorking({ m: 2, b: 3 }, 4)).toBe('2 × 4 + 3 = 11');
    expect(predictionWorking({ m: 0.5, b: -1 }, 4)).toBe('0.5 × 4 − 1 = 1');
    expect(equationOf({ m: 2, b: 3 })).toBe('ŷ = 2x + 3');
    expect(equationOf({ m: 0.61, b: -1.5 })).toBe('ŷ = 0.61x − 1.5');
  });
});
