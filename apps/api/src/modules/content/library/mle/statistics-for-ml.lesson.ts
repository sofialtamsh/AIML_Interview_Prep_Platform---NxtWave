/**
 * Data Preparation → Statistics for ML.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): what standard deviation is and what it tells you, whether two datasets can share a
 * mean but not a standard deviation, when to use the mean, median or mode, what hypothesis testing
 * is and its types, the statistics behind ML models, and, at 8+ LPA, which constant minimises the
 * absolute error (the median). Correlation and p-values follow from model comparison and A/B
 * questions. One bar for every package for now, kept simple, so every section is depth 1.
 * Code outputs were checked with Python 3.14, NumPy 2.5, pandas 3.1 and scipy 1.18.
 */
import type { LessonDocumentInput } from '@app/content';

const DESC = 'stats.descriptive';
const DIST = 'stats.distributions';
const CORR = 'stats.correlation';
const HYP = 'stats.hypothesis-testing';

const SPREAD_CODE = `import numpy as np

a = np.array([28, 29, 30, 30, 31, 32])
b = np.array([10, 18, 25, 35, 42, 50])
print(a.mean(), b.mean())
print(a.std(ddof=1).round(1), b.std(ddof=1).round(1))`;

const DDOF_CODE = `import numpy as np
import pandas as pd

x = np.array([2, 4, 6, 8])
print(round(x.std(), 3), round(x.std(ddof=1), 3))
print(round(pd.Series(x).std(), 3))`;

const BEST_CONSTANT = `import numpy as np

x = np.array([1, 2, 3, 4, 100])
for c in [x.mean(), np.median(x)]:
    mse = ((x - c) ** 2).mean()
    mae = np.abs(x - c).mean()
    print(c, round(mse, 1), round(mae, 1))`;

const CORR_CODE = `import numpy as np

hours = np.array([1, 2, 3, 4, 5, 6])
marks = np.array([35, 48, 46, 60, 72, 75])
print(np.corrcoef(hours, marks)[0, 1].round(3))

x = np.array([-3, -2, -1, 0, 1, 2, 3])
print(np.corrcoef(x, x ** 2)[0, 1].round(3))`;

const BINOM_CODE = `from scipy.stats import binomtest

r = binomtest(60, n=100, p=0.5)
print(round(r.pvalue, 3))
r = binomtest(120, n=200, p=0.5)
print(round(r.pvalue, 4))`;

