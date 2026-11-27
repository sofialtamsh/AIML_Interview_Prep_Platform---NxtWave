/**
 * Classical ML → Linear regression. The second unit in the V1 pattern: one algorithm, taught in
 * depth beside a live picture whose every number can be checked by hand.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): what gradient descent is and how it trains a model (the most repeated), which loss
 * linear regression uses, the best constant under squared and under absolute error, "train a
 * linear regression model, evaluate it and interpret the results", and comparing it with a
 * decision tree. One bar for every package, so every section is depth 1. Lab numbers match NumPy
 * 2.5 and scikit-learn 1.9.1 (tests in packages/learning-ui/src/linreg.test.ts); the scikit-learn
 * outputs were run on 1.9.1.
 */
import type { LessonDocumentInput } from '@app/content';

const LR = 'linreg.line-residuals';
const GD = 'linreg.gradient-descent';
const MP = 'linreg.multiple-polynomial';
const AS = 'linreg.assumptions';
const MX = 'linreg.metrics';
const RG = 'linreg.regularisation';

/** Six employees: years of experience and salary in LPA. Least squares gives exactly ŷ = 2x + 3. */
const SALARY_LAB = {
  xLabel: 'Years of experience',
  yLabel: 'Salary (LPA)',
  xName: 'years',
  yName: 'salary',
  points: [
    { x: 1, y: 6 },
    { x: 2, y: 6 },
    { x: 3, y: 9 },
    { x: 4, y: 11 },
    { x: 5, y: 12 },
    { x: 6, y: 16 },
  ],
  outlier: { x: 7, y: 4 },
  xRange: { min: 0, max: 8 },
  yRange: { min: 0, max: 20 },
  line: { m: 1, b: 5 },
  slope: { min: -1, max: 4, step: 0.05 },
  intercept: { min: -2, max: 12, step: 0.25 },
  learningRates: [0.01, 0.05, 0.07],
  scaledLearningRates: [0.1, 0.3, 0.5],
};

/**
 * The same six employees, now with a second column: projects shipped. Least squares gives
 * w = [1.625, 0.525] and b = 3.35. "months" is years x 12 plus a little noise, which carries no
 * new information at all: it is there to break the weights.
 */
const MULTI_LAB = {
  yLabel: 'Salary (LPA)',
  yName: 'salary',
  columns: [
    { label: 'Years of experience', name: 'years' },
    { label: 'Projects shipped', name: 'projects' },
  ],
  rows: [
    { x1: 1, x2: 0, y: 6 },
    { x1: 2, x2: 1, y: 6 },
    { x1: 3, x2: 1, y: 9 },
    { x1: 4, x2: 3, y: 11 },
    { x1: 5, x2: 2, y: 12 },
    { x1: 6, x2: 4, y: 16 },
  ],
  duplicate: [12.5, 23.6, 36.3, 47.4, 60.2, 72.1],
  duplicateLabel: 'Months of experience',
  duplicateName: 'months',
  weight: { min: -10, max: 10, step: 0.025 },
  intercept: { min: -2, max: 12, step: 0.05 },
  curve: [
    { x: 0, y: 3.126 },
    { x: 0.4, y: 2.932 },
    { x: 0.8, y: 3.896 },
    { x: 1.2, y: 3.681 },
    { x: 1.6, y: 3.488 },
    { x: 2, y: 4.962 },
    { x: 2.4, y: 6.608 },
    { x: 2.8, y: 7.083 },
    { x: 3.2, y: 6.392 },
    { x: 3.6, y: 6.919 },
    { x: 4, y: 8.777 },
    { x: 4.4, y: 10.785 },
    { x: 4.8, y: 9.891 },
    { x: 5.2, y: 13.597 },
    { x: 5.6, y: 14.298 },
    { x: 6, y: 16.668 },
  ],
  xRange: { min: -0.3, max: 6.3 },
  yRange: { min: 0, max: 18 },
  degrees: [1, 2, 3, 5, 7],
};

const CONSTANT = `import numpy as np

salaries = np.array([6, 6, 9, 12, 47])
guesses = np.arange(0, 48)
mse = [((salaries - g) ** 2).mean() for g in guesses]
mae = [np.abs(salaries - g).mean() for g in guesses]
print(guesses[np.argmin(mse)], salaries.mean())
print(guesses[np.argmin(mae)], np.median(salaries))`;

const SKLEARN = `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score

X = np.array([[1], [2], [3], [4], [5], [6]])   # years
y = np.array([6, 6, 9, 11, 12, 16])            # salary, LPA
model = LinearRegression().fit(X, y)
pred = model.predict(X)
print(model.coef_.round(2), round(float(model.intercept_), 2))
print(round(mean_squared_error(y, pred), 3), round(r2_score(y, pred), 3))
print(model.predict([[7]]).round(2))`;

const MULTIPLE = `import numpy as np
from sklearn.linear_model import LinearRegression

# columns: years of experience, projects shipped
X = np.array([[1, 0], [2, 1], [3, 1], [4, 3], [5, 2], [6, 4]])
y = np.array([6, 6, 9, 11, 12, 16])
model = LinearRegression().fit(X, y)
print(model.coef_.round(3), round(float(model.intercept_), 2))
print(round(model.score(X, y), 3))
print(model.predict([[4, 2]]).round(2))`;

const COLLINEAR = `import numpy as np
from sklearn.linear_model import LinearRegression

years = np.array([1, 2, 3, 4, 5, 6.0])
months = years * 12 + np.array([0.5, -0.4, 0.3, -0.6, 0.2, 0.1])
y = np.array([6, 6, 9, 11, 12, 16])
print(round(float(np.corrcoef(years, months)[0, 1]), 4))
alone = LinearRegression().fit(years.reshape(-1, 1), y)
both = LinearRegression().fit(np.column_stack([years, months]), y)
print(alone.coef_.round(2))
print(both.coef_.round(2))`;

const POLYNOMIAL = `import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures

rng = np.random.default_rng(0)
x = np.linspace(0, 6, 16)
y = 3 + 0.4 * x ** 2 + rng.normal(0, 1.0, x.size)
train = np.arange(x.size) % 2 == 0
for degree in (1, 2, 5):
    model = make_pipeline(PolynomialFeatures(degree), LinearRegression())
    model.fit(x[train].reshape(-1, 1), y[train])
    print(degree, round(model.score(x[train].reshape(-1, 1), y[train]), 3),
          round(model.score(x[~train].reshape(-1, 1), y[~train]), 3))`;

const SCRATCH_HEAD = `import numpy as np

x = np.array([1, 2, 3, 4, 5, 6])       # years of experience
y = np.array([6, 6, 9, 11, 12, 16])    # salary, LPA
`;
const SCRATCH_TAIL = `
m, b = fit_line(x, y)
print(float(m), float(b))
print(float(m * 7 + b))
print(round(float(r_squared(x, y, m, b)), 3))
# one more employee: 7 years, 4 LPA
m2, b2 = fit_line(np.append(x, 7), np.append(y, 4))
print(round(float(m2), 3))
# experience in months
m3, b3 = fit_line(x * 12, y)
print(round(float(m3), 3), float(b3))
`;
const SCRATCH_START = `${SCRATCH_HEAD}
def fit_line(x, y):
    # 1. slope: the sum of (x - mean x) * (y - mean y),
    #    divided by the sum of (x - mean x) squared
    m = ____
    # 2. intercept: the line passes through (mean x, mean y)
    b = ____
    return m, b

def r_squared(x, y, m, b):
    pred = m * x + b
    # 3. one minus SSE over SST
    return ____
${SCRATCH_TAIL}`;
const SCRATCH_SOLUTION = `${SCRATCH_HEAD}
def fit_line(x, y):
    m = ((x - x.mean()) * (y - y.mean())).sum() / ((x - x.mean()) ** 2).sum()
    b = y.mean() - m * x.mean()
    return m, b

def r_squared(x, y, m, b):
    pred = m * x + b
    return 1 - ((y - pred) ** 2).sum() / ((y - y.mean()) ** 2).sum()
${SCRATCH_TAIL}`;

/** The lab's degree-7 fit, which overfits badly, then the same fit with a penalty on the weights. */
const RIDGE = `import numpy as np
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

rng = np.random.default_rng(0)
x = np.linspace(0, 6, 16).reshape(-1, 1)
y = 3 + 0.4 * x[:, 0] ** 2 + rng.normal(0, 1.0, 16)
tr = np.arange(16) % 2 == 0
for model in (LinearRegression(), Ridge(alpha=0.1), Ridge(alpha=10)):
    m = make_pipeline(PolynomialFeatures(7, include_bias=False), StandardScaler(), model)
    m.fit(x[tr], y[tr])
    print(round(m.score(x[tr], y[tr]), 3), round(m.score(x[~tr], y[~tr]), 3),
          round(float(abs(m[-1].coef_).max()), 2))`;

