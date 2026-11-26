/**
 * Python & NumPy for AI → Broadcasting and array operations.
 *
 * Evidence (Hiring Intelligence, all families, Jan–Oct 2026; internal only, never quoted to
 * students): an array's dimensions, axis questions (drop with axis=1), vectorisation, matrix
 * transpose, and shape bugs in live coding. Interviewers at 8+ LPA add shape prediction, shape
 * mismatch errors and pairwise distances without loops. One bar for every package for now, aimed
 * at 8–12 LPA and kept simple, so every section is depth 1. Outputs were checked with NumPy 2.5
 * and 2.4 (the browser runs 2.4); both print the same.
 */
import type { LessonDocumentInput } from '@app/content';

const BC = 'numpy.broadcasting-rules';
const AX = 'numpy.axis-aggregations';
const RS = 'numpy.reshape-stack';

const AXIS = `import numpy as np

sales = np.array([[12, 15, 9, 14],
                  [8, 6, 10, 7],
                  [20, 18, 22, 25]])
print(sales.sum())
print(sales.sum(axis=0))
print(sales.sum(axis=1))
print(sales.mean(axis=1))
print(sales.argmax(axis=1))`;

const KEEPDIMS = `import numpy as np

sales = np.array([[12, 15, 9, 14],
                  [8, 6, 10, 7],
                  [20, 18, 22, 25]])
totals = sales.sum(axis=1, keepdims=True)
print(totals.shape)
share = sales / totals
print(share.round(2)[0])
print(share.sum(axis=1))`;

const TABLE = `import numpy as np

prices = np.array([[100], [200], [300]])
factors = np.array([1.0, 0.9, 0.8, 0.5])
print(prices.shape, factors.shape)
table = prices * factors
print(table.shape)
print(table)`;

const FIX = `import numpy as np

X = np.arange(12).reshape(4, 3)
print((X - X.mean(axis=0)).shape)
row_means = X.mean(axis=1)
print(row_means.shape)
try:
    X - row_means
except ValueError as e:
    print(e)
print((X - row_means[:, None]).shape)`;

const SILENT = `import numpy as np

y_true = np.array([3.0, 5.0, 7.0])
y_pred = np.array([[2.5], [5.5], [7.0]])
wrong = y_pred - y_true
print(wrong.shape)
right = y_pred.ravel() - y_true
print(right.shape, np.mean(right ** 2))`;

const PAIRWISE = `import numpy as np

P = np.array([[0, 0], [3, 4], [6, 8]])
Q = np.array([[0, 0], [3, 0], [0, 4], [6, 8]])
diff = P[:, None, :] - Q[None, :, :]
print(diff.shape)
dist = np.sqrt((diff ** 2).sum(axis=-1))
print(dist)`;

const RESHAPE = `import numpy as np

a = np.arange(12)
print(a.reshape(3, 4))
print(a.reshape(2, -1).shape)
print(a.reshape(3, 4).T.shape)
try:
    a.reshape(5, 3)
except ValueError as e:
    print(e)`;

const AXES = `import numpy as np

img = np.zeros((28, 28))
batch = img[None]
print(batch.shape)
print(np.expand_dims(img, -1).shape)
print(batch.squeeze().shape)
print(batch.ravel().shape)`;

const STACK = `import numpy as np

jan = np.array([[1, 2, 3], [4, 5, 6]])
feb = np.array([[7, 8, 9], [10, 11, 12]])
print(np.concatenate([jan, feb]).shape)
print(np.concatenate([jan, feb], axis=1).shape)
print(np.stack([jan, feb]).shape)
print(np.vstack([jan, feb]).shape, np.hstack([jan, feb]).shape)`;

