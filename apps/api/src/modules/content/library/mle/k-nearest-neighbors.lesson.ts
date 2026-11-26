/**
 * Classical ML → K-Nearest Neighbors (KNN). The first unit in the V1 pattern: one algorithm, taught
 * in depth beside a live picture whose every number can be checked by hand.
 *
 * Evidence (Hiring Intelligence, ML/AI families, Jan–Oct 2026; internal only, never quoted to
 * students): explain KNN in detail (idea, how neighbours are picked, the role of K, how predictions
 * are made), its use cases, why it is non-parametric, KNN vs K-Means, KNN vs SVM, KNN for missing
 * values, and "why KNN and not Random Forest in your project". One bar for every package, so every
 * section is depth 1. Lab numbers follow scikit-learn 1.9 (checked on millions of predictions; the only differences are
 * exact distance ties at the K-th neighbour, which the lab flags, as scikit-learn's pick there
 * depends on row order); the
 * scikit-learn code outputs were run on 1.9.1, the NumPy ones on NumPy 2.5 and 2.4.
 */
import type { LessonDocumentInput } from '@app/content';

const DV = 'knn.distance-vote';
const CK = 'knn.choosing-k';
const WP = 'knn.weighted-probabilistic';
const PL = 'knn.practical-limits';

/** Films one user rated: action score, comedy score, and class 0 = liked, 1 = skipped. */
const FILMS = [
  { x: 7, y: 3, cls: 0 },
  { x: 8, y: 5, cls: 0 },
  { x: 6, y: 4, cls: 0 },
  { x: 9, y: 2, cls: 0 },
  { x: 7, y: 6, cls: 0 },
  { x: 5, y: 2, cls: 0 },
  { x: 4, y: 6, cls: 0 },
  { x: 2, y: 7, cls: 1 },
  { x: 3, y: 5, cls: 1 },
  { x: 1, y: 4, cls: 1 },
  { x: 4, y: 8, cls: 1 },
  { x: 2, y: 2, cls: 1 },
  { x: 5, y: 7, cls: 1 },
];
const FILM_LAB = {
  xLabel: 'Action score',
  yLabel: 'Comedy score',
  classes: ['Liked', 'Skipped'],
  points: FILMS,
};

const REGRESSION = `import numpy as np

area = np.array([900, 1000, 1100, 1500, 2000])
price = np.array([52, 58, 61, 80, 110])   # lakhs
d = np.abs(area - 1050)
nearest = np.argsort(d, kind="stable")[:3]
print(area[nearest], price[nearest].mean())`;

const SCALE = `from sklearn.datasets import load_wine
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.3, random_state=42, stratify=y)
raw = KNeighborsClassifier(n_neighbors=5).fit(X_tr, y_tr)
scaled = make_pipeline(StandardScaler(),
                       KNeighborsClassifier(n_neighbors=5)).fit(X_tr, y_tr)
print(round(raw.score(X_te, y_te), 3), round(scaled.score(X_te, y_te), 3))`;

const SEARCH = `from sklearn.datasets import load_wine
from sklearn.model_selection import GridSearchCV
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

X, y = load_wine(return_X_y=True)
pipe = make_pipeline(StandardScaler(), KNeighborsClassifier())
grid = {"kneighborsclassifier__n_neighbors": [1, 3, 5, 7, 9, 15],
        "kneighborsclassifier__weights": ["uniform", "distance"]}
search = GridSearchCV(pipe, grid, cv=5).fit(X, y)
print(search.best_params_)
print(round(search.best_score_, 3))`;

const CURSE = `import numpy as np

rng = np.random.default_rng(0)
for dim in (2, 10, 100, 1000):
    points = rng.random((1000, dim))
    q = rng.random(dim)
    d = np.sqrt(((points - q) ** 2).sum(axis=1))
    print(dim, round(d.min() / d.max(), 2))`;

const SCRATCH_HEAD = `import numpy as np

# Films this user rated: [action score, comedy score]
X = np.array([[7, 3], [8, 5], [6, 4], [9, 2], [7, 6], [5, 2], [4, 6],
              [2, 7], [3, 5], [1, 4], [4, 8], [2, 2], [5, 7]])
# 0 = liked, 1 = skipped: the same order as the lab
y = np.array([0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1])
`;
const SCRATCH_TAIL = `
print(int(knn_predict(X, y, np.array([6, 6]), 3)),
      int(knn_predict(X, y, np.array([2, 6]), 3)))
q = np.array([4, 6.5])
print([int(knn_predict(X, y, q, k)) for k in (1, 3, 5)])
`;
const SCRATCH_START = `${SCRATCH_HEAD}
def knn_predict(X, y, q, k):
    # 1. Euclidean distance from q to every row of X
    d = ____
    # 2. positions of the k smallest distances
    nearest = ____
    # 3. the labels of those neighbours
    votes = y[nearest]
    # 4. the label with the most votes
    return ____
${SCRATCH_TAIL}`;
const SCRATCH_SOLUTION = `${SCRATCH_HEAD}
def knn_predict(X, y, q, k):
    d = np.sqrt(((X - q) ** 2).sum(axis=1))
    nearest = np.argsort(d)[:k]
    votes = y[nearest]
    return np.bincount(votes).argmax()
${SCRATCH_TAIL}`;

