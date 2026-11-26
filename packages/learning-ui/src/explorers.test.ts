import { describe, expect, it } from 'vitest';
import {
  activation,
  bestEpoch,
  optimizerPath,
  polyFeatures,
  seededRandom,
  trainingData,
  trainPolynomial,
  valleyLoss,
} from './explorers';

/** The preset the lessons use: what students are told they will discover must stay true. */
const data = trainingData(56, 12, 0.3);
const train = (degree: number, learningRate: number, l2 = 0, epochs = 3000) =>
  trainPolynomial(data, { degree, learningRate, l2, epochs });
const min = (a: number[]) => Math.min(...a);

describe('training explorer maths', () => {
  it('is deterministic for a seed', () => {
    expect(trainingData(56, 12, 0.3)).toEqual(data);
    const r = seededRandom(1);
    const a = [r(), r(), r()];
    expect(a.every((v) => v >= 0 && v < 1)).toBe(true);
  });

  it('builds unit-variance Legendre features', () => {
    expect(polyFeatures(0.5, 2)).toEqual([
      1,
      0.5 * Math.sqrt(3),
      ((3 * 0.25 - 1) / 2) * Math.sqrt(5),
    ]);
  });

  it('shows overfitting with a degree 9 model trained too long', () => {
    const r = train(9, 0.05);
    const best = bestEpoch(r, 3000);
    expect(best).toBeLessThan(60);
    expect(r.val.at(-1) as number).toBeGreaterThan(3 * (r.val[best - 1] as number));
    expect(r.train.at(-1) as number).toBeLessThan(r.train[best - 1] as number);
  });

  it('diverges with too high a learning rate, and learns slowly with a tiny one', () => {
    expect(train(9, 0.5, 0, 200).divergedAt).not.toBeNull();
    expect(train(9, 0.2).divergedAt).toBeNull();
    expect(bestEpoch(train(9, 0.01), 3000)).toBeGreaterThan(bestEpoch(train(9, 0.05), 3000));
  });

  it('fixes overfitting with L2 or a simpler model, and underfits with a straight line', () => {
    const l2 = train(9, 0.05, 0.3);
    expect(l2.val.at(-1) as number).toBeLessThan(1.15 * min(l2.val));
    const d3 = train(3, 0.05);
    expect(d3.val.at(-1) as number).toBeLessThan(1.3 * min(d3.val));
    expect(train(1, 0.05).train.at(-1) as number).toBeGreaterThan(0.2);
  });
});

describe('optimizer race maths', () => {
  const end = (name: 'sgd' | 'momentum' | 'adam', learningRate: number, steps = 40) => {
    const [x, y] = optimizerPath(name, { learningRate, momentum: 0.9, steps }).at(-1) as [
      number,
      number,
    ];
    return valleyLoss(x, y);
  };

  it('shows each optimizer’s character at the default settings', () => {
    // Plain SGD creeps along the gentle direction; momentum and Adam get much closer.
    expect(end('sgd', 0.3)).toBeGreaterThan(5 * end('momentum', 0.3));
    expect(end('sgd', 0.3)).toBeGreaterThan(5 * end('adam', 0.3));
  });

  it('makes SGD zig-zag at 0.9 and diverge at 1.05, while Adam survives', () => {
    const ys = optimizerPath('sgd', { learningRate: 0.9, momentum: 0.9, steps: 10 }).map(
      (p) => p[1],
    );
    const flips = ys.slice(1).filter((y, i) => Math.sign(y) !== Math.sign(ys[i] as number)).length;
    expect(flips).toBe(10);
    expect(end('sgd', 1.05, 40)).toBeGreaterThan(1000);
    expect(end('adam', 1.05, 40)).toBeLessThan(0.1);
  });
});

describe('activation explorer maths', () => {
  it('gives the textbook values and slopes', () => {
    expect(activation('sigmoid', 0)).toEqual({ a: 0.5, slope: 0.25 });
    expect(activation('tanh', 0)).toEqual({ a: 0, slope: 1 });
    expect(activation('relu', -2)).toEqual({ a: 0, slope: 0 });
    expect(activation('leaky-relu', -2, 0.1)).toEqual({ a: -0.2, slope: 0.1 });
    // Sigmoid saturates: far from 0 the slope is almost zero (vanishing gradients).
    expect(activation('sigmoid', 6).slope).toBeLessThan(0.01);
  });
});