const SCALE_HEAD = `import numpy as np

# 4 customers: age, monthly income (thousands), visits
X = np.array([[22, 30, 5],
              [35, 80, 2],
              [28, 50, 9],
              [45, 120, 4]])
`;
const SCALE_START = `${SCALE_HEAD}
# 1. scaled: min-max scale every column to 0..1
# 2. z: standardise every column (mean 0, std 1)
# One line each, no loops.
scaled = X
z = X
print(scaled.round(2))
print(z.round(2))
`;
const SCALE_SOLUTION = `${SCALE_HEAD}
lo, hi = X.min(axis=0), X.max(axis=0)
scaled = (X - lo) / (hi - lo)
z = (X - X.mean(axis=0)) / X.std(axis=0)
print(scaled.round(2))
print(z.round(2))
`;

export const BROADCASTING_ARRAY_OPS_LESSON: LessonDocumentInput = {
  title: 'Broadcasting and array operations',
  subtitle:
    'How NumPy lines up arrays of different shapes, how to aggregate along an axis, and how to reshape: the shape skills behind every ML pipeline.',
  objectives: [
    {
      key: 'axis',
      text: 'Compute sums, means and argmax along a chosen axis, with and without keepdims',
      minDepthRank: 1,
    },
    {
      key: 'broadcast',
      text: 'Predict the result shape of a broadcast, and fix a shape-mismatch error',
      minDepthRank: 1,
    },
    {
      key: 'reshape',
      text: 'Reshape, add axes, and join arrays with concatenate and stack',
      minDepthRank: 1,
    },
    {
      key: 'batch',
      text: 'Vectorise batch computations such as column scaling and pairwise distances',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'A price table in one line',
      depthRank: 1,
      conceptKeys: [BC],
      body: {
        scenario:
          'A shop wants a price table: 3 products at 4 discount levels. Two nested loops would do it. With NumPy, a column of prices times a row of discounts builds the whole table in one line.',
        animation: {
          name: 'broadcast-stretch',
          caption: 'Real use: every price at every discount',
        },
        realWorld: {
          title: 'Where broadcasting does the work',
          items: [
            { icon: 'gauge', label: 'Feature scaling', sub: 'Subtract each column’s mean' },
            { icon: 'image', label: 'Images', sub: 'Adjust each colour channel at once' },
            { icon: 'brain', label: 'Neural networks', sub: 'Add a bias to every row of a batch' },
            { icon: 'search', label: 'Search', sub: 'Distances from one query to all items' },
          ],
        },
        provocation:
          'How can NumPy subtract a row of 3 numbers from a table of 1,000 rows, without a loop?',
        bridge:
          'Interviews test this through shapes: the shape that comes out, the axis to use, and the meaning of a broadcast error. This lesson gives you the rules.',
      },
    },
    {
      key: 'slides.axis',
      kind: 'SLIDES',
      title: 'Aggregating along an axis',
      depthRank: 1,
      conceptKeys: [AX],
      body: {
        slides: [
          {
            kicker: 'Axis',
            title: 'The axis that collapses',
            body: '`axis` names the direction that collapses. `sum(axis=0)` adds down the rows, giving one total per column. `sum(axis=1)` adds across the columns, giving one total per row. With no axis, everything becomes one number.',
            animation: {
              name: 'axis-collapse',
              caption: 'Real use: totals per store or per day',
            },
          },
          {
            kicker: 'In code',
            title: 'Totals, means and best days',
            visual: {
              type: 'code',
              code: AXIS,
              output: '166\n[40 39 41 46]\n[50 31 85]\n[12.5   7.75 21.25]\n[1 2 3]',
            },
            note: '`argmax` gives the position of the largest value, here each store’s best day. With no axis, it gives a position in the flattened array.',
            narration:
              'Each row is a store and each column a day, Monday to Thursday. With no axis, sum adds everything: 166. Axis 0 collapses the rows, so we get one total per day. Axis 1 collapses the columns, giving one total per store. The mean works the same way. argmax along axis 1 gives each store’s best day: Tuesday, Wednesday and Thursday.',
          },
          {
            kicker: 'keepdims',
            title: 'Keep the collapsed axis',
            body: 'An aggregate drops the axis it collapses: `sales.sum(axis=1)` has shape (3,). With `keepdims=True` it keeps that axis with size 1, shape (3, 1), so the result still lines up with `sales`.',
            visual: {
              type: 'code',
              code: KEEPDIMS,
              output: '(3, 1)\n[0.24 0.3  0.18 0.28]\n[1. 1. 1.]',
            },
            note: 'Dividing by row totals of shape (3, 1) gives each day’s share of its store’s week. Each row of shares adds up to 1.',
            narration:
              'keepdims keeps the store totals as a column, shape 3 by 1. Dividing sales by that column divides every row by its own total. Store A sold 12 out of 50 on Monday, a share of 0.24. Each row of shares adds up to 1.',
          },
          {
            kicker: 'Try it',
            title: 'One total per day',
            try: {
              type: 'choice',
              prompt:
                'sales has shape (3, 4): 3 stores by 4 days. Which call gives one total per day?',
              options: [
                {
                  text: '`sales.sum(axis=0)`',
                  correct: true,
                  feedback:
                    'Right. Axis 0 collapses the stores, leaving one total for each of the 4 days.',
                },
                {
                  text: '`sales.sum(axis=1)`',
                  correct: false,
                  feedback: 'That collapses the days, so you get one total per store.',
                },
                {
                  text: '`sales.sum()`',
                  correct: false,
                  feedback: 'With no axis you get one number: all sales added together.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.axis',
      kind: 'WIDGET',
      title: 'Explore axis and keepdims',
      depthRank: 1,
      conceptKeys: [AX],
      body: {
        widget: 'axis-explorer',
        prompt:
          'Daily sales of three stores. Change the operation, the axis and keepdims. Cells of one colour collapse into one answer.',
        params: {
          name: 'sales',
          rowLabel: 'store',
          colLabel: 'day',
          rowNames: ['Store A', 'Store B', 'Store C'],
          colNames: ['Mon', 'Tue', 'Wed', 'Thu'],
          values: [
            [12, 15, 9, 14],
            [8, 6, 10, 7],
            [20, 18, 22, 25],
          ],
          ops: ['sum', 'mean', 'max', 'min', 'argmax'],
          defaultOp: 'sum',
          tasks: [
            'Switch between axis 0 and axis 1. Which gives one total per store, and what is each shape?',
            'Find each store’s best day with argmax. Which axis do you need?',
            'Choose argmax with axis None. Why is the answer 11?',
            'Turn on keepdims for the store totals. How does the shape change?',
          ],
        },
      },
    },
    {
      key: 'slides.broadcasting',
      kind: 'SLIDES',
      title: 'Broadcasting rules',
      depthRank: 1,
      conceptKeys: [BC],
      body: {
        slides: [
          {
            kicker: 'Story',
            title: 'Stretch without copying',
            body: 'Take a column of 3 prices, shape (3, 1), and a row of 4 discount factors, shape (1, 4). Multiplied, they give a 3 × 4 table. NumPy **stretches** each array along its size-1 axis, without copying any data. This is **broadcasting**.',
            animation: {
              name: 'broadcast-stretch',
              caption: 'Real use: every price at every discount',
            },
          },
          {
            kicker: 'In code',
            title: 'The price table',
            visual: {
              type: 'code',
              code: TABLE,
              output:
                '(3, 1) (4,)\n(3, 4)\n[[100.  90.  80.  50.]\n [200. 180. 160. 100.]\n [300. 270. 240. 150.]]',
            },
            note: 'A 1-D array of 4 acts like a row, shape (1, 4), because a missing axis on the left counts as 1.',
            narration:
              'prices is a column, 3 rows by 1. factors is a plain 1-D array of 4, which acts like a row. Multiplying them stretches the column across 4 columns and the row down 3 rows. The result is a 3 by 4 table: every price at every discount.',
          },
          {
            kicker: 'The rule',
            title: 'Compare shapes from the right',
            body: 'Line the shapes up **from the right**. On each axis, two sizes fit if they are **equal** or one of them is **1**. A missing axis counts as 1. Otherwise NumPy raises a ValueError. The result takes the larger size on each axis.',
            animation: {
              name: 'broadcast-rules',
              caption: 'Real use: checking shapes before you run a batch',
            },
          },
          {
            kicker: 'In code',
            title: 'An error and its fix',
            visual: {
              type: 'code',
              code: FIX,
              output:
                '(4, 3)\n(4,)\noperands could not be broadcast together with shapes (4,3) (4,) \n(4, 3)',
            },
            note: '`row_means[:, None]` adds an axis, so (4,) becomes (4, 1): one value per row. `None` here means `np.newaxis`. `keepdims=True` gives (4, 1) directly.',
            narration:
              'Column means have shape 3, which lines up with the 3 columns, so centring the columns works. Row means have shape 4. From the right, 3 and 4 clash, so NumPy raises an error. Adding an axis turns the row means into a column, 4 by 1, and now the subtraction works.',
          },
          {
            kicker: 'Pitfall',
            title: 'Silent shape bugs',
            body: 'Broadcasting can hide bugs. If `y_true` has shape (3,) and `y_pred` has shape (3, 1), then `y_pred - y_true` is a 3 × 3 table, not 3 errors. No error is raised, and the loss is wrong.',
            visual: { type: 'code', code: SILENT, output: '(3, 3)\n(3,) 0.16666666666666666' },
            note: 'Before any loss or metric, check with `assert y_pred.shape == y_true.shape`.',
            narration:
              'The predictions come out as a column, 3 by 1, while the true values are a flat array of 3. Subtracting them broadcasts to a 3 by 3 table, with no error at all. Flattening the predictions with ravel gives 3 errors, and the mean squared error is about 0.167.',
          },
          {
            kicker: 'Distances',
            title: 'Pairwise distances, no loops',
            body: 'To compare every point in P with every point in Q, add axes so the shapes broadcast. Then (3, 1, 2) minus (1, 4, 2) gives (3, 4, 2). Square, sum over the last axis and take the root: a 3 × 4 table of distances.',
            visual: {
              type: 'code',
              code: PAIRWISE,
              output:
                '(3, 4, 2)\n[[ 0.          3.          4.         10.        ]\n [ 5.          4.          3.          5.        ]\n [10.          8.54400375  7.21110255  0.        ]]',
            },
            note: '`axis=-1` means the last axis, here x and y. This is how nearest-neighbour search and clustering compare many points at once.',
            narration:
              'P has 3 points and Q has 4, each with an x and a y. Adding axes gives shapes 3 by 1 by 2 and 1 by 4 by 2, so the subtraction broadcasts to 3 by 4 by 2: every pair of points. Squaring, summing over the last axis and taking the root gives the distances. The point 3 comma 4 is 5 away from the origin.',
          },
          {
            kicker: 'Try it',
            title: 'Centre each column',
            try: {
              type: 'code',
              prompt: 'Subtract each column’s mean from X, with no loop, and print the result.',
              starter:
                'import numpy as np\n\nX = np.array([[1, 2], [3, 6], [5, 10]])\n# subtract the column means, then print',
              expected: '[[-2. -4.]\n [ 0.  0.]\n [ 2.  4.]]',
              hint: 'The column means are `X.mean(axis=0)`, shape (2,), which broadcasts against (3, 2).',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Spot the clash',
            try: {
              type: 'choice',
              prompt: 'Which pair of shapes cannot be broadcast together?',
              options: [
                {
                  text: '(5, 3) and (5,)',
                  correct: true,
                  feedback: 'Right. From the right, 3 and 5 differ and neither is 1.',
                },
                {
                  text: '(5, 3) and (3,)',
                  correct: false,
                  feedback: 'From the right, 3 matches 3, and the missing axis counts as 1.',
                },
                {
                  text: '(5, 1) and (1, 3)',
                  correct: false,
                  feedback: 'Each axis has a 1, so both stretch and the result is (5, 3).',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Distances to every shop',
            try: {
              type: 'code',
              prompt:
                'W holds 2 warehouses and S holds 3 shops, as (x, y) points in km. Print the 2 × 3 table of distances from every warehouse to every shop, with no loops.',
              starter:
                'import numpy as np\n\nW = np.array([[0, 0], [6, 0]])\nS = np.array([[0, 8], [6, 8], [3, 4]])\n# print every warehouse-to-shop distance, no loops',
              expected: '[[ 8. 10.  5.]\n [10.  8.  5.]]',
              hint: 'Give W shape (2, 1, 2) with `W[:, None, :]` and S shape (1, 3, 2) with `S[None, :, :]`. Subtract, square, sum over `axis=-1`, then take `np.sqrt`.',
              packages: ['numpy'],
            },
          },
        ],
      },
    },
    {
      key: 'widget.broadcast',
      kind: 'WIDGET',
      title: 'Explore broadcasting',
      depthRank: 1,
      conceptKeys: [BC],
      body: {
        widget: 'broadcast-explorer',
        prompt:
          'Pick the shapes of A and B and watch NumPy line them up from the right. Dashed cells are stretched copies that NumPy never stores.',
        params: {
          shapes: [[4, 3], [3], [4], [4, 1], [1, 3], []],
          defaultA: 0,
          defaultB: 1,
          tasks: [
            'With A (4, 3) and B (3,), which axis is stretched? How many rows of the result use B’s three values?',
            'Now pick B (4,). Read the error, then find the shape of B that fixes it.',
            'Try A (4, 1) with B (1, 3). Why is the result bigger than both?',
            'Pick the scalar for B. Why does it work with every shape?',
          ],
        },
      },
    },
    {
      key: 'slides.reshape',
      kind: 'SLIDES',
      title: 'Reshape, stack and concatenate',
      depthRank: 1,
      conceptKeys: [RS],
      body: {
        slides: [
          {
            kicker: 'Reshape',
            title: 'Same data, new shape',
            body: '`reshape` lays the same numbers out in a new shape, row by row, keeping their order. The sizes must multiply to the same total. Write -1 for one size, and NumPy works it out.',
            animation: {
              name: 'reshape-flow',
              caption: 'Real use: turning a flat row of pixels back into an image',
            },
          },
          {
            kicker: 'In code',
            title: 'reshape, -1 and transpose',
            visual: {
              type: 'code',
              code: RESHAPE,
              output:
                '[[ 0  1  2  3]\n [ 4  5  6  7]\n [ 8  9 10 11]]\n(2, 6)\n(4, 3)\ncannot reshape array of size 12 into shape (5,3)',
            },
            note: '`.T` turns rows into columns: its first row is 0, 4, 8. `reshape(4, 3)` has the same shape but keeps the order: 0, 1, 2. Both are views.',
            narration:
              'Twelve numbers reshaped to 3 by 4 fill the rows in order. With minus 1, NumPy works out the missing size: 2 rows means 6 columns. The transpose turns 3 by 4 into 4 by 3. Asking for 5 by 3 fails, because 15 is not 12.',
          },
          {
            kicker: 'New axis',
            title: 'Add or remove an axis',
            body: 'Models usually expect a **batch** axis. One 28 × 28 image has shape (28, 28), but a model wants (1, 28, 28). `x[None]` or `np.expand_dims` adds an axis, `squeeze` removes size-1 axes, and `ravel` flattens to 1-D.',
            visual: {
              type: 'code',
              code: AXES,
              output: '(1, 28, 28)\n(28, 28, 1)\n(28, 28)\n(784,)',
            },
            note: '`flatten()` always copies. `ravel()` returns a view when it can, so it is usually faster.',
            narration:
              'One grey image is 28 by 28. Indexing with None adds a batch axis in front: 1 by 28 by 28. expand dims with minus 1 adds a channel axis at the end instead. squeeze removes the size 1 axis again, and ravel flattens everything into 784 numbers.',
          },
          {
            kicker: 'Joining',
            title: 'concatenate versus stack',
            body: '`np.concatenate` joins arrays along an axis they already have. `np.stack` adds a new axis and joins along it. Two (2, 3) arrays give (4, 3) with concatenate, but (2, 2, 3) with stack.',
            visual: {
              type: 'code',
              code: STACK,
              output: '(4, 3)\n(2, 6)\n(2, 2, 3)\n(4, 3) (2, 6)',
            },
            narration:
              'January and February each have 2 rows and 3 columns. concatenate puts the rows one after the other: 4 by 3. With axis 1 it puts them side by side: 2 by 6. stack adds a new first axis, one slice per month: 2 by 2 by 3. vstack and hstack are shortcuts for rows and columns.',
          },
          {
            kicker: 'Try it',
            title: 'Hours into rows',
            try: {
              type: 'code',
              prompt:
                'readings holds 12 hourly values. Reshape them into 3 rows of 4, then print the mean of each row.',
              starter:
                'import numpy as np\n\nreadings = np.arange(12)\n# reshape to 3 rows of 4, then print each row’s mean',
              expected: '[1.5 5.5 9.5]',
              hint: 'Use `readings.reshape(3, 4)`, then `.mean(axis=1)` for one mean per row.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Which reshape fails',
            try: {
              type: 'choice',
              prompt: 'An array has 30 elements. Which reshape raises an error?',
              options: [
                {
                  text: '`reshape(4, -1)`',
                  correct: true,
                  feedback: 'Right. 30 is not a multiple of 4, so no second size works.',
                },
                {
                  text: '`reshape(5, -1)`',
                  correct: false,
                  feedback: 'That works: NumPy fills in 6, giving (5, 6).',
                },
                {
                  text: '`reshape(2, 3, 5)`',
                  correct: false,
                  feedback: 'That works: 2 × 3 × 5 is 30.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'playground.scale',
      kind: 'PLAYGROUND',
      title: 'Scale every column',
      depthRank: 1,
      conceptKeys: [AX, BC],
      body: {
        language: 'python',
        instructions:
          'Features on different scales confuse many models. Min-max scale every column of X to the range 0 to 1. Then standardise every column to mean 0 and standard deviation 1. Use one line each, with no loops.',
        starterCode: SCALE_START,
        hints: [
          '`X.min(axis=0)` and `X.max(axis=0)` give one value per column, shape (3,), which broadcasts against (4, 3).',
          'Min-max: `(X - lo) / (hi - lo)`.',
          'Standardise: `(X - X.mean(axis=0)) / X.std(axis=0)`.',
        ],
        solution: SCALE_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '[0.57 0.56 0.  ]',
            label: 'Min-max scaling: the second customer becomes 0.57, 0.56, 0',
          },
          {
            type: 'stdout_contains',
            value: '[ 1.46  1.47 -0.39]',
            label: 'Standardising: the last customer becomes 1.46, 1.47, −0.39',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Broadcasting check',
      depthRank: 1,
      conceptKeys: [AX, BC, RS],
      body: {
        items: [
          {
            key: 'shape',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\na = np.ones((2, 3))\nb = np.array([1, 2, 3])\nprint((a + b).shape)',
            options: [
              { id: 'a', text: '(2, 3)' },
              { id: 'b', text: '(3,)' },
              { id: 'c', text: '(2,)' },
              { id: 'd', text: 'A ValueError' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'From the right, 3 matches 3, and the missing axis counts as 1. So b is added to each of the 2 rows.',
          },
          {
            key: 'axis0',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nx = np.array([[1, 2], [3, 4]])\nprint(x.sum(axis=0))',
            options: [
              { id: 'a', text: '[4 6]' },
              { id: 'b', text: '[3 7]' },
              { id: 'c', text: '10' },
              { id: 'd', text: '[[4 6]]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Axis 0 collapses the rows, so each column is added: 1 + 3 and 2 + 4. Without keepdims the result is 1-D.',
          },
          {
            key: 'rowshare',
            type: 'mcq',
            prompt: 'X has shape (100, 5). Which line divides each row by its own total?',
            options: [
              { id: 'a', text: 'X / X.sum(axis=1, keepdims=True)' },
              { id: 'b', text: 'X / X.sum(axis=1)' },
              { id: 'c', text: 'X / X.sum(axis=0)' },
              { id: 'd', text: 'X / X.sum()' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Row totals with keepdims have shape (100, 1), which broadcasts across the 5 columns. Without keepdims, (100,) clashes with (100, 5).',
          },
          {
            key: 'minus1',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nprint(np.arange(6).reshape(2, -1).shape)',
            options: [
              { id: 'a', text: '(2, 3)' },
              { id: 'b', text: '(2, 6)' },
              { id: 'c', text: '(3, 2)' },
              { id: 'd', text: 'A ValueError' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '-1 asks NumPy to work out the size: 6 elements in 2 rows means 3 columns.',
          },
          {
            key: 'silent',
            type: 'mcq',
            prompt:
              'y_true has shape (50,) and y_pred has shape (50, 1). What does y_pred - y_true give?',
            options: [
              { id: 'a', text: 'A (50, 50) array, with no error' },
              { id: 'b', text: 'A (50,) array of errors' },
              { id: 'c', text: 'A (50, 1) array of errors' },
              { id: 'd', text: 'A ValueError' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '(50, 1) and (50,) broadcast to (50, 50). Flatten y_pred first, and assert the shapes match.',
          },
          {
            key: 'stack',
            type: 'mcq',
            prompt: 'What is the shape of np.stack([a, b, c]) if each array has shape (4, 5)?',
            options: [
              { id: 'a', text: '(3, 4, 5)' },
              { id: 'b', text: '(12, 5)' },
              { id: 'c', text: '(4, 15)' },
              { id: 'd', text: '(4, 5)' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'stack adds a new first axis, one slice per array. concatenate would give (12, 5).',
          },
        ],
      },
    },
    {
      key: 'interview.broadcasting',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Explaining broadcasting',
      depthRank: 1,
      conceptKeys: [BC, AX],
      body: {
        question: '"What is broadcasting in NumPy? Give an example and a pitfall."',
        totalMinutes: 2,
        steps: [
          {
            title: 'Define',
            detail:
              'NumPy combines arrays of different shapes by stretching size-1 axes, without copying data.',
          },
          {
            title: 'Give the rule',
            detail:
              'Compare shapes from the right: sizes must be equal or 1, and a missing axis counts as 1.',
          },
          {
            title: 'Example',
            detail:
              'Centring features: `X - X.mean(axis=0)` subtracts a (3,) row of means from a (1000, 3) table.',
          },
          {
            title: 'Pitfall',
            detail:
              'A (n,) array with a (n, 1) array gives an n × n table silently, a classic bug in loss functions.',
          },
          {
            title: 'Habit',
            detail:
              'Print or assert shapes at each step, and use keepdims or `[:, None]` to make intent explicit.',
          },
        ],
        followUps: [
          'For a 2-D array, what does axis=0 mean?',
          'How do you fix "operands could not be broadcast together"?',
          'How would you compute pairwise distances without loops?',
          'What is the difference between concatenate and stack?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [BC, AX, RS],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'What broadcasting is',
            front: 'What is broadcasting in NumPy?',
            back: 'Broadcasting lets NumPy combine arrays of different shapes without copying data. Shapes are compared from the right. Two sizes fit if they are equal or one of them is 1, and a missing axis counts as 1. Size-1 axes are stretched. For example, `X - X.mean(axis=0)` subtracts each column’s mean from every row.',
          },
          {
            title: 'A clash',
            front: 'Can arrays of shape (4, 3) and (4,) be added? Why or why not?',
            back: 'No. From the right, 3 and 4 differ and neither is 1, so NumPy raises "operands could not be broadcast together". To add one value per row, reshape the second array to (4, 1) with `b[:, None]` or `b.reshape(4, 1)`. Then the shapes fit and the result is (4, 3).',
          },
          {
            title: 'axis=0 vs axis=1',
            front: 'For a 2-D array, what is the difference between sum(axis=0) and sum(axis=1)?',
            back: '`axis=0` collapses the rows, adding down each column, so you get one result per column. `axis=1` collapses the columns, adding across each row, so you get one result per row. For sales of shape (stores, days), axis=0 gives daily totals and axis=1 gives store totals. In pandas too, axis=1 means columns: `df.drop("col", axis=1)` removes a column.',
          },
          {
            title: 'keepdims',
            front: 'What does keepdims=True do, and when do you need it?',
            back: 'It keeps the collapsed axis with size 1, so `X.sum(axis=1, keepdims=True)` has shape (n, 1) instead of (n,). The result then broadcasts back against X. Common uses are row-wise normalisation, `X / X.sum(axis=1, keepdims=True)`, and a stable softmax that subtracts each row’s maximum.',
          },
          {
            title: 'Fixing a shape error',
            front:
              'Your code raises "operands could not be broadcast together with shapes (32,10) (32,)". How do you fix it?',
            back: 'Print the shapes in that line and line them up from the right: 10 and 32 clash. You meant one value per row, so give the second array shape (32, 1). Use `[:, None]`, or `keepdims=True` on the step that made it. Then add an assert on the shapes, so the bug cannot return silently.',
          },
          {
            title: 'Silent shape bugs',
            front:
              'y_true has shape (100,) and y_pred has shape (100, 1). What goes wrong in a loss function?',
            back: '`y_pred - y_true` broadcasts to a 100 × 100 table instead of 100 errors, and no error is raised. The mean of that table is a meaningless loss. Flatten with `y_pred.ravel()` or `squeeze()`, and assert that the shapes match before computing any metric.',
          },
          {
            title: 'reshape and -1',
            front: 'How does reshape work, and what does -1 mean?',
            back: '`reshape` lays the same elements out in a new shape, row by row, keeping their order. The sizes must multiply to the original total: 12 elements fit (3, 4) or (2, 6), but not (5, 3). -1 lets NumPy work out one size. So `reshape(-1)` flattens, and `reshape(-1, 1)` makes the (n, 1) column scikit-learn expects for one feature.',
          },
          {
            title: 'Transposing a matrix',
            front: 'How do you transpose an M × N matrix, in NumPy and in plain Python?',
            back: 'In NumPy, `A.T` swaps rows and columns, so shape (m, n) becomes (n, m). In plain Python, `[list(row) for row in zip(*A)]` does the same. `reshape(n, m)` is not a transpose. It keeps the row-by-row order, so the values land in the wrong places.',
          },
          {
            title: 'concatenate vs stack',
            front: 'What is the difference between np.concatenate and np.stack?',
            back: '`concatenate` joins arrays along an axis they already have: two (2, 3) arrays give (4, 3) on axis 0. `stack` adds a new axis and joins along it, so the same two give (2, 2, 3). `vstack` and `hstack` are shortcuts for joining by rows and by columns.',
          },
          {
            title: 'Pairwise distances',
            front:
              'How would you compute the distances between every point in P and every point in Q, without loops?',
            back: 'Add axes so the shapes broadcast: `P[:, None, :] - Q[None, :, :]` has shape (m, n, d). Square it, sum over the last axis and take the square root to get an m × n table. For large sets, expand |p − q|² into |p|² + |q|² − 2 p·q. That needs one matrix multiplication and far less memory.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Broadcasting: key takeaways',
      depthRank: 1,
      conceptKeys: [BC, AX, RS],
      body: {
        takeaways: [
          'axis names the direction that collapses: axis=0 gives one result per column, axis=1 one per row.',
          'keepdims=True keeps a size-1 axis, so the result broadcasts back against the original.',
          'Broadcasting compares shapes from the right: sizes must be equal or 1, and a missing axis counts as 1.',
          'Use [:, None] or reshape to turn one value per row into shape (n, 1).',
          'Watch for silent bugs: (n,) with (n, 1) gives an n × n table.',
          'reshape keeps the order and -1 fills in one size; concatenate joins an axis, stack adds one.',
        ],
        remember: [
          'From the right: equal or 1',
          'axis=0 down, axis=1 across',
          'Assert shapes before a loss',
        ],
      },
    },
  ],
};