const LASSO = `import numpy as np
from sklearn.linear_model import Lasso, Ridge
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import PolynomialFeatures, StandardScaler

rng = np.random.default_rng(0)
x = np.linspace(0, 6, 16).reshape(-1, 1)
y = 3 + 0.4 * x[:, 0] ** 2 + rng.normal(0, 1.0, 16)
tr = np.arange(16) % 2 == 0
for model in (Ridge(alpha=0.1), Lasso(alpha=0.1)):
    m = make_pipeline(PolynomialFeatures(7, include_bias=False), StandardScaler(), model)
    m.fit(x[tr], y[tr])
    print(round(m.score(x[~tr], y[~tr]), 3), m[-1].coef_.round(2))`;

export const LINEAR_REGRESSION_LESSON: LessonDocumentInput = {
  title: 'Linear regression',
  subtitle:
    'Predict a number by drawing the best straight line through your data. You place the line by hand, see what makes one line better than another, then find the best one the way a computer does.',
  objectives: [
    {
      key: 'line',
      text: 'Say what linear regression is, and what its two numbers mean',
      minDepthRank: 1,
    },
    {
      key: 'descent',
      text: 'Measure how wrong a line is, and find the best one in two ways',
      minDepthRank: 1,
    },
    {
      key: 'more',
      text: 'Predict from several columns at once, and notice a model that has gone too far',
      minDepthRank: 1,
    },
    {
      key: 'assume',
      text: 'Spot when a straight line is the wrong answer, from the gaps it leaves',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Predicting a number',
      depthRank: 1,
      conceptKeys: [LR],
      body: {
        scenario:
          '**Linear regression** predicts a number by fitting the best straight line through past examples. Use it when the answer is a quantity: a salary, a price, a demand.\n\nThe example: six employees, each with years of experience and a salary in LPA. Plotted, the dots climb, but not along one line.\n\nA seventh person has 7 years. Nobody on record does, so nothing can be looked up. The fitted line answers: read it at 7 years. That line is the whole model: a slope and an intercept.',
        animation: {
          name: 'line-of-best-fit',
          caption: 'Six employees, and the line read at 7 years',
        },
        analogy: {
          text: 'You have done this with a ruler. Dots on graph paper, a ruler held close to all of them, one line drawn. Linear regression is that ruler, placed by arithmetic instead of by eye.',
          mapping: [
            { everyday: 'The dots on the paper', technical: 'Training data: one dot per example' },
            {
              everyday: 'Where you hold the ruler',
              technical: 'The slope and the intercept: the model’s two numbers',
            },
            {
              everyday: 'The gaps left under the ruler',
              technical: 'Residuals: how wrong the line is for each example',
            },
          ],
          whereItBreaks:
            'A ruler is straight. When the real pattern bends, no position of it fits. The end of this unit shows how to spot that.',
        },
        realWorld: {
          title: 'Where a fitted line decides',
          items: [
            { icon: 'rupee', label: 'Pay and prices', sub: 'Salary from experience' },
            { icon: 'chart', label: 'Forecasts', sub: 'Next month’s demand' },
            { icon: 'target', label: 'Marketing', sub: 'Sales against ad spend' },
            { icon: 'gauge', label: 'Baselines', sub: 'The first model to try' },
          ],
        },
        provocation: 'Hundreds of lines pass near six dots. What makes one of them the best?',
        bridge:
          'You place the line yourself, then learn how a line is scored. Then find the best one twice: with a formula, and by walking downhill.',
      },
    },
    {
      key: 'widget.line',
      kind: 'WIDGET',
      title: 'The line and residuals',
      depthRank: 1,
      conceptKeys: [LR],
      body: {
        widget: 'linreg-lab',
        prompt:
          'Six employees: years of experience across, salary up. Follow the steps, then move the line yourself.',
        story: [
          {
            kicker: 'The goal',
            title: 'The data and the goal',
            body: 'Each dot is one employee: years of experience across, salary in LPA up. The dots rise to the right, but not along one line, because pay depends on more than experience.\n\nThe job of **linear regression** is to find the single straight line that passes closest to all six dots. Once it exists, any prediction is just a point on it.',
            show: 'points',
          },
          {
            kicker: 'The model',
            title: 'Slope and intercept',
            body: 'A line is **ŷ = m·x + b**, where ŷ, said "y hat", is the predicted salary. The **slope m** is how much the prediction changes when x grows by 1. The **intercept b** is the prediction at x = 0. This first guess, ŷ = 1x + 5, says each year adds 1 LPA, starting from 5. Drag the handles and watch the equation change.',
            show: 'line',
            line: { m: 1, b: 5 },
          },
          {
            kicker: 'Predict',
            title: 'Making a prediction',
            body: 'To predict, put x into the equation. For 7 years this line says ŷ = 1 × 7 + 5 = 12 LPA. Nobody in the data has 7 years, so this is **extrapolation**: trusting the line beyond the points it was fitted on.',
            show: 'line',
            line: { m: 1, b: 5 },
            predict: 7,
          },
          {
            kicker: 'The error',
            title: 'Residuals',
            body: 'For each employee, compare the real salary y with the prediction ŷ. The gap **y − ŷ** is the **residual**. At 6 years the line predicts 11 but the real salary is 16, so the residual is 5. The table works out all six. A good line keeps them small.',
            show: 'residuals',
            line: { m: 1, b: 5 },
            panel: 'calculation',
          },
          {
            kicker: 'The loss',
            title: 'Mean squared error',
            body: 'Adding raw residuals fails, because positive and negative ones cancel. So each residual is **squared**: the squares in the picture. Squaring also punishes one big miss more than several small ones. Here the squares are 0, 1, 1, 4, 4 and 25, which add to 35. Their average is the **mean squared error**: MSE = 35 / 6 = 5.83. The MSE is the **loss**: the number fitting makes as small as possible.',
            show: 'squares',
            line: { m: 1, b: 5 },
            panel: 'calculation',
          },
          {
            kicker: 'Try it',
            title: 'Minimising the loss',
            body: 'Move the line and watch the squares shrink or grow. Try a steeper slope, then adjust the intercept. Can you bring the MSE below 1? Fitting a model is this search, done by a method.',
            show: 'squares',
            line: { m: 1, b: 5 },
          },
          {
            kicker: 'The best line',
            title: 'The least-squares line',
            body: 'This is the line with the lowest possible MSE: **ŷ = 2x + 3**. Each year adds 2 LPA, from a base of 3. The residuals are 1, −1, 0, 0, −1 and 1, so MSE = 4 / 6 = 0.67. No other straight line does better. For 7 years it predicts 2 × 7 + 3 = 17 LPA. Nobody has 0 years, so read b = 3 as the line’s anchor, not a real starting salary.',
            show: 'squares',
            best: true,
            panel: 'calculation',
            predict: 7,
          },
        ],
        params: {
          ...SALARY_LAB,
          datasets: ['custom'],
          defaultDataset: 'custom',
          panels: ['calculation'],
          controls: ['line', 'best-fit', 'predict'],
          tasks: [
            'Set the slope to 2 and the intercept to 4. Every residual shifts by 1. What happens to the MSE?',
            'Make the line flat at the mean salary: slope 0, intercept 10. R² scores every line against this one. What is its own R²?',
            'Find a line with a negative R². What does a negative value tell you?',
          ],
        },
      },
    },
    {
      key: 'slides.loss',
      kind: 'SLIDES',
      title: 'Loss and metrics',
      depthRank: 1,
      conceptKeys: [MX],
      body: {
        slides: [
          {
            kicker: 'Residuals',
            title: 'Actual minus predicted',
            body: 'A **residual** is how far one prediction missed: actual salary minus predicted salary. The best line is **ŷ = 2x + 3**. The first employee has 1 year, so it predicts 2 × 1 + 3 = 5 LPA. The actual salary is 6: residual 6 − 5 = **+1**.',
            visual: {
              type: 'table',
              columns: ['Years', 'Actual salary', 'Predicted (2x + 3)', 'Residual'],
              cells: [
                ['1', '6', '5', '+1'],
                ['2', '6', '7', '−1'],
                ['3', '9', '9', '0'],
                ['4', '11', '11', '0'],
                ['5', '12', '13', '−1'],
                ['6', '16', '15', '+1'],
              ],
              highlight: 3,
            },
            note: 'Plus: the person earns more than the line predicts. Minus: less. Every metric is built from this last column.',
          },
          {
            kicker: 'Worked out',
            title: 'From residuals to metrics',
            body: 'Residuals cannot simply be added: +1 and −1 would cancel, and a bad line could look perfect. So each is squared, or its sign is dropped. Then average over the 6 employees.',
            visual: {
              type: 'table',
              columns: ['Residual', 'Squared', 'Absolute'],
              cells: [
                ['+1', '1', '1'],
                ['−1', '1', '1'],
                ['0', '0', '0'],
                ['0', '0', '0'],
                ['−1', '1', '1'],
                ['+1', '1', '1'],
              ],
              totals: ['Sum', '4', '4'],
              highlight: 1,
            },
            note: '**MSE** = 4 / 6 = 0.67. **RMSE** = √0.67 = 0.82 LPA. **MAE** = 4 / 6 = 0.67 LPA. MSE and MAE match here only because every residual is 0 or 1.',
          },
          {
            kicker: 'Which one',
            title: 'MSE, RMSE and MAE',
            body: 'The same residuals, three different jobs.',
            animation: {
              name: 'mse-rmse-mae',
            },
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'target',
                  label: 'MSE — to fit',
                  sub: 'What least squares minimises; a big miss counts far more',
                },
                {
                  icon: 'gauge',
                  label: 'RMSE — to report',
                  sub: 'In salary units, so it reads as a typical miss',
                },
                {
                  icon: 'shield',
                  label: 'MAE — with outliers',
                  sub: 'Averages the gap sizes; one extreme row sways it less',
                },
              ],
            },
            note: 'Fit with MSE, report RMSE, use MAE when outliers are real. An RMSE of 0.82 LPA reads as "typically off by ₹82,000".',
          },
          {
            kicker: 'In code',
            title: 'Squared versus absolute loss',
            body: 'Predict everyone’s salary with one number. Squared error picks the **mean**. Absolute error picks the **median**: as many salaries above as below.',
            visual: { type: 'code', code: CONSTANT, output: '16 16.0\n9 9.0' },
            note: 'A salary of 47 drags the mean to 16; the median stays at 9. MSE chases outliers; MAE resists.',
            narration:
              'Five salaries, one far above the rest. We try every whole number as the single prediction. Squared error picks 16, the mean. Absolute error picks 9, the median.',
          },
          {
            kicker: 'R squared',
            title: 'Variance explained',
            body: '**R²** scores your line against always predicting the mean salary, 10. **SSE** is the sum of squared residuals, 4. **SST** is that sum around the mean: 16 + 16 + 1 + 1 + 4 + 36 = 74. One minus their ratio is R².',
            animation: {
              name: 'r-squared-gaps',
            },
            visual: { type: 'stat', value: '0.946', label: 'R² = 1 − 4 / 74' },
            note: 'R² is 1 for a perfect fit and 0 for "no better than the mean". Negative is worse: a bad line, or a fit judged on new data.',
          },
          {
            kicker: 'Try it',
            title: 'MSE of the best line',
            try: {
              type: 'code',
              prompt: 'Compute the MSE of ŷ = 2x + 3 on the six employees, rounded to 3 decimals.',
              starter:
                'import numpy as np\n\nx = np.array([1, 2, 3, 4, 5, 6])\ny = np.array([6, 6, 9, 11, 12, 16])\n# predictions, residuals, then the mean of their squares',
              expected: '0.667',
              hint: 'Predictions are `2 * x + 3`. Subtract from `y`, square, take `.mean()`.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Interpreting RMSE',
            try: {
              type: 'choice',
              prompt:
                'A rent model has an RMSE of 4, rent in thousands of rupees. What does that tell you?',
              options: [
                {
                  text: 'Its predictions are typically about ₹4,000 from the real rent',
                  correct: true,
                  feedback: 'Right. RMSE is in the target’s units, so it reads as a typical error.',
                },
                {
                  text: 'It explains 4% of the variation in rent',
                  correct: false,
                  feedback: 'That is R², a share. RMSE is an error size.',
                },
                {
                  text: 'It is wrong for 4 flats in every 100',
                  correct: false,
                  feedback: 'RMSE measures how far predictions are off, not how often.',
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
      title: 'Least squares and descent',
      depthRank: 1,
      conceptKeys: [LR, GD],
      body: {
        widget: 'linreg-lab',
        prompt:
          'The same six employees. Find the best line twice: with a formula, then by walking downhill one step at a time.',
        story: [
          {
            kicker: 'Two ways',
            title: 'Two ways to fit',
            body: 'Two ways find the best line. **Least squares** solves for it exactly with a formula. **Gradient descent** starts from any line and improves it step by step. Both aim for the same lowest MSE.\n\nThe formula is the default on small data; descent takes over when the data outgrows it. The start is a poor guess, ŷ = 0: every residual is the salary itself, so the MSE is 112.33.',
            show: 'squares',
            line: { m: 0, b: 0 },
          },
          {
            kicker: 'Least squares',
            title: 'The closed-form solution',
            body: 'Take the means: x̄ = 3.5 years and ȳ = 10 LPA. The slope is **m = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)²** = 35 / 17.5 = 2. The intercept makes the line pass through the means: **b = ȳ − m·x̄** = 10 − 2 × 3.5 = 3. No search is needed.',
            show: 'squares',
            best: true,
            panel: 'ols',
          },
          {
            kicker: 'Gradient descent',
            title: 'The gradient',
            body: 'Start again from ŷ = 0. The **gradient** says how the MSE changes when m or b grows a little. Both values are negative, −81.67 and −20, so raising m and b lowers the loss. A step moves against the gradient: m = 0 − 0.01 × (−81.67) = 0.82. The **learning rate**, 0.01, sets the step size.',
            show: 'squares',
            line: { m: 0, b: 0 },
            panel: 'descent',
            learningRate: 0.01,
            steps: 0,
          },
          {
            kicker: 'Repeat',
            title: 'Convergence',
            body: 'After 50 steps at a rate of 0.05 the line is ŷ = 2.22x + 2.04, with an MSE of 0.84. That is close to the best, 0.67, but 139 steps are needed to come within 1% of it. The slope settles fast. The intercept crawls: drawn against m and b, the MSE forms a long, narrow valley.',
            show: 'squares',
            line: { m: 0, b: 0 },
            panel: 'descent',
            learningRate: 0.05,
            steps: 50,
          },
          {
            kicker: 'Too fast',
            title: 'Divergence',
            body: 'At a rate of 0.07 each step jumps past the lowest point and lands higher on the other side. The MSE climbs from 112 to 171, 261 and 399 in three steps: the run **diverges**. Too small a rate is slow, and too large a rate never arrives.',
            show: 'squares',
            line: { m: 0, b: 0 },
            panel: 'descent',
            learningRate: 0.07,
            steps: 3,
          },
          {
            kicker: 'Scaling',
            title: 'Feature scaling',
            body: 'Now x is **standardised**: its mean is subtracted, and it is divided by its standard deviation. The narrow valley becomes a round bowl, so a larger rate is safe. At 0.3, six steps bring the MSE within 1% of the best, against 139 before. This is why features are scaled before gradient descent.',
            show: 'squares',
            line: { m: 0, b: 0 },
            panel: 'descent',
            scaled: true,
            learningRate: 0.3,
            steps: 6,
          },
          {
            kicker: 'Batches',
            title: 'Batch, SGD and mini-batch',
            body: 'Every step so far used all six employees: that is **batch** gradient descent. **Stochastic** gradient descent (SGD) takes one random row per step. Its slope gradient is −12 from the first employee alone, but −192 from the last, against −81.67 for all six. **Mini-batch** averages a small random group, often 32 rows, and is the usual choice. One pass over all the rows is an **epoch**.',
            show: 'squares',
            line: { m: 0, b: 0 },
            panel: 'descent',
            learningRate: 0.01,
            steps: 0,
          },
        ],
        params: {
          ...SALARY_LAB,
          datasets: ['custom'],
          defaultDataset: 'custom',
          line: { m: 0, b: 0 },
          panels: ['descent', 'ols'],
          controls: ['line', 'best-fit'],
          tasks: [
            'With x as it is, restart and try each learning rate. Which is the largest whose MSE still settles, instead of growing?',
            'Standardise x, choose a rate of 0.5 and take one step. A round bowl lets one step land at the bottom: check the MSE.',
            'Press Draw this line in the least-squares panel. Does gradient descent ever beat its MSE?',
            'Restart, choose 0.05 and press Run 20 steps seven times. Compare the MSE after 140 steps with 0.667.',
          ],
        },
      },
    },
    {
      key: 'slides.multi',
      kind: 'SLIDES',
      title: 'Multiple linear regression',
      depthRank: 1,
      conceptKeys: [MP],
      body: {
        slides: [
          {
            kicker: 'Definition',
            title: 'Multiple linear regression',
            body: 'Simple linear regression uses one feature. **Multiple linear regression** uses two or more: **ŷ = b + w₁x₁ + w₂x₂ + …** Each feature gets its own weight, also called a coefficient.',
            animation: {
              name: 'regression-plane',
              caption: 'Two features: the fitted model is a plane',
            },
            note: 'One feature gives a line, two give a plane. With more, the shape cannot be drawn, but the maths is the same.',
          },
          {
            kicker: 'The data',
            title: 'One more column',
            body: 'The same six employees, with a second feature: projects shipped. The model now reads two numbers for each person.',
            visual: {
              type: 'table',
              columns: ['Years', 'Projects', 'Salary (LPA)'],
              cells: [
                ['1', '0', '6'],
                ['2', '1', '6'],
                ['3', '1', '9'],
                ['4', '3', '11'],
                ['5', '2', '12'],
                ['6', '4', '16'],
              ],
            },
            note: 'Each row is one training example. Years and projects are the features; salary is the target.',
          },
          {
            kicker: 'Prediction',
            title: 'Predicting with two features',
            body: 'Least squares gives **ŷ = 3.35 + 1.625·years + 0.525·projects**. To predict, multiply each feature by its weight, then add the intercept. Take the fourth employee: 4 years and 3 projects.',
            visual: {
              type: 'table',
              columns: ['Term', 'Calculation', 'Value'],
              cells: [
                ['Intercept', 'b', '3.35'],
                ['Years', '1.625 × 4', '6.50'],
                ['Projects', '0.525 × 3', '1.575'],
              ],
              totals: ['Prediction', 'add them up', '11.43'],
              highlight: 2,
            },
            note: 'The actual salary is 11 LPA, so this residual is 11 − 11.43 = −0.43.',
          },
          {
            kicker: 'Coefficients',
            title: 'Interpreting a coefficient',
            body: 'Read each weight with the other features held constant. One more year adds 1.625 LPA at the same number of projects. One more project adds 0.525 LPA at the same experience.',
            animation: {
              name: 'coefficient-held-fixed',
            },
            visual: {
              type: 'icons',
              items: [
                { icon: 'chart', label: '1.625 per year', sub: 'With projects held constant' },
                {
                  icon: 'layers',
                  label: '0.525 per project',
                  sub: 'With experience held constant',
                },
                {
                  icon: 'target',
                  label: '3.35 intercept',
                  sub: 'The prediction when both features are zero',
                },
              ],
            },
            note: 'With years alone the weight was 2. It fell because projects grow with experience, and now explain part of the salary.',
          },
          {
            kicker: 'Metric',
            title: 'Adjusted R squared',
            body: 'R² never falls when a feature is added, even a useless one. **Adjusted R²** corrects for that: **1 − (1 − R²)(n − 1) / (n − p − 1)**, with n rows and p features. It rises only when a new feature helps enough.',
            animation: {
              name: 'adjusted-r2-penalty',
              caption:
                'Projects lift R squared a little; the charge for a second feature costs more',
            },
            visual: {
              type: 'table',
              columns: ['Model', 'R²', 'Adjusted R²'],
              cells: [
                ['Years only', '0.946', '0.932'],
                ['Years + projects', '0.953', '0.922'],
              ],
              highlight: 2,
            },
            note: 'R² went up, but adjusted R² went down. On six rows, projects did not add enough to earn a place.',
          },
          {
            kicker: 'Pitfall',
            title: 'Multicollinearity and VIF',
            body: '**Multicollinearity** means two features are highly correlated, so the model cannot separate their effects, and the weights become unstable. The **variance inflation factor** measures it: VIF = 1 / (1 − R²), from predicting one feature with the others.',
            animation: {
              name: 'collinear-weights',
            },
            visual: {
              type: 'table',
              columns: ['Feature pair', 'Correlation', 'VIF'],
              cells: [
                ['Years, projects', '0.908', '5.7'],
                ['Years, months', '0.9998', '2814'],
              ],
              highlight: 2,
            },
            note: 'A VIF above 5 deserves a look; above 10 is a problem. Drop one feature, combine them, or use ridge.',
          },
        ],
      },
    },
    {
      key: 'widget.multi',
      kind: 'WIDGET',
      title: 'Multiple regression lab',
      depthRank: 1,
      conceptKeys: [MP],
      body: {
        widget: 'linreg-multi',
        prompt:
          'The same six employees, now with projects shipped as a second feature. Set the weights, then let the formula find them.',
        story: [
          {
            kicker: 'The picture',
            title: 'Predicted against actual',
            body: 'Each dot is one employee: actual salary across, predicted salary up. A perfect model puts every dot on the dashed line. The model is **ŷ = b + w₁·years + w₂·projects**. It starts as the old line, with w₂ = 0, so projects count for nothing yet. The employee earning 16 sits 1 LPA below the line.',
            view: 'features',
            features: 2,
            weights: [2, 0],
            intercept: 3,
            panel: 'table',
          },
          {
            kicker: 'By hand',
            title: 'Setting the weights',
            body: 'Raise the weight on projects. Every prediction moves by that much per project shipped, so dots with several projects climb, and the dot with none stays put. Lower the weight on years a little to pay for it. The best pair is somewhere in here, and by hand the search is slow.',
            view: 'features',
            features: 2,
            weights: [1.8, 0.4],
            intercept: 3.2,
            panel: 'table',
          },
          {
            kicker: 'Exact fit',
            title: 'The normal equation',
            body: 'One formula finds every weight at once: **w = (XᵀX)⁻¹Xᵀy**. X holds the two columns, and a column of ones for b. No search, no learning rate. Snap to it, and the dots close in on the line. A year is now worth less than 2, because part of its old effect belonged to projects.',
            view: 'features',
            features: 2,
            best: true,
            row: 5,
            panel: 'working',
          },
          {
            kicker: 'Reading a weight',
            title: 'Interpreting a weight',
            body: 'A weight is the change in ŷ when its own column rises by one **and the other stays fixed**. Two employees with equal experience, one project apart, differ by exactly that weight. So a weight is not importance. Count experience in months instead of years: its weight shrinks twelvefold, and the model is unchanged.',
            view: 'features',
            features: 2,
            best: true,
            row: 3,
            panel: 'working',
          },
          {
            kicker: 'Did it earn it',
            title: 'Adjusted R squared',
            body: 'R² never falls when a column is added, because the fit can always ignore it. **Adjusted R²** charges for each feature. Projects lift R², but on six employees they cost more than they pay, so adjusted R² falls. With several features, quote this score, not R².',
            view: 'features',
            features: 2,
            best: true,
            panel: 'scores',
          },
          {
            kicker: 'The trap',
            title: 'Multicollinearity',
            body: 'Swap projects for **months of experience**: years × 12, and nothing else. The dots barely move, so the fit is no worse. The weights fall apart: one turns large and negative, the other positive, and neither can be read. The correlation between the two columns is almost exactly 1.',
            view: 'features',
            features: 2,
            second: 'duplicate',
            best: true,
            panel: 'scores',
          },
        ],
        params: {
          ...MULTI_LAB,
          tasks: [
            'Set the weight on projects to 0 and read R² and adjusted R². Which one says projects were worth adding?',
            'Switch to months of experience, then change the weight on years by 1. Find the weight on months that keeps the dots in place.',
          ],
        },
      },
    },
    {
      key: 'slides.poly',
      kind: 'SLIDES',
      title: 'Polynomial regression',
      depthRank: 1,
      conceptKeys: [MP],
      body: {
        slides: [
          {
            kicker: 'Definition',
            title: 'Polynomial regression',
            body: 'When the points follow a curve, no straight line fits them. **Polynomial regression** adds powers of x as new features: **ŷ = b + w₁x + w₂x² + …** The highest power is the **degree**.',
            animation: {
              name: 'polynomial-degrees',
              caption: 'One dataset, fitted at degree 1, 2 and 7',
            },
            note: 'It is still linear regression: the model is linear in the weights, so least squares works unchanged.',
          },
          {
            kicker: 'Features',
            title: 'Polynomial features',
            body: 'The powers are built first, as ordinary columns. Then the usual fit runs on those columns. Degree 3 turns one feature into three.',
            animation: {
              name: 'polynomial-columns',
              caption:
                'x, x squared and x cubed as three columns: a straight-line fit on them bends',
            },
            visual: {
              type: 'table',
              columns: ['x', 'x²', 'x³'],
              cells: [
                ['1', '1', '1'],
                ['2', '4', '8'],
                ['3', '9', '27'],
                ['4', '16', '64'],
              ],
            },
            note: 'In scikit-learn, `PolynomialFeatures(degree=3)` builds these columns for you.',
          },
          {
            kicker: 'Two failures',
            title: 'Underfitting and overfitting',
            visual: {
              type: 'compare',
              left: {
                title: 'Underfitting',
                items: [
                  'The model is too simple for the pattern',
                  'High error on the training data',
                  'High error on new data',
                  'Fix: raise the degree or add features',
                ],
              },
              right: {
                title: 'Overfitting',
                items: [
                  'The model is too flexible and fits the noise',
                  'Very low error on the training data',
                  'High error on new data',
                  'Fix: lower the degree, regularise, add data',
                ],
              },
              better: 'none',
            },
            note: 'Underfitting is **high bias**. Overfitting is **high variance**. A good model keeps both low.',
          },
          {
            kicker: 'Trade-off',
            title: 'Bias and variance',
            body: 'As the degree rises, training error keeps falling. Error on held-back data falls at first, then climbs again. The best model sits at the lowest point of that second curve.',
            animation: {
              name: 'bias-variance-curve',
              caption: 'Training error and held-back error against degree',
            },
            note: 'Held-back R² on this data: 0.869 at degree 1, 0.964 at degree 3, and 0.910 at degree 5.',
          },
          {
            kicker: 'In practice',
            title: 'Choosing the degree',
            body: 'Never choose the degree on the training data: the highest degree always wins there.',
            animation: {
              name: 'degree-cross-validation',
            },
            visual: {
              type: 'flow',
              steps: [
                { label: 'Split the data' },
                { label: 'Fit each degree' },
                { label: 'Score held-back data' },
                { label: 'Keep the best' },
              ],
            },
            note: 'Cross-validation repeats the split several times, so one lucky split cannot decide.',
          },
        ],
      },
    },
    {
      key: 'widget.poly',
      kind: 'WIDGET',
      title: 'Polynomial regression lab',
      depthRank: 1,
      conceptKeys: [MP],
      body: {
        widget: 'linreg-multi',
        prompt:
          'Sixteen points that bend. Every second one is held back, so each curve is scored on points it never saw.',
        story: [
          {
            kicker: 'Degree 1',
            title: 'Underfitting',
            body: 'These points climb slowly, then fast. A straight line does its best and still misses whole stretches: it **underfits**. Half the points are held back from the fit. The line scores about the same on both halves, because it is far too simple to have memorised anything.',
            view: 'curve',
            degree: 1,
            holdOut: true,
          },
          {
            kicker: 'Degree 2',
            title: 'Polynomial features',
            body: 'Add x² as another column and the same formula fits a curve. It is still *linear* regression, because ŷ is linear in the **weights**. Degree 2 matches the real shape, and the held-back half agrees. When both scores rise together, the model has found the pattern.',
            view: 'curve',
            degree: 2,
            holdOut: true,
          },
          {
            kicker: 'Degree 5',
            title: 'Overfitting',
            body: 'Push the degree higher. The fitted half keeps improving, because more powers can bend through more points. The held-back half gets worse: the curve is chasing the wiggles of the points it was handed. That gap is **overfitting**. Now try degree 7.',
            view: 'curve',
            degree: 5,
            holdOut: true,
          },
        ],
        params: {
          ...MULTI_LAB,
          tasks: [
            'Raise the degree one step at a time. At which degree does the held-back score start to fall?',
            'At degree 7, switch to fitting on every point. Why does the score look perfect now, and why is that misleading?',
          ],
        },
      },
    },
    {
      key: 'slides.more',
      kind: 'SLIDES',
      title: 'Fitting models in scikit-learn',
      depthRank: 1,
      conceptKeys: [MP, RG],
      body: {
        slides: [
          {
            kicker: 'In code',
            title: 'LinearRegression in scikit-learn',
            visual: { type: 'code', code: SKLEARN, output: '[2.] 3.0\n0.667 0.946\n[17.]' },
            note: 'Say it in words. Each extra year adds 2 LPA on average. The typical error is about 0.82 LPA, and 94.6% of the variation is explained.',
            narration:
              'scikit-learn finds the same line as our formula. coef is the slope, 2, and intercept is 3. The mean squared error is 0.667 and R squared is 0.946. For 7 years the model predicts 17. Interpreting those four numbers in plain words is what interviewers ask for.',
          },
          {
            kicker: 'More features',
            title: 'Multiple regression in code',
            body: 'The same two-column fit in scikit-learn. `coef_` holds one weight per column, in the order they were given, and `intercept_` is b.',
            visual: { type: 'code', code: MULTIPLE, output: '[1.625 0.525] 3.35\n0.953\n[10.9]' },
            note: 'Read it back in words. One more year adds 1.625 LPA at the same number of projects; one more project adds 0.525.',
            narration:
              'Each employee now has two features: years of experience and projects shipped. The model learns one weight for each: 1.625 per year and 0.525 per project, with an intercept of 3.35. R squared rises a little, to 0.953. For 4 years and 2 projects it predicts 10.9.',
          },
          {
            kicker: 'Pitfall',
            title: 'Detecting multicollinearity',
            body: 'The trap in code: months is years × 12 plus a little noise. Fit with years alone, then with both, and watch the weights rather than the predictions.',
            visual: { type: 'code', code: COLLINEAR, output: '0.9998\n[2.]\n[-8.75  0.9 ]' },
            note: 'Detect it with a correlation matrix or the variance inflation factor (VIF). Then drop or combine the columns, or use ridge, which shrinks the weights.',
            narration:
              'Years and months are nearly the same column: their correlation is 0.9998. With years alone the weight is 2. With both, the weights become minus 8.75 and 0.9, and neither can be read.',
          },
          {
            kicker: 'Curves',
            title: 'Polynomial regression',
            body: 'The curve from the lab, in code. `PolynomialFeatures` builds the extra columns, and the same `LinearRegression` fits them. Every second point is held back and scored.',
            visual: {
              type: 'code',
              code: POLYNOMIAL,
              output: '1 0.893 0.869\n2 0.96 0.957\n5 0.977 0.91',
            },
            note: 'Each row: degree, training R², then R² on the half held back. A line underfits (**high bias**); degree 5 overfits (**high variance**).',
            narration:
              'The same sixteen points as the lab. A straight line scores 0.87 on the held-back half. Degree 2 matches the real shape, at 0.96. Degree 5 scores highest on the training half, but falls to 0.91 on the half it never saw.',
          },
          {
            kicker: 'Regularisation',
            title: 'Ridge regression',
            body: 'Degree 7 in the lab hit every training point and failed on the rest: its weights had exploded. **Ridge** adds an **L2** penalty to the loss, MSE + α × Σw². Large weights now cost something, so the curve calms down.',
            visual: {
              type: 'code',
              code: RIDGE,
              output: '1.0 -7.361 23586.69\n0.97 0.961 1.47\n0.925 0.906 0.58',
            },
            note: 'Each row: training R², held-back R², largest weight. α = 0.1 repairs the fit; α = 10 shrinks too hard. Choose α by cross-validation.',
            narration:
              'Three fits on the same degree 7 columns. Plain least squares is perfect on the training half and scores minus 7 on the rest. Ridge with alpha 0.1 lifts the held-back score to 0.96. Alpha 10 shrinks too hard.',
          },
          {
            kicker: 'Regularisation',
            title: 'Lasso regression',
            body: '**Lasso** uses an **L1** penalty, on the absolute weights instead: MSE + α × Σ|w|. That drives some weights to exactly zero, so lasso selects features while it fits. Ridge only shrinks them.',
            visual: {
              type: 'code',
              code: LASSO,
              output:
                '0.961 [ 1.47  0.94  0.22 -0.06  0.03  0.33  0.73]\n0.958 [1.32 1.28 0.   0.   0.   0.   0.97]',
            },
            note: 'Ridge keeps all seven powers, each small. Lasso keeps three and zeroes four. Ridge suits correlated features; lasso drops useless ones. Scale the features first for both.',
            narration:
              'Ridge and lasso on the same seven columns. Both score about 0.96 on the held-back half. Ridge keeps every weight, each small. Lasso sets four of them to exactly zero.',
          },
          {
            kicker: 'Try it',
            title: 'Reading a coefficient',
            try: {
              type: 'choice',
              prompt:
                'A salary model has weights 1.625 for years and 0.525 for projects. What does 1.625 mean?',
              options: [
                {
                  text: 'One more year adds 1.625 LPA, for the same number of projects',
                  correct: true,
                  feedback: 'Right: its effect with the other features held fixed.',
                },
                {
                  text: 'Years explain 1.625 times more of the salary than projects',
                  correct: false,
                  feedback: 'Weights depend on units. Scale the features before comparing them.',
                },
                {
                  text: 'Salary and years have a correlation of 1.625',
                  correct: false,
                  feedback: 'A correlation never exceeds 1. A weight is a slope, in LPA per year.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.assumptions',
      kind: 'WIDGET',
      title: 'Residual plots',
      depthRank: 1,
      conceptKeys: [AS],
      body: {
        widget: 'linreg-lab',
        prompt:
          'A fitted line is only as good as its assumptions. The residuals show when one is broken.',
        story: [
          {
            kicker: 'A healthy fit',
            title: 'A healthy residual plot',
            body: 'Linear regression assumes that the relationship is a straight line, and that the errors are random noise of similar size everywhere. The check is a **residual plot**: each residual drawn against x. For the employees they scatter around zero with no pattern.',
            show: 'residuals',
            best: true,
            dataset: 'custom',
            panel: 'residual-plot',
          },
          {
            kicker: 'Linearity',
            title: 'Non-linearity',
            body: 'These are different points, and their true shape bends. The best straight line runs above the points in the middle and below them at both ends. So the residuals trace a U. A pattern in the residuals means the model is missing something. Add a squared feature, or transform x or y.',
            show: 'residuals',
            best: true,
            dataset: 'curved',
            panel: 'residual-plot',
          },
          {
            kicker: 'Equal spread',
            title: 'Heteroscedasticity',
            body: 'Now the points fan out: small errors on the left, large ones on the right. This is **heteroscedasticity**, an unequal spread of errors. The line is still reasonable, but the uncertainty it reports for each weight, such as p-values, can no longer be trusted. Predicting log(y), or weighting the points, usually helps.',
            show: 'residuals',
            best: true,
            dataset: 'funnel',
            panel: 'residual-plot',
          },
          {
            kicker: 'One bad point',
            title: 'Outliers',
            body: 'One more employee has 7 years but earns only 4 LPA. Squared error punishes that miss so hard that the whole line tilts. The slope falls from 2 to 0.61, and R² from 0.946 to 0.098. Check such a point first. Then correct it, remove it, or use a loss that outliers pull less.',
            show: 'squares',
            best: true,
            dataset: 'outlier',
          },
        ],
        params: {
          ...SALARY_LAB,
          datasets: ['custom', 'outlier', 'curved', 'funnel'],
          defaultDataset: 'custom',
          line: { m: 2, b: 3 },
          panels: ['residual-plot', 'calculation'],
          controls: ['dataset', 'move-points', 'best-fit', 'line'],
          tasks: [
            'On The example, drag the last point straight down to 4 LPA, keeping it at 6 years. Press Best line. How far does the slope fall?',
            'On Curved data, press Best line. Which assumption does the residual plot show is broken?',
            'On Growing spread, press Best line. Where are the residuals largest, and why does that matter?',
          ],
        },
      },
    },
    {
      key: 'slides.assumptions',
      kind: 'SLIDES',
      title: 'Assumptions in practice',
      depthRank: 1,
      conceptKeys: [AS],
      body: {
        slides: [
          {
            kicker: 'Assumptions',
            title: 'The five assumptions',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'chart',
                  label: 'Linearity',
                  sub: 'y changes in a straight line with each feature',
                },
                {
                  icon: 'link',
                  label: 'Independent errors',
                  sub: 'One row’s error says nothing about the next; time series break this',
                },
                {
                  icon: 'layers',
                  label: 'Equal spread',
                  sub: 'Errors have a similar size everywhere',
                },
                {
                  icon: 'target',
                  label: 'Normal errors',
                  sub: 'Check a histogram of the residuals; needed for tests, not fitting',
                },
              ],
            },
            note: 'One more: no feature is a copy or exact combination of others. Break an assumption and the line may still fit, but its conclusions mislead.',
          },
          {
            kicker: 'Categories',
            title: 'Dummy variables',
            body: 'A linear model needs numbers. A column such as city becomes **dummy variables**: one 0-or-1 column per city. Leave one city out. With all of them in, the columns sum to 1 in every row, exactly like the intercept. That is the **dummy variable trap**: perfect multicollinearity.',
            animation: {
              name: 'dummy-columns',
            },
            note: 'With Chennai left out, Hyderabad is (1, 0) and Pune is (0, 1). Each weight is then the gap from Chennai. In pandas: `pd.get_dummies(df, drop_first=True)`.',
          },
          {
            kicker: 'Compare',
            title: 'When a line fits',
            animation: {
              name: 'residual-patterns',
            },
            visual: {
              type: 'compare',
              left: {
                title: 'A line suits this',
                items: [
                  'Each feature moves y by a steady amount',
                  'Residuals are scattered evenly around zero',
                  'Their spread stays similar across the range',
                  'You need weights you can read out and explain',
                ],
              },
              right: {
                title: 'A line struggles here',
                items: [
                  'The scatter bends: y climbs slowly, then fast',
                  'The spread widens as the prediction grows',
                  'One feature’s effect depends on another',
                  'A few extreme points pull the line towards them',
                ],
              },
              better: 'none',
            },
            note: 'Each has a fix inside linear regression. Add a squared term for a bend, a log on y for a widening spread, or an interaction column.',
          },
        ],
      },
    },
    {
      key: 'playground.scratch',
      kind: 'PLAYGROUND',
      title: 'Least squares in NumPy',
      depthRank: 1,
      conceptKeys: [LR],
      body: {
        language: 'python',
        instructions:
          'Fill in the three blanks: the slope, the intercept and R². The fourth line refits with one extra employee, who has 7 years and earns 4 LPA. Before you run it, predict the last line: the fit when experience is counted in months.',
        starterCode: SCRATCH_START,
        hints: [
          'Slope: subtract each mean, multiply the two columns, and add up with `.sum()`. Divide by the summed squares of `x - x.mean()`.',
          'Intercept: the line passes through the two means, so `b = y.mean() - m * x.mean()`.',
          'R²: SSE is the summed squares of `y - pred`. SST is the summed squares of `y - y.mean()`. Return one minus their ratio.',
        ],
        solution: SCRATCH_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '2.0 3.0', label: 'Slope 2 and intercept 3' },
          { type: 'stdout_contains', value: '17.0', label: 'The prediction for 7 years is 17 LPA' },
          { type: 'stdout_contains', value: '0.946', label: 'R² is 0.946' },
          {
            type: 'stdout_contains',
            value: '0.607',
            label: 'With the outlier, the slope falls to 0.607',
          },
          {
            type: 'stdout_contains',
            value: '0.167 3.0',
            label: 'In months the slope is 2 / 12 = 0.167, and the intercept stays 3',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Linear regression quiz',
      depthRank: 1,
      conceptKeys: [LR, GD, MX, MP, RG, AS],
      body: {
        // Each attempt draws 5 of these 20, so a second attempt is new work.
        draw: 5,
        items: [
          {
            key: 'residual',
            type: 'mcq',
            prompt:
              'A line predicts ŷ = 3x + 1. For a point with x = 4 and y = 10, what is the residual?',
            options: [
              { id: 'a', text: '−3' },
              { id: 'b', text: '3' },
              { id: 'c', text: '13' },
              { id: 'd', text: '−13' },
            ],
            answer: { correct: ['a'] },
            explanation: 'The prediction is 3 × 4 + 1 = 13. The residual is y − ŷ = 10 − 13 = −3.',
          },
          {
            key: 'update',
            type: 'mcq',
            prompt:
              'In gradient descent the slope m is 1.5. The gradient of the loss for m is −4, and the learning rate is 0.1. What is the new m?',
            options: [
              { id: 'a', text: '1.9' },
              { id: 'b', text: '1.1' },
              { id: 'c', text: '−2.5' },
              { id: 'd', text: '5.5' },
            ],
            answer: { correct: ['a'] },
            explanation: 'New slope = old − rate × gradient = 1.5 − 0.1 × (−4) = 1.9.',
          },
          {
            key: 'funnel',
            type: 'mcq',
            prompt:
              'A residual plot shows tiny residuals at low x and a widening spread at high x. What does that show?',
            options: [
              { id: 'a', text: 'Unequal error spread: heteroscedasticity' },
              { id: 'b', text: 'A curved relationship: the line misses a bend' },
              { id: 'c', text: 'Multicollinearity' },
              { id: 'd', text: 'A learning rate that is too large' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A widening funnel means the spread of the errors grows with x. A curved relationship traces a U instead.',
          },
          {
            key: 'negative',
            type: 'mcq',
            prompt: 'On test data a model has R² = −0.2. What does that mean?',
            options: [
              { id: 'a', text: 'It is worse than always predicting the mean of the test values' },
              { id: 'b', text: 'It explains 20% of the variation' },
              { id: 'c', text: 'The slope is negative: its predictions fall as the feature rises' },
              { id: 'd', text: 'There is a bug: R² cannot be negative' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'R² = 1 − SSE / SST. It turns negative when the model’s squared error is larger than the mean’s.',
          },
          {
            key: 'polynomial',
            type: 'mcq',
            prompt: 'Is polynomial regression a linear model?',
            options: [
              { id: 'a', text: 'Yes: ŷ is linear in the weights, although it curves in x' },
              { id: 'b', text: 'No: its predictions form a curve, so it cannot be linear' },
              { id: 'c', text: 'Only when the degree is 1' },
              { id: 'd', text: 'Only after the features are scaled' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '"Linear" refers to the weights. x² is just another feature, so the same least-squares maths applies.',
          },
          {
            key: 'slope-meaning',
            type: 'mcq',
            prompt:
              'A fitted line is ŷ = 2x + 3. Here x is years of experience and ŷ is salary in LPA. What does the 2 mean?',
            options: [
              { id: 'a', text: 'Each extra year adds 2 LPA to the predicted salary' },
              { id: 'b', text: 'The predicted salary at 0 years of experience is 2 LPA' },
              { id: 'c', text: 'The average error of the model is 2 LPA' },
              { id: 'd', text: 'The salary doubles every year' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The slope is the change in ŷ when x grows by 1. The intercept, 3, is the prediction at x = 0.',
          },
          {
            key: 'mse-by-hand',
            type: 'mcq',
            prompt: 'Three residuals are 1, −1 and 2. What is the mean squared error?',
            options: [
              { id: 'a', text: '2' },
              { id: 'b', text: '0.67' },
              { id: 'c', text: '6' },
              { id: 'd', text: '1.33' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Square each residual: 1, 1 and 4. Their sum is 6, and 6 / 3 = 2. The value 6 is the sum of squares, not the mean.',
          },
          {
            key: 'why-square',
            type: 'mcq',
            prompt: 'Why are residuals squared before they are averaged?',
            options: [
              {
                id: 'a',
                text: 'So residuals of opposite sign cannot cancel, and big misses count more',
              },
              { id: 'b', text: 'So the loss is in the same units as the target' },
              {
                id: 'c',
                text: 'So the loss always lies between 0 and 1, which makes models easy to compare',
              },
              { id: 'd', text: 'So the slope always comes out positive' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Residuals of +2 and −2 average to 0 and hide the error. Squaring removes the sign and weighs a big miss more heavily. That also makes MSE sensitive to outliers.',
          },
          {
            key: 'rmse',
            type: 'mcq',
            prompt:
              'A salary model has an MSE of 4. Salaries are in LPA. Which statement is correct?',
            options: [
              { id: 'a', text: 'Its RMSE is 2 LPA, so a typical miss is about 2 LPA' },
              { id: 'b', text: 'Its RMSE is 16 LPA, so a typical miss is about 16 LPA' },
              { id: 'c', text: 'Every prediction is off by exactly 4 LPA' },
              { id: 'd', text: 'Its R² is 0.96' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'RMSE = √MSE = √4 = 2, back in the units of the target. The MSE alone says nothing about R².',
          },
          {
            key: 'r2-meaning',
            type: 'mcq',
            prompt: 'A salary model has R² = 0.946 on six employees. What does that tell you?',
            options: [
              {
                id: 'a',
                text: 'It explains about 94.6% of the variation in salary around the mean',
              },
              {
                id: 'b',
                text: 'It predicts the salary exactly right for about 94.6% of the employees',
              },
              { id: 'c', text: 'Its average error is 0.946 LPA' },
              { id: 'd', text: 'Its slope is 0.946' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'R² = 1 − SSE / SST: the share of the spread in salary that the line accounts for. For the six employees in this unit it is 1 − 4 / 74 = 0.946.',
          },
          {
            key: 'intercept-formula',
            type: 'mcq',
            prompt:
              'For a least-squares line, x̄ = 4, ȳ = 20 and the slope m is 3. What is the intercept b?',
            options: [
              { id: 'a', text: '8' },
              { id: 'b', text: '32' },
              { id: 'c', text: '16' },
              { id: 'd', text: '−8' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'b = ȳ − m·x̄ = 20 − 3 × 4 = 8. The least-squares line always passes through the point of means.',
          },
          {
            key: 'diverge',
            type: 'mcq',
            prompt:
              'During gradient descent the loss grows at every step: 112, then 171, then 261. What is the most likely cause?',
            options: [
              { id: 'a', text: 'The learning rate is too large' },
              { id: 'b', text: 'The learning rate is too small' },
              { id: 'c', text: 'The features were standardised' },
              { id: 'd', text: 'The model has too few weights' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each step jumps past the lowest point and lands higher on the other side, so the run diverges. Lower the rate and restart.',
          },
          {
            key: 'scaling',
            type: 'mcq',
            prompt: 'Why are features standardised before gradient descent?',
            options: [
              {
                id: 'a',
                text: 'It makes the loss surface rounder, so descent needs fewer steps',
              },
              {
                id: 'b',
                text: 'It changes the predictions, so the fitted line becomes more accurate',
              },
              { id: 'c', text: 'It removes outliers from the data' },
              { id: 'd', text: 'The least-squares formula cannot run without it' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'On raw features the loss is a long, narrow valley and descent crawls. Without a penalty, scaling changes the speed, not the predictions. The least-squares formula does not need it.',
          },
          {
            key: 'weight-meaning',
            type: 'mcq',
            prompt:
              'A salary model in LPA is ŷ = 3.35 + 1.625·years + 0.525·projects. What does 0.525 mean?',
            options: [
              {
                id: 'a',
                text: 'One more project adds 0.525 LPA, with years held fixed',
              },
              { id: 'b', text: 'Projects are about a third as important as years for the salary' },
              { id: 'c', text: '52.5% of the salary comes from projects' },
              { id: 'd', text: 'One more year adds 0.525 projects' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A weight is the change in ŷ when its own feature rises by one and the others stay fixed. It is not importance: it changes with the units of the feature.',
          },
          {
            key: 'adjusted-r2',
            type: 'mcq',
            prompt:
              'You add a feature to a model. R² rises a little, but adjusted R² falls. What does that tell you?',
            options: [
              { id: 'a', text: 'The feature did not improve the fit enough to justify adding it' },
              { id: 'b', text: 'The new feature is the most useful one in the model' },
              {
                id: 'c',
                text: 'There is a mistake somewhere: the two scores always move together',
              },
              { id: 'd', text: 'The model is now underfitting' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'R² never falls when a feature is added. Adjusted R² charges for each feature, so it falls when the gain is too small.',
          },
          {
            key: 'collinear',
            type: 'mcq',
            prompt:
              'Two features are almost perfectly correlated: experience in years and experience in months. What happens to the fitted model?',
            options: [
              {
                id: 'a',
                text: 'Predictions barely change, but the two weights become unstable',
              },
              {
                id: 'b',
                text: 'Predictions get much worse, but the two weights stay easy to read',
              },
              { id: 'c', text: 'Gradient descent diverges at every learning rate' },
              { id: 'd', text: 'R² drops to zero' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'This is multicollinearity. The model cannot separate the two effects, so the weights can swing to large opposite values. Drop one feature, or use ridge regression.',
          },
          {
            key: 'overfit',
            type: 'mcq',
            prompt:
              'A degree-7 polynomial scores R² = 0.99 on the points it was fitted on and 0.60 on held-back points. What is happening?',
            options: [
              { id: 'a', text: 'Overfitting: the curve follows noise in the fitted points' },
              { id: 'b', text: 'Underfitting: the curve is too simple to follow the real pattern' },
              { id: 'c', text: 'Heteroscedasticity: the errors have unequal spread' },
              { id: 'd', text: 'The held-back points must all be outliers' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A large gap between the fitted score and the held-back score is overfitting. Choose the degree by the held-back score, or penalise large weights.',
          },
          {
            key: 'ridge-lasso',
            type: 'mcq',
            prompt: 'Which statement about ridge and lasso is correct?',
            options: [
              {
                id: 'a',
                text: 'Lasso (L1) can set some weights to exactly zero; ridge (L2) only shrinks them',
              },
              {
                id: 'b',
                text: 'Ridge (L2) can set some weights to exactly zero; lasso (L1) only shrinks them',
              },
              { id: 'c', text: 'Both remove the intercept from the model' },
              { id: 'd', text: 'Neither needs the features to be scaled' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Lasso penalises the absolute weights (L1), which can drive a weight to exactly zero. So lasso also selects features. Ridge penalises the squared weights (L2): it shrinks every weight but keeps them all. Both need scaled features.',
          },
          {
            key: 'outlier',
            type: 'mcq',
            prompt:
              'One employee is added at 7 years with a salary of 4 LPA, far below the trend. The slope falls from 2 to 0.61. What should you do first?',
            options: [
              { id: 'a', text: 'Check whether the point is a data error or a real value' },
              { id: 'b', text: 'Delete it at once, because an outlier is always a mistake' },
              { id: 'c', text: 'Keep it and switch from MAE to MSE, which outliers pull less' },
              { id: 'd', text: 'Raise the learning rate so the line settles faster' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Check the point first. Correct or remove an error. If the value is real, keep it and use a loss such as MAE, which outliers pull less.',
          },
          {
            key: 'extrapolate',
            type: 'mcq',
            prompt:
              'The data covers 1 to 6 years of experience. The line is then used to predict the salary at 20 years. What is the risk?',
            options: [
              {
                id: 'a',
                text: 'Extrapolation: the data cannot show the line still holds there',
              },
              {
                id: 'b',
                text: 'None: a line fitted on 1 to 6 years is valid for every value of x',
              },
              { id: 'c', text: 'The prediction will always be too low' },
              { id: 'd', text: 'The line cannot produce a prediction beyond 6 years' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The line was only checked where there was data. Outside that range the true relationship may bend, so the prediction can be far off.',
          },
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [LR, GD, MP, AS],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What it is',
            front: 'What is linear regression?',
            back: 'Linear regression is a supervised learning algorithm. We use it to predict a continuous value, like a salary or a price.\n\nIt finds the best-fit straight line between the input and the output. The equation is **y = mx + b**, where m is the slope and b is the intercept.\n\nFor example, I can plot years of experience against salary. The model draws the line that stays closest to all the points. For a new person with 7 years of experience, I read the salary from that line.\n\n"Best fit" means the line with the smallest sum of squared errors between the actual and the predicted values.',
          },
          {
            title: 'The loss function',
            front: 'Which loss function is used in linear regression?',
            back: 'Linear regression uses **Mean Squared Error**, or MSE, as its loss function.\n\nFor every data point we take the error: the actual value minus the predicted value. We square each error and then take the average.\n\n**MSE = (1/n) × Σ (actual − predicted)²**\n\nWe square the errors for two reasons. First, positive and negative errors should not cancel each other. Second, bigger errors get a bigger penalty.\n\nTraining means finding the line where the MSE is minimum.\n\nOne drawback: MSE is sensitive to outliers, because a large error becomes very large after squaring.',
          },
          {
            title: 'Gradient descent',
            front: 'What is gradient descent?',
            back: 'Gradient descent is an optimisation algorithm. We use it to find the values of m and b that give the minimum loss.\n\nIt works step by step. We start with some initial values. Then we calculate the gradient, which is the slope of the loss. It tells us the direction in which the loss increases, so we move in the opposite direction.\n\nThe update rule is: **new weight = old weight − learning rate × gradient**. We repeat this until the loss stops decreasing.\n\nThe learning rate controls the step size. If it is too small, training is very slow. If it is too large, the loss can overshoot the minimum and diverge.',
          },
          {
            title: 'Multiple linear regression',
            front: 'What is multiple linear regression?',
            back: 'Multiple linear regression is linear regression with more than one input feature.\n\nThe equation is **y = b + w₁x₁ + w₂x₂ + … + wₙxₙ**. Each feature has its own weight, also called a coefficient.\n\nFor example, I can predict salary from years of experience and number of projects together.\n\nEach coefficient tells how much the output changes when that feature increases by one unit, keeping the other features constant.\n\nI take care of two things. The features should not be highly correlated with each other, which is called multicollinearity. And I use adjusted R squared, because plain R squared always increases when we add a feature.',
          },
          {
            title: 'Evaluation',
            front: 'How do you evaluate a linear regression model?',
            back: 'First I split the data into a training set and a test set. I train on the training set and evaluate on the test set.\n\nThen I look at the metrics. RMSE and MAE give the average error in the same unit as the target. R squared tells how much of the variation in the target the model explains. A value close to 1 is good.\n\nFor example, an RMSE of 0.8 LPA means the predictions are off by about 0.8 LPA on average.\n\nI also check the residual plot. The residuals should be randomly scattered around zero, with no pattern.\n\nFinally I interpret the coefficients. For example, one more year of experience increases the salary by about 2 LPA.',
          },
          {
            title: 'Low R squared',
            front: 'Your model has a low R² score. What will you check?',
            back: 'I check a few things one by one.\n\nFirst, the data. I look for missing values, outliers and wrongly encoded categorical columns.\n\nSecond, the relationship. I plot the features against the target. If the relationship is not linear, a straight line cannot fit it. Then I try polynomial features or a log transformation.\n\nThird, the features. A low R squared often means important features are missing, so I try to add more relevant features.\n\nFourth, I compare the training score and the test score, to see whether the model is underfitting or overfitting.\n\nIf nothing helps, the data may not suit a linear model, and I try another algorithm.',
          },
          {
            title: 'Assumptions',
            front: 'What are the assumptions of linear regression?',
            back: 'Linear regression has five main assumptions.\n\nOne, **linearity**. The relationship between the features and the target is linear.\n\nTwo, **independence**. The errors are independent of each other.\n\nThree, **homoscedasticity**. The errors have constant variance.\n\nFour, **normality**. The errors follow a normal distribution.\n\nFive, **no multicollinearity**. The features are not highly correlated with each other.\n\nI check most of these with a residual plot. If the residuals are randomly scattered around zero, the assumptions hold. For multicollinearity I check the correlation matrix or the VIF.',
          },
          {
            title: 'Multicollinearity',
            front: 'What is multicollinearity?',
            back: 'Multicollinearity means two or more input features are highly correlated with each other.\n\nFor example, experience in years and experience in months. Both carry the same information.\n\nThe problem is that the model cannot separate the effect of each feature. So the coefficients become unstable and unreliable. The predictions may still be fine, but we cannot interpret the coefficients.\n\nTo detect it, I use a correlation matrix or the Variance Inflation Factor, VIF. A VIF above 5 or 10 indicates a problem.\n\nTo fix it, I drop one of the correlated features, combine them into one, or use ridge regression.',
          },
          {
            title: 'Outliers',
            front: 'How do outliers affect linear regression?',
            back: 'An outlier is a data point that is very far from the other points.\n\nLinear regression is sensitive to outliers, because it minimises the squared error. One large error becomes very large after squaring, so it pulls the line towards the outlier.\n\nTo find outliers, I use a box plot, the IQR method or the z-score.\n\nThen I decide what to do. If it is a data entry error, I correct or remove it. If it is a genuine value, I can cap it, apply a log transformation, or use a robust loss like MAE.\n\nI do not delete outliers blindly, because sometimes they carry real information.',
          },
          {
            title: 'Feature scaling',
            front: 'Is feature scaling required for linear regression?',
            back: 'It depends on how we train the model.\n\nWith the normal equation, which scikit-learn’s LinearRegression uses, scaling is not required. The predictions stay the same. Only the coefficients change with the units.\n\nWith gradient descent, scaling is important. Features on very different ranges make training slow. After scaling, gradient descent converges much faster.\n\nScaling is also required for ridge and lasso, because their penalty depends on the size of the coefficients.\n\nThere are two common methods. Standardisation gives mean 0 and standard deviation 1. Min-max scaling gives a range of 0 to 1. I fit the scaler only on the training data, to avoid data leakage.',
          },
          {
            title: 'Ridge and lasso',
            front: 'What is ridge regression?',
            back: 'Ridge regression is linear regression with **L2 regularisation**.\n\nIt adds a penalty to the loss function: alpha times the sum of the squared coefficients. So the model is forced to keep the coefficients small.\n\nWe use it to reduce overfitting, and when the features have multicollinearity.\n\nLasso regression is similar, but it uses **L1 regularisation**. Its penalty is the sum of the absolute values of the coefficients. Lasso can make some coefficients exactly zero, so it also does feature selection.\n\nAlpha controls the strength of the penalty, and I choose it with cross-validation. If alpha is zero, ridge becomes normal linear regression.',
          },
        ],
      },
    },
  ],
};
