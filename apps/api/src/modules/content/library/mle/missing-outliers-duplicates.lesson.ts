/**
 * Data Preparation → Missing values, outliers and duplicates.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): finding and handling missing values in pandas (mean, median, mode, forward fill, and
 * when to use which), what outliers are, IQR and z-score detection, removing the whole row or only
 * the value, dropping duplicates by a key (also without pandas), the steps to clean a raw
 * e-commerce CSV, KNN imputation at 8+ LPA, and "how did you clean the data?" in project rounds.
 * One bar for every package for now, aimed at 8–12 LPA and kept simple, so every section is
 * depth 1. Code outputs were checked with Python 3.14 and pandas 3.1 (the browser runs pandas 3.0).
 */
import type { LessonDocumentInput } from '@app/content';

const MISS = 'data.missing-values';
const OUT = 'data.outliers';
const DUP = 'data.duplicates';

const FIRST_LOOK = `import pandas as pd

df = pd.DataFrame({
    "order_id": [101, 102, 101, 103, 104],
    "city": ["Pune", None, "Pune", "Delhi", "Pune"],
    "minutes": [32, 28, 32, None, 160],
})
print(df.shape)
print(df.isna().sum())
print(df.duplicated().sum())`;

const FILL_MEDIAN = `import pandas as pd

s = pd.Series([30, 32, None, 35, 250, None])
print(s.mean(), s.median())
print(s.fillna(s.median()).tolist())`;

const FILL_TYPES = `import pandas as pd

city = pd.Series(["Pune", None, "Delhi", "Pune"])
print(city.fillna("Unknown").tolist())

temps = pd.Series([24, None, 26, None, 30])
print(temps.ffill().tolist())
print(temps.interpolate().tolist())`;

const MISSING_FLAG = `import pandas as pd

df = pd.DataFrame({"salary": [12.0, None, 15.0]})
df["was_missing"] = df["salary"].isna().astype(int)
med = df["salary"].median()
df["salary"] = df["salary"].fillna(med)
print(df.values.tolist())`;

const KNN_FILL = `import numpy as np
from sklearn.impute import KNNImputer

X = np.array([[25, 30000], [27, np.nan],
              [52, 90000], [50, 85000],
              [26, 32000]])
imp = KNNImputer(n_neighbors=2)
print(imp.fit_transform(X)[1].tolist())`;

const IQR_CODE = `import pandas as pd

t = pd.Series([22, 25, 28, 30, 31, 33, 35, 38, 95, 160])
q1, q3 = t.quantile(0.25), t.quantile(0.75)
iqr = q3 - q1
low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
print(q1, q3, low, high)
print(t[(t < low) | (t > high)].tolist())
print(t.clip(low, high).tolist())`;

const Z_CODE = `import pandas as pd

t = pd.Series([22, 25, 28, 30, 31, 33, 35, 38, 95, 160])
z = (t - t.mean()) / t.std()
print(z.round(2).tolist())
print(t[z.abs() > 3].tolist())`;

const DEDUPE_CODE = `import pandas as pd

orders = pd.DataFrame({
    "order_id": [101, 102, 101, 103, 102],
    "city": ["Pune", "Delhi", "Pune", "Chennai", "Delhi"],
    "amount": [450, 300, 450, 520, 310],
})
print(orders.duplicated().sum())
step1 = orders.drop_duplicates()
print(len(step1))
step2 = step1.drop_duplicates(subset="order_id")
print(step2["amount"].tolist())`;

const NEAR_DUP = `import pandas as pd

names = pd.Series(["Pune", "pune ", "PUNE", "Delhi"])
clean = names.str.strip().str.lower()
print(names.nunique(), clean.nunique())`;

const CLEAN_HEAD = `import pandas as pd

df = pd.DataFrame({
    "order_id": [1, 2, 2, 3, 4, 5, 6],
    "city": ["Pune", "Delhi", "Delhi", None,
             "Pune", "Delhi", "Pune"],
    "minutes": [30.0, 35.0, 35.0, 28.0,
                None, 300.0, 33.0],
})
`;
const CLEAN_TAIL = `
print(len(df), df["city"].tolist())
print(df["minutes"].tolist())
`;
const CLEAN_START = `${CLEAN_HEAD}
# 1. drop rows that repeat an order_id
# 2. fill a missing city with "Unknown"
# 3. fill missing minutes with the median
# 4. cap minutes at the IQR upper fence
${CLEAN_TAIL}`;
const CLEAN_SOLUTION = `${CLEAN_HEAD}
df = df.drop_duplicates(subset="order_id")
df["city"] = df["city"].fillna("Unknown")
med = df["minutes"].median()
df["minutes"] = df["minutes"].fillna(med)
q1, q3 = df["minutes"].quantile([0.25, 0.75])
high = q3 + 1.5 * (q3 - q1)
df["minutes"] = df["minutes"].clip(upper=high)
${CLEAN_TAIL}`;

