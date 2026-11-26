/**
 * Machine Learning Fundamentals → Overfitting, bias–variance and regularization.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): overfitting and underfitting, the bias–variance trade-off, regularisation, Lasso and
 * Ridge, and scenarios where each happens. At 8+ LPA the questions become scenarios: why train,
 * validation and test sets are all needed, data leakage with an example, k-fold cross-validation
 * for small datasets, what the split ratio does to bias and variance, a self-driving model at 99%
 * on its track and 62% on a new street, and a churn model at 99% accuracy because a feature is the
 * cancellation date. "How did you avoid overfitting?" also follows most project discussions. One
 * bar for every package for now, aimed at 8–12 LPA and kept simple, so every section is depth 1.
 * Code outputs were checked by running them with Python 3.14, NumPy 2.5 and scikit-learn 1.9.
 */
import type { LessonDocumentInput } from '@app/content';

const OVER = 'mlf.overfitting';
const BV = 'mlf.bias-variance';
const VAL = 'mlf.validation';
const REG = 'mlf.regularization';

const POLY_CODE = `import numpy as np

rng = np.random.default_rng(0)
x = np.linspace(0, 1, 20)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 20)
tr, te = slice(0, 20, 2), slice(1, 20, 2)

for degree in [1, 3, 9]:
    c = np.polyfit(x[tr], y[tr], degree)
    fit = np.polyval(c, x)
    mse = lambda s: np.mean((fit[s] - y[s]) ** 2)
    print(degree, round(mse(tr), 3), round(mse(te), 3))`;

const KFOLD_CODE = `import numpy as np

rows = np.arange(10)
folds = np.array_split(rows, 5)
for k, val in enumerate(folds):
    train = np.setdiff1d(rows, val)
    print(k, val, len(train))`;

const PENALTY_CODE = `import numpy as np
from sklearn.linear_model import Lasso, LinearRegression, Ridge

rng = np.random.default_rng(0)
X = rng.normal(size=(100, 5))
# only the first two features matter
y = 3 * X[:, 0] - 2 * X[:, 1] + rng.normal(0, 0.5, 100)

models = [LinearRegression(), Ridge(alpha=10),
          Lasso(alpha=0.2)]
for m in models:
    m.fit(X, y)
    zeros = int(np.sum(m.coef_ == 0))
    print(type(m).__name__, np.round(m.coef_[:2], 2), zeros)`;

const RIDGE_HEAD = `import numpy as np

X = np.array([[1.0, 1.0], [1.0, -1.0],
              [-1.0, 1.0], [-1.0, -1.0]])
y = np.array([3.0, -1.0, 1.0, -3.0])

def ridge(X, y, lam):
    n = X.shape[1]
`;
const RIDGE_TAIL = `
for lam in [0, 4, 12]:
    print(lam, np.round(ridge(X, y, lam), 2))
`;
const RIDGE_START = `${RIDGE_HEAD}    # solve (X.T @ X + lam * I) w = X.T @ y
    # with np.linalg.solve(A, b)
    return np.zeros(n)
${RIDGE_TAIL}`;
const RIDGE_SOLUTION = `${RIDGE_HEAD}    A = X.T @ X + lam * np.eye(n)
    return np.linalg.solve(A, X.T @ y)
${RIDGE_TAIL}`;

