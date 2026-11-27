/**
 * Supervised learning → Logistic regression. The second unit of the V1 pattern: theory with a
 * picture first, then a lab whose every number can be checked by hand, then the code.
 *
 * Built from what panels ask (internal only, never quoted to students): what logistic regression
 * is, how it differs from linear regression, which loss it uses, the sigmoid, precision against
 * recall and when to favour each, the F1 score, imbalanced data, and why a model's accuracy is low.
 * One bar for every package, so every section is depth 1. Lab numbers come from
 * packages/learning-ui/src/logreg.ts and match scikit-learn 1.9.1; the code outputs were run on it.
 */
import type { LessonDocumentInput } from '@app/content';

const SG = 'logreg.sigmoid-odds';
const LL = 'logreg.log-loss';
const MT = 'logreg.metrics';
const TB = 'logreg.threshold-boundary';

/**
 * Ten students: hours of practice a week, and whether they cleared a coding test. Maximum
 * likelihood gives z = 0.6767·hours − 3.7219, which crosses p = 0.5 at exactly 5.5 hours. The
 * second table adds mock tests taken; it is not separable, so its fit is finite too.
 */
const CLEAR_LAB = {
  xLabel: 'Hours of practice a week',
  xName: 'hours',
  positive: 'cleared',
  negative: 'did not clear',
  points: [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 3, y: 0 },
    { x: 4, y: 1 },
    { x: 5, y: 0 },
    { x: 6, y: 1 },
    { x: 7, y: 0 },
    { x: 8, y: 1 },
    { x: 9, y: 1 },
    { x: 10, y: 1 },
  ] as Array<{ x: number; y: 0 | 1 }>,
  xRange: { min: 0, max: 11 },
  x2Label: 'Mock tests taken',
  x2Name: 'mocks',
  plane: [
    { x1: 1, x2: 1, y: 0 },
    { x1: 2, x2: 0, y: 0 },
    { x1: 2, x2: 2, y: 0 },
    { x1: 3, x2: 1, y: 0 },
    { x1: 3, x2: 3, y: 0 },
    { x1: 4, x2: 0, y: 0 },
    { x1: 4, x2: 2, y: 0 },
    { x1: 5, x2: 1, y: 1 },
    { x1: 5, x2: 3, y: 1 },
    { x1: 6, x2: 2, y: 1 },
    { x1: 7, x2: 1, y: 0 },
    { x1: 7, x2: 3, y: 1 },
    { x1: 8, x2: 2, y: 1 },
    { x1: 9, x2: 3, y: 1 },
  ] as Array<{ x1: number; x2: number; y: 0 | 1 }>,
  x2Range: { min: -0.5, max: 4.5 },
  weight: { min: -1, max: 3, step: 0.05 },
  intercept: { min: -12, max: 4, step: 0.1 },
  learningRates: [0.1, 0.3, 1],
};

const SK_FIT = `import numpy as np
from sklearn.linear_model import LogisticRegression

X = np.arange(1, 11).reshape(-1, 1)            # hours of practice
y = np.array([0, 0, 0, 1, 0, 1, 0, 1, 1, 1])   # cleared the test
model = LogisticRegression().fit(X, y)
print(model.coef_.round(3), model.intercept_.round(3))
print(model.predict_proba([[6]]).round(3))
print(model.predict([[6]]))`;

const SK_C = `import numpy as np
from sklearn.linear_model import LogisticRegression

X = np.arange(1, 11).reshape(-1, 1)
y = np.array([0, 0, 0, 1, 0, 1, 0, 1, 1, 1])
for C in (0.01, 1, 100, np.inf):
    m = LogisticRegression(C=C).fit(X, y)
    print(C, m.coef_.round(3)[0], m.intercept_.round(3))`;

const SK_METRICS = `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import confusion_matrix, precision_score, recall_score, roc_auc_score

X = np.arange(1, 11).reshape(-1, 1)
y = np.array([0, 0, 0, 1, 0, 1, 0, 1, 1, 1])
model = LogisticRegression().fit(X, y)
p = model.predict_proba(X)[:, 1]
for t in (0.3, 0.5, 0.7):
    pred = (p >= t).astype(int)
    print(t, confusion_matrix(y, pred).ravel(), round(precision_score(y, pred), 2),
          round(recall_score(y, pred), 2))
print(round(roc_auc_score(y, p), 2))`;

const SCRATCH_HEAD = `import numpy as np

x = np.arange(1, 11)                           # hours of practice
y = np.array([0, 0, 0, 1, 0, 1, 0, 1, 1, 1])   # cleared the test
`;
const SCRATCH_TAIL = `
print(round(float(sigmoid(0)), 3))
print(round(float(log_loss(y, sigmoid(0 * x + 0))), 4))
w, b = step(0.0, 0.0, 0.1)
print(round(float(w), 3), round(float(b), 3))
for _ in range(999):
    w, b = step(w, b, 0.1)
print(round(float(w), 2), round(float(b), 2))
`;
const SCRATCH_START = `${SCRATCH_HEAD}
def sigmoid(z):
    # 1. one over (one plus e to the minus z)
    return ____

def log_loss(y, p):
    # 2. the mean of -[y ln p + (1 - y) ln(1 - p)]
    return ____

def step(w, b, lr):
    p = sigmoid(w * x + b)
    # 3. the gradient for w: the mean of (p - y) * x
    gw = ____
    gb = (p - y).mean()
    return w - lr * gw, b - lr * gb
${SCRATCH_TAIL}`;
const SCRATCH_SOLUTION = `${SCRATCH_HEAD}
def sigmoid(z):
    return 1 / (1 + np.exp(-z))

def log_loss(y, p):
    return -(y * np.log(p) + (1 - y) * np.log(1 - p)).mean()

def step(w, b, lr):
    p = sigmoid(w * x + b)
    gw = ((p - y) * x).mean()
    gb = (p - y).mean()
    return w - lr * gw, b - lr * gb
${SCRATCH_TAIL}`;