export const K_NEAREST_NEIGHBORS_LESSON: LessonDocumentInput = {
  title: 'K-Nearest Neighbors (KNN)',
  subtitle:
    'Classify a new point by the vote of its K closest examples. Every distance, vote and weight is worked out in front of you, then you run it yourself.',
  objectives: [
    {
      key: 'steps',
      text: 'Explain KNN step by step: distances, the K nearest neighbours and the vote',
      minDepthRank: 1,
    },
    {
      key: 'k',
      text: 'Choose K, and explain overfitting, underfitting and ties',
      minDepthRank: 1,
    },
    {
      key: 'weighted',
      text: 'Compute weighted and probabilistic KNN by hand',
      minDepthRank: 1,
    },
    {
      key: 'limits',
      text: 'Say when KNN fits a problem and when it fails: scale, cost and many dimensions',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Ask the nearest neighbours',
      depthRank: 1,
      conceptKeys: [DV],
      body: {
        scenario:
          'A streaming app wants to know if you will like a new film. It has no rule for your taste. It finds the films most like this one that you already rated, and goes with what you said about them.',
        realWorld: {
          title: 'Where nearest neighbours decide',
          items: [
            { icon: 'film', label: 'Recommendations', sub: 'Films like the ones you liked' },
            { icon: 'search', label: 'Semantic search', sub: 'The vectors nearest to a query' },
            { icon: 'shield', label: 'Fraud checks', sub: 'Is this payment like past frauds' },
            { icon: 'database', label: 'Filling gaps', sub: 'A missing value from similar rows' },
          ],
        },
        provocation: 'How can a model predict with no training step at all?',
        bridge:
          'Interviewers ask you to explain KNN in detail, then push further. How do you choose K? Why scale the features? When does KNN fail? This unit builds each answer from the numbers.',
      },
    },
    {
      key: 'widget.steps',
      kind: 'WIDGET',
      title: 'KNN step by step',
      depthRank: 1,
      conceptKeys: [DV],
      body: {
        widget: 'knn-lab',
        prompt:
          'Each dot is a film this user rated: its action score, its comedy score, and whether they liked it. Follow the steps, then explore.',
        story: [
          {
            kicker: 'Training data',
            title: 'Start with labelled examples',
            body: 'Every dot is one film the user already rated. Its position gives two **features**: the action score and the comedy score. Its colour is the **label**: liked or skipped. KNN’s whole training step is storing these 13 films. It learns no weights and builds no rules. The data is the model.',
            show: 'points',
          },
          {
            kicker: 'The new point',
            title: 'A new film arrives',
            body: 'A new film scores 6 for action and 6 for comedy. Will this user like it? KNN makes one assumption: films with similar scores got similar reactions. So it looks at the films around the new one. Drag the **?** and notice how its surroundings change.',
            show: 'query',
            query: { x: 6, y: 6 },
          },
          {
            kicker: 'Distances',
            title: 'Measure the distance to every film',
            body: 'KNN measures how far the new film is from each stored film. The usual choice is **Euclidean distance**, the straight-line length. For the film at (7, 6) it is √((6 − 7)² + (6 − 6)²) = 1. The table shows the same working for the closest films. All 13 distances are computed for every single prediction.',
            show: 'distances',
            query: { x: 6, y: 6 },
          },
          {
            kicker: 'K nearest',
            title: 'Sort and keep the K closest',
            body: 'Now sort the distances and keep the **K** smallest. With K = 3, the nearest films are 1, 1.41 and 2 away. The dashed edge shows how far the K-th neighbour is. A fourth film is also 2 away, so which one votes depends on the data order. Both were liked, so the vote is unchanged. K is a **hyperparameter**: you choose it, and the model does not learn it.',
            show: 'neighbours',
            k: 3,
            query: { x: 6, y: 6 },
          },
          {
            kicker: 'The vote',
            title: 'Let the neighbours vote',
            body: 'Each of the K neighbours casts one vote for its own label. Two liked films and one skipped film give **Liked**, 2 votes to 1. The vote share doubles as a confidence: 2 / 3 = 66.7%. That is what `predict_proba` returns in scikit-learn.',
            show: 'vote',
            k: 3,
            query: { x: 6, y: 6 },
          },
          {
            kicker: 'Local answers',
            title: 'Move the film, change the answer',
            body: 'The new film now scores 2 for action and 6 for comedy. Its three nearest films are different, and two of them were skipped, so the answer flips to **Skipped**. KNN’s answer depends only on the nearby points. Drag the film around and watch the vote change.',
            show: 'vote',
            k: 3,
            query: { x: 2, y: 6 },
          },
          {
            kicker: 'Decision regions',
            title: 'Run KNN at every spot',
            body: 'Colour each spot by the answer KNN would give there. The edge between the colours is the **decision boundary**. No formula draws it: it bends wherever the data bends. That is why KNN is called **non-parametric**. Look at the liked comedy at (4, 6). With K = 3, its neighbours outvote it.',
            show: 'vote',
            k: 3,
            boundary: true,
            query: { x: 6, y: 6 },
          },
        ],
        params: {
          ...FILM_LAB,
          datasets: ['custom'],
          defaultDataset: 'custom',
          query: { x: 6, y: 6 },
          k: { max: 13, default: 3 },
          metrics: ['euclidean'],
          defaultMetric: 'euclidean',
          panels: ['calculation'],
          controls: ['k', 'boundary'],
          tasks: [
            'Put the new film at action 9, comedy 1. How far is its nearest film, and what is predicted?',
            'Set K to 1 and move the film onto (4, 6). What does a single neighbour decide?',
            'Raise K to 13, so every film votes. Why is the answer the same everywhere?',
          ],
        },
      },
    },
    {
      key: 'slides.describe',
      kind: 'SLIDES',
      title: 'How to describe KNN',
      depthRank: 1,
      conceptKeys: [DV, PL],
      body: {
        slides: [
          {
            kicker: 'Three labels',
            title: 'Supervised, lazy and non-parametric',
            visual: {
              type: 'icons',
              items: [
                { icon: 'tag', label: 'Supervised', sub: 'It needs labelled examples to vote' },
                {
                  icon: 'clock',
                  label: 'Lazy, or instance-based',
                  sub: 'No training step; the work happens at prediction',
                },
                {
                  icon: 'layers',
                  label: 'Non-parametric',
                  sub: 'No fixed set of weights; the stored data is the model',
                },
              ],
            },
            note: 'A linear model keeps a few weights and throws the data away. KNN keeps every example, so the model grows with the data.',
          },
          {
            kicker: 'Cost',
            title: 'Cheap to train, costly to predict',
            visual: {
              type: 'compare',
              left: {
                title: 'Training',
                items: [
                  'Store the data, or index it in a tree',
                  'Nothing to optimise',
                  'Instant, even on big data',
                ],
              },
              right: {
                title: 'Prediction',
                items: [
                  'One distance per stored example',
                  'Time per query: O(N × d), for d features',
                  'Memory: O(N × d), every example is kept',
                ],
              },
              better: 'none',
            },
            note: 'A KD-tree or ball tree splits the space so a query skips far regions: about log N checks with few features. With many, use an approximate index, as vector databases do.',
          },
          {
            kicker: 'Regression',
            title: 'KNN can predict numbers',
            body: 'To predict a number, replace the vote with an **average**. To price a 1,050 sq ft flat, take the 3 flats closest in area and average their prices.',
            visual: { type: 'code', code: REGRESSION, output: '[1000 1100  900] 57.0' },
            note: 'In scikit-learn this is `KNeighborsRegressor`. It cannot predict beyond its data: a 5,000 sq ft flat gets 83.7 lakhs, the mean of the three largest.',
            narration:
              'Five flats, each with an area and a price in lakhs. For a flat of 1,050 square feet, the distance is just the difference in area. The three closest flats are 1,000, 1,100 and 900 square feet. Their prices are 58, 61 and 52, and the average, 57 lakhs, is the prediction.',
          },
          {
            kicker: 'Try it',
            title: 'One distance by hand',
            try: {
              type: 'code',
              prompt:
                'Compute the Euclidean distance between the new film (6, 6) and the film at (5, 7). Print it rounded to 2 decimals.',
              starter:
                'import numpy as np\n\nnew = np.array([6, 6])\nfilm = np.array([5, 7])\n# distance = root of the summed squared differences',
              expected: '1.41',
              hint: 'Use `np.sqrt(((new - film) ** 2).sum())`, then `print(round(float(d), 2))`.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'What non-parametric means',
            try: {
              type: 'choice',
              prompt: 'Why is KNN called non-parametric?',
              options: [
                {
                  text: 'It learns no fixed set of parameters; it keeps the training data itself',
                  correct: true,
                  feedback: 'Right. The model is the stored data, so it grows as the data grows.',
                },
                {
                  text: 'It has no settings to choose',
                  correct: false,
                  feedback: 'K and the distance metric are settings you must choose.',
                },
                {
                  text: 'It works without any data',
                  correct: false,
                  feedback: 'It depends on the data more than most models: it stores all of it.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.choosing-k',
      kind: 'WIDGET',
      title: 'Choosing K',
      depthRank: 1,
      conceptKeys: [CK],
      body: {
        widget: 'knn-lab',
        prompt:
          'Each pattern has held-out points the model never sees. Watch both accuracies as K changes.',
        story: [
          {
            kicker: 'Small K',
            title: 'K = 1 memorises the data',
            body: 'With K = 1, every training point rules its own patch, so the regions are jagged. Training accuracy is 100%, because each point is its own nearest neighbour. On the 45 unseen points it drops to 84.4%. That gap is **overfitting** (high variance): the model has memorised noise. Here, one stray neighbour decides the new point.',
            show: 'vote',
            k: 1,
            boundary: true,
            dataset: 'blobs',
            query: { x: 5, y: 4 },
          },
          {
            kicker: 'A better K',
            title: 'A few more neighbours smooth it',
            body: 'At K = 5 the islands are gone, and four of the new point’s five neighbours agree. Training accuracy falls to 93.3%, yet accuracy on unseen points rises to 93.3%. A slightly worse fit to the training data gave a better model. Averaging over several neighbours cancels the noise of single points.',
            show: 'vote',
            k: 5,
            boundary: true,
            dataset: 'blobs',
            query: { x: 5, y: 4 },
          },
          {
            kicker: 'Large K',
            title: 'Too many neighbours blur everything',
            body: 'This dataset is a small ring inside a large one, and the new point sits on the large ring. With K = 15 its neighbourhood reaches across to the small ring, which wins the vote 8 to 7. Accuracy on unseen points is 52.3%, close to a coin flip. That is **underfitting** (high bias). Lower K to 7 and it returns to 100%.',
            show: 'vote',
            k: 15,
            boundary: true,
            dataset: 'circles',
            query: { x: 8.7, y: 5 },
          },
          {
            kicker: 'In practice',
            title: 'Pick K with held-out data',
            body: 'Never choose K by training accuracy: K = 1 always wins. Use **cross-validation**: test each K on held-out data over several splits, then keep the best. Start near √N for N examples. If two values of K score the same, prefer the larger: its boundary is smoother.',
            show: 'vote',
            k: 7,
            boundary: true,
            dataset: 'blobs',
            query: { x: 5, y: 4 },
          },
          {
            kicker: 'Ties',
            title: 'An even K can tie',
            body: 'The films again, with K = 2. One neighbour was liked and one was skipped, each 1 away: a **tie**. scikit-learn then returns the class that comes first in label order. With two classes, an odd K makes ties impossible. With three or more classes, ties can still happen.',
            show: 'vote',
            k: 2,
            boundary: false,
            dataset: 'custom',
            query: { x: 5, y: 6 },
          },
        ],
        params: {
          ...FILM_LAB,
          datasets: ['blobs', 'circles', 'custom'],
          defaultDataset: 'blobs',
          query: { x: 5, y: 4 },
          k: { max: 15, default: 1 },
          metrics: ['euclidean'],
          defaultMetric: 'euclidean',
          boundary: true,
          panels: ['calculation', 'accuracy'],
          controls: ['k', 'boundary', 'dataset'],
          tasks: [
            'On Three groups, what is the smallest K at which accuracy on unseen points reaches 93.3%?',
            'On Circles, find the first K where accuracy on unseen points falls below 60%. Why does it fall?',
            'On the Small example with K = 2, drag the film to another spot where the vote ties.',
          ],
        },
      },
    },
    {
      key: 'widget.weighted',
      kind: 'WIDGET',
      title: 'Weighted votes and probabilities',
      depthRank: 1,
      conceptKeys: [WP],
      body: {
        widget: 'knn-lab',
        prompt:
          'The films again. This time, look at how far each neighbour is, not only how many there are.',
        story: [
          {
            kicker: 'The problem',
            title: 'The closest neighbour can lose',
            body: 'The new film is 0.5 away from a film the user liked. The next two neighbours, 1.12 and 1.5 away, were skipped. Plain voting counts every neighbour the same, so the film is predicted **Skipped**, 2 votes to 1. The much closer neighbour is simply outvoted.',
            metric: 'euclidean',
            show: 'vote',
            k: 3,
            weighted: false,
            query: { x: 4, y: 6.5 },
          },
          {
            kicker: 'The fix',
            title: 'Weight each vote by closeness',
            body: 'Give each neighbour a weight of **1 / distance**, so a closer neighbour counts for more. The liked film gets 1 / 0.5 = 2. The skipped films get 0.89 and 0.67, which add up to 1.56. Liked now wins with 2 / 3.56 = 56.2% of the weight. In scikit-learn this is `weights="distance"`.',
            metric: 'euclidean',
            show: 'vote',
            k: 3,
            weighted: true,
            query: { x: 4, y: 6.5 },
          },
          {
            kicker: 'Probabilities',
            title: 'Votes are probabilities',
            body: 'A plain vote gives P(class) = votes / K. With K = 3 the only possible values are 0%, 33.3%, 66.7% and 100%, which is coarse. Weighted votes use weight shares instead, which gives finer values such as 56.2%. Use these probabilities to act only when the model is confident, or to rank predictions.',
            metric: 'euclidean',
            show: 'vote',
            k: 3,
            weighted: false,
            query: { x: 4, y: 6.5 },
          },
          {
            kicker: 'Edge case',
            title: 'An exact match takes it all',
            body: 'Now the new film has the same scores as a stored film, so the distance is 0, and 1 / 0 is undefined. scikit-learn handles this by giving the exact match the whole vote. Some hand-written versions add a tiny number to every distance instead.',
            metric: 'euclidean',
            show: 'vote',
            k: 3,
            weighted: true,
            query: { x: 4, y: 6 },
          },
          {
            kicker: 'Distance metrics',
            title: 'Another way to measure distance',
            body: '**Manhattan distance** adds the differences along each axis, like city blocks. Here K = 1. By Euclidean, the film at (5, 7) is √(4 + 4) = 2.83 away, closer than (7, 6) at 3. By Manhattan it is 2 + 2 = 4 away, so (7, 6) is nearest and the answer flips to **Liked**. Switch the distance to compare. **Minkowski** distance has a power p: p = 1 is Manhattan, p = 2 is Euclidean.',
            show: 'vote',
            k: 1,
            weighted: false,
            metric: 'manhattan',
            query: { x: 7, y: 9 },
          },
        ],
        params: {
          ...FILM_LAB,
          datasets: ['custom'],
          defaultDataset: 'custom',
          query: { x: 4, y: 6.5 },
          k: { max: 13, default: 3 },
          metrics: ['euclidean', 'manhattan', 'minkowski3'],
          defaultMetric: 'euclidean',
          panels: ['calculation'],
          controls: ['k', 'weighted', 'metric'],
          tasks: [
            'Set Euclidean, weighted votes and K = 5 at (4, 6.5). Which class wins now, and why?',
            'At (3.5, 0) with K = 3, switch the distance to Manhattan. Which neighbour changes, and what happens to the prediction?',
            'Find another spot where plain voting and weighted voting disagree.',
          ],
        },
      },
    },
    {
      key: 'slides.limits',
      kind: 'SLIDES',
      title: 'Where KNN breaks',
      depthRank: 1,
      conceptKeys: [PL, CK],
      body: {
        slides: [
          {
            kicker: 'Scale',
            title: 'Scale the features first',
            body: 'A distance adds up the differences in every feature. Two people differ by 20 years and ₹2,000 of income: √(20² + 2,000²) = 2,000.1. Age adds only 0.1. Standardise or min-max scale first, and fit the scaler on the training data only.',
            narration:
              'A distance adds up the differences in every feature, so a feature with big numbers drowns out one with small numbers. Take two people who differ by 20 years in age and 2,000 rupees in income. The distance comes to 2,000.1, so the 20 year gap adds only 0.1. Standardise or min-max scale the features first, and fit the scaler on the training data only.',
            animation: {
              name: 'scaling-squash',
              caption: 'Real use: age and income on one scale before any distance',
            },
          },
          {
            kicker: 'In code',
            title: 'The same model, scaled',
            visual: { type: 'code', code: SCALE, output: '0.722 0.944' },
            note: 'Wine has 13 features. One of them, proline, runs from 278 to 1,680, so unscaled it decides nearly every distance.',
            narration:
              'The Wine dataset has 178 wines and 13 measured features. We hold out 30 percent for testing. The first model uses the raw features and scores 72 percent. The second puts a standard scaler in front of the same KNN, inside a pipeline, and scores 94 percent. Nothing else changed.',
          },
          {
            kicker: 'In code',
            title: 'Choose K with cross-validation',
            visual: {
              type: 'code',
              code: SEARCH,
              output:
                "{'kneighborsclassifier__n_neighbors': 7, 'kneighborsclassifier__weights': 'uniform'}\n0.967",
            },
            note: 'The scaler sits inside the pipeline, so each split scales with its own training part. Test data never leaks in.',
            narration:
              'Grid search tries six values of K and both kinds of vote, with 5 fold cross validation. Each combination is trained on four parts and scored on the fifth, five times over. The best setting here is K equal to 7 with plain votes, at 96.7 percent accuracy.',
          },
          {
            kicker: 'Many features',
            title: 'The curse of dimensionality',
            body: 'With many features, points spread out, and the nearest point is almost as far as the farthest. "Nearest" then means little. Below, the ratio of nearest to farthest distance climbs from 0.01 with 2 features to 0.9 with 1,000.',
            visual: { type: 'code', code: CURSE, output: '2 0.01\n10 0.22\n100 0.72\n1000 0.9' },
            note: 'Fixes: drop irrelevant features, reduce dimensions with PCA, or switch to a model that weighs features, such as a tree ensemble.',
            narration:
              'We scatter 1,000 random points and one query point, first with 2 features, then 10, 100 and 1,000. Each time we divide the nearest distance by the farthest. With 2 features the nearest point is more than 100 times closer than the farthest. With 1,000 features the ratio is 0.9: every point is almost equally far away.',
          },
          {
            kicker: 'More limits',
            title: 'Other ways KNN fails',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'clock',
                  label: 'Slow predictions',
                  sub: 'Every query scans the stored data',
                },
                {
                  icon: 'filter',
                  label: 'Irrelevant or correlated features',
                  sub: 'Noise in every distance, or one signal counted twice',
                },
                {
                  icon: 'users',
                  label: 'Imbalanced classes',
                  sub: 'The big class wins most votes',
                },
                { icon: 'alert', label: 'Missing values', sub: 'A distance cannot be computed' },
              ],
            },
            note: 'For imbalance, weight the votes or balance the classes by resampling. Turn categories into 0 and 1 columns, or count mismatches with Hamming distance. Fill missing values first.',
          },
          {
            kicker: 'Uses',
            title: 'Where KNN earns its place',
            body: 'KNN is a strong **baseline** on small, clean data with few features. Nearest-neighbour search needs no labels: it powers recommendations, anomaly detection and semantic search over embeddings by cosine similarity. `KNNImputer` fills a missing value from the most similar rows.',
          },
          {
            kicker: 'Compare',
            title: 'KNN is not K-Means',
            visual: {
              type: 'compare',
              left: {
                title: 'KNN',
                items: [
                  'Supervised: needs labels',
                  'K = neighbours that vote',
                  'No training; predicts a class or a number',
                ],
              },
              right: {
                title: 'K-Means',
                items: [
                  'Unsupervised: no labels',
                  'K = number of clusters',
                  'Trains by moving cluster centres',
                ],
              },
              better: 'none',
            },
            note: 'Have labels and want a prediction? KNN. No labels and want groups? K-Means.',
          },
          {
            kicker: 'Try it',
            title: 'When another model fits better',
            try: {
              type: 'choice',
              prompt:
                'You have 2 million rows and 300 features, and need predictions in milliseconds. What do you try first?',
              options: [
                {
                  text: 'A model trained once, such as logistic regression or a tree ensemble',
                  correct: true,
                  feedback:
                    'Right. It predicts from learned weights or splits, with no scan of the stored data.',
                },
                {
                  text: 'KNN with K = 1',
                  correct: false,
                  feedback: 'Even one neighbour means a distance to every stored row.',
                },
                {
                  text: 'KNN, because it needs no training',
                  correct: false,
                  feedback: 'No training is the cheap part. Prediction is the slow part.',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'A slow model',
            try: {
              type: 'choice',
              prompt:
                'Your KNN model is accurate, but each prediction takes 2 seconds on 5 million stored rows. What do you try first?',
              options: [
                {
                  text: 'An approximate nearest-neighbour index, so a query checks only a small part of the data',
                  correct: true,
                  feedback:
                    'Right. HNSW walks a graph of neighbours; IVF searches only the nearest clusters. Both trade a little accuracy for speed.',
                },
                {
                  text: 'A larger K',
                  correct: false,
                  feedback: 'The scan over all rows stays the same, whatever K is.',
                },
                {
                  text: 'Train for more epochs',
                  correct: false,
                  feedback: 'KNN has no training loop. The cost is all at prediction time.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.sandbox',
      kind: 'WIDGET',
      title: 'KNN sandbox',
      depthRank: 1,
      conceptKeys: [DV, CK, WP],
      body: {
        widget: 'knn-lab',
        prompt:
          'Everything is open: four patterns, three distance metrics, both kinds of vote, and your own points. Minkowski distance covers both of the others: p = 1 is Manhattan and p = 2 is Euclidean. The accuracy chart uses points the model never trained on.',
        params: {
          ...FILM_LAB,
          datasets: ['moons', 'blobs', 'circles', 'xor', 'custom'],
          defaultDataset: 'moons',
          query: { x: 5, y: 5 },
          k: { max: 15, default: 5 },
          metrics: ['euclidean', 'manhattan', 'minkowski3'],
          defaultMetric: 'euclidean',
          boundary: true,
          panels: ['calculation', 'accuracy'],
          controls: ['k', 'weighted', 'metric', 'boundary', 'dataset', 'add-points'],
          tasks: [
            'Two moons: compare K = 1 and K = 15. Which boundary follows the curve, and which cuts across it?',
            'XOR pattern: no straight line separates these classes. What does KNN’s boundary look like?',
            'Add three points of another class inside a group. How do K = 1 and K = 7 react?',
            'Circles at K = 15: switch between one vote each and weighted votes. What happens to accuracy on unseen points, and why?',
          ],
        },
      },
    },
    {
      key: 'playground.scratch',
      kind: 'PLAYGROUND',
      title: 'Write KNN from scratch',
      depthRank: 1,
      conceptKeys: [DV],
      body: {
        language: 'python',
        instructions:
          'Fill in the three blanks to finish `knn_predict`: the distances, the K nearest positions, and the winning label. Before you run it, predict the last line: what should K = 1, 3 and 5 give at (4, 6.5)? The films are the same 13 as in the lab, so you can check your answers there. Compare with an odd K: on a tied vote this code returns the lower label, 0.',
        starterCode: SCRATCH_START,
        hints: [
          'Distances: subtract `q` from every row of `X`, square the result, add across each row with `.sum(axis=1)`, then take `np.sqrt`.',
          'The K nearest positions: `np.argsort(d)` lists positions from the closest to the farthest. Slice the first `k`.',
          'The winner: `np.bincount(votes)` counts each label, and `.argmax()` picks the highest count. On a tie it returns the smaller label, as scikit-learn does.',
        ],
        solution: SCRATCH_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '0 1',
            label:
              'With K = 3, the film at (6, 6) is liked (0) and the film at (2, 6) is skipped (1)',
          },
          {
            type: 'stdout_contains',
            value: '[0, 1, 1]',
            label: 'At (4, 6.5): liked (0) with K = 1, skipped (1) with K = 3 and K = 5',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'KNN quiz',
      depthRank: 1,
      conceptKeys: [DV, CK, WP, PL],
      body: {
        // Each attempt draws 5 of these 20, so a second attempt is new work.
        draw: 5,
        items: [
          {
            key: 'vote',
            type: 'mcq',
            prompt:
              'A new point’s five nearest neighbours, closest first, have classes A, B, B, A, A. What does plain KNN predict?',
            options: [
              { id: 'a', text: 'B with K = 3, and A with K = 5' },
              { id: 'b', text: 'A with K = 3, and B with K = 5' },
              { id: 'c', text: 'B for both' },
              { id: 'd', text: 'A for both' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'K = 3 counts A, B, B: two votes for B. K = 5 adds two more A neighbours: three votes for A.',
          },
          {
            key: 'weighted',
            type: 'mcq',
            prompt:
              'K = 3. The neighbours are 0.5 away (class A), 1 away (class B) and 2 away (class B). With weights of 1 / distance, which class wins?',
            options: [
              { id: 'a', text: 'Class A: a weight of 2 against 1.5' },
              { id: 'b', text: 'Class B: two votes against one' },
              { id: 'c', text: 'It is a tie' },
              { id: 'd', text: 'Class B: a weight of 3 against 0.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A gets 1 / 0.5 = 2. B gets 1 / 1 + 1 / 2 = 1.5. Plain voting would have said B.',
          },
          {
            key: 'k1',
            type: 'mcq',
            prompt:
              'A KNN model with K = 1 scores 100% on its training data and 84% on new data. What does that show?',
            options: [
              {
                id: 'a',
                text: 'Overfitting: the model has memorised its training points',
              },
              { id: 'b', text: 'Underfitting: K is too large to follow the pattern in the data' },
              { id: 'c', text: 'The model is perfect; the new data must be wrong' },
              { id: 'd', text: 'A scaling problem: the features were not standardised' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'With K = 1 each training point is its own nearest neighbour, so the training score is 100%. The drop to 84% on new data shows it memorised noise.',
          },
          {
            key: 'scale',
            type: 'mcq',
            prompt:
              'Two features: age (20 to 60) and salary (₹20,000 to ₹2,00,000). What happens if you run KNN without scaling?',
            options: [
              { id: 'a', text: 'Salary decides almost every distance, and age is nearly ignored' },
              { id: 'b', text: 'Age decides almost every distance, and salary is nearly ignored' },
              { id: 'c', text: 'Nothing: KNN does not depend on scale' },
              { id: 'd', text: 'scikit-learn scales the features for you' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Distances add raw differences, and salary differences are thousands of times larger. Scale first.',
          },
          {
            key: 'kmeans',
            type: 'mcq',
            prompt: 'Which statement about KNN and K-Means is true?',
            options: [
              {
                id: 'a',
                text: 'KNN needs labels and K-Means does not',
              },
              { id: 'b', text: 'Both are unsupervised clustering methods' },
              { id: 'c', text: 'In both, K is the number of neighbours' },
              { id: 'd', text: 'K-Means needs labels and KNN does not' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'KNN is supervised and K-Means is unsupervised. In KNN, K is how many neighbours vote. In K-Means, K is how many clusters to form.',
          },
          {
            key: 'euclidean',
            type: 'mcq',
            prompt: 'What is the Euclidean distance between the points (2, 3) and (5, 7)?',
            options: [
              { id: 'a', text: '5' },
              { id: 'b', text: '7' },
              { id: 'c', text: '25' },
              { id: 'd', text: '3.5' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '√((5 − 2)² + (7 − 3)²) = √(9 + 16) = 5. The value 25 is the sum before the square root.',
          },
          {
            key: 'manhattan',
            type: 'mcq',
            prompt: 'By Manhattan distance, how far is (5, 7) from (3, 5)?',
            options: [
              { id: 'a', text: '4' },
              { id: 'b', text: '2.83' },
              { id: 'c', text: '8' },
              { id: 'd', text: '2' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Manhattan distance adds the differences along each axis: 2 + 2 = 4. The value 2 is only one of those differences.',
          },
          {
            key: 'training',
            type: 'mcq',
            prompt: 'What does KNN do when it is trained?',
            options: [
              { id: 'a', text: 'It stores the training data, and learns nothing else' },
              { id: 'b', text: 'It learns one weight per feature' },
              { id: 'c', text: 'It sorts the data into K groups' },
              { id: 'd', text: 'It removes the points that lie far from the others' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'KNN is a lazy learner: the stored data is the model. All the work happens when a prediction is asked for.',
          },
          {
            key: 'cost',
            type: 'mcq',
            prompt:
              'A KNN model has N training points with d features and no index. About how much work is one prediction?',
            options: [
              { id: 'a', text: 'About N × d operations: one distance to every training point' },
              { id: 'b', text: 'About d operations: one per feature' },
              { id: 'c', text: 'About K operations: one per neighbour' },
              { id: 'd', text: 'None: the answers were worked out during training' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Each prediction measures the distance to all N points, and each distance uses all d features.',
          },
          {
            key: 'regression',
            type: 'mcq',
            prompt:
              'KNN regression with K = 3: the three nearest flats cost 52, 58 and 61 lakhs. What price is predicted?',
            options: [
              { id: 'a', text: '57 lakhs' },
              { id: 'b', text: '58 lakhs' },
              { id: 'c', text: '61 lakhs' },
              { id: 'd', text: '171 lakhs' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'To predict a number, KNN averages its neighbours: (52 + 58 + 61) / 3 = 57.',
          },
          {
            key: 'beyond-data',
            type: 'mcq',
            prompt:
              'KNN regression is asked for the price of a flat far larger than any flat in its data. What does it return?',
            options: [
              {
                id: 'a',
                text: 'The average price of its K largest flats',
              },
              { id: 'b', text: 'A price that keeps rising with the area' },
              { id: 'c', text: 'Zero: no flat in its data is close enough' },
              { id: 'd', text: 'An error: the area is outside its data' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The nearest neighbours of an extreme point are the edge of the data. KNN cannot predict beyond the prices in its data.',
          },
          {
            key: 'vote-share',
            type: 'mcq',
            prompt:
              'With plain votes and K = 3, which probability can `predict_proba` return for a class?',
            options: [
              { id: 'a', text: '66.7%' },
              { id: 'b', text: '50%' },
              { id: 'c', text: '56.2%' },
              { id: 'd', text: '90%' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A plain vote gives votes / K. With K = 3 the only values are 0%, 33.3%, 66.7% and 100%. Weighted votes give finer values.',
          },
          {
            key: 'tie',
            type: 'mcq',
            prompt:
              'Two classes, plain votes and K = 4: two neighbours vote for each class. What does scikit-learn return?',
            options: [
              { id: 'a', text: 'The class that comes first in label order' },
              { id: 'b', text: 'The class of the nearest neighbour' },
              { id: 'c', text: 'An error' },
              { id: 'd', text: 'A class picked at random' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'On a tied plain vote, scikit-learn takes the first class in label order. With two classes, an odd K makes a tie impossible.',
          },
          {
            key: 'k-equals-n',
            type: 'mcq',
            prompt:
              'With plain votes, what does KNN predict when K equals the number of training points?',
            options: [
              {
                id: 'a',
                text: 'The majority class of the training set, every time',
              },
              { id: 'b', text: 'The class of the nearest training point, every time' },
              { id: 'c', text: 'A different class for every new point' },
              { id: 'd', text: 'An error: K cannot be that large' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Every point votes every time, so the answer never changes. This is the extreme of underfitting: high bias.',
          },
          {
            key: 'choose-k',
            type: 'mcq',
            prompt: 'How should K be chosen?',
            options: [
              {
                id: 'a',
                text: 'By cross-validation: score each K on held-out data and keep the best',
              },
              {
                id: 'b',
                text: 'By training accuracy: keep the K that scores highest on the training data',
              },
              { id: 'c', text: 'Always use K = 1' },
              { id: 'd', text: 'Always use the number of training points' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Cross-validation scores every K on rows the model was not trained on. A common starting point is near √N.',
          },
          {
            key: 'noise',
            type: 'mcq',
            prompt:
              'One mislabelled point sits inside a region of the other class. Which K is hurt most by it?',
            options: [
              { id: 'a', text: 'K = 1' },
              { id: 'b', text: 'K = 5' },
              { id: 'c', text: 'K = 15' },
              { id: 'd', text: 'Every K is hurt equally' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'With K = 1 one point decides alone, so a new point nearest to it copies its wrong label. A few more neighbours outvote the stray point.',
          },
          {
            key: 'dimensions',
            type: 'mcq',
            prompt:
              'With 1,000 features, the nearest training point is almost as far away as the farthest. What is this problem called?',
            options: [
              {
                id: 'a',
                text: 'The curse of dimensionality',
              },
              { id: 'b', text: 'The bias-variance trade-off' },
              { id: 'c', text: 'Data leakage' },
              { id: 'd', text: 'Class imbalance' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'With many features the points spread out and the distances bunch together, so "nearest" means little. Drop irrelevant features, or reduce the number of dimensions.',
          },
          {
            key: 'scaler-leak',
            type: 'mcq',
            prompt: 'You cross-validate KNN with a scaler. Where should the scaler be fitted?',
            options: [
              {
                id: 'a',
                text: 'On the training part of each split only',
              },
              { id: 'b', text: 'On the whole dataset, before splitting' },
              { id: 'c', text: 'On the test part of each split only' },
              { id: 'd', text: 'Nowhere: KNN needs no scaling' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Fitting the scaler on all the data lets test rows shape the training features: that is data leakage. A pipeline refits it inside every split.',
          },
          {
            key: 'exact-match',
            type: 'mcq',
            prompt:
              'With weighted votes, the new point has exactly the same features as a training point. What does scikit-learn do?',
            options: [
              { id: 'a', text: 'It gives that training point the whole vote' },
              { id: 'b', text: 'It fails, because 1 / 0 is undefined' },
              { id: 'c', text: 'It ignores that training point' },
              { id: 'd', text: 'It gives every neighbour the same weight' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A distance of 0 would mean a weight of 1 / 0, which has no value. scikit-learn gives the exact match all the weight instead.',
          },
          {
            key: 'imbalance',
            type: 'mcq',
            prompt:
              'In the training data, 95% of the points are class A. Why can a large K be a problem?',
            options: [
              {
                id: 'a',
                text: 'Class A wins most votes, so class B is rarely predicted',
              },
              { id: 'b', text: 'A large K always overfits, whatever the class balance is' },
              { id: 'c', text: 'The distances to class B can no longer be computed' },
              { id: 'd', text: 'Class B points are dropped from the training data' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'With plain votes the common class outvotes the rare one almost everywhere. Weight the votes by distance, or balance the classes by resampling.',
          },
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [DV, CK, WP, PL],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'How KNN works',
            front: 'How does the KNN algorithm work?',
            back: 'KNN stores the labelled training data. To predict, it measures the distance to every stored point, usually Euclidean, sometimes Manhattan or cosine. It sorts them and keeps the K nearest. For classification those neighbours vote and the majority wins; for regression their values are averaged. There is no training step.',
          },
          {
            title: 'Non-parametric and lazy',
            front: 'Why is KNN called a non-parametric, lazy learner?',
            back: 'Non-parametric: it learns no fixed set of parameters, such as weights. The stored data is the model, so it grows with the data. Lazy: it does no work at training time and delays all computation to prediction. That makes training instant, and prediction slow on large data.',
          },
          {
            title: 'Choosing K',
            front: 'How do you choose K, and what happens at the extremes?',
            back: 'K = 1 follows every point, including noise: low bias, high variance, overfitting. A large K averages over distant points: high bias, low variance, underfitting. At K = N it always predicts the majority class. Choose K by cross-validation, starting near √N. Use an odd K with two classes.',
          },
          {
            title: 'Feature scaling',
            front: 'Why must features be scaled for KNN?',
            back: 'A distance adds the differences across features. A feature with large values, such as income in rupees, dominates one with small values, such as age. The small one is then ignored. Standardise or min-max scale first, and fit the scaler on the training data only, ideally inside a pipeline.',
          },
          {
            title: 'Weighted KNN and ties',
            front: 'What is weighted KNN, and how are ties handled?',
            back: 'Plain KNN gives every neighbour one vote, so a very close neighbour can be outvoted by farther ones. Weighted KNN weights each vote by 1 / distance; in scikit-learn, `weights="distance"`. On a tied plain vote, scikit-learn returns the class that comes first in label order. An odd K avoids ties with two classes.',
          },
          {
            title: 'Cost and many dimensions',
            front: 'KNN is slow on your large, high-dimensional dataset. Why, and what do you do?',
            back: 'Each prediction measures the distance to every stored point: about N × d operations. With many features, distances also become nearly equal, so neighbours carry little meaning. Reduce dimensions with feature selection or PCA. Use a KD-tree or ball tree for few features, or an approximate nearest-neighbour index for many.',
          },
          {
            title: 'KNN vs K-Means',
            front: 'What is the difference between KNN and K-Means?',
            back: 'KNN is supervised: it needs labels and predicts a class or number from the K nearest labelled points, with no training. K-Means is unsupervised: it has no labels and groups points into K clusters by moving cluster centres. In KNN, K counts neighbours; in K-Means, K counts clusters.',
          },
          {
            title: 'KNN vs SVM',
            front: 'How does KNN differ from SVM?',
            back: 'Both are supervised and both need scaled features. KNN keeps all the data and decides by a local vote, so training is instant and prediction is slow. SVM learns one boundary with the widest margin and keeps only the support vectors, so training costs more and prediction is fast.',
          },
          {
            title: 'KNN for missing values',
            front: 'How can KNN fill missing values?',
            back: 'For a row with a missing value, find the K rows most similar on the features that are present. Fill the gap with the average of their values: neighbours aged 30 and 34 give 32. scikit-learn’s `KNNImputer` does this. It respects relationships between features, unlike a plain mean, but needs scaled features and is slow on large data.',
          },
          {
            title: 'Why KNN in your project',
            front: 'Why did you choose KNN and not Random Forest?',
            back: 'A strong answer cites evidence. KNN suits small, clean data with a few scaled numeric features, where similar inputs share labels. It also explains a prediction by showing the neighbours. Say you compared both with cross-validation and KNN matched or beat the forest. Admit that a forest handles many features and mixed types better.',
          },
        ],
      },
    },
  ],
};
