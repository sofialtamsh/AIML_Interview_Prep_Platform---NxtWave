/**
 * Machine Learning Fundamentals → Loss functions and gradient descent.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): "What is gradient descent?" is the most repeated question here, at both packages.
 * Then: what a loss function is and how it is calculated, which loss linear and logistic
 * regression use (8+), other optimisation techniques, writing a NumPy function that computes a
 * gradient, and an 8+ maths question: with one constant guess for every row, the mean minimises
 * squared error and the median minimises absolute error. One bar for every package for now, aimed
 * at 8–12 LPA and kept simple, so every section is depth 1. Every code output is checked by
 * running it with Python 3.14 and NumPy 2.5.
 */
import type { LessonDocumentInput } from '@app/content';

const LOSS = 'mlf.loss-functions';
const GD = 'mlf.gradient-descent';

const ERRORS_CODE = `import numpy as np

actual = np.array([30, 40, 25, 50])
predicted = np.array([28, 45, 25, 40])
errors = actual - predicted
print(errors)
print("MAE:", np.mean(np.abs(errors)))
print("MSE:", np.mean(errors ** 2))
print("RMSE:", round(np.sqrt(np.mean(errors ** 2)), 2))`;

const LOG_LOSS_CODE = `import numpy as np

# probability the model gave to the TRUE class
for p in [0.9, 0.6, 0.1]:
    print(p, round(-np.log(p), 2))`;

const CONSTANT_CODE = `import numpy as np

y = np.array([20, 22, 25, 26, 90])
for b in [np.mean(y), np.median(y)]:
    mse = np.mean((y - b) ** 2)
    mae = np.mean(np.abs(y - b))
    print(b, round(mse, 1), round(mae, 1))`;

const STEPS_CODE = `w = 0.0
lr = 0.1
for step in range(1, 6):
    # slope of (w - 3) ** 2
    grad = 2 * (w - 3)
    w = w - lr * grad
    print(step, round(w, 3))`;

const RATES_CODE = `def descend(lr, steps=20):
    w = 0.0
    for _ in range(steps):
        w -= lr * 2 * (w - 3)
    return round(w, 3)

for lr in [0.01, 0.1, 0.5, 1.1]:
    print(lr, descend(lr))`;

const GRADIENT_CODE = `import numpy as np

def gradient(f, x, h=1e-5):
    g = np.zeros_like(x)
    for i in range(len(x)):
        step = np.zeros_like(x)
        step[i] = h
        g[i] = (f(x + step) - f(x - step)) / (2 * h)
    return g

f = lambda v: v[0] ** 2 + 3 * v[1]
print(np.round(gradient(f, np.array([2.0, 1.0])), 4))`;

const DESCEND_START = `w = 5.0
lr = 0.1
for _ in range(50):
    # slope of (w + 2) ** 2 is 2 * (w + 2)
    # step against the slope: change w here
    pass
print(round(w, 2))
`;

const LINE_HEAD = `import numpy as np

x = np.array([1.0, 2.0, 3.0, 4.0])
y = np.array([3.0, 5.0, 7.0, 9.0])
w, b, lr = 0.0, 0.0, 0.05

for _ in range(2000):
    error = (w * x + b) - y
`;
const LINE_START = `${LINE_HEAD}    # gradients of the MSE:
    #   dw = 2 * mean(error * x)
    #   db = 2 * mean(error)
    # then step w and b against them
    pass

print(round(w, 2), round(b, 2))
`;
const LINE_SOLUTION = `${LINE_HEAD}    dw = 2 * np.mean(error * x)
    db = 2 * np.mean(error)
    w -= lr * dw
    b -= lr * db

print(round(w, 2), round(b, 2))
`;