export const STATISTICS_FOR_ML_LESSON: LessonDocumentInput = {
  title: 'Statistics for ML',
  subtitle:
    'The few statistics ideas ML interviews use: centre and spread, distributions, correlation, and telling a real effect from luck.',
  objectives: [
    {
      key: 'describe',
      text: 'Explain mean, median, mode, variance and standard deviation, and when to use each',
      minDepthRank: 1,
    },
    {
      key: 'distributions',
      text: 'Describe the normal distribution, skew and the 68–95–99.7 rule',
      minDepthRank: 1,
    },
    {
      key: 'correlation',
      text: 'Interpret correlation, and explain why it does not prove causation',
      minDepthRank: 1,
    },
    {
      key: 'testing',
      text: 'Explain what a hypothesis test checks, and interpret a p-value correctly',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Same average, different promise',
      depthRank: 1,
      conceptKeys: [DESC],
      body: {
        scenario:
          'Two delivery apps both promise 30 minutes on average. App A always takes 28 to 32 minutes. App B swings from 10 to 50. The average is the same, but only one is reliable, and statistics puts a number on that difference.',
        animation: { name: 'same-mean-spread', caption: 'Real use: delivery times, API latency' },
        realWorld: {
          title: 'Where statistics decides',
          items: [
            {
              icon: 'truck',
              label: 'Delivery promises',
              sub: 'The average and the spread of times',
            },
            { icon: 'chart', label: 'A/B tests', sub: 'Did the new button really help?' },
            { icon: 'heart', label: 'Medical trials', sub: 'Is the drug better than a placebo?' },
            { icon: 'bot', label: 'Model comparison', sub: 'Is model B really better than A?' },
          ],
        },
        provocation: 'Model B beats model A on 60 of 100 test questions. Is B really better?',
        bridge:
          'Statistics questions check whether you can describe data and tell a real effect from luck. This lesson covers the ideas ML interviews use: spread, distributions, correlation and p-values.',
      },
    },
    {
      key: 'slides.descriptive',
      kind: 'SLIDES',
      title: 'Centre and spread',
      depthRank: 1,
      conceptKeys: [DESC],
      body: {
        slides: [
          {
            kicker: 'Centre',
            title: 'Mean, median and mode',
            body: 'The **mean** is the average. The **median** is the middle value once sorted. The **mode** is the most common value. Use the median for skewed data like incomes, and the mode for categories.',
            animation: { name: 'mean-median-skew', caption: 'Real use: salaries, house prices' },
          },
          {
            kicker: 'Spread',
            title: 'Variance and standard deviation',
            body: '**Variance** is the average squared distance from the mean. The **standard deviation** is its square root, so it is in the same units as the data. Small means tightly clustered; large means spread out.',
            visual: { type: 'code', code: SPREAD_CODE, output: '30.0 30.0\n1.4 15.1' },
            note: 'The same mean with very different spreads. Report a spread with every average.',
            narration:
              'App A’s delivery times sit between 28 and 32 minutes, and App B’s between 10 and 50. Both means are exactly 30. But the standard deviation of A is 1.4 minutes and of B is 15.1. The average alone would hide that B is unreliable. The d d o f equal to 1 in the code asks for the sample version, which the next slide explains.',
          },
          {
            kicker: 'Sample or population',
            title: 'Why divide by n − 1',
            body: 'For a **sample**, divide the squared distances by n − 1 instead of n. The sample mean sits closer to its own data than the true mean does. So dividing by n tends to underestimate the spread. Use n only for a whole population.',
            visual: { type: 'code', code: DDOF_CODE, output: '2.236 2.582\n2.582' },
            note: 'NumPy divides by n unless you pass `ddof=1`. pandas divides by n − 1 by default.',
            narration:
              'The same four numbers give two standard deviations. NumPy divides by n by default and gets 2.236. With d d o f equal to 1, it divides by n minus 1 and gets 2.582, the sample version. pandas uses n minus 1 by default, so it also gives 2.582.',
          },
          {
            kicker: 'Going deeper',
            title: 'Which single number fits best',
            body: 'Summarise numbers with one constant: the **mean** gives the smallest squared error, and the **median** the smallest absolute error. So models trained on mean squared error (MSE) predict averages, and those trained on mean absolute error (MAE) predict medians.',
            visual: {
              type: 'code',
              code: BEST_CONSTANT,
              output: '22.0 1522.0 31.2\n3.0 1883.0 20.2',
            },
            note: 'Proof sketch: the derivative of Σ(x − c)² is zero only at the mean. The slope of Σ|x − c| is the count below c minus the count above: zero at the median.',
            narration:
              'Five numbers, one of them 100. Using the mean, 22, as the guess gives the lower squared error, 1522, against 1883 for the median. Using the median, 3, gives the lower absolute error, 20.2, against 31.2. Squared error punishes big misses, so it is pulled towards the outlier.',
          },
          {
            kicker: 'Try it',
            title: 'A typical salary',
            try: {
              type: 'choice',
              prompt:
                'At a startup, most people earn 6 to 10 LPA and the founder earns 2 crore. Which number describes a typical salary?',
              options: [
                {
                  text: 'The median',
                  correct: true,
                  feedback:
                    'Right. The founder’s salary drags the mean up, but the median stays with the typical employee.',
                },
                {
                  text: 'The mean',
                  correct: false,
                  feedback: 'One huge salary pulls the mean far above what most people earn.',
                },
                {
                  text: 'The maximum',
                  correct: false,
                  feedback: 'The maximum is the founder alone, the least typical salary of all.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.distributions',
      kind: 'SLIDES',
      title: 'Distributions and the normal curve',
      depthRank: 1,
      conceptKeys: [DIST],
      body: {
        slides: [
          {
            kicker: 'The bell',
            title: 'The normal distribution',
            body: 'A **normal distribution** is symmetric and bell-shaped, fixed by its mean and standard deviation. About 68% of values lie within one standard deviation of the mean, 95% within two, and 99.7% within three.',
            animation: {
              name: 'normal-68-95',
              caption: 'Real use: exam scores, measurement errors',
            },
          },
          {
            kicker: 'Shapes',
            title: 'Four shapes to recognise',
            visual: {
              type: 'icons',
              items: [
                { icon: 'chart', label: 'Normal', sub: 'Heights, measurement errors: a bell' },
                {
                  icon: 'wallet',
                  label: 'Right-skewed',
                  sub: 'Incomes, delivery times: a long right tail',
                },
                { icon: 'repeat', label: 'Uniform', sub: 'A fair die: every value equally likely' },
                { icon: 'check', label: 'Binomial', sub: 'Successes in n yes-or-no trials' },
              ],
            },
            note: 'In right-skewed data the mean sits above the median. A log transform often makes it more symmetric.',
          },
          {
            kicker: 'Why bells appear',
            title: 'The central limit theorem',
            body: 'Take many samples of the same size and average each one. With large enough samples, those averages form a bell curve, even when the raw data is skewed. This is the **central limit theorem**, and it is why tests on averages work.',
            note: 'The spread of the averages, the **standard error**, is the standard deviation divided by √n. A common rule of thumb calls 30 or more per sample large enough.',
          },
          {
            kicker: 'Try it',
            title: 'Within two deviations',
            try: {
              type: 'choice',
              prompt:
                'Exam scores are roughly normal, with mean 70 and standard deviation 10. About what share scored between 50 and 90?',
              options: [
                {
                  text: 'About 95%',
                  correct: true,
                  feedback: 'Right. 50 and 90 are two standard deviations either side of 70.',
                },
                {
                  text: 'About 68%',
                  correct: false,
                  feedback: 'That is within one standard deviation: 60 to 80.',
                },
                {
                  text: 'About 50%',
                  correct: false,
                  feedback: 'Half the scores lie above 70, but 50 to 90 covers far more.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.correlation',
      kind: 'SLIDES',
      title: 'Correlation and covariance',
      depthRank: 1,
      conceptKeys: [CORR],
      body: {
        slides: [
          {
            kicker: 'Moving together',
            title: 'Correlation from −1 to 1',
            body: '**Pearson correlation**, r, measures how strongly two variables move together in a straight line. 1 means a perfect rising line, −1 a perfect falling line, and 0 means no straight-line link.',
            animation: {
              name: 'correlation-scatter',
              caption: 'Real use: feature checks before modelling',
            },
          },
          {
            kicker: 'In code',
            title: 'r misses curved patterns',
            visual: { type: 'code', code: CORR_CODE, output: '0.972\n0.0' },
            note: 'y = x² depends completely on x, yet r is 0. Always plot before you trust r.',
            narration:
              'Study hours and marks rise together, and the correlation is 0.972. Now take x from minus 3 to 3, and y as x squared. y depends completely on x, but the correlation is 0, because the pattern is a U shape, not a line. Correlation only sees straight lines.',
          },
          {
            kicker: 'Careful',
            title: 'Correlation is not causation',
            body: 'Ice-cream sales and drownings rise together because hot weather, a hidden **confounder**, drives both. **Covariance** also measures moving together, but it depends on units. Correlation divides it by both standard deviations, so it runs from −1 to 1.',
            note: 'In ML, two features with |r| near 1 say almost the same thing. They can make a linear model’s weights unstable.',
          },
          {
            kicker: 'Try it',
            title: 'Reading a correlation',
            try: {
              type: 'choice',
              prompt: 'Two features have r = 0. What can you conclude?',
              options: [
                {
                  text: 'They have no straight-line link; a curved one is still possible',
                  correct: true,
                  feedback:
                    'Right. r only measures straight-line patterns, as the x squared example shows.',
                },
                {
                  text: 'They are completely unrelated',
                  correct: false,
                  feedback: 'A U-shaped link can give r = 0 while one fully depends on the other.',
                },
                {
                  text: 'One causes the other',
                  correct: false,
                  feedback: 'Correlation, zero or not, never shows cause on its own.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.testing',
      kind: 'SLIDES',
      title: 'Hypothesis testing and p-values',
      depthRank: 1,
      conceptKeys: [HYP],
      body: {
        slides: [
          {
            kicker: 'The idea',
            title: 'Assume no effect, then check',
            body: 'Start from a **null hypothesis**: the two models are equally good. The **alternative hypothesis** is that they differ. Collect data, then ask how surprising it would be if the null were true. Very surprising data is evidence against the null.',
          },
          {
            kicker: 'p-value',
            title: 'How surprising is the result',
            body: 'The **p-value** is the chance of a result at least this extreme if the null were true. It is not the chance that the null is true. If p is below a level set in advance, **α**, often 0.05, you reject the null. Otherwise you **cannot reject** it, which does not prove it true.',
            animation: { name: 'pvalue-tail', caption: 'Real use: A/B tests, model comparisons' },
            note: 'A **two-sided** test, as here, counts results at least this far from 50 in either direction. Use one-sided only if you fixed the direction in advance.',
          },
          {
            kicker: 'In code',
            title: 'More data, smaller p',
            visual: { type: 'code', code: BINOM_CODE, output: '0.057\n0.0057' },
            note: 'The same 60% win rate is not significant at 100 questions, but it is at 200. More data makes a real effect easier to see.',
            narration:
              'binom test checks a count of wins against a fifty fifty chance. 60 wins out of 100 gives a p value of 0.057, just above 0.05, so we cannot reject the null. The same win rate, 120 out of 200, gives 0.0057. If the models were equally good, a split this uneven would be very rare, so we reject the null.',
          },
          {
            kicker: 'Errors',
            title: 'Two ways to be wrong',
            visual: {
              type: 'compare',
              left: {
                title: 'Type I: false alarm',
                items: [
                  'Rejecting a null that is true',
                  'Shipping a model that is not better',
                  'Its rate is α, often 5%',
                ],
              },
              right: {
                title: 'Type II: a miss',
                items: [
                  'Not rejecting a null that is false',
                  'Missing a model that really is better',
                  'More data makes misses rarer',
                ],
              },
              better: 'none',
            },
          },
          {
            kicker: 'Which test',
            title: 'Pick the test that fits',
            visual: {
              type: 'icons',
              items: [
                { icon: 'chart', label: 't-test', sub: 'Compare two means, like order values' },
                {
                  icon: 'layers',
                  label: 'Chi-square test',
                  sub: 'Are two categories linked, like city and churn?',
                },
                { icon: 'list', label: 'ANOVA', sub: 'Compare means across three or more groups' },
                {
                  icon: 'target',
                  label: 'Proportion test',
                  sub: 'Compare rates, like conversions or wins',
                },
              ],
            },
            note: 'An A/B test uses one of these after randomly splitting users, with the metric and sample size fixed in advance.',
          },
          {
            kicker: 'Careful',
            title: 'Statistical versus practical significance',
            body: 'With millions of users, a 0.01% lift can be statistically significant and still worth nothing. Report the size of the effect and its cost, not just the p-value.',
          },
          {
            kicker: 'Try it',
            title: 'Read a p-value',
            try: {
              type: 'choice',
              prompt: 'An A/B test gives p = 0.03. What does that mean?',
              options: [
                {
                  text: 'With no real difference, a result this extreme would happen about 3% of the time',
                  correct: true,
                  feedback:
                    'Right. That is exactly what a p-value measures, under the null hypothesis.',
                },
                {
                  text: 'There is a 3% chance the null hypothesis is true',
                  correct: false,
                  feedback:
                    'The most common misreading. p assumes the null is true; it does not measure it.',
                },
                {
                  text: 'There is a 97% chance the new version is better',
                  correct: false,
                  feedback: 'A p-value does not give the chance that either version is better.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.pvalue',
      kind: 'WIDGET',
      title: 'Explore p-values',
      depthRank: 1,
      conceptKeys: [HYP],
      body: {
        widget: 'pvalue-explorer',
        prompt:
          'A reviewer compares a new model with an old one on each test question and picks the better answer. If the models were equally good, each would win about half. Change the number of questions and the new model’s wins.',
        params: {
          trialsLabel: 'test questions',
          successLabel: 'Wins for the new model',
          n: { options: [10, 50, 100, 200, 500], default: 100 },
          defaultShare: 0.6,
          alpha: { options: [0.01, 0.05, 0.1], default: 0.05 },
          tasks: [
            'At 100 questions and 60 wins, is the result significant at α = 0.05?',
            'Keep the 60% win rate but switch to 200 questions. What happens to the p-value?',
            'With 10 questions, how many wins does the new model need for p below 0.05?',
            'Back at 100 questions and 60 wins, set α to 0.1. Does the decision change, and what is the risk?',
          ],
        },
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Statistics check',
      depthRank: 1,
      conceptKeys: [DESC, DIST, CORR, HYP],
      body: {
        items: [
          {
            key: 'spread',
            type: 'mcq',
            prompt:
              'Two classes both average 70 marks. Class A’s standard deviation is 3; class B’s is 15. What does that tell you?',
            options: [
              { id: 'a', text: 'Class B’s marks are far more spread out' },
              { id: 'b', text: 'Class B scored higher on average' },
              { id: 'c', text: 'Class A has more students' },
              { id: 'd', text: 'Nothing, because the means are equal' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Equal means say nothing about spread. A standard deviation of 15 means class B’s marks vary far more.',
          },
          {
            key: 'normal',
            type: 'mcq',
            prompt:
              'Normal data has mean 50 and standard deviation 5. About what share lies between 45 and 55?',
            options: [
              { id: 'a', text: 'About 68%' },
              { id: 'b', text: 'About 95%' },
              { id: 'c', text: 'About 99.7%' },
              { id: 'd', text: 'About 50%' },
            ],
            answer: { correct: ['a'] },
            explanation: '45 to 55 is one standard deviation either side of the mean: about 68%.',
          },
          {
            key: 'strength',
            type: 'mcq',
            prompt:
              'Feature A has r = −0.9 with the target, and feature B has r = 0.3. Which has the stronger straight-line link?',
            options: [
              {
                id: 'a',
                text: 'Feature A: the size of r gives strength, and the sign gives direction',
              },
              { id: 'b', text: 'Feature B, because its r is positive' },
              { id: 'c', text: 'Neither, because a negative r means no link' },
              { id: 'd', text: 'They are equally strong' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Strength is how close |r| is to 1. At −0.9 the target falls steadily as A rises; 0.3 is a weak link.',
          },
          {
            key: 'type-one',
            type: 'mcq',
            prompt:
              'You ship a new model because a test said it was better, but it was not. Which error is that?',
            options: [
              { id: 'a', text: 'A Type I error, a false alarm' },
              { id: 'b', text: 'A Type II error, a miss' },
              { id: 'c', text: 'A sampling error' },
              { id: 'd', text: 'No error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Rejecting a null that was true is a Type I error. Its rate is the significance level α.',
          },
          {
            key: 'which-test',
            type: 'mcq',
            prompt: 'Which test compares the average order value of two groups in an A/B test?',
            options: [
              { id: 'a', text: 'A t-test' },
              { id: 'b', text: 'A chi-square test' },
              { id: 'c', text: 'Pearson correlation' },
              { id: 'd', text: 'A box plot' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A t-test compares two means. Chi-square is for links between categories, and correlation measures a straight-line link.',
          },
          {
            key: 'cannot-reject',
            type: 'mcq',
            prompt: 'A test of two models gives p = 0.2, with α = 0.05. What should you conclude?',
            options: [
              { id: 'a', text: 'You cannot reject the null: the data shows no clear difference' },
              { id: 'b', text: 'The null is true: the two models are equally good' },
              { id: 'c', text: 'There is a 20% chance that the null is true' },
              { id: 'd', text: 'The new model is better 80% of the time' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'p is not below α, so you cannot reject the null. That does not prove the null: a small test can miss a real difference.',
          },
        ],
      },
    },
    {
      key: 'interview.significance',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Is it really better',
      depthRank: 1,
      conceptKeys: [HYP],
      body: {
        question: '"Your new model beats the old one on 60 of 100 test cases. Is it better?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Null',
            detail:
              'State the null hypothesis: the models are equally good, so each wins half the time.',
          },
          {
            title: 'Test',
            detail:
              'Pick a test that fits: a binomial test, which checks the count of wins against a 50/50 split.',
          },
          {
            title: 'p-value',
            detail: 'Report it: a two-sided test on 60 of 100 gives p ≈ 0.057, not below 0.05.',
          },
          {
            title: 'Decide',
            detail: 'Say you cannot reject the null yet, which is not proof the models are equal.',
          },
          {
            title: 'Next',
            detail:
              'Suggest a larger test, with its size fixed in advance, and check that the gain matters in practice.',
          },
        ],
        followUps: [
          'What exactly does a p-value mean?',
          'What are Type I and Type II errors?',
          'When would you use a t-test or a chi-square test?',
          'Can two datasets have the same mean but different standard deviations?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [DESC, DIST, CORR, HYP],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Standard deviation',
            front: 'What is standard deviation, and what can you infer from it?',
            back: 'It measures how far values typically sit from the mean, in the data’s own units. Square each distance from the mean, average them (dividing by n − 1 for a sample), then take the square root. Small means tightly clustered; large means spread out. For bell-shaped data, about 68% lies within one standard deviation.',
          },
          {
            title: 'Same mean, different spread',
            front: 'Can two datasets have the same mean but different standard deviations?',
            back: 'Yes. Delivery times of 28 to 32 minutes and of 10 to 50 minutes can both average 30. The first has a standard deviation near 1.4, the second near 15. That is why you report a spread with every average: it shows how far single values stray from it.',
          },
          {
            title: 'Mean, median or mode',
            front: 'When do you use the mean, the median or the mode?',
            back: 'The mean for roughly symmetric numbers, like heights. The median for skewed data or outliers, like incomes or house prices, because extreme values cannot pull it. The mode for categories, like the most common city. In right-skewed data, the mean sits above the median.',
          },
          {
            title: 'Normal distribution',
            front: 'What is a normal distribution, and what is the 68–95–99.7 rule?',
            back: 'A symmetric, bell-shaped distribution set by its mean and standard deviation. About 68% of values lie within one standard deviation of the mean, 95% within two, and 99.7% within three. Many measurement errors look normal, and averages of large samples tend towards it.',
          },
          {
            title: 'Correlation',
            front: 'What is correlation, and does it imply causation?',
            back: 'Pearson correlation, r, measures how strongly two variables move together in a straight line, from −1 to 1. It does not imply causation: ice-cream sales and drownings rise together because summer drives both. And r = 0 rules out only a straight-line link, not a curved one.',
          },
          {
            title: 'Hypothesis testing',
            front: 'What is hypothesis testing? Explain with an example.',
            back: 'You state a null hypothesis, such as "the two models are equally good", and an alternative, "they differ". You collect data and compute how surprising it would be if the null were true: the p-value. If p is below a level set in advance, often 0.05, you reject the null. Otherwise you cannot reject it.',
          },
          {
            title: 'p-value',
            front: 'What does a p-value of 0.03 mean?',
            back: 'If there were truly no effect, a result at least this extreme would happen about 3% of the time. It is not the chance that the null hypothesis is true. It also says nothing about how big or useful the effect is, so report the effect size too.',
          },
          {
            title: 'Type I and Type II errors',
            front: 'What are Type I and Type II errors?',
            back: 'A Type I error is a false alarm: rejecting a true null, such as shipping a model that is not really better. Its rate is α. A Type II error is a miss: failing to detect a real effect. Its rate is β, and power, 1 − β, is the chance of catching one. More data raises power without raising α.',
          },
          {
            title: 'Types of tests',
            front: 'Explain the different types of hypothesis tests.',
            back: 'A t-test compares two means, like order values in an A/B test; a z-test does the same for large samples. A chi-square test checks whether two categories are linked, like city and churn. ANOVA compares three or more means. A proportion test compares rates. Tests on means and rates can be two-tailed, checking both directions, or one-tailed, checking one.',
          },
          {
            title: 'Statistics in ML',
            front: 'Which statistics concepts are used in machine learning?',
            back: 'Descriptive statistics summarise data: mean, median, standard deviation. Standardising a feature subtracts its mean and divides by its standard deviation. Distributions guide transforms, like a log for skewed incomes. Correlation flags redundant features. Loss functions are statistics too: MSE targets the mean, MAE the median. Hypothesis tests judge from a sample whether model B really beats model A.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Statistics: key takeaways',
      depthRank: 1,
      conceptKeys: [DESC, DIST, CORR, HYP],
      body: {
        takeaways: [
          'Report a centre and a spread: the mean or median, with the standard deviation or interquartile range.',
          'Use the median for skewed data and the mode for categories. The mean minimises squared error; the median, absolute error.',
          'Normal data: about 68%, 95% and 99.7% within one, two and three standard deviations.',
          'Correlation measures straight-line links from −1 to 1, and never proves causation.',
          'A p-value is the chance of data at least this extreme if the null were true. It is not the chance the null is true.',
          'Significant is not the same as important: check the size of the effect and the cost of errors.',
        ],
        remember: [
          'Skewed data: use the median',
          '68, 95, 99.7',
          'Small p: data surprising under the null',
        ],
      },
    },
  ],
};
