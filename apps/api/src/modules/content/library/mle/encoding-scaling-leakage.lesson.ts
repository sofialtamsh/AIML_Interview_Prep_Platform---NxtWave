/**
 * Data Preparation → Encoding, scaling and data leakage (plus feature engineering and selection).
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): one-hot vs label encoding, why and when to scale, normalisation vs standardisation,
 * data leakage with an example (a churn model at 99% because a feature is the cancellation date,
 * scaling before the split), how to decide which features are useful, "what features are you using
 * for prediction?", and the end-to-end pipeline from cleaning to feature engineering. The 8–12 LPA
 * objectives add high-cardinality encodings, leak-free preprocessing (fit on train only) and
 * feature selection with a clear reason. One bar for every package for now, so every section is
 * depth 1. Code outputs were checked with Python 3.14, NumPy 2.5, pandas 3.1 and scikit-learn 1.9.
 */
import type { LessonDocumentInput } from '@app/content';

const ENC = 'data.encoding';
const SCALE = 'data.scaling';
const LEAK = 'data.leakage';
const FEAT = 'data.feature-selection';

const ENCODE_CODE = `import pandas as pd

df = pd.DataFrame({"city": ["Delhi", "Mumbai", "Chennai", "Delhi"]})
codes = df["city"].astype("category").cat.codes
print(codes.tolist())

dummies = pd.get_dummies(df["city"], dtype=int)
print(list(dummies.columns))
print(dummies.values.tolist())`;

const ORDINAL_CODE = `import pandas as pd

sizes = pd.Series(["M", "S", "L", "M"])
order = {"S": 0, "M": 1, "L": 2}
print(sizes.map(order).tolist())`;

const UNSEEN_CODE = `from sklearn.preprocessing import OneHotEncoder

enc = OneHotEncoder(handle_unknown="ignore")
enc.fit([["Delhi"], ["Mumbai"], ["Chennai"]])
new = [["Pune"], ["Delhi"]]
print(enc.transform(new).toarray().tolist())`;

const HIGH_CARD_CODE = `import pandas as pd

df = pd.DataFrame({
    "pin": ["560001", "560001", "110001",
            "400001", "560001", "110001"],
    "bought": [1, 0, 1, 0, 1, 1],
})
df["pin_freq"] = df["pin"].map(df["pin"].value_counts())
df["pin_rate"] = df.groupby("pin")["bought"].transform("mean")
print(df[["pin_freq", "pin_rate"]].round(2).values.tolist())`;

const SCALE_CODE = `import numpy as np

age = np.array([22, 26, 40, 58])
mm = (age - age.min()) / (age.max() - age.min())
z = (age - age.mean()) / age.std()
print(mm.round(2).tolist())
print(z.round(2).tolist())`;

const ROBUST_CODE = `import numpy as np

inc = np.array([30, 32, 35, 38, 400])
mm = (inc - inc.min()) / (inc.max() - inc.min())
print(mm.round(2).tolist())

q1, med, q3 = np.percentile(inc, [25, 50, 75])
print(((inc - med) / (q3 - q1)).round(2).tolist())`;

const LEAK_CODE = `import numpy as np

train = np.array([20.0, 22, 24, 26])
test = np.array([60.0])

wrong = np.concatenate([train, test]).mean()
right = train.mean()
print(wrong, right)`;

const PIPE_CODE = `from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_breast_cancer(return_X_y=True)
model = make_pipeline(StandardScaler(),
                      LogisticRegression(max_iter=1000))
scores = cross_val_score(model, X, y, cv=5)
print(round(scores.mean(), 3))`;

const COLUMNS_CODE = `import pandas as pd
from sklearn.compose import make_column_transformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

X = pd.DataFrame({"city": ["Delhi", "Pune", "Delhi", "Pune"],
                  "income": [30000, 45000, 72000, 95000]})
prep = make_column_transformer(
    (OneHotEncoder(handle_unknown="ignore"), ["city"]),
    (StandardScaler(), ["income"]))
model = make_pipeline(prep, LogisticRegression()).fit(X, [0, 0, 1, 1])
new = pd.DataFrame({"city": ["Chennai"], "income": [90000]})
print(prep.transform(new).round(2).tolist(), model.predict(new))`;

const SELECT_CODE = `import pandas as pd

df = pd.DataFrame({
    "area": [600, 800, 1000, 1200, 1500],
    "age": [12, 3, 8, 15, 5],
    "tiles": [1, 1, 1, 1, 1],
    "price": [32, 45, 48, 58, 80],
})
print(df.var().round(1).to_dict())
corr = df.drop(columns="tiles").corr()["price"]
print(corr.round(2).to_dict())`;

