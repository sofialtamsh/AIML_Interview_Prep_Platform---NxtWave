/**
 * Every number the logistic regression lab shows comes from here, so these tests pin the ones the
 * lesson prints. The expected values come from scikit-learn 1.9.1 on the same data:
 * LogisticRegression, log_loss, roc_curve, roc_auc_score and StandardScaler.
 */
import { describe, expect, it } from 'vitest';
import {
  auc,
  boundary1d,
  boundary2d,
  type Confusion,
  confusion,
  descend,
  fitL2,
  fit as fitLikelihood,
  gdStep,
  gradient,
  logit,
  logLoss,
  type Model,
  oddsOf,
  probaOf,
  probas,
  rocCurve,
  rowLoss,
  scoreOf,
  sigmoid,
  standardiseRows,
  toRawModel,
} from './logreg';

/** Ten students: hours of practice, and whether each cleared the test. */
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((h) => [h]);
const CLEARED = [0, 0, 0, 1, 0, 1, 0, 1, 1, 1];

/** Twelve students: hours of practice and mock tests taken, with the same outcome. */
const PREP = [
  [1, 1],
  [2, 0],
  [2, 2],
  [3, 1],
  [4, 3],
  [4, 0],
  [5, 2],
  [6, 1],
  [6, 4],
  [7, 2],
  [8, 3],
  [9, 1],
];
const PREP_CLEARED = [0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1];

/** Rounds for comparison. The `|| 0` turns −0 into 0, which toEqual tells apart. */
const r = (v: number, d = 4) => +v.toFixed(d) || 0;
const counts = (c: Confusion) => [c.tp, c.fp, c.tn, c.fn];
/** The largest difference between two models, over every weight and the intercept. */
const gap = (a: Model, b: Model) =>
  Math.max(
    Math.abs(a.intercept - b.intercept),
    ...a.weights.map((w, j) => Math.abs(w - (b.weights[j] ?? 0))),
  );
const ZERO: Model = { weights: [0], intercept: 0 };

// LogisticRegression(C=np.inf, tol=1e-10, max_iter=10000): no penalty, run until lbfgs is done.
const SK_PLAIN: Model = { weights: [0.6767057612313443], intercept: -3.721881687439491 };
// LogisticRegression() with every default. Its lbfgs stops at tol=1e-4, short of the true optimum.
const SK_DEFAULT_ONE: Model = { weights: [0.5926010525333822], intercept: -3.25936156577777 };
const SK_DEFAULT_TWO: Model = {
  weights: [0.9640496664547253, 0.677548404994297],
  intercept: -5.72220148031131,
};
// The same default penalty with tol=1e-12, where lbfgs has nothing left to gain.
const SK_TIGHT_ONE: Model = { weights: [0.5926068387537248], intercept: -3.2593376151431817 };
const SK_TIGHT_TWO: Model = {
  weights: [0.9640481821566471, 0.6775583137117261],
  intercept: -5.72222423366239,
};

describe('sigmoid, odds and log-odds', () => {
  it('turns a score into a probability and back', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect([r(sigmoid(2)), r(sigmoid(-2))]).toEqual([0.8808, 0.1192]);
    expect(sigmoid(-1.3)).toBeCloseTo(1 - sigmoid(1.3), 12);
    expect(logit(sigmoid(3))).toBeCloseTo(3, 12);
    expect(logit(0.5)).toBe(0);
    expect(oddsOf(0.75)).toBe(3);
    expect(Math.log(oddsOf(0.2))).toBeCloseTo(logit(0.2), 12);
  });

  it('stays a number however large the score', () => {
    expect([sigmoid(800), sigmoid(-800)]).toEqual([1, 0]);
    expect(sigmoid(40)).toBeLessThanOrEqual(1);
    expect(sigmoid(-40)).toBeGreaterThan(0);
  });
});