export const MISSING_OUTLIERS_DUPLICATES_LESSON: LessonDocumentInput = {
  title: 'Missing values, outliers and duplicates',
  subtitle:
    'How to find and fix the three most common data problems, and explain every choice in an interview.',
  objectives: [
    {
      key: 'profile',
      text: 'Profile a dataset and clean it in a clear order',
      minDepthRank: 1,
    },
    {
      key: 'missing',
      text: 'Find missing values and choose a fill method with a reason',
      minDepthRank: 1,
    },
    {
      key: 'outliers',
      text: 'Detect outliers with the IQR rule and z-scores, and decide how to treat them',
      minDepthRank: 1,
    },
    {
      key: 'duplicates',
      text: 'Remove exact and key-based duplicates in pandas',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Dirty data, wrong predictions',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        scenario:
          'A food delivery app wants to predict delivery times. Its data has gaps from app crashes, one delivery logged at 900 minutes, and orders saved twice after a network retry. A model trained on this data learns the mistakes too.',
        animation: { name: 'missing-fill', caption: 'Real use: salary columns with gaps' },
        realWorld: {
          title: 'Where dirty data shows up',
          items: [
            { icon: 'truck', label: 'Delivery apps', sub: 'Missing times, typos, double logs' },
            { icon: 'heart', label: 'Hospital records', sub: 'Tests that were never taken' },
            { icon: 'wallet', label: 'Payments', sub: 'A retry that charged twice' },
            { icon: 'cart', label: 'Online shops', sub: 'A price typed as 99999' },
          ],
        },
        provocation: 'Many rows have one empty column. Do you drop them or fill them?',
        bridge:
          '"How did you clean the data?" comes up in almost every project discussion. This lesson gives you a clear order, the pandas code, and a reason for every choice.',
      },
    },
    {
      key: 'slides.first-look',
      kind: 'SLIDES',
      title: 'Profiling a dataset',
      depthRank: 1,
      conceptKeys: [MISS, DUP],
      body: {
        slides: [
          {
            kicker: 'The story',
            title: 'Look before you clean',
            body: 'A doctor checks your pulse before prescribing anything. Do the same with data: count the rows, read the types, and count the gaps and repeats. This first look is called **profiling**, and it stops you fixing the wrong thing.',
          },
          {
            kicker: 'In code',
            title: 'Profile a table in pandas',
            visual: {
              type: 'code',
              code: FIRST_LOOK,
              output: '(5, 3)\norder_id    0\ncity        1\nminutes     1\ndtype: int64\n1',
            },
            note: 'On a real file, start with `df.info()` for types and non-empty counts, and `df.describe()` for the range of each numeric column.',
            narration:
              'We build a small orders table. Its shape is 5 rows and 3 columns. isna, then sum, counts the empty cells in each column: one missing city and one missing time. duplicated, then sum, counts rows that repeat an earlier row exactly, and order 101 appears twice. On a real file, you would read a CSV and start with info and describe.',
          },
          {
            kicker: 'The order',
            title: 'A cleaning order that works',
            body: 'Clean in a fixed order, and keep a log of each change: rows before and after, and why. Interviewers like hearing both the order and the reason.',
            visual: {
              type: 'flow',
              steps: [
                { label: 'Profile', icon: 'search' },
                { label: 'Fix types', icon: 'pen' },
                { label: 'Remove duplicates', icon: 'layers' },
                { label: 'Handle missing', icon: 'filter' },
                { label: 'Treat outliers', icon: 'gauge' },
              ],
            },
            note: 'Remove duplicates before filling gaps, or the repeats skew the fill value. Set impossible values, like age 245, to missing before you fill.',
          },
          {
            kicker: 'Scenario',
            title: 'Cleaning plan for a raw CSV',
            body: 'An interviewer hands you raw orders, customers and payments files. Say the plan out loud. Profile, fix types like dates and prices, and drop repeated orders. Then handle gaps, check extremes and validate totals against the source.',
            note: 'Validating means checking the cleaned data still makes sense, for example that order totals match the payments.',
          },
          {
            kicker: 'Try it',
            title: 'What to check first',
            try: {
              type: 'choice',
              prompt: 'You get a new 50,000-row customer file. What do you do first?',
              options: [
                {
                  text: 'Profile it: shape, types, missing counts and duplicates',
                  correct: true,
                  feedback: 'Right. You cannot choose a fix until you know what is wrong.',
                },
                {
                  text: 'Fill every gap with the column mean',
                  correct: false,
                  feedback:
                    'Filling blindly can hide problems. Profile first, then pick a method per column.',
                },
                {
                  text: 'Drop every row that has any missing value',
                  correct: false,
                  feedback: 'That may throw away most of your data. Count the gaps first.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.missing',
      kind: 'SLIDES',
      title: 'Handling missing values',
      depthRank: 1,
      conceptKeys: [MISS],
      body: {
        slides: [
          {
            kicker: 'Why it happens',
            title: 'Three reasons a value is missing',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'alert',
                  label: 'Never recorded',
                  sub: 'An app crash or a skipped form field',
                },
                {
                  icon: 'x',
                  label: 'Not applicable',
                  sub: 'No car model for someone without a car',
                },
                {
                  icon: 'eye',
                  label: 'Missing for a reason',
                  sub: 'High earners skip the salary question',
                },
              ],
            },
            note: 'The third kind is the tricky one: the gap itself carries information. Filling it blindly hides that.',
          },
          {
            kicker: 'Drop or fill',
            title: 'When dropping is safe',
            body: 'Filling a gap with an estimate is called **imputation**. Dropping is simpler, but every dropped row is data you lose.',
            visual: {
              type: 'compare',
              left: {
                title: 'Drop',
                items: [
                  'Few rows are affected, say under 5%',
                  'The gaps look random',
                  'A column is mostly empty and unimportant',
                ],
              },
              right: {
                title: 'Fill (impute)',
                items: [
                  'Many rows have gaps',
                  'Each row is valuable, like rare fraud cases',
                  'New data will have gaps too',
                ],
              },
              better: 'none',
            },
            note: 'The 5% is a rule of thumb, not a law. Check whether the dropped rows differ from the rest.',
          },
          {
            kicker: 'Mean or median',
            title: 'One big value pulls the mean',
            body: 'Fill numbers with the **mean** when the column is roughly symmetric. Use the **median**, the middle value, when it is skewed or has outliers, like salaries. Use the **mode**, the most common value, for categories like city.',
            animation: {
              name: 'mean-median-skew',
              caption: 'Real use: salaries, prices, delivery times',
            },
          },
          {
            kicker: 'In code',
            title: 'Fill with the median',
            visual: {
              type: 'code',
              code: FILL_MEDIAN,
              output: '86.75 33.5\n[30.0, 32.0, 33.5, 35.0, 250.0, 33.5]',
            },
            note: 'pandas skips gaps when it computes the mean and median. A fill of 86.75 would be higher than three of the four known salaries.',
            narration:
              'Here are the six salaries from the opening animation, in thousands, and two are missing. The mean skips the gaps and gives 86.75, because the single 250 drags it up. The median, the middle value, is 33.5. fillna puts the median into both gaps, and the list shows them as 33.5. That is a typical salary, not an inflated one.',
          },
          {
            kicker: 'By column type',
            title: 'Pick the fill that fits',
            visual: {
              type: 'code',
              code: FILL_TYPES,
              output:
                "['Pune', 'Unknown', 'Delhi', 'Pune']\n[24.0, 24.0, 26.0, 26.0, 30.0]\n[24.0, 25.0, 26.0, 28.0, 30.0]",
            },
            note: 'Categories: the mode, or an "Unknown" label. Ordered data like daily readings: forward fill, backward fill (`bfill`, the next known value) or interpolation.',
            narration:
              'For a category like city, a new label such as Unknown keeps the fact that the value was missing. For readings taken in time order, forward fill copies the last known value, so the gap after 24 becomes 24. Interpolate draws a straight line between the neighbours instead, so that gap becomes 25. For a smooth series, that is usually closer to the truth.',
          },
          {
            kicker: 'A useful trick',
            title: 'Keep a missing flag',
            visual: {
              type: 'code',
              code: MISSING_FLAG,
              output: '[[12.0, 0.0], [13.5, 1.0], [15.0, 0.0]]',
            },
            note: 'If the gap carries signal, like high earners skipping the salary question, the flag lets the model still learn it.',
            narration:
              'Before filling, we add a column called was missing, which is 1 where the salary was empty and 0 elsewhere. Then we fill the gap with the median, 13.5. Each row now holds the salary and the flag. The model sees a reasonable number and still knows the value was filled.',
          },
          {
            kicker: 'Beyond one column',
            title: 'Fill from similar rows',
            body: '**KNN imputation** fills a gap from the most similar rows. To fill a missing income, it finds the rows with the closest age and other features, then averages their incomes. It usually beats one value for everyone, but it is slower.',
            visual: { type: 'code', code: KNN_FILL, output: '[27.0, 31000.0]' },
            note: 'Scale the features first, or the biggest numbers decide who counts as similar. The next unit shows why.',
            narration:
              'Five people, with age and income, and the second person’s income is missing. KNN imputer with two neighbours finds the two rows with the closest age, 25 and 26. Their incomes are 30,000 and 32,000, so the gap becomes their average, 31,000.',
          },
          {
            kicker: 'Do not leak',
            title: 'Learn fill values from training data',
            body: 'Compute the mean or median on the **training split only**. Then use that same number for the validation and test rows. Computing it on all rows lets test data shape training, which is a form of data leakage.',
            note: 'In scikit-learn, fit `SimpleImputer(strategy="median")` on the training rows, then transform every split. The next unit shows how a pipeline does this.',
          },
          {
            kicker: 'Try it',
            title: 'Choose a fill',
            try: {
              type: 'choice',
              prompt:
                'A house-price column is right-skewed, with a few mansions, and 4% of values are missing. Which fill fits best?',
              options: [
                {
                  text: 'The median of the training rows',
                  correct: true,
                  feedback:
                    'Right. The median ignores the few mansions, and using training rows avoids leakage.',
                },
                {
                  text: 'The mean of all rows',
                  correct: false,
                  feedback:
                    'The mansions pull the mean up, and using all rows leaks test data into training.',
                },
                {
                  text: 'Zero',
                  correct: false,
                  feedback:
                    'Zero is not a real price. The model would learn that some houses are free.',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Fill a category gap',
            try: {
              type: 'code',
              prompt: 'Fill the missing city with the most common city, then print the list.',
              starter:
                'import pandas as pd\n\ncity = pd.Series(["Pune", None, "Delhi", "Pune"])\n# fill the gap with the mode\nprint(city.tolist())',
              expected: "['Pune', 'Pune', 'Delhi', 'Pune']",
              hint: 'The mode is `city.mode()[0]`. Pass it to `fillna` and print the result as a list.',
              packages: ['pandas'],
            },
          },
        ],
      },
    },
    {
      key: 'widget.imputation',
      kind: 'WIDGET',
      title: 'Explore filling missing values',
      depthRank: 1,
      conceptKeys: [MISS],
      body: {
        widget: 'imputation-explorer',
        prompt:
          'Three small datasets, each with gaps. Pick a fill method and watch the filled points, the summary and the spread change.',
        params: {
          datasets: [
            {
              name: 'Salaries',
              label: 'Monthly salary (thousands)',
              values: [28, 32, null, 35, 30, null, 41, 33, 250, null, 29, 36],
              ordered: false,
            },
            {
              name: 'Ratings',
              label: 'Product rating (1 to 5)',
              values: [5, 4, null, 5, 3, 5, null, 4, 5, 2, null, 4],
              ordered: false,
            },
            {
              name: 'Temperature',
              label: 'Daily temperature (°C)',
              values: [24, 25, null, 27, 28, null, null, 31, 32, 31, null, 29],
              ordered: true,
            },
          ],
          strategies: ['drop', 'mean', 'median', 'mode', 'ffill', 'bfill', 'interpolate'],
          defaultStrategy: 'mean',
          tasks: [
            'Salaries with Mean: how many of the nine known salaries are above the fill value? Now try Median.',
            'Ratings with Mean fills 4.111, a rating no one can give. Which methods fill a real rating?',
            'Temperature with Mean: does the fill follow the warming trend? Now try Interpolate.',
            'Salaries with Forward fill: what does row 10 get, and why is that wrong for unordered rows?',
          ],
        },
      },
    },
    {
      key: 'slides.outliers',
      kind: 'SLIDES',
      title: 'Detecting and treating outliers',
      depthRank: 1,
      conceptKeys: [OUT],
      body: {
        slides: [
          {
            kicker: 'The story',
            title: 'A typo or a real extreme',
            body: 'One delivery shows 900 minutes. Maybe someone typed 900 instead of 90. A 160-minute delivery in a storm could be real. An **outlier** is a value far from the rest. First ask why it is there, then decide.',
          },
          {
            kicker: 'Detect · IQR',
            title: 'The box plot fences',
            body: '**Q1** and **Q3** are the values a quarter and three quarters of the way up the sorted data. The **IQR** is Q3 − Q1, the spread of the middle half. Values more than 1.5 × IQR outside the box are flagged.',
            animation: {
              name: 'iqr-fences',
              caption: 'Real use: delivery times, prices, sensor readings',
            },
          },
          {
            kicker: 'In code',
            title: 'IQR fences in pandas',
            body: 'Now take just ten of those delivery times. With fewer values, the quartiles and fences shift a little.',
            visual: {
              type: 'code',
              code: IQR_CODE,
              output:
                '28.5 37.25 15.375 50.375\n[95, 160]\n[22.0, 25.0, 28.0, 30.0, 31.0, 33.0, 35.0, 38.0, 50.375, 50.375]',
            },
            note: '`clip` caps values at the fences instead of deleting rows. Capping at percentiles, such as the 1st and 99th, is called winsorizing.',
            narration:
              'Ten of those delivery times, in minutes. quantile gives Q1 of 28.5 and Q3 of 37.25, so the IQR is 8.75. The fences sit one and a half IQRs outside the box, at 15.375 and 50.375. The filter keeps the values outside the fences: 95 and 160. clip then caps both at the upper fence, 50.375, and keeps every row.',
          },
          {
            kicker: 'Detect · z-score',
            title: 'Distance in standard deviations',
            body: 'A **z-score** says how many standard deviations a value sits from the mean. A common rule flags values beyond 3. It suits roughly bell-shaped data. With few rows, an extreme value stretches the standard deviation and hides itself.',
            visual: {
              type: 'code',
              code: Z_CODE,
              output: '[-0.63, -0.56, -0.49, -0.45, -0.42, -0.38, -0.33, -0.27, 1.03, 2.51]\n[]',
            },
            note: 'The same data, but the z-score rule flags nothing: 160 only reaches 2.51. The IQR rule does not use the mean, so it is more robust.',
            narration:
              'The same ten delivery times. The z score subtracts the mean and divides by the standard deviation. But 95 and 160 pull the mean up and stretch the standard deviation, so even 160 only reaches 2.51. Nothing passes the usual cut off of 3. The IQR rule caught both, because quartiles barely move when one value grows.',
          },
          {
            kicker: 'Treat',
            title: 'Five ways to handle an outlier',
            visual: {
              type: 'icons',
              items: [
                { icon: 'pen', label: 'Fix it', sub: 'A typo with a clear right value' },
                { icon: 'x', label: 'Remove it', sub: 'An impossible value, like age 245' },
                { icon: 'filter', label: 'Cap it', sub: 'Clip to the fences, keep the row' },
                { icon: 'chart', label: 'Transform it', sub: 'A log scale shrinks long tails' },
                {
                  icon: 'check',
                  label: 'Keep it',
                  sub: 'Real extremes, like fraud, may be the signal',
                },
              ],
            },
            note: 'The median and tree models are hardly moved by outliers in the features. The mean, linear models and KNN are.',
          },
          {
            kicker: 'Row or value',
            title: 'Remove the row or the value',
            body: 'If one value is wrong but the rest of the row is fine, set just that value to missing and fill it. Remove the whole row when the record itself is bad, such as a test order or a bot.',
          },
          {
            kicker: 'Scenario',
            title: 'Fraud is an outlier on purpose',
            body: 'In fraud detection, the rare huge transaction is what you want to catch. Removing outliers there deletes the very cases the model must learn. Always ask what an outlier means before you treat it.',
          },
          {
            kicker: 'Try it',
            title: 'An impossible age',
            try: {
              type: 'choice',
              prompt:
                'An age column has the values 23, 31, 27 and 245. What should you do with 245?',
              options: [
                {
                  text: 'Treat it as an error: set it to missing, then fill or drop it',
                  correct: true,
                  feedback:
                    'Right. No one is 245, so it is an error. Fix it if you know the true value; otherwise treat it as missing.',
                },
                {
                  text: 'Keep it, because it is a real extreme',
                  correct: false,
                  feedback: 'An age of 245 is impossible, so it is not a real extreme.',
                },
                {
                  text: 'Run the z-score rule to decide',
                  correct: false,
                  feedback:
                    'You do not need a rule for an impossible value. Domain knowledge says it is an error.',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Flag slow deliveries',
            try: {
              type: 'code',
              prompt:
                'Compute the IQR upper fence, then print the delivery times above it as a list.',
              starter:
                'import pandas as pd\n\nt = pd.Series([30, 32, 29, 35, 31, 120])\nq1, q3 = t.quantile(0.25), t.quantile(0.75)\n# high = Q3 + 1.5 * IQR\n# print the values above high',
              expected: '[120]',
              hint: 'The IQR is `q3 - q1`. Then print `t[t > high].tolist()`.',
              packages: ['pandas'],
            },
          },
        ],
      },
    },
    {
      key: 'widget.outliers',
      kind: 'WIDGET',
      title: 'Explore outlier rules',
      depthRank: 1,
      conceptKeys: [OUT],
      body: {
        widget: 'outlier-explorer',
        prompt:
          'Nineteen delivery times, plus one more you can drag. Flag outliers with the IQR rule or the z-score rule, then keep, remove or cap them.',
        params: {
          label: 'Delivery time (minutes)',
          values: [22, 24, 25, 27, 28, 29, 30, 30, 31, 32, 33, 34, 35, 36, 38, 40, 42, 44, 95],
          extra: { label: 'The last delivery (minutes)', min: 40, max: 300, step: 5, default: 160 },
          methods: ['iqr', 'zscore'],
          defaultMethod: 'iqr',
          iqrK: { options: [1.5, 3], default: 1.5 },
          zThreshold: { options: [2, 2.5, 3], default: 3 },
          treatments: ['keep', 'remove', 'cap'],
          tasks: [
            'Drag the last delivery from 160 to 300 minutes. How far does the mean move? And the median?',
            'Switch to Z-score with threshold 3. Which slow delivery does it miss?',
            'Still on Z-score, drag the last delivery to 100. Why is nothing flagged now?',
            'Back on the IQR rule, choose Cap at the fences. What happens to the mean?',
          ],
        },
      },
    },
    {
      key: 'slides.duplicates',
      kind: 'SLIDES',
      title: 'Duplicate records',
      depthRank: 1,
      conceptKeys: [DUP],
      body: {
        slides: [
          {
            kicker: 'The story',
            title: 'Charged twice for one order',
            body: 'A payment times out, the app retries, and the same order is saved twice. Now it counts double in revenue and in training. **Duplicates** are repeated records, and they quietly bias everything you compute.',
          },
          {
            kicker: 'Rows and keys',
            title: 'Exact repeats, then repeated keys',
            body: '`duplicated()` marks rows that repeat an earlier row exactly, and `drop_duplicates()` removes them. Often the real key is one column, like order_id. Pass `subset=` to compare only that column.',
            animation: { name: 'dedupe-rows', caption: 'Real use: orders, payments, sign-ups' },
          },
          {
            kicker: 'In code',
            title: 'Removing duplicates in pandas',
            visual: { type: 'code', code: DEDUPE_CODE, output: '1\n4\n[450, 300, 520]' },
            note: 'keep="first" is the default. Use keep="last" when later rows are corrections, or keep=False to drop every copy.',
            narration:
              'Five orders. Order 101 appears twice, identical, and order 102 appears twice with different amounts. duplicated finds one exact repeat. drop duplicates removes it, leaving four rows. Then subset equals order id compares only the id, so the second 102 goes too. By default pandas keeps the first copy, so the amounts left are 450, 300 and 520.',
          },
          {
            kicker: 'Near duplicates',
            title: 'Clean text before comparing',
            body: '"Pune", "pune " and "PUNE" look different to pandas. Strip spaces and lower-case the text first, or the duplicates survive. The same goes for phone numbers with and without +91.',
            visual: { type: 'code', code: NEAR_DUP, output: '4 2' },
            narration:
              'Four city names, but three of them are Pune written differently. Counting unique values gives 4. After stripping spaces and lower casing, the count drops to 2, Pune and Delhi. Always normalise text before you look for duplicates.',
          },
          {
            kicker: 'Leakage',
            title: 'Duplicates across train and test',
            body: 'If the same customer or image lands in both training and test data, the test score rises. The model has already seen the answer. Remove duplicates before you split, and when one person has many rows, split by person.',
          },
          {
            kicker: 'Try it',
            title: 'Dedupe a list without pandas',
            try: {
              type: 'code',
              prompt:
                'Remove repeated customer IDs from a list without pandas or a set conversion, keeping the first of each in order.',
              starter:
                'ids = [7, 3, 7, 9, 3, 1]\nseen = set()\nunique = []\n# loop over ids and keep each id once\nprint(unique)',
              expected: '[7, 3, 9, 1]',
              hint: 'For each id, if it is not in `seen`, add it to `seen` and append it to `unique`.',
            },
          },
        ],
      },
    },
    {
      key: 'playground.clean',
      kind: 'PLAYGROUND',
      title: 'Clean an orders table',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        language: 'python',
        instructions:
          'Clean this orders table in four steps. Drop rows that repeat an `order_id`, fill a missing city with `"Unknown"`, and fill missing minutes with the median. Then cap minutes at the IQR upper fence.',
        starterCode: CLEAN_START,
        hints: [
          'Step 1: `df = df.drop_duplicates(subset="order_id")`.',
          'Steps 2 and 3: assign `df["city"].fillna("Unknown")` back to `df["city"]`, and do the same for minutes with the median.',
          'Step 4: `q1, q3 = df["minutes"].quantile([0.25, 0.75])`, then `high = q3 + 1.5 * (q3 - q1)` and `.clip(upper=high)`.',
        ],
        solution: CLEAN_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: "6 ['Pune', 'Delhi', 'Unknown', 'Pune', 'Delhi', 'Pune']",
            label: 'Six unique orders and no missing city',
          },
          {
            type: 'stdout_contains',
            value: '[30.0, 35.0, 28.0, 33.0, 40.125, 33.0]',
            label: 'The median fills the gap and 300 is capped at 40.125',
          },
        ],
        packages: ['pandas'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Data cleaning check',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        items: [
          {
            key: 'median',
            type: 'mcq',
            prompt:
              'A salary column has a few very high values and some gaps. Which fill is safest?',
            options: [
              { id: 'a', text: 'The median' },
              { id: 'b', text: 'The mean' },
              { id: 'c', text: 'Zero' },
              { id: 'd', text: 'The maximum' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The few high salaries pull the mean up. The median is the middle value, so it stays typical.',
          },
          {
            key: 'fill-mean',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import pandas as pd\n\ns = pd.Series([10, None, 30])\nprint(s.fillna(s.mean()).tolist())',
            options: [
              { id: 'a', text: '[10.0, 20.0, 30.0]' },
              { id: 'b', text: '[10.0, 0.0, 30.0]' },
              { id: 'c', text: '[10.0, nan, 30.0]' },
              { id: 'd', text: '[10.0, 13.33, 30.0]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The mean skips the gap: (10 + 30) ÷ 2 = 20, and fillna puts 20 in the gap.',
          },
          {
            key: 'iqr',
            type: 'mcq',
            prompt: 'Q1 is 20 and Q3 is 30. Which value does the 1.5 × IQR rule flag?',
            options: [
              { id: 'a', text: '48' },
              { id: 'b', text: '44' },
              { id: 'c', text: '10' },
              { id: 'd', text: '35' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The IQR is 10, so the fences are 20 − 15 = 5 and 30 + 15 = 45. Only 48 is outside them.',
          },
          {
            key: 'subset',
            type: 'mcq',
            prompt: 'Which call keeps one row per order_id?',
            options: [
              { id: 'a', text: 'df.drop_duplicates(subset="order_id")' },
              { id: 'b', text: 'df.drop_duplicates()' },
              { id: 'c', text: 'df.duplicated()' },
              { id: 'd', text: 'df.dropna(subset="order_id")' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Without subset, two rows for one order with different amounts both stay. duplicated() only marks rows, and dropna removes missing values.',
          },
          {
            key: 'fraud',
            type: 'mcq',
            prompt:
              'In a fraud dataset, a few transactions are 50 times larger than the rest. What should you do first?',
            options: [
              { id: 'a', text: 'Check whether they are fraud before removing anything' },
              { id: 'b', text: 'Remove them, because they are outliers' },
              { id: 'c', text: 'Cap them at the IQR fence' },
              { id: 'd', text: 'Replace them with the median' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'In fraud detection, extreme values may be exactly the cases you need. Understand them before you treat them.',
          },
        ],
      },
    },
    {
      key: 'interview.cleaning',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Data cleaning answer structure',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        question: '"How did you clean the data in your project?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Profile',
            detail:
              'Name the size and the problems, for example "40,000 rows, 6% missing income, 1,200 repeated orders".',
          },
          {
            title: 'Order',
            detail: 'Walk through your order: types, duplicates, missing values, then outliers.',
          },
          {
            title: 'Missing',
            detail:
              'Say what you filled with and why, for example "the median income, because it was skewed".',
          },
          {
            title: 'Outliers',
            detail:
              'Say how you detected them, with IQR or domain rules, and whether you fixed, capped or kept them.',
          },
          {
            title: 'Leakage',
            detail: 'Mention that fill values came from the training split only.',
          },
          {
            title: 'Result',
            detail: 'Give the impact: rows kept, and the score before and after cleaning.',
          },
        ],
        followUps: [
          'When do you fill with the mean, the median or the mode?',
          'How do you detect outliers: IQR or z-score?',
          'Do you remove the whole row or only the bad value?',
          'How do you remove duplicates in pandas?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Finding missing values',
            front: 'How do you find missing values in a dataset with pandas?',
            back: 'Use `df.isna().sum()` to count the gaps in each column, and `df.isna().mean()` for the share. `df.info()` shows non-empty counts and types. Then look at where the gaps sit: spread at random, or bunched in some rows, which hints at why they are missing. Also replace placeholders like "?" or 999 with NaN, because `isna()` does not count them.',
          },
          {
            title: 'Mean, median or mode',
            front: 'When do you fill with the mean, the median or the mode?',
            back: 'Mean for numbers that are roughly symmetric. Median for skewed numbers or outliers, like salaries, because one huge value cannot drag it. Mode for categories like city. For ordered data like daily readings, forward fill or interpolation is usually better. Compute the value on the training split only.',
          },
          {
            title: 'Ways to handle gaps',
            front: 'What are the ways to handle missing data?',
            back: 'Drop rows when few are affected and the gaps look random. Drop a column that is mostly empty and unimportant. Otherwise fill: mean, median, mode, forward or backward fill, interpolation, or a model-based method like KNN imputation. Add a missing flag when the gap itself may carry signal.',
          },
          {
            title: 'KNN imputation',
            front: 'How can KNN be used to fill missing values?',
            back: 'For a row with a gap, find the k most similar rows using the features it does have. Fill the gap with their average, or their most common value for categories. Scale the features first so distances are fair. It fits relationships better than one constant, but it is slower.',
          },
          {
            title: 'Detecting outliers',
            front: 'What are outliers, and how do you detect them?',
            back: 'An outlier is a value far from the rest. Detect it with a box plot or the IQR rule, which flags values more than 1.5 × IQR outside Q1 and Q3. A z-score above 3 or below −3 also works for bell-shaped data. Domain rules help too: an age of 245 is impossible.',
          },
          {
            title: 'Treating outliers',
            front: 'Should you remove, keep or process outliers?',
            back: 'First find out why the value is extreme. Fix clear typos and remove impossible values. Cap or log-transform long tails when they distort a linear model. Keep real extremes when they are the signal, as in fraud detection. Tree models are hardly affected by outliers in the features anyway.',
          },
          {
            title: 'Row or value',
            front: 'When removing outliers, do you remove the whole row or only that value?',
            back: 'Only the value, when the rest of the row is good: set it to missing, then fill it. Remove the whole row when the record itself is bad, such as a test order, a bot, or several impossible fields. That keeps as much real data as possible.',
          },
          {
            title: 'Removing duplicates',
            front: 'How do you find and remove duplicates, such as repeated customer IDs?',
            back: '`df.duplicated()` marks exact repeats and `drop_duplicates()` removes them. To dedupe by a key, pass `subset="customer_id"` and choose `keep="first"` or `"last"`. To see every copy first, use `df[df.duplicated(subset="customer_id", keep=False)]`. Normalise text first by trimming spaces and lower-casing. Remove duplicates before splitting, so no row sits in both training and test.',
          },
          {
            title: 'Cleaning a raw CSV',
            front: 'I give you a raw e-commerce CSV. What steps would you take to clean it?',
            back: 'Profile it: shape, types, missing counts and duplicates. Fix types with `pd.to_datetime()` and `pd.to_numeric(col, errors="coerce")`, which turns junk text into missing values. Drop repeated orders by order ID. Handle gaps per column, check outliers with IQR and domain rules, then validate totals against the source. Log every change with row counts before and after.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Data cleaning: key takeaways',
      depthRank: 1,
      conceptKeys: [MISS, OUT, DUP],
      body: {
        takeaways: [
          'Profile first: shape, types, missing counts and duplicates. Clean in a fixed order and log each change.',
          'Fill skewed numbers with the median, symmetric ones with the mean, and categories with the mode or "Unknown".',
          'For ordered data, forward fill or interpolate. Add a missing flag when a gap may carry signal.',
          'Detect outliers with the IQR rule or z-scores. The IQR rule is more robust, and z-scores suit bell-shaped data.',
          'Ask why a value is extreme: fix typos, remove impossible values, cap long tails, keep real signals.',
          'Remove duplicates by the right key, after cleaning the text, and before you split the data.',
        ],
        remember: [
          'Skewed data: fill with the median',
          'Fences: Q1 − 1.5 IQR and Q3 + 1.5 IQR',
          'Dedupe before you split',
        ],
      },
    },
  ],
};