export const GENERALIZATION_REGULARIZATION_LESSON: LessonDocumentInput = {
  title: 'Overfitting, bias–variance and regularization',
  subtitle:
    'Why a model that aces its training data can fail on new data, how to measure that honestly, and how to fix it.',
  objectives: [
    {
      key: 'fit',
      text: 'Explain overfitting and underfitting, and spot them from training and validation scores',
      minDepthRank: 1,
    },
    {
      key: 'bias-variance',
      text: 'Explain the bias–variance trade-off with examples',
      minDepthRank: 1,
    },
    {
      key: 'splits',
      text: 'Explain why train, validation and test sets are all needed, and use k-fold cross-validation',
      minDepthRank: 1,
    },
    {
      key: 'leakage',
      text: 'Spot data leakage and fix it',
      minDepthRank: 1,
    },
    {
      key: 'regularize',
      text: 'Compare L1 (Lasso) and L2 (Ridge), and name other ways to reduce overfitting',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Ninety-nine percent, then a fall',
      depthRank: 1,
      conceptKeys: [OVER],
      body: {
        scenario:
          'A student memorises last year’s question paper and scores 100 in the practice test. In the real exam the questions change, and they score 55. They learned the answers, not the subject. A model can do exactly the same.',
        animation: {
          name: 'overfit-underfit',
          caption: 'Too simple, just right, and too wiggly',
        },
        realWorld: {
          title: 'Where models meet new data',
          items: [
            { icon: 'car', label: 'Self-driving', sub: 'A new street, not the test track' },
            { icon: 'shield', label: 'Fraud models', sub: 'New tricks, not last year’s' },
            { icon: 'chart', label: 'Sales forecasts', sub: 'Next season, not the last one' },
            { icon: 'camera', label: 'Face unlock', sub: 'New light and new angles' },
          ],
        },
        provocation: 'Your model scores 99% in training. Should you celebrate?',
        bridge:
          '"How did you avoid overfitting?" follows almost every project discussion. This lesson shows how to spot it, the trade-off behind it, how to measure a model honestly, and how to fix it.',
      },
    },
    {
      key: 'slides.overfitting',
      kind: 'SLIDES',
      title: 'Overfitting and underfitting',
      depthRank: 1,
      conceptKeys: [OVER],
      body: {
        slides: [
          {
            kicker: 'Two failures',
            title: 'Memorising or missing the pattern',
            body: 'An **overfit** model learns the training data so closely, noise included, that it fails on new data. An **underfit** model is too simple to capture even the training data. Both generalise badly.',
            visual: {
              type: 'compare',
              left: {
                title: 'Underfitting',
                items: ['Too simple for the pattern', 'Poor on training and new data'],
              },
              right: {
                title: 'Overfitting',
                items: ['Memorises the noise', 'Great on training, poor on new data'],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Diagnose',
            title: 'Read the two scores',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'x',
                  label: 'Train 70%, validation 68%',
                  sub: 'Underfitting: both are low',
                },
                {
                  icon: 'alert',
                  label: 'Train 99%, validation 72%',
                  sub: 'Overfitting: a big gap',
                },
                {
                  icon: 'check',
                  label: 'Train 92%, validation 90%',
                  sub: 'A good fit: high and close',
                },
              ],
            },
            note: 'The gap between the training and validation scores is the clearest sign of overfitting.',
          },
          {
            kicker: 'In code',
            title: 'More flexible is not always better',
            visual: {
              type: 'code',
              code: POLY_CODE,
              output: '1 0.356 0.363\n3 0.028 0.038\n9 0.0 45.537',
            },
            note: 'Degree 1 underfits: both errors are high. Degree 9 hits every training point but swings wildly near the edges, so new points there miss badly.',
            narration:
              'We take 20 noisy points from a smooth wave, train on every other point and test on the rest. A straight line, degree 1, has a high error on both sets: it underfits. Degree 3 has a low error on both: a good fit. Degree 9 bends through all 10 training points, so its training error is zero. But it swings wildly near the edges, so its test error jumps to 45, mostly from the very last point. That is overfitting in one table.',
          },
          {
            kicker: 'Scenario',
            title: 'A stop sign on a new street',
            body: 'A car spots stop signs with 99% accuracy on its training track, but 62% on a new street. It learned the track, its light, angles and backgrounds, not stop signs. That is overfitting. Fix it with more varied data, augmentation or regularisation.',
            note: 'Catch this before launch: keep whole streets out of training and validate on them. Random frames from the same track hide the problem.',
          },
          {
            kicker: 'Fixes',
            title: 'How to reduce overfitting',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'database',
                  label: 'More data',
                  sub: 'Or augmentation: flips, crops, noise',
                },
                {
                  icon: 'filter',
                  label: 'A simpler model',
                  sub: 'Fewer features, a shallower tree',
                },
                { icon: 'shield', label: 'Regularisation', sub: 'L1, L2 or dropout' },
                {
                  icon: 'clock',
                  label: 'Early stopping',
                  sub: 'Stop when validation stops improving',
                },
                {
                  icon: 'layers',
                  label: 'Ensembles',
                  sub: 'Average many models, like a random forest',
                },
              ],
            },
            note: 'For underfitting, do the opposite: a richer model, better features, less regularisation, longer training.',
          },
          {
            kicker: 'Try it',
            title: 'Diagnose and act',
            try: {
              type: 'choice',
              prompt:
                'Training accuracy is 65% and validation accuracy is 63%. What should you try first?',
              options: [
                {
                  text: 'A more flexible model or better features',
                  correct: true,
                  feedback:
                    'Right. Both scores are low and close: the model underfits, so it needs more capacity.',
                },
                {
                  text: 'Add dropout or a stronger penalty',
                  correct: false,
                  feedback: 'Those fight overfitting. Here they would make the model even simpler.',
                },
                {
                  text: 'Remove half of the training data',
                  correct: false,
                  feedback:
                    'Less data rarely helps, and it does not add the capacity this model lacks.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.bias-variance',
      kind: 'SLIDES',
      title: 'The bias–variance trade-off',
      depthRank: 1,
      conceptKeys: [BV],
      body: {
        slides: [
          {
            kicker: 'Bias and variance · the story',
            title: 'Darts on a board',
            body: '**Bias** is being consistently off target, like a player whose darts all land low. **Variance** is being scattered, landing all over the board. A good model is both on target and consistent.',
            animation: {
              name: 'bias-variance-darts',
              caption: 'Real use: naming why a model fails, and which fix to try',
            },
          },
          {
            kicker: 'The trade-off',
            title: 'Flexibility moves the balance',
            body: 'A more flexible model lowers bias but raises variance. The best model sits where the validation error is lowest.',
            visual: {
              type: 'compare',
              left: {
                title: 'High bias',
                items: [
                  'Too simple: underfits',
                  'A straight line on a curve',
                  'Fix: a richer model',
                ],
              },
              right: {
                title: 'High variance',
                items: [
                  'Too flexible: overfits',
                  'A deep tree on little data',
                  'Fix: more data, regularisation',
                ],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Where error comes from',
            title: 'Bias, variance and noise',
            visual: {
              type: 'icons',
              items: [
                { icon: 'target', label: 'Bias²', sub: 'Wrong, too-simple assumptions' },
                {
                  icon: 'repeat',
                  label: 'Variance',
                  sub: 'How much the model changes with a new training sample',
                },
                { icon: 'alert', label: 'Noise', sub: 'Randomness no model can remove' },
              ],
            },
            note: 'For squared error, the average error over many training sets is bias² + variance + noise. You can trade the first two, never the third.',
          },
          {
            kicker: 'Examples',
            title: 'Models along the trade-off',
            visual: {
              type: 'icons',
              items: [
                { icon: 'zap', label: 'k-NN with k = 1', sub: 'Low bias, high variance' },
                { icon: 'shield', label: 'k-NN with k = 50', sub: 'Higher bias, lower variance' },
                {
                  icon: 'layers',
                  label: 'Random forest',
                  sub: 'Averages many trees to cut variance',
                },
                { icon: 'rocket', label: 'Boosting', sub: 'Adds trees one by one to cut bias' },
              ],
            },
          },
          {
            kicker: 'Curves',
            title: 'Read the training and validation curves',
            body: 'Plot the training and validation error as training goes on, or as you add more data. The gap between the two curves names the problem.',
            animation: {
              name: 'early-stopping',
              caption: 'Training loss keeps falling while validation loss turns up: overfitting',
            },
            points: [
              'Both curves high and close: underfitting, or high bias',
              'Training low, validation much higher: overfitting, or high variance',
              'The gap shrinks as you add data: more data will help',
              'Both stay high as data grows: more data will not help, so add capacity',
            ],
            note: 'This answers "will more data help?": only while the two curves still have a gap.',
          },
          {
            kicker: 'Try it',
            title: 'Name the problem',
            try: {
              type: 'choice',
              prompt:
                'A decision tree with no depth limit scores 100% on training data and 70% on validation. Which statement fits?',
              options: [
                {
                  text: 'High variance: limit the depth or use a random forest',
                  correct: true,
                  feedback:
                    'Right. It memorised the training rows. Limit its depth, or average many trees.',
                },
                {
                  text: 'High bias: use a more complex model',
                  correct: false,
                  feedback:
                    'A 100% training score is not bias. The model is too flexible, not too simple.',
                },
                {
                  text: 'It is fine: 100% is the best possible',
                  correct: false,
                  feedback: 'The 30-point gap to validation shows it will do poorly on new data.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.validation',
      kind: 'SLIDES',
      title: 'Validation and data leakage',
      depthRank: 1,
      conceptKeys: [VAL],
      body: {
        slides: [
          {
            kicker: 'Three sets · the story',
            title: 'Practice, mock test, final exam',
            body: 'A student learns from practice questions, checks progress with mock tests, and sits the final exam once. The **training** set fits the model. The **validation** set compares models and settings. The **test** set gives one final, honest score.',
            animation: {
              name: 'train-test-split',
              caption: 'Real use: an honest score before a model goes live',
            },
          },
          {
            kicker: 'Why three',
            title: 'Tuning on the test set leaks it',
            body: 'If you try 50 settings and keep the one with the best test score, the test set has quietly joined training. Its score is now too optimistic. Keep the test set locked until the very end.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Fit on train', icon: 'cpu' },
                { label: 'Compare on validation', icon: 'gauge' },
                { label: 'Pick the best', icon: 'check' },
                { label: 'Score once on test', icon: 'lock' },
              ],
            },
          },
          {
            kicker: 'K-fold · the story',
            title: 'Every row gets a turn',
            body: 'With little data, one validation split is noisy. **K-fold cross-validation** splits the data into k parts. It trains on k − 1 of them and validates on the one left out, k times. Each row validates exactly once.',
            animation: {
              name: 'kfold-rotation',
              caption: 'Real use: reliable scores on small datasets',
            },
          },
          {
            kicker: 'K-fold · the code',
            title: 'Five folds of ten rows',
            visual: {
              type: 'code',
              code: KFOLD_CODE,
              output: '0 [0 1] 8\n1 [2 3] 8\n2 [4 5] 8\n3 [6 7] 8\n4 [8 9] 8',
            },
            note: 'In practice, `cross_val_score(model, X, y, cv=5)` does this and returns 5 scores. Report their mean and spread.',
            narration:
              'Here are ten row numbers split into five folds of two. In each round, one fold is the validation set and the other eight rows train the model. So round 0 validates on rows 0 and 1, round 1 on rows 2 and 3, and so on. Every row is validated exactly once. Scikit learn does the same with cross val score, which returns one score per fold.',
          },
          {
            kicker: 'Leakage · the story',
            title: 'The answer hidden in a feature',
            body: 'A churn model reaches 99% accuracy. One feature is the cancellation date, which only exists after a customer leaves. The model reads the answer from it. That is **data leakage**: information at training time that will not exist when predicting.',
          },
          {
            kicker: 'Leakage · the checklist',
            title: 'Common leaks and their fixes',
            visual: {
              type: 'checklist',
              items: [
                { text: 'A feature from the future, like a cancellation date', ok: false },
                { text: 'Scaling or filling gaps before the split', ok: false },
                { text: 'The same customer in both train and test', ok: false },
                { text: 'Split first, then fit scalers on training data only', ok: true },
                { text: 'For forecasts, train on the past and test on later data', ok: true },
              ],
            },
            note: 'A score that looks too good to be true usually is. Check the strongest features first.',
          },
          {
            kicker: 'Try it',
            title: 'Split a forecast',
            try: {
              type: 'choice',
              prompt: 'Which split fits a model that forecasts next month’s sales?',
              options: [
                {
                  text: 'Train on earlier months, validate on the later months',
                  correct: true,
                  feedback:
                    'Right. That matches how the model will be used: past data, future answers.',
                },
                {
                  text: 'A random 80/20 split of all the rows',
                  correct: false,
                  feedback:
                    'Future months would leak into training, so the score would be too optimistic.',
                },
                {
                  text: 'K-fold with the rows shuffled',
                  correct: false,
                  feedback: 'Shuffling mixes future rows into training: the same leak.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.regularization',
      kind: 'SLIDES',
      title: 'Regularisation',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        slides: [
          {
            kicker: 'Regularisation · the story',
            title: 'A fine on big weights',
            body: 'Imagine every unit of weight a model uses costs a small fine. The model then keeps only the weights that really pay off. **Regularisation** adds this penalty to the loss, which keeps the model simpler and less likely to overfit.',
          },
          {
            kicker: 'L1 and L2',
            title: 'Lasso and Ridge',
            body: '**L2 (Ridge)** adds the sum of squared weights: it shrinks the weights overall towards zero, but almost never to exactly zero. **L1 (Lasso)** adds the sum of absolute weights: it can push some weights to exactly zero, which drops those features.',
            animation: {
              name: 'l1-l2-shrink',
              caption: 'Real use: simpler models, and feature selection with L1',
            },
            note: 'In neural networks, the L2 penalty is usually called **weight decay**.',
          },
          {
            kicker: 'In code',
            title: 'Lasso drops the useless features',
            visual: {
              type: 'code',
              code: PENALTY_CODE,
              output:
                'LinearRegression [ 2.97 -1.96] 0\nRidge [ 2.61 -1.76] 0\nLasso [ 2.7  -1.74] 3',
            },
            note: 'Scale your features before L1 or L2. The penalty treats every weight alike, so the units matter.',
            narration:
              'We make 100 rows with five features, where only the first two affect y. Each model prints its first two weights and how many weights are exactly zero. Plain linear regression finds about 3 and minus 2, and keeps small weights for the three useless features. Ridge pulls the two real weights in a little, to 2.61 and minus 1.76, but no weight becomes zero. Lasso also shrinks them, and sets the three useless weights to exactly zero, so it selects the features for us.',
          },
          {
            kicker: 'Strength',
            title: 'Alpha controls the trade-off',
            body: 'The penalty strength, called alpha or lambda, is a knob. At zero there is no penalty. Too large, and every weight is crushed towards zero, so the model underfits. Choose it with cross-validation.',
            visual: {
              type: 'compare',
              left: { title: 'Alpha too small', items: ['Little effect', 'Can still overfit'] },
              right: { title: 'Alpha too large', items: ['Weights crushed', 'Underfits'] },
              better: 'none',
            },
          },
          {
            kicker: 'Beyond L1 and L2',
            title: 'Other regularisers',
            visual: {
              type: 'icons',
              items: [
                { icon: 'filter', label: 'Elastic Net', sub: 'L1 and L2 together' },
                { icon: 'x', label: 'Dropout', sub: 'Randomly switch off neurons in training' },
                {
                  icon: 'clock',
                  label: 'Early stopping',
                  sub: 'Stop when validation loss turns up',
                },
                {
                  icon: 'image',
                  label: 'Data augmentation',
                  sub: 'New views of the same examples',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Pick the penalty',
            try: {
              type: 'choice',
              prompt:
                'You have 200 features and suspect most of them are useless. Which regularisation also helps pick the useful ones?',
              options: [
                {
                  text: 'L1 (Lasso)',
                  correct: true,
                  feedback: 'Right. L1 sets the weights of useless features to exactly zero.',
                },
                {
                  text: 'L2 (Ridge)',
                  correct: false,
                  feedback:
                    'L2 shrinks weights but rarely makes them exactly zero, so every feature stays.',
                },
                {
                  text: 'No regularisation',
                  correct: false,
                  feedback:
                    'With 200 features and few useful ones, an unpenalised model is likely to overfit.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.overfitting',
      kind: 'WIDGET',
      title: 'Explore overfitting and L2',
      depthRank: 1,
      conceptKeys: [OVER, REG],
      body: {
        widget: 'training-explorer',
        prompt:
          'Train a small model live and watch both losses. Change how flexible the model is, how long it trains and how strong the L2 penalty is.',
        params: {
          degree: { options: [1, 3, 9], default: 9 },
          learningRate: { options: [0.05], default: 0.05 },
          l2: { options: [0, 0.01, 0.1, 0.3], default: 0 },
          epochs: { max: 3000, default: 3000 },
          seed: 56,
          points: 12,
          noise: 0.3,
          tasks: [
            'With degree 9 and no L2, drag the epochs from 1 to 3,000. Where does validation loss turn up?',
            'Set the L2 penalty to 0.1, then 0.3. Does validation loss still climb?',
            'Switch to degree 1. Why do both losses stay high?',
            'Switch to degree 3. Does it overfit?',
          ],
        },
      },
    },
    {
      key: 'playground.ridge',
      kind: 'PLAYGROUND',
      title: 'Ridge regression by hand',
      depthRank: 1,
      conceptKeys: [REG],
      body: {
        language: 'python',
        instructions:
          'The data follows y = 1·x₁ + 2·x₂ exactly. Ridge has a direct formula: solve (XᵀX + lam·I) w = Xᵀy. Finish `ridge`, then watch both weights shrink as `lam` grows. With `lam = 0` it should print `[1. 2.]`.',
        starterCode: RIDGE_START,
        hints: [
          'Build `A = X.T @ X + lam * np.eye(n)`.',
          'Return `np.linalg.solve(A, X.T @ y)`. It solves A · w = Xᵀy for w.',
          'Here XᵀX is 4 times the identity, so every weight is multiplied by 4 ÷ (4 + lam). At `lam = 4` both weights halve.',
        ],
        solution: RIDGE_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '0 [1. 2.]',
            label: 'No penalty recovers the true weights',
          },
          {
            type: 'stdout_contains',
            value: '4 [0.5 1.',
            label: 'A penalty of 4 halves both weights',
          },
          {
            type: 'stdout_contains',
            value: '12 [0.25 0.5',
            label: 'A stronger penalty shrinks them further',
          },
        ],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Generalisation check',
      depthRank: 1,
      conceptKeys: [OVER, BV, VAL, REG],
      body: {
        items: [
          {
            key: 'gap',
            type: 'mcq',
            prompt: 'Training accuracy is 99% and validation accuracy is 72%. What is happening?',
            options: [
              { id: 'a', text: 'Overfitting' },
              { id: 'b', text: 'Underfitting' },
              { id: 'c', text: 'A good fit' },
              { id: 'd', text: 'Data drift' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A high training score with a much lower validation score means the model memorised the training data.',
          },
          {
            key: 'leak',
            type: 'mcq',
            prompt:
              'A churn model has 99% accuracy, and its strongest feature is the date the customer cancelled. What is the problem?',
            options: [
              { id: 'a', text: 'Data leakage: that date only exists after the answer is known' },
              { id: 'b', text: 'High variance' },
              { id: 'c', text: 'Vanishing gradients' },
              { id: 'd', text: 'The feature needs one-hot encoding' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The model reads the answer from a feature it will not have when predicting. Drop the feature and retrain.',
          },
          {
            key: 'test-once',
            type: 'mcq',
            prompt: 'When should you use the test set?',
            options: [
              { id: 'a', text: 'Once, at the end, for the final score' },
              { id: 'b', text: 'After every change, to pick the best setting' },
              { id: 'c', text: 'During training, to tune the learning rate' },
              { id: 'd', text: 'Never; the validation set is enough' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Using it to choose settings makes it part of training, and its score becomes too optimistic.',
          },
          {
            key: 'folds',
            type: 'mcq',
            prompt: 'In 5-fold cross-validation on 1,000 rows, how many rows train each model?',
            options: [
              { id: 'a', text: '800' },
              { id: 'b', text: '200' },
              { id: 'c', text: '1,000' },
              { id: 'd', text: '500' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each fold holds 200 rows. One fold validates, so the other four, 800 rows, train the model.',
          },
          {
            key: 'l1',
            type: 'mcq',
            prompt: 'Which penalty can set weights to exactly zero?',
            options: [
              { id: 'a', text: 'L1 (Lasso)' },
              { id: 'b', text: 'L2 (Ridge)' },
              { id: 'c', text: 'Both, equally often' },
              { id: 'd', text: 'Neither' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'L1 pulls each weight towards zero by a fixed amount, so small weights land on exactly zero. L2 only shrinks them.',
          },
        ],
      },
    },
    {
      key: 'interview.overfitting',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Overfitting answer structure',
      depthRank: 1,
      conceptKeys: [OVER, VAL, REG],
      body: {
        question: '"How did you make sure your model was not overfitting?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Split',
            detail:
              'Say how you split: a validation set for choices, and a test set touched only once.',
          },
          {
            title: 'Compare',
            detail: 'Compare training and validation scores. A big gap signals overfitting.',
          },
          {
            title: 'Cross-validate',
            detail: 'With little data, use 5-fold cross-validation and report the mean and spread.',
          },
          {
            title: 'Fix',
            detail:
              'Name what you used: regularisation, a simpler model, early stopping, more data or augmentation.',
          },
          {
            title: 'Leakage',
            detail:
              'Mention leak checks: scalers fitted on training data only, no future features.',
          },
          {
            title: 'Result',
            detail:
              'Give your real numbers, for example "train and validation F1 ended within 3 points".',
          },
        ],
        followUps: [
          'What is the bias–variance trade-off?',
          'Why do you need both a validation set and a test set?',
          'What is the difference between L1 and L2 regularisation?',
          'What is data leakage? Give an example.',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [OVER, BV, VAL, REG],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Overfitting and underfitting',
            front: 'What are overfitting and underfitting?',
            back: 'Overfitting is when a model learns the training data too closely, noise included. It does well on training data and poorly on new data. Underfitting is when the model is too simple to capture the pattern, so it does poorly on both.',
          },
          {
            title: 'Detecting overfitting',
            front: 'How do you detect overfitting?',
            back: 'Compare the training and validation scores. A high training score with a much lower validation score means overfitting. On loss curves over the epochs, training loss keeps falling while validation loss stops falling and starts to rise.',
          },
          {
            title: 'The bias–variance trade-off',
            front: 'Explain the bias–variance trade-off.',
            back: 'Bias is error from too-simple assumptions, which causes underfitting. Variance is error from being too sensitive to the training sample, which causes overfitting. A more flexible model lowers bias but raises variance, so we pick the complexity with the lowest validation error.',
          },
          {
            title: 'Three data splits',
            front: 'Why do we need train, validation and test sets?',
            back: 'Training data fits the model. Validation data compares models and tunes settings, so it slowly shapes your choices. The test set is used once, at the end, for an unbiased final score. Tuning on it would make that score too optimistic.',
          },
          {
            title: 'Small datasets',
            front:
              'Your dataset is very small. How do you split it and reuse it for training and evaluation?',
            back: 'Use k-fold cross-validation: split the data into k parts, train on k − 1 and validate on the one left out, k times. Every row validates once. Report the mean and spread of the k scores. Use stratified folds when classes are imbalanced.',
          },
          {
            title: 'The split ratio',
            front:
              'What happens to bias and variance if the training split is too small or too large?',
            back: 'Too small a training split: the model learns from less data, so its variance rises. Its score is also biased low, worse than it could be. Too small a validation or test split: the score swings with which rows land there, so it is unreliable. Start near 70 to 80% for training, and use k-fold when data is small.',
          },
          {
            title: 'Data leakage',
            front: 'What is data leakage? Give an example.',
            back: 'It is when training uses information that will not exist at prediction time, so scores look far better than reality. Example: a churn model using the cancellation date. Another is scaling the whole dataset before splitting. Split first, and drop future features.',
          },
          {
            title: 'Lasso and Ridge',
            front:
              'What is the difference between Lasso and Ridge regression? Why does only Lasso give exact zeros?',
            back: 'Both add a penalty on the weights to the loss. Ridge (L2) adds the squared weights and shrinks the weights overall towards zero. Lasso (L1) adds the absolute weights and can push some to exactly zero, so it selects features. L1 pulls every weight by the same amount, so small ones reach zero; the L2 pull fades as a weight shrinks.',
          },
          {
            title: 'Fixing overfitting',
            front: 'Your model overfits. What would you try?',
            back: 'Get more data or use augmentation. Simplify the model or use fewer features. Add regularisation, such as L1, L2 or dropout. Use early stopping. Try an ensemble like a random forest. Judge each change on the validation set, never the test set.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Generalisation: key takeaways',
      depthRank: 1,
      conceptKeys: [OVER, BV, VAL, REG],
      body: {
        takeaways: [
          'Overfitting: great on training, poor on new data. Underfitting: poor on both.',
          'The gap between training and validation scores is the clearest sign of overfitting.',
          'More flexibility lowers bias and raises variance. Choose the complexity with the lowest validation error.',
          'Train fits, validation chooses, test scores once. K-fold gives steadier scores on small data.',
          'Data leakage makes scores look too good: split first and drop features from the future.',
          'L2 shrinks the weights overall. L1 can set some to exactly zero, which selects features. Tune the strength with cross-validation.',
        ],
        remember: [
          'Train 99%, validation 72%: overfitting',
          'Split first, then fit the scaler',
          'L1 zeros, L2 shrinks',
        ],
      },
    },
  ],
};