const FE_CODE = `import pandas as pd

o = pd.DataFrame({
    "when": pd.to_datetime(["2026-11-14", "2026-11-16"]),
    "amount": [900, 1200],
    "items": [6, 10],
})
o["weekday"] = o["when"].dt.day_name()
o["per_item"] = o["amount"] / o["items"]
print(o[["weekday", "per_item"]].values.tolist())`;

const SCALE_HEAD = `import numpy as np

# age, monthly income
train = np.array([[22, 30000], [30, 52000],
                  [45, 61000], [58, 95000]], dtype=float)
test = np.array([[26, 52000]], dtype=float)
`;
const SCALE_START = `${SCALE_HEAD}
# 1. mean and std of each column, from train only
# 2. standardise train and test with those numbers

print(mean.tolist())
print(test_s.round(2).tolist())
`;
const SCALE_SOLUTION = `${SCALE_HEAD}
mean = train.mean(axis=0)
std = train.std(axis=0)
train_s = (train - mean) / std
test_s = (test - mean) / std

print(mean.tolist())
print(test_s.round(2).tolist())
`;

export const ENCODING_SCALING_LEAKAGE_LESSON: LessonDocumentInput = {
  title: 'Encoding, scaling and data leakage',
  subtitle:
    'Turning raw columns into model-ready features without fooling yourself: encodings, scaling, leak-free pipelines and choosing features.',
  objectives: [
    {
      key: 'encode',
      text: 'Choose between one-hot, label and other encodings, including for many categories',
      minDepthRank: 1,
    },
    {
      key: 'scale',
      text: 'Explain why and when to scale, and compare min-max, standard and robust scaling',
      minDepthRank: 1,
    },
    {
      key: 'leakage',
      text: 'Spot data leakage and build preprocessing that fits on training data only',
      minDepthRank: 1,
    },
    {
      key: 'features',
      text: 'Create useful features and select features with a clear reason',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Numbers that shout louder',
      depthRank: 1,
      conceptKeys: [SCALE, ENC],
      body: {
        scenario:
          'A bank finds similar customers to suggest loans. Ages run from 22 to 58, and incomes from 30,000 to 95,000 rupees a month. Measured as they are, a 1,000 rupee income gap counts for more than a 30-year age gap.',
        animation: {
          name: 'scaling-squash',
          caption: 'Real use: customer similarity, credit scoring',
        },
        realWorld: {
          title: 'Where features need care',
          items: [
            { icon: 'wallet', label: 'Credit scoring', sub: 'Income in rupees, age in years' },
            { icon: 'cart', label: 'Recommendations', sub: 'Similar shoppers, found by distance' },
            { icon: 'map', label: 'Delivery zones', sub: 'Thousands of pin codes as categories' },
            { icon: 'heart', label: 'Health risk', sub: 'Blood sugar next to age and weight' },
          ],
        },
        provocation:
          'A model sees Chennai = 0, Delhi = 1, Mumbai = 2. What does it think Mumbai is?',
        bridge:
          'Preprocessing questions follow almost every ML answer: which encoding, why you scaled, and how you avoided leakage. This lesson covers all three, plus how to choose features.',
      },
    },
    {
      key: 'slides.encoding',
      kind: 'SLIDES',
      title: 'Encoding categories',
      depthRank: 1,
      conceptKeys: [ENC],
      body: {
        slides: [
          {
            kicker: 'Why encode',
            title: 'Models only read numbers',
            body: 'A model cannot multiply "Delhi" by a weight. **Encoding** turns categories into numbers. The way you do it can add a meaning that is not there, so the choice matters.',
          },
          {
            kicker: 'Two choices',
            title: 'Label codes or one-hot columns',
            body: '**Label encoding** gives each category a number. **One-hot encoding** gives each category its own 0/1 column. Numbers imply an order, so label codes on cities tell the model that Mumbai is "more" than Delhi.',
            animation: {
              name: 'one-hot-vs-label',
              caption: 'Real use: city, payment method, device type',
            },
          },
          {
            kicker: 'In code',
            title: 'Label codes and get_dummies',
            visual: {
              type: 'code',
              code: ENCODE_CODE,
              output:
                "[1, 2, 0, 1]\n['Chennai', 'Delhi', 'Mumbai']\n[[0, 1, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]]",
            },
            note: 'Both sort the categories alphabetically, so Chennai is 0 and the first column.',
            narration:
              'Four rows of cities. Category codes give each city a number in alphabetical order: Chennai 0, Delhi 1, Mumbai 2. So the column becomes 1, 2, 0, 1. get dummies makes one column per city instead. Each row has a single 1, in its own city’s column, and no city is bigger than another.',
          },
          {
            kicker: 'When order is real',
            title: 'Ordinal encoding with your own order',
            body: 'Some categories do have an order: sizes S, M, L, or education levels. Map them to numbers in that order yourself. Alphabetical codes would put L before M.',
            visual: { type: 'code', code: ORDINAL_CODE, output: '[1, 0, 2, 1]' },
            note: 'In scikit-learn, `OrdinalEncoder(categories=[["S", "M", "L"]])` does the same. `LabelEncoder` is meant for the target, not features.',
            narration:
              'Shirt sizes have a real order: small, medium, large. We write that order in a dictionary, S 0, M 1, L 2, and map the column through it. The result keeps the order, so M becomes 1 and L becomes 2.',
          },
          {
            kicker: 'Which model',
            title: 'Match the encoding to the model',
            visual: {
              type: 'compare',
              left: {
                title: 'One-hot',
                items: [
                  'Unordered categories: city, colour',
                  'Linear models, KNN, SVM, neural networks',
                  'A few to a few dozen categories',
                ],
              },
              right: {
                title: 'Label or ordinal',
                items: [
                  'Ordered categories: size, rating, level',
                  'Tree models handle plain codes well',
                  'Many categories in tree models, where one-hot would explode',
                ],
              },
              better: 'none',
            },
            note: 'For linear models, drop one one-hot column (drop_first=True). The rest already imply it, and a redundant column can confuse the weights.',
          },
          {
            kicker: 'In production',
            title: 'A city the model never saw',
            body: 'Training had Delhi, Mumbai and Chennai. Next week a Pune order arrives. Fit the encoder on training data with `handle_unknown="ignore"`, so an unseen city becomes all zeros instead of a crash.',
            visual: {
              type: 'code',
              code: UNSEEN_CODE,
              output: '[[0.0, 0.0, 0.0], [0.0, 1.0, 0.0]]',
            },
            narration:
              'The encoder learns three cities from training data. Then we send it Pune, which it has never seen, and Delhi. Because handle unknown is set to ignore, Pune becomes three zeros instead of an error. Delhi becomes a 1 in its own column, the second one.',
          },
          {
            kicker: 'Many categories',
            title: 'Thousands of pin codes',
            body: 'One-hot on 20,000 pin codes adds 20,000 columns. Use **frequency encoding**, how often each value appears, or **target encoding**, the average label for each value. Group very rare values into "Other" first.',
            visual: {
              type: 'code',
              code: HIGH_CARD_CODE,
              output: '[[3.0, 0.67], [3.0, 0.67], [2.0, 1.0], [1.0, 0.0], [3.0, 0.67], [2.0, 1.0]]',
            },
            note: 'Target encoding uses the label, so compute it on training folds only. Otherwise it leaks the answer.',
            narration:
              'Six orders from three pin codes, and whether each customer bought. Frequency encoding replaces each pin code with its count: 560001 appears three times. Target encoding replaces it with the share who bought: two of three for 560001, all for 110001, none for 400001. One number per row instead of thousands of columns.',
          },
          {
            kicker: 'Try it',
            title: 'Label codes on cities',
            try: {
              type: 'choice',
              prompt:
                'A linear model gets city as Chennai 0, Delhi 1, Mumbai 2. What can go wrong?',
              options: [
                {
                  text: 'It treats the cities as ordered, as if Mumbai were twice Delhi',
                  correct: true,
                  feedback:
                    'Right. The weight multiplies the code, so the model assumes an order and spacing that do not exist. Use one-hot.',
                },
                {
                  text: 'Nothing: codes are just names',
                  correct: false,
                  feedback:
                    'To a linear model, 2 is twice 1. The codes become a false measurement.',
                },
                {
                  text: 'The model cannot train on integers',
                  correct: false,
                  feedback: 'It trains fine. The problem is the false order the integers imply.',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'One-hot a payment column',
            try: {
              type: 'code',
              prompt:
                'One-hot encode the payment column with `pd.get_dummies`, then print its column names as a list.',
              starter:
                'import pandas as pd\n\npay = pd.Series(["UPI", "card", "UPI", "cash"])\n# one-hot encode pay, then print the columns',
              expected: "['UPI', 'card', 'cash']",
              hint: 'Store `pd.get_dummies(pay)` in a variable, then print `list(its_name.columns)`.',
              packages: ['pandas'],
            },
          },
        ],
      },
    },
    {
      key: 'slides.scaling',
      kind: 'SLIDES',
      title: 'Feature scaling',
      depthRank: 1,
      conceptKeys: [SCALE],
      body: {
        slides: [
          {
            kicker: 'Why scale',
            title: 'Big numbers win distances',
            body: 'KNN predicts from the nearest rows; K-means and SVM also use distances. If income runs in tens of thousands and age in tens, income decides almost everything. **Scaling** puts features on a similar range, so each one gets a fair say.',
          },
          {
            kicker: 'Two scalers',
            title: 'Min-max and standardisation',
            body: '**Min-max scaling** maps a feature to 0 to 1: (x − min) ÷ (max − min). **Standardisation** subtracts the mean and divides by the standard deviation, so the feature has mean 0 and standard deviation 1.',
            visual: {
              type: 'code',
              code: SCALE_CODE,
              output: '[0.0, 0.11, 0.5, 1.0]\n[-1.03, -0.74, 0.25, 1.53]',
            },
            note: 'Min-max suits bounded values like pixels. Standardisation is the usual default for linear models, SVM and PCA.',
            narration:
              'Four ages: 22, 26, 40 and 58. Min max scaling subtracts the smallest, 22, and divides by the range, 36. So 22 becomes 0, 58 becomes 1, and 40 lands at 0.5. Standardisation subtracts the mean, 36.5, and divides by the standard deviation, about 14.1. Now the ages sit around 0, from minus 1.03 to 1.53.',
          },
          {
            kicker: 'With outliers',
            title: 'One outlier squeezes min-max',
            visual: {
              type: 'code',
              code: ROBUST_CODE,
              output: '[0.0, 0.01, 0.01, 0.02, 1.0]\n[-0.83, -0.5, 0.0, 0.5, 60.83]',
            },
            note: 'A robust scaler uses the median and the IQR, so the normal values keep their spread. scikit-learn calls it RobustScaler.',
            narration:
              'Five incomes in thousands, and one of them is 400. Min max scaling squeezes the four normal incomes between 0 and 0.02, so they look almost identical. The robust version subtracts the median and divides by the IQR instead. The normal incomes now spread from minus 0.83 to 0.5, and only the outlier sits far away.',
          },
          {
            kicker: 'Which models',
            title: 'Who needs scaling',
            visual: {
              type: 'compare',
              left: {
                title: 'Scale for these',
                items: [
                  'KNN, K-means, SVM: they use distances',
                  'Linear and logistic models with L1 or L2',
                  'Neural networks and PCA',
                ],
              },
              right: {
                title: 'Not needed',
                items: [
                  'Decision trees and random forests',
                  'Gradient boosting like XGBoost',
                  'They split one feature at a time',
                ],
              },
              better: 'none',
            },
            note: 'Gradient descent also converges faster on scaled features, because the loss surface is less stretched.',
          },
          {
            kicker: 'Fit once',
            title: 'Learn the scale from training data',
            body: 'The min, max, mean and standard deviation are learned values, like a model’s weights. Learn them on the training rows, then reuse them for validation, test and every new prediction.',
          },
          {
            kicker: 'Try it',
            title: 'Scaling for a random forest',
            try: {
              type: 'choice',
              prompt:
                'You switch from logistic regression to a random forest. Do you still need to scale?',
              options: [
                {
                  text: 'No: each split compares one feature with a threshold',
                  correct: true,
                  feedback:
                    'Right. Scaling a feature moves its thresholds but not the order of the rows, so the trees are the same.',
                },
                {
                  text: 'Yes: every model needs scaled features',
                  correct: false,
                  feedback:
                    'Tree models only ask "is this feature above a threshold?", so scale does not matter.',
                },
                {
                  text: 'Yes, but only min-max scaling',
                  correct: false,
                  feedback:
                    'No scaler changes a tree, because none of them change the order of the values.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.scaling',
      kind: 'WIDGET',
      title: 'Explore scaling with KNN',
      depthRank: 1,
      conceptKeys: [SCALE],
      body: {
        widget: 'scaling-explorer',
        prompt:
          'A k-nearest-neighbours model predicts whether a new customer takes a premium plan, from age and monthly income. Change the scaling and move the new customer.',
        params: {
          xLabel: 'Age',
          yLabel: 'Monthly income (₹)',
          classes: ['No plan', 'Took the plan'],
          points: [
            { x: 23, y: 38000, cls: 1 },
            { x: 25, y: 45000, cls: 1 },
            { x: 27, y: 61000, cls: 1 },
            { x: 29, y: 58000, cls: 1 },
            { x: 24, y: 66000, cls: 1 },
            { x: 31, y: 72000, cls: 1 },
            { x: 22, y: 30000, cls: 0 },
            { x: 35, y: 95000, cls: 1 },
            { x: 41, y: 88000, cls: 0 },
            { x: 48, y: 51000, cls: 0 },
            { x: 52, y: 53500, cls: 0 },
            { x: 55, y: 50500, cls: 0 },
            { x: 58, y: 47000, cls: 0 },
            { x: 45, y: 64000, cls: 0 },
          ],
          queryX: { label: 'New customer’s age', min: 20, max: 60, step: 1, default: 26 },
          queryY: {
            label: 'New customer’s income (₹)',
            min: 25000,
            max: 100000,
            step: 1000,
            default: 52000,
          },
          k: { options: [1, 3, 5], default: 3 },
          scalers: ['none', 'minmax', 'standard'],
          defaultScaler: 'none',
          tasks: [
            'With No scaling, look at the three nearest customers. How old are they, next to the new customer’s 26?',
            'Switch to Min-max, then Standardise. Which customers are nearest now, and does the prediction change?',
            'Back on No scaling, drag the age from 26 to 60. Does the prediction ever change?',
            'On Standardise with k = 3, drag the age up from 26. At what age does the prediction flip to No plan?',
          ],
        },
      },
    },
    {
      key: 'slides.leakage',
      kind: 'SLIDES',
      title: 'Data leakage in preprocessing',
      depthRank: 1,
      conceptKeys: [LEAK],
      body: {
        slides: [
          {
            kicker: 'The story',
            title: 'A score too good to trust',
            body: 'A loan-default model catches 98% of defaulters with few false alarms. Its top feature is collection calls, which start only after a customer misses payments. The model reads the answer. That is **data leakage**: training uses information that will not exist when you predict.',
          },
          {
            kicker: 'Two kinds',
            title: 'Target leakage and test leakage',
            visual: {
              type: 'compare',
              left: {
                title: 'Target leakage',
                items: [
                  'A feature recorded after the outcome',
                  'Collection calls, a cancellation date',
                  'Fix: drop it; check each feature’s timestamp',
                ],
              },
              right: {
                title: 'Train–test leakage',
                items: [
                  'Test rows shape training',
                  'Scaling or filling before the split',
                  'Fix: split first, fit on training rows',
                ],
              },
              better: 'none',
            },
          },
          {
            kicker: 'In numbers',
            title: 'One test row moves the mean',
            visual: { type: 'code', code: LEAK_CODE, output: '30.4 23.0' },
            note: 'A scaler fitted on all rows learns a mean of 30.4, which already knows about the test row. The honest training mean is 23.',
            narration:
              'Four training values and one test value, 60. If we compute the mean on all five rows, we get 30.4. From the training rows alone it is 23. A scaler fitted on all rows has already seen the test row, so the test score is no longer a fair check.',
          },
          {
            kicker: 'The fix',
            title: 'Split first, then fit',
            body: 'Split the data first. Fit scalers, encoders and fill values on the training rows, then transform the validation and test rows with them.',
            animation: { name: 'fit-on-train', caption: 'Real use: every preprocessing step' },
          },
          {
            kicker: 'In code',
            title: 'A pipeline keeps folds clean',
            visual: { type: 'code', code: PIPE_CODE, output: '0.981' },
            note: 'A pipeline refits the scaler inside every cross-validation fold, on that fold’s training rows only. Fit it once more on all training rows to serve predictions.',
            narration:
              'We chain a standard scaler and a logistic regression into one pipeline. cross val score splits the data into five folds. For each fold, the pipeline fits the scaler on the training part only, then the model, then scores the held out part. The mean accuracy is 0.981, and no fold ever saw its own test rows.',
          },
          {
            kicker: 'Mixed columns',
            title: 'One pipeline for every column',
            visual: { type: 'code', code: COLUMNS_CODE, output: '[[0.0, 0.0, 1.18]] [1]' },
            note: 'Encoder and scaler are fitted on the training rows only. Chennai was never seen, so its city columns are both 0.',
            narration:
              'Real tables mix text and numbers. The column transformer sends city to a one hot encoder and income to a standard scaler. A logistic regression comes last, and the labels say who took the plan. Fit runs every step on the training rows only. A new customer from Chennai, a city it never saw, gets zeros for city. The income of 90,000 becomes 1.18, using the training mean and standard deviation. The model predicts 1, so this customer is likely to take the plan.',
          },
          {
            kicker: 'Checklist',
            title: 'Common leaks to rule out',
            visual: {
              type: 'checklist',
              items: [
                { text: 'Features recorded after the outcome', ok: false },
                {
                  text: 'Scaling, filling, encoding or feature selection before the split',
                  ok: false,
                },
                { text: 'Oversampling before the split, so copies land in test', ok: false },
                { text: 'Target encoding computed on all rows', ok: false },
                { text: 'Split first, then fit everything on training rows', ok: true },
                { text: 'For time data, train on the past and test on later data', ok: true },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Recall that is too good',
            try: {
              type: 'choice',
              prompt:
                'You oversample the rare fraud class by copying rows, then split into train and test. Test recall jumps to 99%. Why?',
              options: [
                {
                  text: 'Copies of the same fraud rows landed in both train and test',
                  correct: true,
                  feedback:
                    'Right. The model recognises rows it trained on. Split first, then oversample the training set only.',
                },
                {
                  text: 'Oversampling always improves recall honestly',
                  correct: false,
                  feedback:
                    'It can help, but only when the test set stays untouched and copy-free.',
                },
                {
                  text: 'The model is underfitting',
                  correct: false,
                  feedback: 'An underfit model would score low, not suspiciously high.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.features',
      kind: 'SLIDES',
      title: 'Feature engineering and selection',
      depthRank: 1,
      conceptKeys: [FEAT],
      body: {
        slides: [
          {
            kicker: 'Create',
            title: 'Features the model can use',
            body: '**Feature engineering** means creating inputs that make the pattern easier to learn. A date becomes a weekday. Amount and item count become price per item. Orders become total spent in the last 30 days. Never let a feature contain the answer.',
            visual: {
              type: 'code',
              code: FE_CODE,
              output: "[['Saturday', 150.0], ['Monday', 120.0]]",
            },
            narration:
              'Two orders with a date, an amount and an item count. The date column gives us the day of the week, which a model can use for weekend patterns. Dividing amount by items gives the price per item, 150 and 120 rupees. Neither number was in the raw data, but both carry meaning.',
          },
          {
            kicker: 'Select',
            title: 'Remove what does not help',
            body: 'First drop IDs, leaky features and columns that never change. Then compare each feature with the target, and drop one of two features that say the same thing.',
            visual: {
              type: 'code',
              code: SELECT_CODE,
              output:
                "{'area': 122000.0, 'age': 24.3, 'tiles': 0.0, 'price': 320.8}\n{'area': 0.98, 'age': -0.25, 'price': 1.0}",
            },
            narration:
              'Five houses. The tiles column has a variance of 0: it never changes, so it cannot help, and we drop it. Then we check how each remaining feature moves with price. Area has a correlation of 0.98, a strong signal. The building’s age has minus 0.25, a weak one. Correlation only sees straight-line patterns, so treat it as a first filter.',
          },
          {
            kicker: 'Three families',
            title: 'Filter, wrapper, embedded',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'filter',
                  label: 'Filter',
                  sub: 'Score each feature alone: variance, correlation',
                },
                { icon: 'repeat', label: 'Wrapper', sub: 'Try subsets with a model, like RFE' },
                {
                  icon: 'layers',
                  label: 'Embedded',
                  sub: 'The model picks: L1 zeros, tree importance',
                },
              ],
            },
            note: 'Select on training rows only, like any fitted step. Then confirm with cross-validation that removing a feature does not hurt the score.',
          },
          {
            kicker: 'Try it',
            title: 'Two ways to say area',
            try: {
              type: 'choice',
              prompt:
                'Your model has area in square feet and area in square metres. What should you do?',
              options: [
                {
                  text: 'Drop one: they carry exactly the same information',
                  correct: true,
                  feedback:
                    'Right. One is the other times a constant, so the second adds nothing and can make linear weights unstable.',
                },
                {
                  text: 'Keep both, since more features always help',
                  correct: false,
                  feedback: 'Duplicate information adds cost and can confuse linear models.',
                },
                {
                  text: 'Multiply them into one feature',
                  correct: false,
                  feedback: 'That creates area squared, a different feature, not a fix.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.scale-train',
      kind: 'PLAYGROUND',
      title: 'Standardise with training statistics',
      depthRank: 1,
      conceptKeys: [SCALE, LEAK],
      body: {
        language: 'python',
        instructions:
          'Standardise age and income without leakage. Compute the mean and standard deviation of each column from `train` only. Then scale both `train` and `test` with those numbers, and print them.',
        starterCode: SCALE_START,
        hints: [
          '`train.mean(axis=0)` gives one mean per column, and `train.std(axis=0)` one standard deviation per column.',
          'Then `test_s = (test - mean) / std`. Never compute `mean` from `test`.',
        ],
        solution: SCALE_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '[38.75, 59500.0]',
            label: 'The means come from the four training rows',
          },
          {
            type: 'stdout_contains',
            value: '[[-0.92, -0.32]]',
            label: 'The test customer is scaled with the training numbers',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Preprocessing check',
      depthRank: 1,
      conceptKeys: [ENC, SCALE, LEAK],
      body: {
        items: [
          {
            key: 'ordinal',
            type: 'mcq',
            prompt: 'Which column suits ordinal (label) encoding?',
            options: [
              { id: 'a', text: 'Education: school, graduate, postgraduate' },
              { id: 'b', text: 'City: Pune, Delhi, Chennai' },
              { id: 'c', text: 'Payment method: UPI, card, cash' },
              { id: 'd', text: 'Product colour' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Education levels have a real order. Cities, payment methods and colours do not, so one-hot is the safe choice.',
          },
          {
            key: 'dummies',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import pandas as pd\n\ns = pd.Series(["red", "blue", "red"])\nprint(pd.get_dummies(s, dtype=int).values.tolist())',
            options: [
              { id: 'a', text: '[[0, 1], [1, 0], [0, 1]]' },
              { id: 'b', text: '[[1, 0], [0, 1], [1, 0]]' },
              { id: 'c', text: '[[1], [0], [1]]' },
              { id: 'd', text: '[[0, 1, 0], [1, 0, 0], [0, 1, 0]]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The columns are sorted: blue, then red. So "red" is [0, 1] and "blue" is [1, 0].',
          },
          {
            key: 'trees',
            type: 'mcq',
            prompt: 'Which model does not need feature scaling?',
            options: [
              { id: 'a', text: 'Random forest' },
              { id: 'b', text: 'KNN' },
              { id: 'c', text: 'SVM' },
              { id: 'd', text: 'K-means' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A random forest splits one feature at a time on a threshold, so scale does not matter. The others use distances.',
          },
          {
            key: 'minmax',
            type: 'mcq',
            prompt: 'Min-max scale [10, 20, 30, 50]. What does 30 become?',
            options: [
              { id: 'a', text: '0.5' },
              { id: 'b', text: '0.6' },
              { id: 'c', text: '0.75' },
              { id: 'd', text: '30' },
            ],
            answer: { correct: ['a'] },
            explanation: '(30 − 10) ÷ (50 − 10) = 20 ÷ 40 = 0.5.',
          },
          {
            key: 'target-leak',
            type: 'mcq',
            prompt:
              'A loan-default model uses "number of collection calls". The calls start after a customer misses payments. What is the problem?',
            options: [
              { id: 'a', text: 'Target leakage: the feature is only known after the outcome' },
              { id: 'b', text: 'The feature needs scaling' },
              { id: 'c', text: 'The feature needs one-hot encoding' },
              { id: 'd', text: 'Nothing; it is a strong feature' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'At prediction time, before any missed payment, the calls do not exist yet. Drop the feature.',
          },
          {
            key: 'scale-order',
            type: 'mcq',
            prompt:
              'A notebook runs `X_s = scaler.fit_transform(X)`, then `train_test_split(X_s, y)`. What is wrong?',
            options: [
              {
                id: 'a',
                text: 'The scaler learned from the test rows, so the test score is too optimistic',
              },
              { id: 'b', text: 'The scaler must be fitted after the model' },
              { id: 'c', text: 'Nothing: scaling all rows together is more accurate' },
              { id: 'd', text: 'train_test_split cannot take scaled data' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The mean and standard deviation already include the test rows. Split first, then fit the scaler on `X_train` and transform both sets.',
          },
        ],
      },
    },
    {
      key: 'interview.preprocessing',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Preprocessing answer structure',
      depthRank: 1,
      conceptKeys: [ENC, SCALE, LEAK, FEAT],
      body: {
        question: '"Walk me through your preprocessing pipeline."',
        totalMinutes: 2,
        steps: [
          {
            title: 'Split',
            detail:
              'Remove duplicate rows, then split into train, validation and test before any fitting.',
          },
          {
            title: 'Missing values',
            detail: 'Say how you filled gaps, with values learned from the training rows.',
          },
          {
            title: 'Encode',
            detail:
              'Name the encoding per column and why, for example one-hot for city and ordinal for education.',
          },
          {
            title: 'Scale',
            detail: 'Say which scaler and why, or why you skipped it for a tree model.',
          },
          {
            title: 'Pipeline',
            detail: 'Mention that it all ran inside a pipeline, so cross-validation never leaked.',
          },
          {
            title: 'Features',
            detail: 'End with the features you added or removed, and the effect on the score.',
          },
        ],
        followUps: [
          'Why not label-encode a city column?',
          'Which models need scaling, and which do not?',
          'What is data leakage? Give an example.',
          'How do you encode a column with thousands of categories?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [ENC, SCALE, LEAK, FEAT],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'One-hot vs label encoding',
            front:
              'What is the difference between one-hot and label encoding, and when do you use each?',
            back: 'Label encoding gives each category a number. Set the order yourself for ordered categories like sizes; tree models also cope with plain codes. One-hot gives each category its own 0/1 column, so no false order appears. Use one-hot for unordered categories like city with linear models, KNN or neural networks.',
          },
          {
            title: 'Many categories',
            front: 'A column has 20,000 product IDs. How do you encode it?',
            back: 'One-hot would add 20,000 sparse columns. Group rare IDs into "Other", or use frequency encoding, the count of each ID. Target encoding, the average label per ID, is powerful but must be computed on training folds to avoid leakage. In deep learning, learn an embedding.',
          },
          {
            title: 'Unseen categories',
            front: 'In production, a city appears that the model never saw. What happens?',
            back: 'A plain encoder fails or makes a column the model does not know. Fit the encoder on training data with `handle_unknown="ignore"`, so an unseen city becomes all zeros. Also log unseen values: many new ones mean the data has drifted and the model may need retraining.',
          },
          {
            title: 'Why scale',
            front: 'Why and when do you scale features?',
            back: 'Distance-based models like KNN, K-means and SVM let the feature with the largest range dominate, so income would drown out age. Gradient descent also converges faster on a shared scale. Scale for those models, regularised linear models and neural networks. Tree models do not need it.',
          },
          {
            title: 'Normalisation vs standardisation',
            front: 'What is the difference between normalisation and standardisation?',
            back: 'Min-max normalisation maps each feature to 0 to 1 using the min and max, so one outlier squeezes the rest. It suits bounded values like pixels. Standardisation subtracts the mean and divides by the standard deviation, giving mean 0 and standard deviation 1. It is the usual default. With strong outliers, use a robust scaler: median and IQR.',
          },
          {
            title: 'A leaky feature',
            front:
              'You predict subscription cancellations and get 99% accuracy. One feature is date_of_cancellation. What is wrong?',
            back: 'That is data leakage: the date only exists after a customer cancels, so the model reads the answer. Drop it and any other feature recorded after the outcome. Retrain and expect a lower but honest score. Check each feature’s timestamp against the moment you predict.',
          },
          {
            title: 'Scaling before the split',
            front: 'Why must you fit the scaler after the train-test split, not before?',
            back: 'Fitting on all rows lets the test rows shape the mean and standard deviation, so test information leaks into training. Scores then look better than they will in production. Split first, fit the scaler on the training rows, and transform both. A pipeline does this in every fold.',
          },
          {
            title: 'Choosing features',
            front: 'How do you decide which features to keep and which to remove?',
            back: 'First drop IDs, leaky features and columns that never change. Check how each feature relates to the target, and drop one of two features that say the same thing. Use L1 regularisation or tree importances, and confirm with cross-validation that a removal does not hurt the score.',
          },
          {
            title: 'Feature engineering',
            front: 'What is feature engineering? Give an example.',
            back: 'It is creating new inputs that make the pattern easier to learn. From an order date, take the weekday or the month. From order amount and item count, compute price per item. From a customer’s orders, total the spend over the last 30 days. Never let a feature contain the answer you predict. Good features often beat a fancier model.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Encoding and scaling: key takeaways',
      depthRank: 1,
      conceptKeys: [ENC, SCALE, LEAK, FEAT],
      body: {
        takeaways: [
          'One-hot for unordered categories; ordinal codes only when the order is real. Trees cope with plain codes.',
          'Many categories: group rare ones, then use frequency or target encoding, computed on training folds.',
          'Scale for distance-based models, regularised linear models and neural networks, not for trees.',
          'Min-max maps to 0 to 1; standardisation gives mean 0 and standard deviation 1; use a robust scaler for outliers.',
          'Leakage makes scores lie: drop features from after the outcome, and fit every step on training rows only.',
          'Engineer features from domain sense, drop useless or duplicate ones, and confirm with cross-validation.',
        ],
        remember: [
          'Cities: one-hot, not 0, 1, 2',
          'Split first, then fit',
          'Trees do not need scaling',
        ],
      },
    },
  ],
};