export const LOGISTIC_REGRESSION_LESSON: LessonDocumentInput = {
  title: 'Logistic regression',
  subtitle:
    'Predict yes or no with a probability. See why a straight line fails, how the sigmoid fixes it, how the model is trained, and how to judge its answers.',
  objectives: [
    {
      key: 'sigmoid',
      text: 'Say what logistic regression is, and turn a score into a probability with the sigmoid',
      minDepthRank: 1,
    },
    {
      key: 'loss',
      text: 'Compute log loss by hand, and explain how gradient descent lowers it',
      minDepthRank: 1,
    },
    {
      key: 'metrics',
      text: 'Read a confusion matrix, and choose between precision and recall with the threshold',
      minDepthRank: 1,
    },
    {
      key: 'boundary',
      text: 'Describe the decision boundary, and say when a straight one is not enough',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Predicting yes or no',
      depthRank: 1,
      conceptKeys: [SG],
      body: {
        scenario:
          '**Logistic regression** predicts the probability of a yes-or-no outcome. Use it for classification: cleared or not, spam or not, will leave or will stay.\n\nThe example: ten students, each with hours of practice a week, and whether they cleared a coding test. More practice helps, but not always. One student cleared with 4 hours; another missed with 7.\n\nA new student practises 6 hours. Will they clear? The model answers with a probability, about 0.58, and a threshold turns that into yes or no.',
        animation: {
          name: 'line-vs-sigmoid',
          caption: 'Ten students: a straight line fails, a sigmoid fits',
        },
        analogy: {
          text: 'Think of a weather forecast. It does not say rain or no rain. It says a 70% chance of rain, and you decide about the umbrella. Logistic regression is the forecast; the threshold is your decision.',
          mapping: [
            { everyday: 'The 70% in the forecast', technical: 'The predicted probability p' },
            {
              everyday: 'Your rule: umbrella above 50%',
              technical: 'The decision threshold',
            },
            { everyday: 'Whether it rained', technical: 'The actual label: 1 or 0' },
          ],
          whereItBreaks:
            'A forecaster uses physics. Logistic regression draws one straight boundary through the features, so it misses patterns that curve.',
        },
        realWorld: {
          title: 'Where a yes-or-no model decides',
          items: [
            { icon: 'shield', label: 'Spam filters', sub: 'Spam or not spam' },
            { icon: 'rupee', label: 'Loans', sub: 'Repay or default' },
            { icon: 'target', label: 'Churn', sub: 'Leave or stay' },
            { icon: 'gauge', label: 'Medical tests', sub: 'Disease or healthy' },
          ],
        },
        provocation: 'Linear regression already draws a line. Why can it not answer yes or no?',
        bridge:
          'First see why a straight line fails and how the sigmoid fixes it. Then learn how the model is scored, trained and judged.',
      },
    },
    {
      key: 'slides.intro',
      kind: 'SLIDES',
      title: 'Classification and the sigmoid',
      depthRank: 1,
      conceptKeys: [SG],
      body: {
        slides: [
          {
            kicker: 'The task',
            title: 'Binary classification',
            body: 'In classification the target is a category, not a number. With two categories it is **binary classification**: the label y is 1 for yes and 0 for no.',
            visual: {
              type: 'table',
              columns: ['Hours of practice', 'Cleared', 'Label y'],
              cells: [
                ['1', 'no', '0'],
                ['2', 'no', '0'],
                ['3', 'no', '0'],
                ['4', 'yes', '1'],
                ['5', 'no', '0'],
                ['6', 'yes', '1'],
                ['7', 'no', '0'],
                ['8', 'yes', '1'],
                ['9', 'yes', '1'],
                ['10', 'yes', '1'],
              ],
              highlight: 2,
            },
            note: 'A 1 is the **positive class**, here "cleared". A 0 is the **negative class**.',
          },
          {
            kicker: 'Why not a line',
            title: 'Linear regression fails here',
            body: 'Fit a straight line to the 0 and 1 labels and read it as a probability. At 14 hours it says 1.48, and under 1 hour it goes negative. A probability must stay between 0 and 1.',
            animation: {
              name: 'line-vs-sigmoid',
              caption: 'The line leaves 0 to 1; the sigmoid stays inside',
            },
            note: 'The line is also dragged by far-off points: one student with 30 hours would tilt it and move every prediction.',
          },
          {
            kicker: 'The fix',
            title: 'The sigmoid function',
            body: 'The **sigmoid** squeezes any number into the range 0 to 1: **σ(z) = 1 / (1 + e⁻ᶻ)**. A large positive z gives a value near 1. A large negative z gives a value near 0. At z = 0 it is exactly 0.5.',
            visual: {
              type: 'table',
              columns: ['z', 'e⁻ᶻ', 'σ(z)'],
              cells: [
                ['−4', '54.6', '0.018'],
                ['−2', '7.39', '0.119'],
                ['0', '1', '0.5'],
                ['2', '0.135', '0.881'],
                ['4', '0.018', '0.982'],
              ],
              highlight: 2,
            },
            note: 'It is also called the logistic function, which is where the name logistic regression comes from.',
          },
          {
            kicker: 'The model',
            title: 'Score, then probability',
            animation: {
              name: 'logreg-score-to-p',
            },
            body: 'Logistic regression works in two steps. First a linear score, exactly as in linear regression: **z = w·x + b**. Then the sigmoid turns that score into a probability: **p = σ(z)**.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Features x' },
                { label: 'Score z = w·x + b' },
                { label: 'Sigmoid σ(z)' },
                { label: 'Probability p' },
              ],
            },
            note: 'p is the probability that the label is 1. The probability of 0 is simply 1 − p.',
          },
          {
            kicker: 'Worked example',
            title: 'One student, step by step',
            body: 'The fitted model is **z = 0.6767 × hours − 3.7219**. Take the student with 8 hours of practice.',
            visual: {
              type: 'table',
              columns: ['Step', 'Calculation', 'Value'],
              cells: [
                ['Score z', '0.6767 × 8 − 3.7219', '1.692'],
                ['e⁻ᶻ', 'e to the power −1.692', '0.184'],
                ['Probability p', '1 / (1 + 0.184)', '0.844'],
              ],
              highlight: 2,
            },
            note: 'The model gives this student an 84% chance of clearing. They did clear, so this is a good prediction.',
          },
          {
            kicker: 'Odds',
            title: 'Odds and log-odds',
            animation: {
              name: 'logreg-odds-scales',
            },
            body: '**Odds** compare the chance of yes with the chance of no: p / (1 − p). The **log-odds**, or logit, is ln of the odds. In logistic regression the score z *is* the log-odds.',
            visual: {
              type: 'table',
              columns: ['Probability p', 'Odds p / (1 − p)', 'Log-odds'],
              cells: [
                ['0.2', '0.25', '−1.386'],
                ['0.5', '1', '0'],
                ['0.8', '4', '1.386'],
                ['0.9', '9', '2.197'],
              ],
            },
            note: 'Reading a weight: one more hour adds 0.6767 to the log-odds, which multiplies the odds by e^0.6767 = 1.97. The odds nearly double.',
          },
        ],
      },
    },
    {
      key: 'widget.sigmoid',
      kind: 'WIDGET',
      title: 'The sigmoid lab',
      depthRank: 1,
      conceptKeys: [SG],
      body: {
        widget: 'logreg-lab',
        prompt:
          'Ten students: hours of practice across, cleared (1) or not (0) up. Follow the steps, then move the curve yourself.',
        story: [
          {
            kicker: 'The data',
            title: 'Labels at 0 and 1',
            body: 'Each dot is one student. Hours of practice run across. A student who cleared sits at 1, at the top; one who did not sits at 0. More hours mostly means cleared, but the two groups overlap between 4 and 7 hours. No rule can be perfect here.',
            view: 'curve',
            show: 'points',
          },
          {
            kicker: 'First try',
            title: 'A straight line',
            body: 'Fit linear regression to the 0 and 1 labels. The line rises, which is right. But it dips below 0 on the left and climbs above 1 on the right, into the shaded bands. Those values cannot be probabilities. The line needs bending.',
            view: 'curve',
            show: 'line',
          },
          {
            kicker: 'The sigmoid',
            title: 'The S-shaped curve',
            body: 'The **sigmoid** bends the line into an S that never leaves 0 to 1. The model computes a score, **z = w·hours + b**, then **p = 1 / (1 + e⁻ᶻ)**. This first guess uses w = 0.5 and b = −2.5. The curve passes 0.5 exactly where z = 0, at 5 hours.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0.5],
            intercept: -2.5,
            panel: 'table',
          },
          {
            kicker: 'The weight',
            title: 'Weight and intercept',
            body: 'Move the sliders. The **weight w** sets how steep the curve is: a large w means a sharp jump from no to yes. The **intercept b** slides the curve left and right. Here w = 1.5 and b = −7.5: still centred on 5 hours, but far more confident on both sides.',
            view: 'curve',
            show: 'sigmoid',
            weights: [1.5],
            intercept: -7.5,
            panel: 'table',
          },
          {
            kicker: 'One row',
            title: 'Score to probability',
            body: 'This is the best-fitting curve: **z = 0.6767·hours − 3.7219**. Follow the student with 8 hours. The score is 0.6767 × 8 − 3.7219 = 1.69. The sigmoid turns that into p = 0.844: an 84% chance of clearing. The table works out all ten students.',
            view: 'curve',
            show: 'sigmoid',
            best: true,
            row: 7,
            panel: 'table',
          },
          {
            kicker: 'Odds',
            title: 'Interpreting the weight',
            body: 'The score z is the **log-odds**. Each extra hour adds 0.6767 to it, which multiplies the odds by e^0.6767 = 1.97. So one more hour of practice nearly doubles the odds of clearing. A logistic regression weight is read as a change in odds, not in probability.',
            view: 'curve',
            show: 'sigmoid',
            best: true,
            row: 5,
            panel: 'table',
          },
          {
            kicker: 'Decide',
            title: 'The threshold',
            body: 'A probability is not yet an answer. The **threshold** turns it into one: predict "cleared" when p ≥ 0.5. The curve crosses 0.5 at 5.5 hours, the **decision boundary**. Everyone to its right is predicted to clear. Two students sit on the wrong side, ringed in red.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.5,
            panel: 'table',
          },
        ],
        params: {
          ...CLEAR_LAB,
          tasks: [
            'Set the weight to 0. What does the curve become, and what is every probability?',
            'Make the curve cross 0.5 at 4 hours instead of 5.5. Which slider did you move, and why?',
            'Find the lowest log loss you can by hand, then press Best fit. How close were you?',
          ],
        },
      },
    },
    {
      key: 'slides.loss',
      kind: 'SLIDES',
      title: 'Log loss',
      depthRank: 1,
      conceptKeys: [LL],
      body: {
        slides: [
          {
            kicker: 'Scoring',
            title: 'Why not squared error',
            animation: {
              name: 'logreg-squared-vs-log',
            },
            body: 'With a sigmoid inside, MSE becomes a bumpy surface, and it punishes a confident wrong answer too gently.',
            visual: {
              type: 'compare',
              left: {
                title: 'MSE with a sigmoid',
                items: [
                  'Not convex: more than one valley',
                  'A wrong answer at p = 0.01 costs under 1',
                  'Gradients vanish where the curve is flat',
                ],
              },
              right: {
                title: 'Log loss',
                items: [
                  'Convex: one lowest point',
                  'A wrong answer at p = 0.01 costs 4.6',
                  'A clean gradient: (p − y) × x',
                ],
              },
              better: 'right',
            },
            note: 'Logistic regression therefore uses **log loss**, or binary cross-entropy.',
          },
          {
            kicker: 'The formula',
            title: 'The log loss formula',
            body: 'For one row: **loss = −[ y·ln(p) + (1 − y)·ln(1 − p) ]**. If y = 1 the loss is −ln(p). If y = 0 it is −ln(1 − p). The model’s score is the average over all rows.',
            animation: {
              name: 'log-loss-curve',
              caption: 'The loss for a row whose true label is 1',
            },
            note: 'Right and confident costs almost nothing; wrong and confident costs a lot.',
          },
          {
            kicker: 'Worked out',
            title: 'Four students, four losses',
            body: 'For each student, take the probability of the label that really happened, then −ln of it.',
            visual: {
              type: 'table',
              columns: ['Hours', 'Actual y', 'Predicted p', 'Calculation', 'Loss'],
              cells: [
                ['2', '0', '0.086', '−ln(1 − 0.086)', '0.089'],
                ['4', '1', '0.266', '−ln(0.266)', '1.324'],
                ['7', '0', '0.734', '−ln(1 − 0.734)', '1.324'],
                ['9', '1', '0.914', '−ln(0.914)', '0.089'],
              ],
              highlight: 4,
            },
            note: 'The students at 4 and 7 hours were predicted wrongly and carry most of the loss. The mean over all ten: 0.4335.',
          },
          {
            kicker: 'Where it comes from',
            title: 'Maximum likelihood',
            animation: {
              name: 'logreg-likelihood-bars',
            },
            body: 'The model gives each row a probability of what really happened. Multiply those ten probabilities: that is the **likelihood** of the data. Training picks the weights that make it largest.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Probability of each row' },
                { label: 'Multiply: likelihood' },
                { label: 'Take −log, average' },
                { label: 'Minimise: log loss' },
              ],
            },
            note: 'Maximising the likelihood is the same as minimising the log loss: maximum likelihood estimation.',
          },
          {
            kicker: 'Training',
            title: 'Gradient of the log loss',
            animation: {
              name: 'logreg-gradient-pushes',
            },
            body: 'Logistic regression has no normal equation, because of the sigmoid. The weights are found by **gradient descent**, and the gradient is simple.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'target', label: 'p − y', sub: 'The error of each row' },
                { icon: 'layers', label: '× x', sub: 'Scaled by that row’s feature' },
                { icon: 'gauge', label: 'mean', sub: 'Averaged over every row' },
              ],
            },
            note: '∂L/∂w = mean((p − y)·x) and ∂L/∂b = mean(p − y). The same shape as in linear regression, with p in place of ŷ.',
          },
          {
            kicker: 'Try it',
            title: 'Loss of one prediction',
            try: {
              type: 'choice',
              prompt:
                'The true label is 0 and the model predicts p = 0.9. What is the log loss for this row?',
              options: [
                {
                  text: '−ln(1 − 0.9) = 2.303',
                  correct: true,
                  feedback: 'Right. For y = 0 the loss is −ln(1 − p).',
                },
                {
                  text: '−ln(0.9) = 0.105',
                  correct: false,
                  feedback: 'That is the loss when the true label is 1.',
                },
                {
                  text: '(0 − 0.9)² = 0.81',
                  correct: false,
                  feedback: 'That is squared error, not log loss.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.fit',
      kind: 'WIDGET',
      title: 'Training by gradient descent',
      depthRank: 1,
      conceptKeys: [LL],
      body: {
        widget: 'logreg-lab',
        prompt:
          'The same ten students. Lower the log loss by hand, then one gradient-descent step at a time.',
        story: [
          {
            kicker: 'Start',
            title: 'A model that knows nothing',
            body: 'Start with w = 0 and b = 0. Every score is 0, so every probability is 0.5: the model shrugs at everyone. Each row then costs −ln(0.5) = 0.693, and so does the average. Any useful model must beat **0.693**, the log loss of a coin toss.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0],
            intercept: 0,
            panel: 'table',
          },
          {
            kicker: 'By hand',
            title: 'Lowering the loss',
            body: 'Try w = 0.5 and b = −2.5. The curve now leans the right way, and the mean log loss falls to 0.450. Look down the loss column. Students the curve gets right cost little; the student who missed at 7 hours costs 1.31. Training is the search for the lowest total.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0.5],
            intercept: -2.5,
            row: 6,
            panel: 'table',
          },
          {
            kicker: 'Direction',
            title: 'The gradient',
            body: 'Back at zero. The **gradient** says which way to move each number. For the weight it is the mean of (p − y) × hours: −0.95. For the intercept it is the mean of (p − y): 0. A negative gradient means raising w lowers the loss. One step: w = 0 − 0.1 × (−0.95) = 0.095.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0],
            intercept: 0,
            panel: 'descent',
            learningRate: 0.1,
            steps: 0,
          },
          {
            kicker: 'Repeat',
            title: 'Convergence',
            body: 'A thousand steps at a rate of 0.1 bring the model to w = 0.62 and b = −3.37, with a loss of 0.4347. The lowest possible is 0.4335. Log loss is convex, so there is one valley and the run cannot get stuck elsewhere. It is simply slow, because the intercept crawls.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0],
            intercept: 0,
            panel: 'descent',
            learningRate: 0.1,
            steps: 1000,
          },
          {
            kicker: 'Rate',
            title: 'Learning rate too high',
            body: 'At a rate of 1 each step overshoots the valley. The loss jumps from 0.69 to 1.77, 3.10 and 5.13, then keeps bouncing. Too small a rate crawls; too large a rate never settles. Try 0.3 in between: it zig-zags, but it does arrive.',
            view: 'curve',
            show: 'sigmoid',
            weights: [0],
            intercept: 0,
            panel: 'descent',
            learningRate: 1,
            steps: 12,
          },
          {
            kicker: 'Best fit',
            title: 'The maximum likelihood fit',
            body: 'This is where gradient descent is heading: **w = 0.6767 and b = −3.7219**, with a mean log loss of 0.4335. No other weights score lower on these ten students. Libraries reach it in a handful of steps with a faster solver, but it is the same lowest point.',
            view: 'curve',
            show: 'sigmoid',
            best: true,
            panel: 'table',
          },
          {
            kicker: 'In practice',
            title: 'Regularisation by default',
            body: 'scikit-learn does not return those weights. By default it adds an **L2 penalty** that keeps the weights small, with its strength set by **C**. Here it gives w = 0.593 and b = −3.259: a slightly gentler curve. A small C means a strong penalty. It guards against overfitting, and you should know it is on.',
            view: 'curve',
            show: 'sigmoid',
            penalised: true,
            panel: 'table',
          },
        ],
        params: {
          ...CLEAR_LAB,
          tasks: [
            'Restart from zero and run 100 steps at 0.1, then at 0.3. Which gets lower, and why does 0.3 look jagged?',
            'Find weights with a log loss above 0.693. What does a model worse than a coin toss look like?',
          ],
        },
      },
    },
    {
      key: 'slides.metrics',
      kind: 'SLIDES',
      title: 'Threshold and metrics',
      depthRank: 1,
      conceptKeys: [MT],
      body: {
        slides: [
          {
            kicker: 'Decision',
            title: 'The decision threshold',
            body: 'The model outputs a probability. To act on it you need a cut-off: predict 1 when **p ≥ threshold**. The default is 0.5, but that is a choice, not a law.',
            animation: {
              name: 'threshold-tradeoff',
              caption: 'The same model at three thresholds',
            },
            note: 'A lower threshold predicts 1 more often. A higher one predicts 1 only when the model is very sure.',
          },
          {
            kicker: 'Four outcomes',
            title: 'The confusion matrix',
            animation: {
              name: 'logreg-confusion-drop',
            },
            body: 'Every prediction lands in one of four boxes. At a threshold of 0.5, the ten students give 4 true positives, 4 true negatives, 1 false positive and 1 false negative.',
            visual: {
              type: 'table',
              columns: ['Actual', 'Predicted cleared', 'Predicted not cleared'],
              cells: [
                ['Cleared (5)', '4 true positives', '1 false negative'],
                ['Not cleared (5)', '1 false positive', '4 true negatives'],
              ],
            },
            note: 'TP and TN are correct. A **false positive** is a false alarm. A **false negative** is a miss.',
          },
          {
            kicker: 'Metrics',
            title: 'Accuracy, precision and recall',
            animation: {
              name: 'logreg-metric-boxes',
            },
            body: 'Four scores come from those four counts.',
            visual: {
              type: 'table',
              columns: ['Metric', 'Formula', 'Here'],
              cells: [
                ['Accuracy', '(TP + TN) / all', '8 / 10 = 0.80'],
                ['Precision', 'TP / (TP + FP)', '4 / 5 = 0.80'],
                ['Recall', 'TP / (TP + FN)', '4 / 5 = 0.80'],
                ['F1 score', '2 × P × R / (P + R)', '0.80'],
              ],
              highlight: 2,
            },
            note: '**Precision**: of those predicted positive, how many were. **Recall**: of the actual positives, how many were found. **F1** is their harmonic mean.',
          },
          {
            kicker: 'Trade-off',
            title: 'Precision against recall',
            animation: {
              name: 'logreg-precision-recall',
            },
            body: 'Move the threshold, and the two scores pull against each other.',
            visual: {
              type: 'table',
              columns: ['Threshold', 'TP', 'FP', 'FN', 'Precision', 'Recall'],
              cells: [
                ['0.3', '4', '2', '1', '0.67', '0.80'],
                ['0.5', '4', '1', '1', '0.80', '0.80'],
                ['0.7', '3', '1', '2', '0.75', '0.60'],
              ],
            },
            note: 'Raising the threshold removes false alarms but misses more positives. You usually cannot maximise both.',
          },
          {
            kicker: 'Which metric',
            title: 'Precision or recall',
            visual: {
              type: 'compare',
              left: {
                title: 'Recall matters most',
                items: [
                  'A missed positive is costly',
                  'Disease screening, fraud detection',
                  'Lower the threshold',
                  'Accept more false alarms',
                ],
              },
              right: {
                title: 'Precision matters most',
                items: [
                  'A false alarm is costly',
                  'Spam filter, recommending a product',
                  'Raise the threshold',
                  'Accept more misses',
                ],
              },
              better: 'none',
            },
            note: 'Decide from the cost of each mistake, and say that with an example.',
          },
          {
            kicker: 'Pitfall',
            title: 'Accuracy on imbalanced data',
            animation: {
              name: 'logreg-imbalance-grid',
            },
            body: 'Suppose only 1 transaction in 100 is fraud. A model that always says "not fraud" is 99% accurate and useless: its recall is 0. With **imbalanced classes**, read precision, recall and F1, not accuracy.',
            visual: {
              type: 'stat',
              value: '99%',
              label: 'accuracy of a model that catches no fraud at all',
              sub: 'Recall = 0 / 1 = 0',
            },
            note: 'Fixes: class weights, oversampling the rare class (SMOTE), undersampling the common one, or moving the threshold.',
          },
          {
            kicker: 'All thresholds',
            title: 'ROC curve and AUC',
            animation: {
              name: 'logreg-roc-pairs',
            },
            body: 'The **ROC curve** plots recall against the false positive rate for every threshold at once. **AUC** is the area under it: the chance that a random positive gets a higher probability than a random negative.',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'target',
                  label: 'AUC = 1',
                  sub: 'Every positive ranked above every negative',
                },
                { icon: 'gauge', label: 'AUC = 0.88', sub: 'This model on the ten students' },
                { icon: 'chart', label: 'AUC = 0.5', sub: 'No better than guessing' },
              ],
            },
            note: 'AUC does not depend on the threshold, so it compares models fairly before a threshold is chosen.',
          },
        ],
      },
    },
    {
      key: 'widget.threshold',
      kind: 'WIDGET',
      title: 'Threshold lab',
      depthRank: 1,
      conceptKeys: [MT, TB],
      body: {
        widget: 'logreg-lab',
        prompt:
          'The fitted curve, and a threshold you can move. Watch the four counts and the metrics change.',
        story: [
          {
            kicker: 'Default',
            title: 'Threshold 0.5',
            body: 'At 0.5 the boundary sits at 5.5 hours. Count the boxes: 4 true positives, 4 true negatives, 1 false positive at 7 hours and 1 false negative at 4 hours. Accuracy, precision and recall are all 0.8. The two ringed dots are the two mistakes.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.5,
            panel: 'confusion',
          },
          {
            kicker: 'Lower',
            title: 'Lowering the threshold',
            body: 'Lower the threshold to 0.3 and the boundary moves left, to 4.25 hours. The student at 5 hours is now predicted to clear, wrongly: a second false positive. Recall stays at 0.8, but precision falls to 0.67. Here you catch no more positives, and raise one more false alarm.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.3,
            panel: 'confusion',
          },
          {
            kicker: 'Higher',
            title: 'Raising the threshold',
            body: 'Raise it to 0.7 and the boundary moves right, to 6.75 hours. The student at 6 hours, who cleared, is now missed. Recall falls to 0.6, while precision is 0.75. A high threshold says yes only when the model is very sure, so it misses more positives.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.7,
            panel: 'confusion',
          },
          {
            kicker: 'Every threshold',
            title: 'The ROC curve',
            body: 'The ROC curve draws every threshold at once: recall up, false positive rate across. The dot is your threshold; slide it and the dot walks the curve. The area under the curve, the **AUC**, is 0.88 here. A model that guesses lies on the dashed diagonal, with an AUC of 0.5.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.5,
            panel: 'roc',
          },
          {
            kicker: 'Choose',
            title: 'Choosing a threshold',
            body: 'There is no best threshold in general. If a miss is expensive, as in screening for a disease, lower it and accept false alarms. If a false alarm is expensive, as in a spam filter, raise it and accept misses. Choose from the cost of each mistake.',
            view: 'curve',
            show: 'threshold',
            best: true,
            threshold: 0.5,
            panel: 'confusion',
          },
        ],
        params: {
          ...CLEAR_LAB,
          tasks: [
            'Find the threshold with the highest recall. What did it cost in precision?',
            'Find a threshold where precision is 1. How many students who cleared does it miss?',
          ],
        },
      },
    },
    {
      key: 'slides.boundary',
      kind: 'SLIDES',
      title: 'Decision boundary',
      depthRank: 1,
      conceptKeys: [TB],
      body: {
        slides: [
          {
            kicker: 'Definition',
            title: 'The decision boundary',
            animation: {
              name: 'logreg-boundary-point',
            },
            body: 'The **decision boundary** is where the model switches from predicting 0 to predicting 1. At a threshold of 0.5 that is where z = 0. With one feature it is a single point: **x = −b / w** = 3.7219 / 0.6767 = 5.5 hours.',
            visual: {
              type: 'stat',
              value: '5.5 hours',
              label: 'where the probability is exactly 0.5',
              sub: 'Below it the model predicts 0; above it, 1',
            },
            note: 'A different threshold moves the boundary. At 0.7 it sits at 6.75 hours.',
          },
          {
            kicker: 'Two features',
            title: 'A boundary line',
            body: 'Add a second feature, mock tests taken. Now z = w₁·hours + w₂·mocks + b, and z = 0 is a **straight line** across the plane. One side is predicted 1, the other 0.',
            visual: {
              type: 'table',
              columns: ['Term', 'Fitted value'],
              cells: [
                ['Weight on hours', '1.109'],
                ['Weight on mock tests', '1.271'],
                ['Intercept', '−8.11'],
              ],
              highlight: 1,
            },
            note: 'With more features the boundary is a flat plane. It is always straight: logistic regression is a **linear classifier**.',
          },
          {
            kicker: 'Limit',
            title: 'Only straight boundaries',
            animation: {
              name: 'logreg-ring-features',
            },
            visual: {
              type: 'compare',
              left: {
                title: 'Works well',
                items: [
                  'Classes a straight line can separate',
                  'Each feature pushes steadily one way',
                  'You need probabilities and readable weights',
                ],
              },
              right: {
                title: 'Struggles',
                items: [
                  'One class surrounding the other',
                  'A feature whose effect flips direction',
                  'Classes separated by a curve',
                ],
              },
              better: 'none',
            },
            note: 'The fix is the same as in linear regression: add polynomial or interaction features, and the boundary can bend.',
          },
          {
            kicker: 'More classes',
            title: 'Multiclass classification',
            animation: {
              name: 'logreg-softmax',
            },
            body: 'With more than two classes there are two standard routes. **One-vs-rest** trains one yes-or-no model per class and picks the most confident. **Softmax** extends the sigmoid to give one probability per class, adding up to 1.',
            visual: {
              type: 'icons',
              items: [
                { icon: 'layers', label: 'One-vs-rest', sub: 'One binary model per class' },
                { icon: 'chart', label: 'Softmax', sub: 'One probability per class, summing to 1' },
              ],
            },
            note: 'scikit-learn handles this for you: `LogisticRegression` switches to the multinomial form when it sees more than two classes.',
          },
          {
            kicker: 'Assumptions',
            title: 'Assumptions of logistic regression',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'chart',
                  label: 'Linear log-odds',
                  sub: 'Each feature moves the log-odds in a straight line',
                },
                {
                  icon: 'link',
                  label: 'Independent rows',
                  sub: 'One row says nothing about the next',
                },
                {
                  icon: 'layers',
                  label: 'No multicollinearity',
                  sub: 'Features are not copies of each other',
                },
                { icon: 'target', label: 'Enough data', sub: 'Plenty of rows for each class' },
              ],
            },
            note: 'It does not assume normal errors or equal spread. Those belong to linear regression.',
          },
        ],
      },
    },
    {
      key: 'widget.boundary',
      kind: 'WIDGET',
      title: 'Decision boundary lab',
      depthRank: 1,
      conceptKeys: [TB],
      body: {
        widget: 'logreg-lab',
        prompt:
          'Fourteen students and two features: hours of practice, and mock tests taken. Place the line that separates them.',
        story: [
          {
            kicker: 'Two features',
            title: 'A vertical boundary',
            body: 'Each dot is a student: hours of practice across, mock tests up. Filled dots cleared. The model starts by ignoring mocks, so its boundary is a vertical line at 5.5 hours. The blue shading is where it predicts "cleared". Three dots are ringed: they sit on the wrong side.',
            view: 'plane',
            weights: [1, 0],
            intercept: -5.5,
            panel: 'confusion',
          },
          {
            kicker: 'Tilt',
            title: 'Weighting the second feature',
            body: 'Give mock tests a weight and the line tilts. Now a student can clear with fewer hours if they took more mocks. The boundary is where **w₁·hours + w₂·mocks + b = 0**. Tilt and shift it until as few dots as possible are ringed.',
            view: 'plane',
            weights: [1, 1],
            intercept: -7.5,
            panel: 'confusion',
          },
          {
            kicker: 'Best fit',
            title: 'The fitted boundary',
            body: 'Maximum likelihood gives w₁ = 1.109, w₂ = 1.271 and b = −8.11. Two students are still on the wrong side. One cleared with 5 hours and 1 mock; the other missed with 7 hours and 1 mock. No straight line separates these classes perfectly.',
            view: 'plane',
            best: true,
            panel: 'confusion',
          },
          {
            kicker: 'Threshold',
            title: 'Moving the boundary',
            body: 'The threshold still applies. Lower it to 0.2 and the whole line slides towards the "did not clear" side, parallel to itself. The student who cleared with 5 hours is now caught, so recall is 1. Two more students are wrongly predicted to clear. The weights set the **direction** of the boundary; the threshold sets its **position**.',
            view: 'plane',
            best: true,
            threshold: 0.2,
            panel: 'confusion',
          },
        ],
        params: {
          ...CLEAR_LAB,
          tasks: [
            'Set the weight on mocks to 0. Which way does the boundary point, and how many dots are ringed?',
            'Make the boundary horizontal. What is the model ignoring now?',
          ],
        },
      },
    },
    {
      key: 'slides.code',
      kind: 'SLIDES',
      title: 'Logistic regression in scikit-learn',
      depthRank: 1,
      conceptKeys: [SG, LL, MT],
      body: {
        slides: [
          {
            kicker: 'In code',
            title: 'Fit and predict',
            body: '`fit` trains the model. `predict_proba` returns two columns: the probability of 0, then of 1. `predict` applies the 0.5 threshold.',
            visual: {
              type: 'code',
              code: SK_FIT,
              output: '[[0.593]] [-3.259]\n[[0.426 0.574]]\n[1]',
            },
            note: 'The weights are 0.593 and −3.259, not 0.677 and −3.722, because the default L2 penalty is on.',
            narration:
              'scikit-learn fits the ten students. The weight is 0.593 and the intercept is minus 3.259. For a student with 6 hours, the probability of clearing is 0.574, so the prediction is 1.',
          },
          {
            kicker: 'In code',
            title: 'The C parameter',
            body: '**C** is the inverse of the regularisation strength. A small C means a strong penalty and small weights. A very large C switches the penalty off.',
            visual: {
              type: 'code',
              code: SK_C,
              output:
                '0.01 [0.079] [-0.434]\n1 [0.593] [-3.259]\n100 [0.676] [-3.716]\ninf [0.677] [-3.722]',
            },
            note: 'As C grows, the weights approach the maximum likelihood fit from the lab. Choose C by cross-validation.',
            narration:
              'Four values of C. At 0.01 the penalty is strong and the weight is only 0.079. At the default of 1 it is 0.593. At 100 it is 0.676, and with no penalty it reaches 0.677, the maximum likelihood fit.',
          },
          {
            kicker: 'In code',
            title: 'Metrics at each threshold',
            body: 'Take the probabilities, apply your own threshold, and score the result. `ravel()` lists the confusion matrix as TN, FP, FN, TP.',
            visual: {
              type: 'code',
              code: SK_METRICS,
              output: '0.3 [3 2 1 4] 0.67 0.8\n0.5 [4 1 1 4] 0.8 0.8\n0.7 [4 1 2 3] 0.75 0.6\n0.88',
            },
            note: 'Each row: threshold, the four counts, precision, recall. The last line is the AUC. They match the lab.',
            narration:
              'Three thresholds. At 0.3 there are two false positives and precision is 0.67. At 0.5 precision and recall are both 0.8. At 0.7 recall drops to 0.6. The area under the ROC curve is 0.88.',
          },
          {
            kicker: 'Try it',
            title: 'Applying a threshold',
            try: {
              type: 'choice',
              prompt:
                '`predict_proba` returns [[0.426, 0.574]] for a student. What is the prediction at a threshold of 0.7?',
              options: [
                {
                  text: '0, because the probability of class 1 is 0.574, below 0.7',
                  correct: true,
                  feedback:
                    'Right. The second column is the probability of class 1, and it is under the threshold.',
                },
                {
                  text: '1, because 0.574 is the larger of the two numbers',
                  correct: false,
                  feedback:
                    'That is what `predict` does at 0.5. With a threshold of 0.7, 0.574 is not enough.',
                },
                {
                  text: '0, because the first column, 0.426, is below 0.7',
                  correct: false,
                  feedback:
                    'The first column is the probability of class 0. Compare the second with the threshold.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.scratch',
      kind: 'PLAYGROUND',
      title: 'Logistic regression in NumPy',
      depthRank: 1,
      conceptKeys: [SG, LL],
      body: {
        language: 'python',
        instructions:
          'Fill in the three blanks: the sigmoid, the log loss, and the gradient for the weight. Before you run it, predict the second line: the log loss of a model whose weights are all zero.',
        starterCode: SCRATCH_START,
        hints: [
          'Sigmoid: `1 / (1 + np.exp(-z))`.',
          'Log loss: `-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean()`.',
          'Gradient for w: multiply the error `p - y` by `x`, then take `.mean()`.',
        ],
        solution: SCRATCH_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '0.5', label: 'The sigmoid of 0 is 0.5' },
          {
            type: 'stdout_contains',
            value: '0.6931',
            label: 'A model that knows nothing has a log loss of 0.6931',
          },
          {
            type: 'stdout_contains',
            value: '0.095 0.0',
            label: 'One step at a rate of 0.1 gives w = 0.095 and b = 0',
          },
          {
            type: 'stdout_contains',
            value: '0.62 -3.37',
            label: 'After 1,000 steps the weights are 0.62 and −3.37',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Logistic regression quiz',
      depthRank: 1,
      conceptKeys: [SG, LL, MT, TB],
      body: {
        // Each attempt draws 5 of these 22, so a second attempt is new work.
        draw: 5,
        items: [
          {
            key: 'sigmoid',
            type: 'mcq',
            prompt: 'A row has a score of z = −2. Which value is closest to its probability?',
            options: [
              { id: 'a', text: '0.12' },
              { id: 'b', text: '0.50' },
              { id: 'c', text: '0.88' },
              { id: 'd', text: '0.02' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'σ(−2) = 1 / (1 + e²) = 1 / 8.389 = 0.119. A negative score gives a probability below 0.5.',
          },
          {
            key: 'loss',
            type: 'mcq',
            prompt:
              'The true label is 1 and the model predicts p = 0.1. What is the log loss of this row?',
            options: [
              { id: 'a', text: '2.303' },
              { id: 'b', text: '0.105' },
              { id: 'c', text: '0.810' },
              { id: 'd', text: '0.900' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'For y = 1 the loss is −ln(p) = −ln(0.1) = 2.303. With p = 0.9 it would have been only 0.105.',
          },
          {
            key: 'precision',
            type: 'mcq',
            prompt: 'A model gives TP = 30, FP = 10, FN = 20 and TN = 40. What is its precision?',
            options: [
              { id: 'a', text: '0.75' },
              { id: 'b', text: '0.60' },
              { id: 'c', text: '0.70' },
              { id: 'd', text: '0.50' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Precision = TP / (TP + FP) = 30 / 40 = 0.75. The other options mix in FN or TN, which precision never uses.',
          },
          {
            key: 'threshold',
            type: 'mcq',
            prompt: 'You lower the threshold from 0.5 to 0.3. What happens to recall?',
            options: [
              {
                id: 'a',
                text: 'It stays the same or rises',
              },
              { id: 'b', text: 'It falls, because fewer rows are predicted positive' },
              { id: 'c', text: 'It cannot change: only precision depends on the threshold' },
              { id: 'd', text: 'It becomes equal to accuracy' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Every row predicted positive at 0.5 is still predicted positive at 0.3, so no true positive is lost. The price is usually more false positives.',
          },
          {
            key: 'imbalance',
            type: 'mcq',
            prompt:
              'In a fraud dataset 1% of rows are fraud, the positive class. A model predicts "not fraud" for every row. Which is true?',
            options: [
              { id: 'a', text: 'Its accuracy is 99% and its recall is 0' },
              { id: 'b', text: 'Its accuracy is 1% and its recall is 1' },
              { id: 'c', text: 'Its accuracy and recall are both 99%' },
              { id: 'd', text: 'Its precision is 99%' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'It is right on the 99% that are not fraud, and finds none of the fraud. Accuracy misleads on imbalanced data.',
          },
          {
            key: 'boundary',
            type: 'mcq',
            prompt:
              'With two features, what shape is the decision boundary of plain logistic regression?',
            options: [
              { id: 'a', text: 'A straight line' },
              { id: 'b', text: 'An S-shaped curve' },
              { id: 'c', text: 'A circle around the positive class' },
              { id: 'd', text: 'It depends on the learning rate' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The boundary is where the score z is constant, and z is linear in the features. The S-curve is the probability, not the boundary.',
          },
          {
            key: 'why-not-line',
            type: 'mcq',
            prompt: 'Why is a straight line a poor model for a label that is 0 or 1?',
            options: [
              {
                id: 'a',
                text: 'Its output can go below 0 or above 1',
              },
              { id: 'b', text: 'It cannot use more than one feature' },
              { id: 'c', text: 'It predicts 0.5 for every row' },
              { id: 'd', text: 'It always passes through the origin' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A probability must stay between 0 and 1, and a line does not. The sigmoid squeezes the linear score into that range.',
          },
          {
            key: 'score-to-p',
            type: 'mcq',
            prompt:
              'A model is z = 0.5 × hours − 2.5. For a student with 7 hours, which value is closest to the probability?',
            options: [
              { id: 'a', text: '0.73' },
              { id: 'b', text: '0.50' },
              { id: 'c', text: '0.27' },
              { id: 'd', text: '1.00' },
            ],
            answer: { correct: ['a'] },
            explanation: 'z = 0.5 × 7 − 2.5 = 1, and σ(1) = 1 / (1 + e⁻¹) = 0.731.',
          },
          {
            key: 'odds',
            type: 'mcq',
            prompt: 'The probability of clearing is p = 0.8. What are the odds of clearing?',
            options: [
              { id: 'a', text: '4' },
              { id: 'b', text: '0.8' },
              { id: 'c', text: '0.25' },
              { id: 'd', text: '1.6' },
            ],
            answer: { correct: ['a'] },
            explanation: 'Odds = p / (1 − p) = 0.8 / 0.2 = 4: four to one in favour.',
          },
          {
            key: 'weight-odds',
            type: 'mcq',
            prompt:
              'The weight on hours is 0.6767, and e^0.6767 = 1.97. What does one extra hour do?',
            options: [
              { id: 'a', text: 'It multiplies the odds of the positive class by about 1.97' },
              { id: 'b', text: 'It adds 0.6767 to the probability of the positive class' },
              { id: 'c', text: 'It multiplies the probability of the positive class by 1.97' },
              { id: 'd', text: 'It adds 1.97 to the log-odds of the positive class' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The score z is the log-odds, so one more hour adds 0.6767 to it. That multiplies the odds by 1.97. The change in probability depends on where you start.',
          },
          {
            key: 'coin-toss',
            type: 'mcq',
            prompt:
              'A model with w = 0 and b = 0 predicts p = 0.5 for every row. What is its mean log loss?',
            options: [
              { id: 'a', text: '0.693' },
              { id: 'b', text: '0.500' },
              { id: 'c', text: '0.250' },
              { id: 'd', text: '1.000' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Every row costs −ln(0.5) = 0.693. Any useful model must score below this.',
          },
          {
            key: 'why-log-loss',
            type: 'mcq',
            prompt: 'Why does logistic regression use log loss and not mean squared error?',
            options: [
              {
                id: 'a',
                text: 'With the sigmoid, log loss is convex and punishes confident wrong answers heavily',
              },
              { id: 'b', text: 'Log loss is faster to compute, because it skips the sigmoid' },
              { id: 'c', text: 'Squared error cannot be computed for 0 and 1 labels' },
              { id: 'd', text: 'Log loss has a closed-form solution, so it needs no gradient' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Squared error with a sigmoid has more than one valley, and it is too gentle on confident mistakes. Log loss has one lowest point.',
          },
          {
            key: 'gradient',
            type: 'mcq',
            prompt: 'What is the gradient of the mean log loss with respect to the weight w?',
            options: [
              { id: 'a', text: 'mean((p − y) × x)' },
              { id: 'b', text: 'mean((y − p)²)' },
              { id: 'c', text: 'mean(p × x)' },
              { id: 'd', text: '−ln(p)' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The gradient is mean((p − y) × x), and for the intercept it is mean(p − y). Each row’s error, p − y, is scaled by its feature x.',
          },
          {
            key: 'no-formula',
            type: 'mcq',
            prompt: 'How are the weights of logistic regression found?',
            options: [
              {
                id: 'a',
                text: 'By an iterative method such as gradient descent',
              },
              { id: 'b', text: 'By the normal equation, in one step' },
              { id: 'c', text: 'By setting each weight to the mean of its feature' },
              { id: 'd', text: 'By trying every possible pair of weights' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The sigmoid leaves no closed-form solution, so there is nothing to solve in one step. Gradient descent takes small steps downhill until the loss stops falling.',
          },
          {
            key: 'recall',
            type: 'mcq',
            prompt: 'A model gives TP = 45, FP = 15, FN = 5 and TN = 35. What is its recall?',
            options: [
              { id: 'a', text: '0.90' },
              { id: 'b', text: '0.75' },
              { id: 'c', text: '0.80' },
              { id: 'd', text: '0.45' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Recall = TP / (TP + FN) = 45 / 50 = 0.90. The other options mix in FP or TN, which recall never uses.',
          },
          {
            key: 'f1',
            type: 'mcq',
            prompt: 'Precision is 0.5 and recall is 1.0. What is the F1 score?',
            options: [
              { id: 'a', text: '0.67' },
              { id: 'b', text: '0.75' },
              { id: 'c', text: '0.50' },
              { id: 'd', text: '1.00' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'F1 = 2 × P × R / (P + R) = 2 × 0.5 × 1 / 1.5 = 0.67. The harmonic mean sits closer to the lower score than the plain average, 0.75.',
          },
          {
            key: 'which-metric',
            type: 'mcq',
            prompt:
              'A screening test for a serious disease must miss as few sick people as possible. Which metric matters most?',
            options: [
              { id: 'a', text: 'Recall, because a missed sick person is the costly mistake' },
              { id: 'b', text: 'Precision, because a false alarm is the costly mistake' },
              { id: 'c', text: 'Accuracy, because most people tested are healthy' },
              { id: 'd', text: 'F1, because both mistakes cost the same here' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A missed positive is the costly mistake here, so recall matters most. A spam filter is the opposite case: a false alarm is costly.',
          },
          {
            key: 'auc',
            type: 'mcq',
            prompt: 'What does an AUC of 0.5 mean?',
            options: [
              {
                id: 'a',
                text: 'The model ranks positives above negatives no better than guessing',
              },
              { id: 'b', text: 'The model ranks every positive below every negative' },
              { id: 'c', text: 'Its recall is 0.5, whatever threshold you choose' },
              { id: 'd', text: 'The best threshold for this model is 0.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'AUC is the chance that a random positive gets a higher probability than a random negative. At 0.5 that is a coin toss; 1.0 is a perfect ranking.',
          },
          {
            key: 'c-parameter',
            type: 'mcq',
            prompt:
              'In scikit-learn, what does a smaller value of C do in `LogisticRegression` with its default settings?',
            options: [
              { id: 'a', text: 'It strengthens the L2 penalty, so the weights shrink' },
              { id: 'b', text: 'It weakens the penalty, so the weights grow' },
              { id: 'c', text: 'It lowers the decision threshold' },
              { id: 'd', text: 'It reduces the number of features' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'C is the inverse of the regularisation strength, so a small C means a strong penalty. The default penalty is L2, which shrinks weights but does not remove features.',
          },
          {
            key: 'boundary-point',
            type: 'mcq',
            prompt:
              'A one-feature model is z = 2x − 6. Where is the decision boundary at a threshold of 0.5?',
            options: [
              { id: 'a', text: 'x = 3' },
              { id: 'b', text: 'x = −3' },
              { id: 'c', text: 'x = 6' },
              { id: 'd', text: 'x = 0.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'At a threshold of 0.5 the boundary is where z = 0. So 2x − 6 = 0, and x = −b / w = 3.',
          },
          {
            key: 'multiclass',
            type: 'mcq',
            prompt: 'Which statement about more than two classes is correct?',
            options: [
              {
                id: 'a',
                text: 'Softmax gives one probability per class, and they add up to 1',
              },
              { id: 'b', text: 'Logistic regression cannot handle more than two classes' },
              { id: 'c', text: 'One-vs-rest trains one model for every pair of classes' },
              { id: 'd', text: 'Both routes need every label to be a number between 0 and 1' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Softmax extends the sigmoid: one probability per class, adding up to 1. One-vs-rest is the other route, with one yes-or-no model per class. scikit-learn switches to the multinomial form when it sees more than two classes.',
          },
          {
            key: 'ring',
            type: 'mcq',
            prompt:
              'One class forms a ring around the other, and plain logistic regression scores badly. What helps most?',
            options: [
              {
                id: 'a',
                text: 'Adding the square of each feature as a new column',
              },
              { id: 'b', text: 'Lowering the learning rate, so training is smoother' },
              { id: 'c', text: 'Raising the threshold from 0.5 to 0.9' },
              { id: 'd', text: 'Running more steps of gradient descent' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A ring needs a curved boundary. Squared features, as in polynomial regression, let the boundary curve.',
          },
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [SG, LL, MT, TB],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What it is',
            front: 'What is logistic regression?',
            back: 'Logistic regression is a supervised learning algorithm used for classification. It predicts the probability that an input belongs to a class.\n\nIt first calculates a linear score, **z = w·x + b**, just like linear regression. Then it passes that score through the sigmoid function, which converts it into a value between 0 and 1.\n\nIf the probability is 0.5 or more, we predict class 1. Otherwise we predict class 0.\n\nFor example, I can predict whether a student will clear a test from their hours of practice. Other uses are spam detection, loan default and customer churn.',
          },
          {
            title: 'Linear or logistic',
            front: 'What is the difference between linear regression and logistic regression?',
            back: 'The main difference is the type of output.\n\nLinear regression predicts a continuous value, like a salary. Logistic regression predicts a probability, and we use it for classification, like pass or fail.\n\nLinear regression fits a straight line to the data. Logistic regression fits an S-shaped sigmoid curve, so the output always stays between 0 and 1.\n\nThe loss function is different. Linear regression uses mean squared error. Logistic regression uses log loss.\n\nThe evaluation is also different. For linear regression we use RMSE and R squared. For logistic regression we use accuracy, precision, recall and F1 score.\n\nThe same split decides the task. If the question is "how much", it is regression. If it is "which class", it is classification.',
          },
          {
            title: 'Why "regression"',
            front: 'Why is it called regression if it is used for classification?',
            back: 'Because inside, it is still a regression.\n\nThe model fits a linear equation, **z = w·x + b**, exactly like linear regression. That equation predicts a continuous value: the log-odds of the positive class.\n\nThe sigmoid then converts the log-odds into a probability, which is also a continuous value between 0 and 1.\n\nIt becomes a classifier only at the last step, when we apply a threshold such as 0.5 to that probability.\n\nSo the name comes from the method, and the classification comes from the threshold.',
          },
          {
            title: 'The sigmoid',
            front: 'What is the sigmoid function?',
            back: 'The sigmoid function converts any real number into a value between 0 and 1.\n\nThe formula is **σ(z) = 1 / (1 + e⁻ᶻ)**.\n\nWhen z is a large positive number, the output is close to 1. When z is a large negative number, the output is close to 0. When z is 0, the output is exactly 0.5.\n\nIts graph is an S-shaped curve.\n\nIn logistic regression we use it to convert the linear score into a probability.',
          },
          {
            title: 'The loss function',
            front: 'Which loss function is used in logistic regression?',
            back: 'Logistic regression uses **log loss**, also called binary cross-entropy.\n\n**Loss = −[ y·log(p) + (1 − y)·log(1 − p) ]**\n\nHere y is the actual label and p is the predicted probability.\n\nIf the model is confident and correct, the loss is close to zero. If it is confident and wrong, the loss is very high.\n\nWe do not use mean squared error here. With the sigmoid, MSE gives a non-convex curve with many local minima. Log loss is convex, so gradient descent can reach the global minimum.',
          },
          {
            title: 'Confusion matrix',
            front: 'What is a confusion matrix?',
            back: 'A confusion matrix is a table that compares the actual labels with the predicted labels.\n\nFor binary classification it has four values.\n\n**True positive**: actual is positive, predicted positive.\n\n**True negative**: actual is negative, predicted negative.\n\n**False positive**: actual is negative, but predicted positive. This is a false alarm, or Type 1 error.\n\n**False negative**: actual is positive, but predicted negative. This is a miss, or Type 2 error.\n\nFrom these four numbers we calculate accuracy, precision, recall and F1 score.',
          },
          {
            title: 'Precision and recall',
            front: 'What are precision and recall?',
            back: '**Precision** tells us, out of all the rows we predicted as positive, how many are actually positive.\n\nPrecision = TP / (TP + FP)\n\n**Recall** tells us, out of all the actual positive rows, how many we correctly found.\n\nRecall = TP / (TP + FN)\n\nFor example, in a spam filter: precision asks, of the mails marked as spam, how many were really spam. Recall asks, of all the spam mails, how many did we catch.\n\nPrecision is reduced by false positives. Recall is reduced by false negatives.',
          },
          {
            title: 'Precision or recall',
            front: 'When would you prioritise precision over recall?',
            back: 'It depends on which mistake is more costly.\n\nI prioritise **precision** when a false positive is costly. For example, a spam filter. If an important mail goes to spam, the user may miss it.\n\nI prioritise **recall** when a false negative is costly. For example, cancer detection or fraud detection. Missing a real case is much worse than a false alarm.\n\nI control this with the threshold. A higher threshold usually increases precision. A lower threshold increases recall, or keeps it the same.\n\nIf both matter equally, I use the F1 score.',
          },
          {
            title: 'F1 score',
            front: 'What is the F1 score?',
            back: 'The F1 score is the harmonic mean of precision and recall.\n\n**F1 = 2 × (precision × recall) / (precision + recall)**\n\nIt gives one number that balances both metrics. Its value is between 0 and 1, and higher is better.\n\nWe use the harmonic mean because it punishes extreme values. If either precision or recall is very low, the F1 score is also low.\n\nIt is most useful when the dataset is imbalanced, because accuracy can be misleading there.',
          },
          {
            title: 'ROC and AUC',
            front: 'What are the ROC curve and AUC?',
            back: 'The ROC curve shows the performance of a classifier at every threshold.\n\nIt plots the true positive rate, which is recall, against the false positive rate.\n\nAUC means area under the curve. Its value is between 0 and 1.\n\nAn AUC of 1 means a perfect model. An AUC of 0.5 means the model is no better than random guessing.\n\nA simple meaning: pick one positive row and one negative row at random. AUC is the probability that the positive row gets the higher score.\n\nIt is useful for comparing models, because it does not depend on one threshold.',
          },
          {
            title: 'Imbalanced data',
            front: 'How do you handle an imbalanced dataset?',
            back: 'An imbalanced dataset has far more rows of one class than the other. For example, 99% normal transactions and 1% fraud.\n\nFirst, I do not rely on accuracy. I use precision, recall, F1 score and AUC.\n\nThen I can balance the data. Oversampling adds more rows of the minority class, for example with SMOTE. Undersampling removes rows of the majority class.\n\nI can also use class weights, so the model gives more importance to the minority class. In scikit-learn that is `class_weight="balanced"`.\n\nFinally, I can adjust the decision threshold instead of using 0.5.',
          },
          {
            title: 'Low accuracy',
            front: 'Your logistic regression model has low accuracy. What will you check?',
            back: 'I check a few things one by one.\n\nFirst, the data. I look for missing values, outliers and wrongly encoded categorical columns. I also check whether the features are scaled.\n\nSecond, class imbalance. If one class is rare, accuracy is misleading, so I look at precision and recall.\n\nThird, the relationship. Logistic regression draws a straight decision boundary. If the classes are not linearly separable, I add polynomial or interaction features.\n\nFourth, the features. Important features may be missing, or some may be highly correlated.\n\nFinally, I tune the regularisation parameter C and the threshold. If it still fails, I try a non-linear model.',
          },
        ],
      },
    },
  ],
};