describe('a model and its predictions', () => {
  const model: Model = { weights: [0.5, -1], intercept: 1 };

  it('scores a row, then squashes the score', () => {
    expect(scoreOf(model, [4, 2])).toBe(1);
    expect(r(probaOf(model, [4, 2]))).toBe(0.7311);
    expect(
      probas(model, [
        [4, 2],
        [0, 1],
      ]).map((p) => r(p)),
    ).toEqual([0.7311, 0.5]);
  });

  it('reads the intercept alone when there are no features', () => {
    expect(probaOf({ weights: [], intercept: 0 }, [])).toBe(0.5);
  });
});

describe('log loss', () => {
  it('charges each row for the probability it gave the truth', () => {
    expect(
      [rowLoss(1, 0.9), rowLoss(0, 0.2), rowLoss(1, 0.4), rowLoss(0, 0.7)].map((v) => r(v)),
    ).toEqual([0.1054, 0.2231, 0.9163, 1.204]);
  });

  it('matches log_loss on a short vector', () => {
    expect(logLoss([1, 0, 1, 1, 0], [0.9, 0.2, 0.6, 0.4, 0.7])).toBeCloseTo(0.5919186453876235, 12);
  });

  it('is ln 2 for the all-zero model, which says 0.5 for every row', () => {
    const one = logLoss(CLEARED, probas(ZERO, HOURS));
    const two = logLoss(PREP_CLEARED, probas({ weights: [0, 0], intercept: 0 }, PREP));
    // Compared as printed digits: a bare 0.6931 reads to the linter as a mistyped Math.LN2.
    expect([one.toFixed(4), two.toFixed(4)]).toEqual(['0.6931', '0.6931']);
    expect(one).toBeCloseTo(Math.LN2, 12);
  });

  it('keeps a certain, wrong prediction large but finite, at scikit-learn’s value', () => {
    expect(rowLoss(1, 0)).toBeCloseTo(36.04365338911715, 10);
    expect(rowLoss(0, 1)).toBeCloseTo(36.04365338911715, 10);
    expect(rowLoss(1, 1)).toBeLessThan(1e-15);
    expect(rowLoss(0, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe('gradient descent', () => {
  it('computes the gradient at the all-zero model', () => {
    const g = gradient(ZERO, HOURS, CLEARED);
    expect(g.gw).toHaveLength(1);
    expect([r(g.gw[0] as number), r(g.gb)]).toEqual([-0.95, 0]);
  });

  it('takes its first three steps by the textbook formulas', () => {
    const run = descend(ZERO, HOURS, CLEARED, 0.1, 3);
    expect(run.models.map((m) => r(m.weights[0] as number, 6))).toEqual([
      0, 0.095, 0.102791, 0.10566,
    ]);
    expect(run.models.map((m) => r(m.intercept, 6))).toEqual([0, 0, -0.012555, -0.025767]);
    expect(run.loss.map((v) => v.toFixed(6))).toEqual([
      '0.693147',
      '0.645303',
      '0.643271',
      '0.641451',
    ]);
    expect(run.models[1]).toEqual(gdStep(ZERO, HOURS, CLEARED, 0.1));
  });

  it('keeps the start model and every model after it', () => {
    const run = descend(ZERO, HOURS, CLEARED, 0.1, 25);
    expect(run.models).toHaveLength(26);
    expect(run.loss).toHaveLength(26);
    expect(run.models[0]).toBe(ZERO);
    for (let i = 1; i < run.loss.length; i++) {
      expect(run.loss[i] as number).toBeLessThan(run.loss[i - 1] as number);
    }
  });

  it('reaches the fitted weights far sooner once the feature is standardised', () => {
    const best = fitLikelihood(HOURS, CLEARED);
    const z = standardiseRows(HOURS);
    const scaled = descend(ZERO, z.rows, CLEARED, 1, 200);
    const raw = descend(ZERO, HOURS, CLEARED, 0.1, 200);
    const arrived = toRawModel(scaled.models[200] as Model, z.means, z.sds);
    expect(gap(arrived, best.model)).toBeLessThan(1e-6);
    expect(scaled.loss[200] as number).toBeCloseTo(best.loss, 10);
    // On raw hours the same 200 steps are still a long way up the slope.
    expect((raw.loss[200] as number) - best.loss).toBeGreaterThan(0.04);
  });

  it('stops rather than record a loss that is not a number', () => {
    const run = descend(ZERO, HOURS, CLEARED, Number.POSITIVE_INFINITY, 5);
    expect(run.models).toEqual([ZERO]);
    expect(run.loss).toHaveLength(1);
  });
});

describe('fit, with no penalty', () => {
  const best = fitLikelihood(HOURS, CLEARED);
  const ps = probas(best.model, HOURS);

  it('finds scikit-learn’s weights for one feature', () => {
    expect(best.converged).toBe(true);
    expect(best.separable).toBe(false);
    expect(gap(best.model, SK_PLAIN)).toBeLessThan(1e-4);
    expect([r(best.model.weights[0] as number, 6), r(best.model.intercept, 6)]).toEqual([
      0.676706, -3.721882,
    ]);
    expect(r(best.loss, 6)).toBe(0.433511);
  });

  it('gives each row scikit-learn’s probability', () => {
    expect(ps.map((p) => r(p))).toEqual([
      0.0454, 0.0856, 0.1555, 0.266, 0.4162, 0.5838, 0.734, 0.8445, 0.9144, 0.9546,
    ]);
    expect(best.loss).toBeCloseTo(logLoss(CLEARED, ps), 12);
  });

  it('leaves the loss with no slope left', () => {
    const g = gradient(best.model, HOURS, CLEARED);
    expect(Math.abs(g.gw[0] as number)).toBeLessThan(1e-9);
    expect(Math.abs(g.gb)).toBeLessThan(1e-9);
  });

  it('gives the same predictions whatever units the feature is in', () => {
    const minutes = HOURS.map((row) => row.map((h) => h * 60));
    const other = fitLikelihood(minutes, CLEARED);
    expect(other.model.weights[0] as number).toBeCloseTo(
      (best.model.weights[0] as number) / 60,
      10,
    );
    expect(other.model.intercept).toBeCloseTo(best.model.intercept, 8);
    expect(other.loss).toBeCloseTo(best.loss, 12);
  });

  it('shows the model after any number of Newton steps', () => {
    const start = fitLikelihood(HOURS, CLEARED, { maxIterations: 0 });
    expect(start.model).toEqual(ZERO);
    expect([start.iterations, start.converged]).toEqual([0, false]);
    const losses = [0, 1, 2, 3, 4].map(
      (k) => fitLikelihood(HOURS, CLEARED, { maxIterations: k }).loss,
    );
    expect(losses.map((v) => v.toFixed(4))).toEqual([
      '0.6931',
      '0.4514',
      '0.4343',
      '0.4335',
      '0.4335',
    ]);
    // Six steps are all it takes, and the sixth is already recognised as the last.
    expect(best.iterations).toBe(6);
    expect(fitLikelihood(HOURS, CLEARED, { maxIterations: 6 })).toEqual(best);
    expect(fitLikelihood(HOURS, CLEARED, { maxIterations: 5 }).converged).toBe(false);
  });

  it('calls cleanly split classes separable instead of chasing infinity', () => {
    const rows = [[1], [2], [3], [4], [5], [6]];
    const split = fitLikelihood(rows, [0, 0, 0, 1, 1, 1]);
    expect([split.separable, split.converged]).toEqual([true, false]);
    expect(split.iterations).toBeLessThan(40);
    expect(Number.isFinite(split.model.weights[0])).toBe(true);
    expect(Number.isFinite(split.model.intercept)).toBe(true);
    expect(split.loss).toBeLessThan(1e-8);
    expect(boundary1d(split.model) as number).toBeCloseTo(3.5, 6);
  });

  it('also catches classes that only touch at the boundary', () => {
    const rows = [[1], [2], [3], [3], [4], [5]];
    const touching = fitLikelihood(rows, [0, 0, 0, 1, 1, 1]);
    expect([touching.separable, touching.converged]).toEqual([true, false]);
    // The two rows at x = 3 share a probability of 0.5 and are the only loss left.
    expect(probas(touching.model, rows).map((p) => r(p))).toEqual([0, 0, 0.5, 0.5, 1, 1]);
    expect(touching.loss).toBeCloseTo((2 * Math.LN2) / 6, 7);
    expect(boundary1d(touching.model) as number).toBeCloseTo(3, 6);
  });

  it('treats a single class as separable, and no rows as nothing to fit', () => {
    const same = fitLikelihood([[1], [2], [3]], [0, 0, 0]);
    expect(same.separable).toBe(true);
    expect(same.model.weights).toEqual([0]);
    expect(probaOf(same.model, [2])).toBeLessThan(1e-6);
    expect(fitLikelihood([], [])).toEqual({
      model: { weights: [], intercept: 0 },
      loss: 0,
      iterations: 0,
      converged: true,
      separable: false,
    });
  });

  it('gives no weight to a column that never varies', () => {
    const padded = fitLikelihood(
      HOURS.map((row) => [...row, 7]),
      CLEARED,
    );
    expect(padded.model.weights[1]).toBe(0);
    expect(
      gap(
        { weights: [padded.model.weights[0] as number], intercept: padded.model.intercept },
        best.model,
      ),
    ).toBeLessThan(1e-9);
  });
});

describe('the two-feature data, which has no best weights', () => {
  // The rows (4, 3), (5, 2) and (6, 1) lie on the line x1 + x2 = 7 with labels 1, 0, 1. Every other
  // row is on its own side of that line, so the weights grow for ever. With no penalty scikit-learn
  // returns (11.13, 11.13, −77.22) at tol=1e-10 and (4.64, 4.64, −31.81) at its default tolerance.
  const stopped = fitLikelihood(PREP, PREP_CLEARED);
  const ps = probas(stopped.model, PREP);

  it('is reported as separable, with weights still growing', () => {
    expect([stopped.separable, stopped.converged]).toEqual([true, false]);
    const [w1 = 0, w2 = 0] = stopped.model.weights;
    expect(w1).toBeGreaterThan(5);
    expect(w1 / w2).toBeCloseTo(1, 6);
    expect(Number.isFinite(stopped.model.intercept)).toBe(true);
  });

  it('settles on the loss and probabilities scikit-learn’s run also ends at', () => {
    // The loss cannot fall below (2·ln 1.5 + ln 3) / 12: the three rows on the line share 2/3.
    expect(r(stopped.loss)).toBe(0.1591);
    expect(stopped.loss).toBeCloseTo((2 * Math.log(1.5) + Math.log(3)) / 12, 8);
    expect(ps.map((p) => r(p))).toEqual([0, 0, 0, 0, 0.6667, 0, 0.6667, 0.6667, 1, 1, 1, 1]);
  });

  it('scores as scikit-learn’s stopped fit does', () => {
    expect([0.3, 0.5, 0.7].map((t) => counts(confusion(PREP_CLEARED, ps, t)))).toEqual([
      [6, 1, 5, 0],
      [6, 1, 5, 0],
      [4, 0, 6, 2],
    ]);
    expect(r(auc(PREP_CLEARED, ps))).toBe(0.9722);
  });

  it('draws the boundary just under the line the weights are heading for', () => {
    const line = boundary2d(stopped.model) as { slope: number; intercept: number };
    expect(line.slope).toBeCloseTo(-1, 6);
    // 7 − ln 2 / w: it reaches 7 only in the limit, and scikit-learn stops at 6.94.
    expect(line.intercept).toBeGreaterThan(6.9);
    expect(line.intercept).toBeLessThan(7);
  });
});

describe('fitL2, scikit-learn’s default', () => {
  const one = fitL2(HOURS, CLEARED);
  const two = fitL2(PREP, PREP_CLEARED);

  it('matches the default fit on one feature', () => {
    expect([one.converged, one.separable]).toEqual([true, false]);
    expect(gap(one.model, SK_DEFAULT_ONE)).toBeLessThan(1e-3);
    expect(gap(one.model, SK_TIGHT_ONE)).toBeLessThan(1e-6);
    expect([
      r(one.model.weights[0] as number, 3),
      r(one.model.intercept, 3),
      r(one.loss, 3),
    ]).toEqual([0.593, -3.259, 0.436]);
    expect(probas(one.model, HOURS).map((p) => r(p, 3))).toEqual([
      0.065, 0.112, 0.185, 0.291, 0.426, 0.574, 0.709, 0.815, 0.888, 0.935,
    ]);
    expect(r(boundary1d(one.model) as number, 3)).toBe(5.5);
  });

  it('matches the default fit on two features', () => {
    expect([two.converged, two.separable]).toEqual([true, false]);
    expect(gap(two.model, SK_DEFAULT_TWO)).toBeLessThan(1e-3);
    expect(gap(two.model, SK_TIGHT_TWO)).toBeLessThan(1e-6);
    expect([...two.model.weights, two.model.intercept, two.loss].map((v) => r(v, 3))).toEqual([
      0.964, 0.678, -5.722, 0.21,
    ]);
    expect(probas(two.model, PREP).map((p) => r(p, 3))).toEqual([
      0.017, 0.022, 0.08, 0.104, 0.542, 0.134, 0.611, 0.677, 0.941, 0.915, 0.982, 0.974,
    ]);
  });

  it('scores the two-feature fit as scikit-learn does', () => {
    const ps = probas(two.model, PREP);
    expect([0.3, 0.5, 0.7].map((t) => counts(confusion(PREP_CLEARED, ps, t)))).toEqual([
      [6, 1, 5, 0],
      [6, 1, 5, 0],
      [4, 0, 6, 2],
    ]);
    expect(r(auc(PREP_CLEARED, ps))).toBe(0.9722);
    const line = boundary2d(two.model) as { slope: number; intercept: number };
    expect([r(line.slope, 3), r(line.intercept, 3)]).toEqual([-1.423, 8.445]);
  });

  it('shrinks the weights harder as C falls', () => {
    // Reference weights from LogisticRegression(C=C, tol=1e-12).
    expect(
      gap(fitL2(HOURS, CLEARED, 0.1).model, {
        weights: [0.33648581697618507],
        intercept: -1.8506719933713356,
      }),
    ).toBeLessThan(1e-6);
    expect(
      gap(fitL2(HOURS, CLEARED, 10).model, {
        weights: [0.6662965914346596],
        intercept: -3.66463125075724,
      }),
    ).toBeLessThan(1e-6);
    expect(
      gap(fitL2(PREP, PREP_CLEARED, 0.1).model, {
        weights: [0.4428600562962202, 0.20886537215710144],
        intercept: -2.4486934263168996,
      }),
    ).toBeLessThan(1e-6);
    expect(
      gap(fitL2(PREP, PREP_CLEARED, 10).model, {
        weights: [1.529854387718921, 1.4043262189967343],
        intercept: -9.808653930630541,
      }),
    ).toBeLessThan(1e-6);
    const sizes = [0.1, 1, 10].map((C) => fitL2(HOURS, CLEARED, C).model.weights[0] as number);
    expect(sizes[0] as number).toBeLessThan(sizes[1] as number);
    expect(sizes[1] as number).toBeLessThan(sizes[2] as number);
    expect(sizes[2] as number).toBeLessThan(
      fitLikelihood(HOURS, CLEARED).model.weights[0] as number,
    );
  });

  it('approaches the unpenalised fit as C grows', () => {
    // LogisticRegression(C=1e6, tol=1e-12) gives 0.6767056541 and −3.7218810982.
    const loose = fitL2(HOURS, CLEARED, 1e6).model;
    expect(
      gap(loose, { weights: [0.6767056540896532], intercept: -3.7218810981600914 }),
    ).toBeLessThan(1e-6);
    expect(gap(loose, fitLikelihood(HOURS, CLEARED).model)).toBeLessThan(1e-5);
    expect(
      gap(
        fitL2(HOURS, CLEARED, Number.POSITIVE_INFINITY).model,
        fitLikelihood(HOURS, CLEARED).model,
      ),
    ).toBe(0);
  });

  it('depends on the feature’s units, exactly as scikit-learn’s penalty does', () => {
    const z = standardiseRows(HOURS);
    const scaled = fitL2(z.rows, CLEARED);
    // LogisticRegression() on StandardScaler output: weight 1.0430, intercept 0.
    expect(gap(scaled.model, { weights: [1.043011141552472], intercept: 0 })).toBeLessThan(1e-3);
    const back = toRawModel(scaled.model, z.means, z.sds);
    expect(r(back.weights[0] as number, 3)).toBe(0.363);
    expect(r(one.model.weights[0] as number, 3)).toBe(0.593);
  });

  it('keeps the weights finite on data a plain fit cannot settle', () => {
    const split = fitL2([[1], [2], [3], [4], [5], [6]], [0, 0, 0, 1, 1, 1]);
    expect([split.converged, split.separable]).toEqual([true, false]);
    expect(r(split.model.weights[0] as number, 3)).toBe(1.121);
  });
});

describe('confusion', () => {
  const ps = probas(fitLikelihood(HOURS, CLEARED).model, HOURS);

  it('counts the four outcomes at each threshold', () => {
    expect([0.3, 0.5, 0.7].map((t) => counts(confusion(CLEARED, ps, t)))).toEqual([
      [4, 2, 3, 1],
      [4, 1, 4, 1],
      [3, 1, 4, 2],
    ]);
    expect(counts(confusion(CLEARED, ps))).toEqual([4, 1, 4, 1]);
  });

  it('turns the counts into the rates scikit-learn reports', () => {
    const rates = (c: Confusion) => [c.accuracy, c.precision, c.recall, c.f1].map((v) => r(v));
    expect(rates(confusion(CLEARED, ps, 0.3))).toEqual([0.7, 0.6667, 0.8, 0.7273]);
    expect(rates(confusion(CLEARED, ps, 0.5))).toEqual([0.8, 0.8, 0.8, 0.8]);
    expect(rates(confusion(CLEARED, ps, 0.7))).toEqual([0.7, 0.75, 0.6, 0.6667]);
  });

  it('counts a probability exactly on the threshold as positive', () => {
    expect(counts(confusion([1, 0], [0.5, 0.5], 0.5))).toEqual([1, 1, 0, 0]);
    expect(counts(confusion([1, 0], [0.5, 0.5], 0.51))).toEqual([0, 0, 1, 1]);
  });

  it('reports 0 where a rate has nothing to divide by', () => {
    const none = confusion(CLEARED, ps, 2);
    expect([none.tp, none.fp, none.precision, none.recall, none.f1]).toEqual([0, 0, 0, 0, 0]);
    expect(confusion([0, 0], [0.9, 0.1]).recall).toBe(0);
    expect(confusion([], []).accuracy).toBe(0);
  });
});

describe('ROC curve and AUC', () => {
  const ps = probas(fitLikelihood(HOURS, CLEARED).model, HOURS);

  it('traces scikit-learn’s curve from (0, 0) to (1, 1)', () => {
    const curve = rocCurve(CLEARED, ps);
    expect(curve.map((q) => r(q.fpr))).toEqual([0, 0, 0, 0, 0.2, 0.2, 0.4, 0.4, 0.6, 0.8, 1]);
    expect(curve.map((q) => r(q.tpr))).toEqual([0, 0.2, 0.4, 0.6, 0.6, 0.8, 0.8, 1, 1, 1, 1]);
    expect(curve[0]?.threshold).toBe(Number.POSITIVE_INFINITY);
    expect(curve.slice(1).map((q) => q.threshold)).toEqual([...ps].sort((a, b) => b - a));
  });

  it('matches roc_auc_score', () => {
    expect(auc(CLEARED, ps)).toBeCloseTo(0.88, 12);
    expect(auc(PREP_CLEARED, probas(fitL2(PREP, PREP_CLEARED).model, PREP))).toBeCloseTo(
      35 / 36,
      12,
    );
  });

  it('scores a tied pair as half a win', () => {
    const ys = [1, 0, 1, 0];
    const tied = [0.8, 0.8, 0.4, 0.2];
    expect(auc(ys, tied)).toBe(0.625);
    expect(rocCurve(ys, tied).map((q) => [q.fpr, q.tpr, q.threshold])).toEqual([
      [0, 0, Number.POSITIVE_INFINITY],
      [0.5, 0.5, 0.8],
      [0.5, 1, 0.4],
      [1, 1, 0.2],
    ]);
    expect(auc([1, 1, 0, 0, 1, 0], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5])).toBe(0.5);
  });

  it('equals the area under its own curve', () => {
    const area = (ys: number[], scores: number[]) => {
      const curve = rocCurve(ys, scores);
      return curve.slice(1).reduce((acc, q, i) => {
        const before = curve[i] ?? q;
        return acc + ((q.fpr - before.fpr) * (q.tpr + before.tpr)) / 2;
      }, 0);
    };
    expect(area(CLEARED, ps)).toBeCloseTo(auc(CLEARED, ps), 12);
    expect(area([1, 0, 1, 0], [0.8, 0.8, 0.4, 0.2])).toBeCloseTo(0.625, 12);
  });

  it('is undefined when a class is missing', () => {
    expect(auc([1, 1], [0.2, 0.3])).toBeNaN();
    expect(auc([], [])).toBeNaN();
    expect(rocCurve([1, 1], [0.2, 0.3]).map((q) => q.tpr)).toEqual([0, 0.5, 1]);
  });
});

describe('decision boundary', () => {
  it('finds where one feature’s probability crosses the threshold', () => {
    const model = fitLikelihood(HOURS, CLEARED).model;
    expect(boundary1d(model)).toBeCloseTo(5.5, 9);
    expect([0.3, 0.7].map((t) => r(boundary1d(model, t) as number))).toEqual([4.2479, 6.7521]);
    expect(probaOf(model, [boundary1d(model, 0.7) as number])).toBeCloseTo(0.7, 12);
  });

  it('has no crossing for a flat curve or an impossible threshold', () => {
    expect(boundary1d({ weights: [0], intercept: 1 })).toBeNull();
    expect(boundary1d({ weights: [2], intercept: -4 }, 1)).toBeNull();
    expect(boundary1d({ weights: [2], intercept: -4 })).toBe(2);
  });

  it('draws the line for two features', () => {
    const model = fitL2(PREP, PREP_CLEARED).model;
    for (const threshold of [0.5, 0.8]) {
      const line = boundary2d(model, threshold) as { slope: number; intercept: number };
      for (const x1 of [0, 3, 9]) {
        expect(probaOf(model, [x1, line.slope * x1 + line.intercept])).toBeCloseTo(threshold, 12);
      }
    }
    expect(boundary2d({ weights: [1, 2], intercept: -4 })).toEqual({ slope: -0.5, intercept: 2 });
  });

  it('stands the line upright when only the first feature counts', () => {
    expect(boundary2d({ weights: [1, 0], intercept: -4 })).toEqual({ vertical: 4 });
    expect(boundary2d({ weights: [0, 2], intercept: -4 })).toEqual({ slope: 0, intercept: 2 });
    expect(boundary2d({ weights: [0, 0], intercept: -4 })).toBeNull();
  });
});

describe('standardising', () => {
  it('centres and scales each column as StandardScaler does', () => {
    const z = standardiseRows(PREP);
    expect(z.means.map((v) => r(v))).toEqual([4.75, 1.6667]);
    expect(z.sds.map((v) => r(v))).toEqual([2.4195, 1.1785]);
    expect(z.rows[0]?.map((v) => r(v))).toEqual([-1.5499, -0.5657]);
    const again = standardiseRows(z.rows);
    expect(again.means.map((v) => r(v, 10))).toEqual([0, 0]);
    expect(again.sds.map((v) => r(v, 10))).toEqual([1, 1]);
    expect(r(standardiseRows(HOURS).sds[0] as number)).toBe(2.8723);
  });

  it('gives a constant column a spread of 1 and leaves it at zero', () => {
    const z = standardiseRows([
      [0.1, 1],
      [0.1, 2],
      [0.1, 3],
      [0.1, 4],
      [0.1, 5],
      [0.1, 6],
    ]);
    expect([z.means[0], z.sds[0]]).toEqual([0.1, 1]);
    expect(z.rows.map((row) => row[0])).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('converts a standardised fit back to raw units', () => {
    const z = standardiseRows(HOURS);
    const scaled = fitLikelihood(z.rows, CLEARED);
    // LogisticRegression(C=np.inf) on StandardScaler output: weight 1.9437, intercept 0.
    expect(scaled.model.weights[0] as number).toBeCloseTo(1.9436893182536474, 8);
    expect(scaled.model.intercept).toBeCloseTo(0, 10);
    expect(
      gap(toRawModel(scaled.model, z.means, z.sds), fitLikelihood(HOURS, CLEARED).model),
    ).toBeLessThan(1e-10);
    expect(toRawModel({ weights: [2, 3], intercept: 1 }, [10, 20], [2, 6])).toEqual({
      weights: [1, 0.5],
      intercept: -19,
    });
  });
});

/**
 * The two-feature data the lesson teaches with: fourteen students, with real overlap, so the
 * unpenalised fit is finite. Values from LogisticRegression(C=inf, tol=1e-12) in scikit-learn 1.9.1.
 */
describe("the lesson's two-feature data", () => {
  const rows = [
    [1, 1],
    [2, 0],
    [2, 2],
    [3, 1],
    [3, 3],
    [4, 0],
    [4, 2],
    [5, 1],
    [5, 3],
    [6, 2],
    [7, 1],
    [7, 3],
    [8, 2],
    [9, 3],
  ];
  const labels = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1];
  const fitted = fitLikelihood(rows, labels);
  const ps = probas(fitted.model, rows);

  it('has a finite best fit, and it is the one scikit-learn finds', () => {
    expect(fitted.separable).toBe(false);
    expect(fitted.converged).toBe(true);
    expect(fitted.model.weights[0]).toBeCloseTo(1.109136, 4);
    expect(fitted.model.weights[1]).toBeCloseTo(1.271246, 4);
    expect(fitted.model.intercept).toBeCloseTo(-8.110202, 4);
    expect(fitted.loss).toBeCloseTo(0.293131, 5);
    expect(auc(labels, ps)).toBeCloseTo(0.9375, 6);
  });

  it('leaves two students on the wrong side at 0.5, and trades a miss for false alarms at 0.2', () => {
    expect(confusion(labels, ps, 0.5)).toMatchObject({ tp: 5, fp: 1, tn: 7, fn: 1 });
    // Nobody sits between 0.3 and 0.5, so the counts only move once the threshold reaches 0.2.
    expect(confusion(labels, ps, 0.3)).toMatchObject({ tp: 5, fp: 1, tn: 7, fn: 1 });
    expect(confusion(labels, ps, 0.2)).toMatchObject({ tp: 6, fp: 3, tn: 5, fn: 0 });
  });

  it('draws the boundary scikit-learn would', () => {
    const line = boundary2d(fitted.model);
    expect(line && 'slope' in line ? line.slope : Number.NaN).toBeCloseTo(-0.87248, 4);
    expect(line && 'slope' in line ? line.intercept : Number.NaN).toBeCloseTo(6.379725, 3);
  });
});