export const LOSS_GRADIENT_DESCENT_LESSON: LessonDocumentInput = {
  title: 'Loss functions and gradient descent',
  subtitle:
    'How a model measures its mistakes, and how it changes itself, step by step, to make fewer.',
  objectives: [
    {
      key: 'loss',
      text: 'Explain what a loss function measures, and name the loss for regression and classification',
      minDepthRank: 1,
    },
    {
      key: 'choose',
      text: 'Choose between MSE and MAE, and explain what outliers do to each',
      minDepthRank: 1,
    },
    {
      key: 'descent',
      text: 'Explain gradient descent and the effect of the learning rate',
      minDepthRank: 1,
    },
    {
      key: 'variants',
      text: 'Compare batch, mini-batch and stochastic gradient descent',
      minDepthRank: 1,
    },
    {
      key: 'numpy',
      text: 'Compute a gradient with NumPy and fit a line with gradient descent',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'How wrong, and which way',
      depthRank: 1,
      conceptKeys: [LOSS],
      body: {
        scenario:
          'A delivery app promises 30 minutes, and the food arrives in 45. Across thousands of orders, how wrong is the app overall? And which way should the model change? A loss function answers the first question. Gradient descent answers the second.',
        animation: {
          name: 'residuals',
          caption: 'Each gap is one mistake: the real value minus the prediction',
        },
        realWorld: {
          title: 'Where a loss is being minimised',
          items: [
            { icon: 'truck', label: 'Delivery estimates', sub: 'Minutes early or late' },
            { icon: 'chart', label: 'Sales forecasts', sub: 'Units over or under' },
            { icon: 'mail', label: 'Spam filters', sub: 'Confident and wrong costs most' },
            { icon: 'home', label: 'House prices', sub: 'Lakhs above or below' },
          ],
        },
        provocation: 'How does a model know which way to change?',
        bridge:
          '"What is a loss function?" and "what is gradient descent?" sit under every model you will discuss. This lesson builds both from small examples you can run.',
      },
    },
    {
      key: 'slides.loss',
      kind: 'SLIDES',
      title: 'Loss functions',
      depthRank: 1,
      conceptKeys: [LOSS],
      body: {
        slides: [
          {
            kicker: 'Loss · the story',
            title: 'One number for how wrong',
            body: 'A **loss function** turns every mistake into one number. Lower is better. Training a model means changing its parameters to make that number as small as possible.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Predict', icon: 'target' },
                { label: 'Measure the loss', icon: 'gauge' },
                { label: 'Adjust the weights', icon: 'settings' },
                { label: 'Repeat', icon: 'repeat' },
              ],
            },
            note: "Some books call one row's error the loss, and the average over all rows the cost. Many people use the two words interchangeably.",
          },
          {
            kicker: 'Regression losses',
            title: 'MAE, MSE and RMSE',
            visual: {
              type: 'code',
              code: ERRORS_CODE,
              output: '[ 2 -5  0 10]\nMAE: 4.25\nMSE: 32.25\nRMSE: 5.68',
            },
            note: 'MSE squares each error, so the 10-minute miss counts 100 and dominates. RMSE takes the square root, back in minutes.',
            narration:
              'Here are four delivery times and four predictions. The errors are 2, minus 5, 0 and 10 minutes. Mean absolute error, or MAE, ignores the sign and averages them: 4.25 minutes. Mean squared error, or MSE, squares each error first, so the 10 minute miss becomes 100, and the average is 32.25. RMSE is the square root of MSE, 5.68, which is back in minutes and easy to explain.',
          },
          {
            kicker: 'Outliers',
            title: 'MSE punishes big misses',
            visual: {
              type: 'compare',
              left: {
                title: 'MSE',
                items: [
                  'Squares errors: big misses dominate',
                  'Smooth and easy to optimise',
                  'Use when big errors are costly',
                ],
              },
              right: {
                title: 'MAE',
                items: [
                  'Every minute counts the same',
                  'Robust to outliers',
                  'Use when outliers are just noise',
                ],
              },
              better: 'none',
            },
            note: 'Huber loss mixes the two: squared for small errors, absolute for big ones.',
          },
          {
            kicker: 'Classification',
            title: 'Log loss for probabilities',
            body: 'A classifier outputs a probability. **Log loss**, or cross-entropy, is minus the log of the probability given to the true class. Confident and right costs little. Confident and wrong costs a lot.',
            visual: { type: 'code', code: LOG_LOSS_CODE, output: '0.9 0.11\n0.6 0.51\n0.1 2.3' },
            narration:
              'For classification, the loss looks at the probability the model gave to the correct answer. If it gave 0.9, the loss is minus log of 0.9, only 0.11. At 0.6 the loss is 0.51. If it gave the correct class only 0.1, it was confident and wrong, and the loss jumps to 2.3. That steep jump is what pushes the model away from confident mistakes.',
          },
          {
            kicker: 'Matching the model',
            title: 'Which loss for which model',
            visual: {
              type: 'icons',
              items: [
                { icon: 'chart', label: 'Linear regression', sub: 'Mean squared error (MSE)' },
                {
                  icon: 'filter',
                  label: 'Logistic regression',
                  sub: 'Log loss (binary cross-entropy)',
                },
                { icon: 'layers', label: 'Multi-class network', sub: 'Categorical cross-entropy' },
                { icon: 'shield', label: 'Regression with outliers', sub: 'MAE or Huber loss' },
              ],
            },
            note: 'Accuracy is not a loss: it changes in jumps, so it gives no direction. Train on a smooth loss, then report accuracy.',
          },
          {
            kicker: 'The constant guess',
            title: 'The mean for MSE, the median for MAE',
            body: 'If a model could predict only one number for every row, which number is best? Under MSE, the mean. Under MAE, the median. One outlier pulls the mean far more than the median.',
            visual: {
              type: 'code',
              code: CONSTANT_CODE,
              output: '36.6 717.4 21.4\n25.0 852.0 14.8',
            },
            note: 'Why: the slope of the MSE in b is −2 × mean(y − b). It is zero only when b is the mean of y.',
            narration:
              'Five delivery times, with one outlier of 90 minutes. We try two constant guesses: the mean, 36.6, and the median, 25. The mean gives the lower MSE, 717 against 852. The median gives the lower MAE, 14.8 against 21.4. So each loss has its own best guess. Notice how the single 90 pulled the mean up, while the median stayed with the typical orders.',
          },
          {
            kicker: 'Try it',
            title: 'Pick the loss',
            try: {
              type: 'choice',
              prompt:
                'Delivery times include a few huge delays from traffic jams that no model could predict. Which loss is the safer choice?',
              options: [
                {
                  text: 'MAE or Huber loss',
                  correct: true,
                  feedback: 'Right. They do not let a few unpredictable delays dominate training.',
                },
                {
                  text: 'MSE',
                  correct: false,
                  feedback:
                    'MSE squares the delays, so the model would bend itself to chase a few jams.',
                },
                {
                  text: 'Cross-entropy',
                  correct: false,
                  feedback: 'Cross-entropy is for class probabilities, not for minutes.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.gradient',
      kind: 'SLIDES',
      title: 'Gradient descent',
      depthRank: 1,
      conceptKeys: [GD],
      body: {
        slides: [
          {
            kicker: 'Gradient descent · the story',
            title: 'Walking downhill in fog',
            body: 'You are on a hill in thick fog and want the lowest point. You feel the slope under your feet and step downhill, again and again. **Gradient descent** does this: the gradient is the slope of the loss, and each step goes against it.',
            animation: {
              name: 'loss-bowl',
              caption: 'Real use: how almost every model learns',
            },
          },
          {
            kicker: 'The update rule',
            title: 'Step against the slope',
            body: 'Each step moves a weight w by the slope times a small number, the **learning rate**: w = w − learning rate × gradient. Here the loss is (w − 3)², lowest at w = 3.',
            visual: {
              type: 'code',
              code: STEPS_CODE,
              output: '1 0.6\n2 1.08\n3 1.464\n4 1.771\n5 2.017',
            },
            narration:
              'The loss here is w minus 3, squared, so the best value of w is 3. We start at w equal to 0, with a learning rate of 0.1. The slope at 0 is minus 6, so the update moves w up to 0.6. Each step recomputes the slope and moves again. The steps get smaller as the slope flattens near the bottom: 0.6, then 1.08, then 1.46, and after five steps w is just above 2.',
          },
          {
            kicker: 'Learning rate · the story',
            title: 'Too small, just right, too big',
            body: 'Tiny steps creep and waste time. Good steps settle quickly. Steps that are too big jump over the bottom, so the loss bounces or even grows.',
            animation: {
              name: 'learning-rate',
              caption: 'Real use: the first setting to tune when training stalls',
            },
          },
          {
            kicker: 'Learning rate · the code',
            title: 'Four learning rates, 20 steps each',
            visual: {
              type: 'code',
              code: RATES_CODE,
              output: '0.01 0.997\n0.1 2.965\n0.5 3.0\n1.1 -112.013',
            },
            note: 'On this simple bowl, 0.5 lands in one step; real losses are not this tidy. At 1.1, every step overshoots further.',
            narration:
              'The same loss, 20 steps each, with four learning rates. At 0.01 the steps are tiny, and w only reaches about 1 out of 3. At 0.1 it gets close, 2.97. At 0.5 it lands on 3 exactly, because this bowl is so simple. At 1.1 every step jumps past the bottom and lands further away, so w runs off to minus 112. That is divergence.',
          },
          {
            kicker: 'Batch size',
            title: 'Batch, mini-batch and stochastic',
            visual: {
              type: 'icons',
              items: [
                { icon: 'database', label: 'Batch', sub: 'Every row per step: stable but slow' },
                {
                  icon: 'layers',
                  label: 'Mini-batch',
                  sub: 'Often 32 to 256 rows: the usual choice',
                },
                { icon: 'zap', label: 'Stochastic (SGD)', sub: 'One row per step: fast but noisy' },
              ],
            },
            note: 'An epoch is one full pass over the training data. With 1,000 rows and batches of 100, one epoch is 10 steps.',
          },
          {
            kicker: 'Gradients in NumPy',
            title: 'Compute a gradient numerically',
            visual: { type: 'code', code: GRADIENT_CODE, output: '[4. 3.]' },
            note: 'PyTorch computes exact gradients for you. This nudge-and-measure method, called finite differences, checks a gradient you derived by hand.',
            narration:
              'A common coding question: write a function that computes the gradient of any function with NumPy. For each input, we nudge it up and down by a tiny h, and measure how much f changes. That change divided by 2 h is the slope for that input. Our f is v zero squared plus 3 times v one. At the point 2 and 1, the slopes are 4 and 3, which is exactly what calculus gives.',
          },
          {
            kicker: 'The shape of the loss',
            title: 'Bowls, valleys and saddles',
            body: 'A **convex** loss is a single bowl, like MSE for linear regression. With a small enough learning rate, gradient descent reaches its bottom. Network losses also have **saddles**: flat spots that are not a bottom. Momentum and Adam help a model move through them.',
            animation: {
              name: 'optimizer-paths',
              caption: 'Real use: why deep networks use Adam, not plain gradient descent',
            },
          },
          {
            kicker: 'Try it',
            title: 'Write the update',
            try: {
              type: 'code',
              prompt:
                'Finish the loop so gradient descent finds the lowest point of (w + 2)². It should print -2.0.',
              starter: DESCEND_START,
              expected: '-2.0',
              hint: 'Replace `pass` with `w -= lr * 2 * (w + 2)`.',
            },
          },
          {
            kicker: 'Linear regression',
            title: 'Derive the update for a line',
            body: 'The prediction is ŷ = w·x + b, and each error is ŷ − y. The loss is the mean of the squared errors. Its slope for w and for b comes in two small steps.',
            points: [
              'Step 1: the slope of error² is 2 × error',
              'Step 2: raising w by 1 moves the error by x; raising b by 1 moves it by 1',
              'Multiply the two (the chain rule): dw = mean(2 × error × x), db = mean(2 × error)',
              'Update both: w = w − lr × dw and b = b − lr × db',
            ],
            note: 'Too-high predictions give positive errors, so db is positive and b goes down. The fit-a-line exercise codes exactly this.',
          },
        ],
      },
    },
    {
      key: 'widget.training',
      kind: 'WIDGET',
      title: 'Explore learning rate and epochs',
      depthRank: 1,
      conceptKeys: [GD],
      body: {
        widget: 'training-explorer',
        prompt:
          'A small model is trained live, right here, by gradient descent. Change the learning rate and the number of epochs, and watch the loss and the fitted curve respond.',
        params: {
          degree: { options: [9], default: 9 },
          learningRate: { options: [0.003, 0.01, 0.05, 0.2, 0.5], default: 0.05 },
          l2: { options: [0], default: 0 },
          epochs: { max: 3000, default: 100 },
          seed: 56,
          points: 12,
          noise: 0.3,
          tasks: [
            'At 100 epochs, compare learning rates 0.003 and 0.05. Which one has learned the shape?',
            'Set the learning rate to 0.5. What happens to the loss, and when?',
            'At 0.05, drag the epochs from 1 to 100 and watch the fitted curve bend into shape.',
            'At 1,000 epochs, compare the best epoch at 0.01 and at 0.05. Why do smaller steps need more epochs?',
          ],
        },
      },
    },
    {
      key: 'playground.fit-line',
      kind: 'PLAYGROUND',
      title: 'Fit a line with gradient descent',
      depthRank: 1,
      conceptKeys: [GD, LOSS],
      body: {
        language: 'python',
        instructions:
          'The points lie on y = 2x + 1. Finish the loop so gradient descent learns `w` and `b` by minimising the MSE. It should print `2.0 1.0`.',
        starterCode: LINE_START,
        hints: [
          'The gradient of the MSE for w is `2 * np.mean(error * x)`, and for b it is `2 * np.mean(error)`.',
          'Then update both: `w -= lr * dw` and `b -= lr * db`.',
          'This is exactly how linear regression is trained by gradient descent.',
        ],
        solution: LINE_SOLUTION,
        checks: [
          { type: 'stdout_contains', value: '2.0 1.0', label: 'Learns slope 2 and intercept 1' },
        ],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Loss and gradient check',
      depthRank: 1,
      conceptKeys: [LOSS, GD],
      body: {
        items: [
          {
            key: 'mae-mse',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\ne = np.array([1, -1, 4])\nprint(np.mean(np.abs(e)), np.mean(e ** 2))',
            options: [
              { id: 'a', text: '2.0 6.0' },
              { id: 'b', text: '2.0 4.0' },
              { id: 'c', text: '1.33 6.0' },
              { id: 'd', text: '6.0 2.0' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The absolute errors 1, 1 and 4 average to 2. The squared errors 1, 1 and 16 average to 6.',
          },
          {
            key: 'logistic-loss',
            type: 'mcq',
            prompt: 'Which loss does logistic regression minimise?',
            options: [
              { id: 'a', text: 'Log loss (binary cross-entropy)' },
              { id: 'b', text: 'Mean squared error' },
              { id: 'c', text: 'Mean absolute error' },
              { id: 'd', text: 'Accuracy' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Logistic regression outputs a probability, and log loss scores probabilities. Accuracy is a metric, not a loss to train on.',
          },
          {
            key: 'step',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'w = 1.0\ngrad = 2 * (w - 4)\nw = w - 0.25 * grad\nprint(w)',
            options: [
              { id: 'a', text: '2.5' },
              { id: 'b', text: '-0.5' },
              { id: 'c', text: '4.0' },
              { id: 'd', text: '1.75' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The gradient is 2 × (1 − 4) = −6. Stepping against it: 1 − 0.25 × (−6) = 2.5, closer to 4.',
          },
          {
            key: 'diverge',
            type: 'mcq',
            prompt:
              'The training loss bounces and grows from the first epochs. What is the most likely cause?',
            options: [
              { id: 'a', text: 'The learning rate is too high' },
              { id: 'b', text: 'The learning rate is too low' },
              { id: 'c', text: 'The model has too few parameters' },
              { id: 'd', text: 'The test set is too small' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Steps that are too big overshoot the bottom of the loss, so it bounces and can grow. Lower the learning rate.',
          },
          {
            key: 'mini-batch',
            type: 'mcq',
            prompt: 'In mini-batch gradient descent, where does each step get its gradient from?',
            options: [
              { id: 'a', text: 'A small random subset of the training rows' },
              { id: 'b', text: 'All the training rows' },
              { id: 'c', text: 'One training row' },
              { id: 'd', text: 'The test set' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Batch uses every row, stochastic uses one, and mini-batch uses a small batch, often 32 to 256 rows.',
          },
        ],
      },
    },
    {
      key: 'interview.gradient-descent',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Gradient descent answer structure',
      depthRank: 1,
      conceptKeys: [LOSS, GD],
      body: {
        question: '"What is gradient descent, and how does the learning rate affect it?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Goal',
            detail:
              'Training means finding the parameters that make the loss as small as possible.',
          },
          {
            title: 'Idea',
            detail:
              'The gradient is the slope of the loss for each parameter. Step against it to go downhill.',
          },
          {
            title: 'Update',
            detail: 'w = w − learning rate × gradient, repeated over many steps and epochs.',
          },
          {
            title: 'Learning rate',
            detail:
              'Too small is slow. Too big overshoots and can diverge. It is the first thing to tune.',
          },
          {
            title: 'Variants',
            detail:
              'Batch uses all rows per step, stochastic one row, mini-batch a small batch: the usual choice.',
          },
          {
            title: 'Limits',
            detail:
              'Neural network losses have valleys and saddles. Momentum and Adam help move through them.',
          },
        ],
        followUps: [
          'Which loss does linear regression use, and which does logistic regression use?',
          'Why do we not train on accuracy directly?',
          'What is the difference between an epoch, a batch and an iteration?',
          'Can gradient descent get stuck in a local minimum?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [LOSS, GD],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What a loss function is',
            front: 'What is a loss function, and why does a model need one?',
            back: 'A loss function turns the model’s mistakes into one number, where lower is better. Training changes the parameters to make it smaller, so the loss defines what "good" means. Match it to the task: MSE for numbers, cross-entropy for classes.',
          },
          {
            title: 'Linear and logistic losses',
            front:
              'Which loss does linear regression use, and which does logistic regression use? Why not MSE for both?',
            back: 'Linear regression minimises mean squared error, the average squared gap between prediction and target. Logistic regression minimises log loss, or binary cross-entropy, which punishes confident wrong probabilities heavily. Both are convex for their model, so gradient descent finds the best fit. MSE on a sigmoid output is not convex, and its slope fades when the model is confidently wrong.',
          },
          {
            title: 'MAE or MSE',
            front: 'When would you use MAE instead of MSE?',
            back: 'When large errors are mostly noise or outliers you do not want to chase. MSE squares the errors, so one big miss dominates training. MAE counts every unit the same, so it is robust to outliers. Huber loss is a middle ground.',
          },
          {
            title: 'Why not train on accuracy',
            front: 'Why do we not train a classifier directly on accuracy?',
            back: 'Accuracy changes in jumps, only when a prediction flips class, so its slope is zero almost everywhere and gives no direction. Cross-entropy changes smoothly with the probability, so gradient descent can follow it. We train on the loss and report accuracy.',
          },
          {
            title: 'Gradient descent',
            front: 'What is gradient descent?',
            back: 'A method that finds parameters with a low loss. It computes the gradient, the slope of the loss for each parameter, and steps the other way: w = w − learning rate × gradient. It repeats until the loss stops improving.',
          },
          {
            title: 'Choosing the learning rate',
            front: 'How do you choose the learning rate?',
            back: 'Try a few values on a log scale, such as 0.1, 0.01 and 0.001, and watch the training loss. If it bounces or grows, go lower. If it falls very slowly, go higher. Schedules that lower it over time, and optimisers like Adam, make it easier.',
          },
          {
            title: 'Batch sizes and epochs',
            front:
              'Compare batch, mini-batch and stochastic gradient descent. What are an epoch and an iteration?',
            back: 'Batch gradient descent uses every row per step: stable but slow. Stochastic uses one row: fast but noisy. Mini-batch uses a small batch, often 32 to 256 rows, and is the default. One update step is an iteration, and one full pass over the data is an epoch. With 1,000 rows and batches of 100, one epoch is 10 iterations.',
          },
          {
            title: 'The best constant guess',
            front:
              'If a model predicts the same value b for every row, which b minimises MSE, and which minimises MAE?',
            back: 'The mean minimises MSE: setting the slope of the squared error to zero gives b equal to the average. The median minimises MAE, because moving b towards the side with more points always lowers the total. That is why MAE resists outliers.',
          },
          {
            title: 'Local minima',
            front: 'Can gradient descent get stuck in a local minimum?',
            back: 'With a convex loss, like linear regression, no: there is one bowl. Neural network losses have many valleys and flat saddle points. In practice, mini-batch noise, momentum and good starting weights usually lead to a solution that works well.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Loss and gradient descent: key takeaways',
      depthRank: 1,
      conceptKeys: [LOSS, GD],
      body: {
        takeaways: [
          'A loss turns mistakes into one number. Training changes the parameters to make it smaller.',
          'Regression: MSE punishes big misses; MAE resists outliers; RMSE is in the units of the target.',
          'Classification: log loss punishes confident wrong probabilities. Train on the loss, report accuracy.',
          'Gradient descent steps against the slope: w = w − learning rate × gradient.',
          'Too small a learning rate is slow; too big overshoots. Mini-batches are the usual choice.',
        ],
        remember: [
          'Linear regression: MSE. Logistic regression: log loss.',
          'w -= lr * grad',
          'Mean for MSE, median for MAE',
        ],
      },
    },
  ],
};
