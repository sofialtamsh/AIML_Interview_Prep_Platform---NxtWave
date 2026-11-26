/**
 * Python & NumPy for AI → NumPy arrays and vectorization.
 *
 * Evidence (Hiring Intelligence, all families, Jan–Oct 2026; internal only, never quoted to
 * students): what NumPy is and what it is used for, NumPy vs pandas, list vs array and why arrays
 * are faster than loops, vectorisation in ML, an array's dimensions, a[1:5, :] vs a[1:5], why
 * np.minimum(), and "how did you use NumPy in your project". One bar for every package for now,
 * aimed at 8–12 LPA and kept simple, so every section is depth 1. Outputs were checked with NumPy
 * 2.5 and 2.4 (the browser runs 2.4). Integer dtypes are never printed: the browser's default
 * integer can differ from a 64-bit PC's.
 */
import type { LessonDocumentInput } from '@app/content';

const AR = 'numpy.ndarray-basics';
const VEC = 'numpy.vectorization';
const IDX = 'numpy.indexing-slicing';

const CREATE = `import numpy as np

marks = np.array([[78, 85, 62],
                  [92, 70, 88]])
print(marks.shape, marks.ndim, marks.size)
print(np.zeros((2, 3)))
print(np.arange(0, 10, 3))
print(np.linspace(0, 1, 5))`;

const DTYPE = `import numpy as np

print(np.array([1, 2.5]).dtype)
print(np.array([1, 2.5, "3"]))
pixels = np.array([200, 250], dtype=np.uint8)
print(pixels + 100)
print(pixels.astype(np.int16) + 100)`;

const GST = `import numpy as np

price_list = [100, 250, 400, 80, 120]
with_gst = []
for p in price_list:
    with_gst.append(p * 1.18)

prices = np.array(price_list)
print(prices * 1.18)
print(prices.sum(), prices.mean(), prices.max())`;

const UFUNC = `import numpy as np

fees = np.array([30, 45, 80, 25])
print(fees * 2)
print(np.minimum(fees, 50))
print(np.min(fees))
print(np.where(fees > 40, "high", "low"))`;

const SLICE_1D = `import numpy as np

a = np.array([10, 20, 30, 40, 50])
print(a[0], a[-1])
print(a[1:4])
print(a[::2])
print(a[::-1])`;

const SLICE_2D = `import numpy as np

a = np.arange(20).reshape(4, 5)
print(a[1])
print(a[:, 2])
print(a[1:3, 1:4])
print(a[1].shape, a[1:2].shape)`;

const MASK = `import numpy as np

temps = np.array([31, 36, 29, 38, 35])
hot = temps > 35
print(hot)
print(temps[hot], hot.sum())
print(temps[(temps > 30) & (temps < 37)])`;

const FANCY = `import numpy as np

scores = np.array([72, 95, 64, 88])
print(scores[[0, 2]])
top = np.argsort(scores)[::-1][:2]
print(top, scores[top])`;

const VIEW = `import numpy as np

a = np.array([10, 20, 30, 40])
b = a[1:3]
b[0] = 99
print(a)
c = a[a > 15]
c[0] = 0
print(a, c)
print(np.shares_memory(a, b), np.shares_memory(a, c))`;

const CLEAN_HEAD = `import numpy as np

# Daily temperatures; -999 means the sensor failed
temps = np.array([31.5, 33.0, -999, 35.5, 36.0, -999, 34.5])
`;
const CLEAN_START = `${CLEAN_HEAD}
# 1. valid: a mask that is True where the reading is real
# 2. mean: the mean of the valid readings, rounded to 2
# 3. above: how many valid readings are above 34
# 4. put the mean in place of every -999
# Use no loops.
valid = temps
mean = 0
above = 0
print(mean, above)
print(temps)
`;
const CLEAN_SOLUTION = `${CLEAN_HEAD}
valid = temps != -999
mean = round(temps[valid].mean(), 2)
above = (temps[valid] > 34).sum()
print(mean, above)
temps[~valid] = mean
print(temps)
`;

export const NUMPY_ARRAYS_VECTORIZATION_LESSON: LessonDocumentInput = {
  title: 'NumPy arrays and vectorization',
  subtitle:
    'Why ML code uses arrays instead of loops, and how to create, slice and filter them: the NumPy basics interviews check first.',
  objectives: [
    {
      key: 'create',
      text: 'Create and inspect arrays: shape, ndim, size and dtype',
      minDepthRank: 1,
    },
    {
      key: 'vectorise',
      text: 'Replace a Python loop with a vectorised expression, and explain why it is faster',
      minDepthRank: 1,
    },
    {
      key: 'select',
      text: 'Select rows, columns and values with slicing, boolean masks and position lists',
      minDepthRank: 1,
    },
    {
      key: 'views',
      text: 'Tell a view from a copy, and avoid editing data by accident',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'Photos as grids of numbers',
      depthRank: 1,
      conceptKeys: [VEC],
      body: {
        scenario:
          'Every photo on your phone is a grid of numbers: a 12-megapixel photo holds 36 million of them. Brightening it means adding to every one. A Python loop takes seconds. NumPy does it in a blink.',
        animation: {
          name: 'vectorized-vs-loop',
          caption: 'Real use: GST on every order in one step',
        },
        realWorld: {
          title: 'Where NumPy arrays live',
          items: [
            { icon: 'image', label: 'Photos', sub: 'Height × width × 3 colour values' },
            { icon: 'users', label: 'Recommendations', sub: 'Each user is a row of numbers' },
            { icon: 'chart', label: 'Sensor data', sub: 'Readings over time' },
            { icon: 'bot', label: 'ML models', sub: 'Weights stored as arrays' },
          ],
        },
        provocation: 'Why is NumPy faster than a Python list for the same maths?',
        bridge:
          'pandas and scikit-learn are built on NumPy arrays, and PyTorch tensors work much the same way. Interviews check that you can create, slice and filter arrays without loops, and explain why that is fast.',
      },
    },
    {
      key: 'slides.arrays',
      kind: 'SLIDES',
      title: 'Arrays, shape and dtype',
      depthRank: 1,
      conceptKeys: [AR],
      body: {
        slides: [
          {
            kicker: 'The tool',
            title: 'Lists versus arrays',
            body: 'A Python list holds **pointers** to separate objects, which may be of any type. A NumPy **array** stores numbers of one type side by side, in one block of memory. That layout lets NumPy run maths over the whole block in fast compiled code.',
            animation: {
              name: 'list-vs-array',
              caption: 'Real use: millions of pixel values in one block',
            },
          },
          {
            kicker: 'In code',
            title: 'Create and inspect an array',
            visual: {
              type: 'code',
              code: CREATE,
              output:
                '(2, 3) 2 6\n[[0. 0. 0.]\n [0. 0. 0.]]\n[0 3 6 9]\n[0.   0.25 0.5  0.75 1.  ]',
            },
            note: '`arange` works like `range` and leaves out the stop. `linspace(0, 1, 5)` gives 5 evenly spaced values and includes both ends.',
            narration:
              'np dot array turns a list of lists into a 2-D array of marks. Its shape is 2 rows by 3 columns, it has 2 axes, and it holds 6 numbers. zeros builds an array of the shape you ask for, filled with zeros. The dot after each 0 means float, the default type. arange counts from 0 in steps of 3 and stops before 10. linspace gives 5 evenly spaced values from 0 to 1, both ends included.',
          },
          {
            kicker: 'Shape',
            title: 'Axes and shape',
            body: 'An **axis** is one direction of an array, and the **shape** lists its length along each axis. A row of 4 numbers has shape (4,). A table of 3 rows and 4 columns has shape (3, 4). Axis 0 runs down the rows, axis 1 across the columns. `ndim` counts the axes.',
            animation: {
              name: 'array-axes',
              caption: 'Real use: a colour photo is (height, width, 3)',
            },
          },
          {
            kicker: 'One type',
            title: 'Every element shares one dtype',
            body: 'An array has one **dtype**, the type of every element. Mix whole numbers and decimals, and everything becomes a float. Add a string, and everything becomes text, so maths no longer works.',
            visual: {
              type: 'code',
              code: DTYPE,
              output: "float64\n['1' '2.5' '3']\n[44 94]\n[300 350]",
            },
            note: 'Photos are often uint8, from 0 to 255. Going past 255 wraps around silently, so convert to a bigger type first, then `np.clip` back.',
            narration:
              'One whole number and one decimal give a float64 array. Add the string 3, and every element becomes text. Now a trap. Pixels are often stored as uint8, which holds only 0 to 255. Adding 100 to 200 should give 300, but it wraps around to 44, with no warning. Converting to int16 first gives the right answers, 300 and 350.',
          },
          {
            kicker: 'Try it',
            title: 'Build your first array',
            try: {
              type: 'code',
              prompt:
                'Make an array of the order amounts 120, 340, 90, 560 and 210. Print its shape and its largest value on one line.',
              starter: 'import numpy as np\n\n# make the array, then print its shape and max',
              expected: '(5,) 560',
              hint: 'Use `orders = np.array([...])`, then `print(orders.shape, orders.max())`.',
              packages: ['numpy'],
            },
          },
        ],
      },
    },
    {
      key: 'slides.vectorize',
      kind: 'SLIDES',
      title: 'Vectorization: no loops',
      depthRank: 1,
      conceptKeys: [VEC],
      body: {
        slides: [
          {
            kicker: 'Story',
            title: 'GST on every order',
            body: 'A shop adds 18% GST to every order. A loop handles one amount per step. With NumPy, `prices * 1.18` handles the whole array in one step. This is **vectorization**: one operation on whole arrays, with no Python loop.',
            animation: {
              name: 'vectorized-vs-loop',
              caption: 'Real use: billing a million orders at once',
            },
          },
          {
            kicker: 'In code',
            title: 'The loop and the one-liner',
            visual: {
              type: 'code',
              code: GST,
              output: '[118.  295.  472.   94.4 141.6]\n950 190.0 400',
            },
            note: 'Both give the same amounts. On a million orders, the NumPy line is often tens of times faster.',
            narration:
              'The loop visits one price at a time and appends its amount with GST. The NumPy version turns the list into an array and multiplies the whole array by 1.18 in a single line. The results match: 100 becomes 118, and 80 becomes 94.4. Sum, mean and max also run on the whole array.',
          },
          {
            kicker: 'Why faster',
            title: 'Why NumPy is faster',
            visual: {
              type: 'icons',
              items: [
                {
                  icon: 'cpu',
                  label: 'Compiled loops',
                  sub: 'The loop runs in C, not in Python',
                },
                {
                  icon: 'layers',
                  label: 'One type',
                  sub: 'No type check for each element',
                },
                {
                  icon: 'zap',
                  label: 'One block of memory',
                  sub: 'Read fast; several numbers per instruction (SIMD)',
                },
              ],
            },
            note: 'A Python loop interprets each step and handles each number as a separate object. NumPy skips both costs.',
          },
          {
            kicker: 'Element-wise',
            title: 'Maths on whole arrays',
            body: 'Operators such as `+`, `*` and `>` work element by element: `a * b` multiplies matching positions, not matrices. Functions like `np.sqrt` and `np.exp` also run on every element. These are **ufuncs**, short for universal functions.',
            visual: {
              type: 'code',
              code: UFUNC,
              output: "[ 60  90 160  50]\n[30 45 50 25]\n25\n['low' 'high' 'high' 'low']",
            },
            note: '`np.min(a)` gives one number, the smallest. `np.minimum(a, b)` compares element by element, so here it caps each fee at 50.',
            narration:
              'Doubling the fees doubles every element. np dot minimum compares each fee with 50 and keeps the smaller, so 80 is capped at 50. np dot min is different: it returns one number, the smallest fee, 25. np dot where is a vectorised if else: high where the fee is above 40, low elsewhere.',
          },
          {
            kicker: 'Try it',
            title: 'Celsius to Fahrenheit',
            try: {
              type: 'code',
              prompt:
                'Convert the Celsius readings to Fahrenheit with no loop, using F = C × 9 / 5 + 32. Print the result.',
              starter:
                'import numpy as np\n\ncelsius = np.array([25, 30, 35, 40])\n# convert without a loop, then print',
              expected: '[ 77.  86.  95. 104.]',
              hint: 'Write the formula on the whole array: `print(celsius * 9 / 5 + 32)`.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Cap every fee',
            try: {
              type: 'choice',
              prompt: 'Every delivery fee above 50 must become 50. Which line does that?',
              options: [
                {
                  text: '`np.minimum(fees, 50)`',
                  correct: true,
                  feedback: 'Right. It keeps the smaller of each fee and 50, element by element.',
                },
                {
                  text: '`np.min(fees)`',
                  correct: false,
                  feedback: 'That returns one number, the smallest fee, not a capped array.',
                },
                {
                  text: '`np.maximum(fees, 50)`',
                  correct: false,
                  feedback: 'That raises every fee below 50 up to 50: a floor, not a cap.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'slides.indexing',
      kind: 'SLIDES',
      title: 'Indexing, slicing and masks',
      depthRank: 1,
      conceptKeys: [IDX],
      body: {
        slides: [
          {
            kicker: '1-D',
            title: 'Index and slice a row',
            visual: {
              type: 'code',
              code: SLICE_1D,
              output: '10 50\n[20 30 40]\n[10 30 50]\n[50 40 30 20 10]',
            },
            note: 'A slice `start:stop:step` keeps start and leaves out stop, like Python lists. A step of -1 reverses.',
            narration:
              'Index 0 is the first element and minus 1 the last. The slice from 1 to 4 keeps positions 1, 2 and 3, so stop is left out. A step of 2 takes every second element. A step of minus 1 walks backwards and reverses the array.',
          },
          {
            kicker: '2-D',
            title: 'Rows, columns and blocks',
            body: 'In 2-D, write one index or slice per axis: `a[row, col]`. `a[1]` is a row, `a[:, 2]` a column and `a[1:3, 1:4]` a block. `a[1:3, :]` and `a[1:3]` are the same, because a missing axis means all of it.',
            animation: {
              name: 'slice-2d',
              caption: 'Real use: picking samples (rows) and features (columns)',
            },
          },
          {
            kicker: 'In code',
            title: 'One index drops an axis',
            visual: {
              type: 'code',
              code: SLICE_2D,
              output: '[5 6 7 8 9]\n[ 2  7 12 17]\n[[ 6  7  8]\n [11 12 13]]\n(5,) (1, 5)',
            },
            note: 'A single index drops its axis; a slice keeps it. So `a[1]` is 1-D, while `a[1:2]` is still a 2-D table with one row.',
            narration:
              'arange gives the numbers 0 to 19, and reshape lays them out in 4 rows of 5. Index 1 gives the second row. Colon, 2 gives the third column from every row. Rows 1 to 2 with columns 1 to 3 give a small block. Last, compare the shapes. One index gives shape 5, but the slice from 1 to 2 keeps a table of shape 1 by 5.',
          },
          {
            kicker: 'Masks',
            title: 'Filter with a condition',
            body: 'A comparison like `temps > 35` gives a **boolean mask**: True or False for every element. `temps[mask]` keeps the True ones. Join conditions with `&` and `|`, with each condition in brackets.',
            animation: {
              name: 'boolean-mask',
              caption: 'Real use: keeping only valid sensor readings',
            },
          },
          {
            kicker: 'In code',
            title: 'Masks in action',
            visual: {
              type: 'code',
              code: MASK,
              output: '[False  True False  True False]\n[36 38] 2\n[31 36 35]',
            },
            note: 'Python’s `and` needs one True or False, not a whole array, so it raises an error. `mask.sum()` counts the True values.',
            narration:
              'temps greater than 35 marks each day True or False. Using that mask inside the brackets keeps 36 and 38, and summing the mask counts them: 2 hot days. For a range, wrap each condition in brackets and join them with the and symbol. Above 30 and below 37 keeps 31, 36 and 35.',
          },
          {
            kicker: 'Positions',
            title: 'Pick by a list of positions',
            visual: {
              type: 'code',
              code: FANCY,
              output: '[72 64]\n[1 3] [95 88]',
            },
            note: 'A list of positions inside the brackets is **fancy indexing**. `np.argsort` gives the positions that would sort the array, which makes top-k easy.',
            narration:
              'A list of positions, 0 and 2, picks those two scores. argsort returns the positions in sorted order, from lowest to highest. Reversing them and keeping the first two gives the positions of the top two scores, 1 and 3. Indexing with those positions gives the scores themselves, 95 and 88.',
          },
          {
            kicker: 'Views',
            title: 'Views and copies',
            body: 'A slice is a **view**: it shares memory with the original, so changing it changes the original. Reading with a mask or a list of positions gives a **copy**, but `a[mask] = 0` still writes into `a`. Call `.copy()` when you need a slice you can change safely.',
            animation: {
              name: 'view-vs-copy',
              caption: 'Real use: not editing your training data by accident',
            },
          },
          {
            kicker: 'In code',
            title: 'Prove it with shares_memory',
            visual: {
              type: 'code',
              code: VIEW,
              output: '[10 99 30 40]\n[10 99 30 40] [ 0 30 40]\nTrue False',
            },
            note: 'Views make slicing fast, because nothing is copied. They also cause silent bugs when you edit a slice and forget it is shared.',
            narration:
              'b is a slice of a, so it is a view. Setting the first element of b to 99 changes a as well. c comes from a mask, so it is a copy. Setting its first element to 0 leaves a untouched. shares memory confirms it: True for the slice, False for the mask.',
          },
          {
            kicker: 'Try it',
            title: 'Keep the high scores',
            try: {
              type: 'code',
              prompt:
                'Keep the scores above 80 and print them. Then print how many there are, on the next line.',
              starter:
                'import numpy as np\n\nscores = np.array([72, 95, 64, 88, 81, 79])\n# print the scores above 80, then their count',
              expected: '[95 88 81]\n3',
              hint: 'Make the mask `scores > 80`, use it inside `scores[...]`, then count with `.sum()`.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Two ways to write it',
            try: {
              type: 'choice',
              prompt: 'a has shape (6, 4). How do `a[1:5, :]` and `a[1:5]` differ?',
              options: [
                {
                  text: 'They do not: both are rows 1 to 4 with every column',
                  correct: true,
                  feedback: 'Right. A missing axis means all of it, and both are views.',
                },
                {
                  text: '`a[1:5]` is 1-D',
                  correct: false,
                  feedback: 'A slice keeps its axis, so both are 2-D with shape (4, 4).',
                },
                {
                  text: '`a[1:5, :]` is a copy and `a[1:5]` a view',
                  correct: false,
                  feedback: 'Both are basic slices, so both are views.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.indexing',
      kind: 'WIDGET',
      title: 'Explore slicing and masks',
      depthRank: 1,
      conceptKeys: [IDX],
      body: {
        widget: 'array-index-explorer',
        prompt:
          'Marks of five students in four subjects, as a NumPy array. Pick rows and columns, or test the marks against a value. Watch the expression, the result’s shape, and whether it is a view or a copy.',
        params: {
          name: 'marks',
          rowLabel: 'student',
          colLabel: 'subject',
          rowNames: ['Asha', 'Ravi', 'Meera', 'Kiran', 'Arjun'],
          colNames: ['Maths', 'Physics', 'Chem', 'English'],
          values: [
            [78, 85, 62, 90],
            [92, 70, 88, 65],
            [55, 60, 71, 82],
            [83, 91, 79, 74],
            [67, 58, 94, 88],
          ],
          modes: ['slice', 'mask', 'rows'],
          defaultMode: 'slice',
          threshold: { label: 'Mark above', min: 50, max: 95, step: 1, default: 85 },
          tasks: [
            'Keep every row and slice the columns from 2 to the end. What shape do you get?',
            'Set the columns back to All. Pick row 1 with One index, then as the slice 1 to 2. Why is one shape (4,) and the other (1, 4)?',
            'Switch to Mask cells at 85. How many marks pass? They do not form a rectangle, so NumPy lists them row by row in a 1-D array.',
            'Filter rows on Maths above 70. Who is left, and is the result a view or a copy?',
          ],
        },
      },
    },
    {
      key: 'playground.clean',
      kind: 'PLAYGROUND',
      title: 'Clean sensor readings',
      depthRank: 1,
      conceptKeys: [VEC, IDX],
      body: {
        language: 'python',
        instructions:
          'A temperature sensor writes -999 when it fails. Build a mask of the real readings, then find their mean, rounded to 2 decimals, and count the readings above 34. Finally, put the mean in place of every -999. Use no loops.',
        starterCode: CLEAN_START,
        hints: [
          '`valid = temps != -999` is True for every real reading.',
          '`temps[valid].mean()` averages only the real readings; `(temps[valid] > 34).sum()` counts the hot ones.',
          '`~valid` flips the mask. Assigning through a mask writes into `temps` itself, so `temps[~valid] = mean` fills only the failed readings.',
        ],
        solution: CLEAN_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '34.1 3',
            label: 'Mean of the real readings 34.1, with 3 above 34',
          },
          {
            type: 'stdout_contains',
            value: '[31.5 33.  34.1 35.5 36.  34.1 34.5]',
            label: 'Every -999 replaced by the mean',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'NumPy basics check',
      depthRank: 1,
      conceptKeys: [AR, VEC, IDX],
      body: {
        items: [
          {
            key: 'shapes',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\na = np.array([[1, 2, 3], [4, 5, 6]])\nprint(a[1].shape, a[:, 1:].shape)',
            options: [
              { id: 'a', text: '(3,) (2, 2)' },
              { id: 'b', text: '(1, 3) (2, 2)' },
              { id: 'c', text: '(3,) (2, 3)' },
              { id: 'd', text: '(2,) (3, 2)' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A single index drops its axis, so a[1] is a 1-D row of 3. a[:, 1:] keeps both rows and the last two columns.',
          },
          {
            key: 'dtype',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nprint(np.array([1, 2, 3.5]).dtype)',
            options: [
              { id: 'a', text: 'float64' },
              { id: 'b', text: 'int64' },
              { id: 'c', text: 'object' },
              { id: 'd', text: 'mixed' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'An array has one dtype. One decimal makes NumPy store every element as a float.',
          },
          {
            key: 'view',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\na = np.array([1, 2, 3, 4])\nb = a[:2]\nb[0] = 50\nprint(a)',
            options: [
              { id: 'a', text: '[50  2  3  4]' },
              { id: 'b', text: '[1 2 3 4]' },
              { id: 'c', text: '[50  2]' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'A slice is a view that shares memory with a, so changing b changes a. Use a[:2].copy() to avoid it.',
          },
          {
            key: 'range',
            type: 'mcq',
            prompt: 'Which line keeps the values of a that are above 10 and below 20?',
            options: [
              { id: 'a', text: 'a[(a > 10) & (a < 20)]' },
              { id: 'b', text: 'a[a > 10 and a < 20]' },
              { id: 'c', text: 'a[a > 10 & a < 20]' },
              { id: 'd', text: 'a[10:20]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`and` needs a single True or False. Without brackets, `&` runs before the comparisons. a[10:20] selects positions, not values.',
          },
          {
            key: 'minimum',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nprint(np.minimum(np.array([30, 60, 90]), 50))',
            options: [
              { id: 'a', text: '[30 50 50]' },
              { id: 'b', text: '30' },
              { id: 'c', text: '[50 60 90]' },
              { id: 'd', text: '[30 60 90]' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'np.minimum compares element by element and keeps the smaller value, so it caps each value at 50.',
          },
          {
            key: 'slow',
            type: 'mcq',
            prompt:
              'A feature is computed with a Python loop over 5 million rows, and it takes minutes. What should you try first?',
            options: [
              { id: 'a', text: 'Rewrite it as vectorised NumPy operations on whole arrays' },
              { id: 'b', text: 'Store the rows in a Python list instead' },
              { id: 'c', text: 'Convert the numbers to strings first' },
              { id: 'd', text: 'Add a progress print inside the loop' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'Vectorised operations run the loop in compiled code over one block of memory, which is usually far faster.',
          },
        ],
      },
    },
    {
      key: 'interview.list-vs-array',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Answering list versus array',
      depthRank: 1,
      conceptKeys: [AR, VEC],
      body: {
        question: '"Why would you use a NumPy array instead of a Python list?"',
        totalMinutes: 2,
        steps: [
          {
            title: 'Define',
            detail:
              'An array holds one type, packed in one block of memory. A list holds pointers to separate objects of any type.',
          },
          {
            title: 'Show',
            detail:
              'Give the quick example: `arr * 2` doubles every value, while `lst * 2` repeats the list.',
          },
          {
            title: 'Explain speed',
            detail:
              'Vectorised maths runs in compiled loops, with no type check per element, over memory the CPU reads quickly.',
          },
          {
            title: 'Trade-off',
            detail:
              'Lists suit mixed items that grow often. `np.append` copies the whole array each time, so build a list first, then convert.',
          },
          {
            title: 'Connect',
            detail:
              'Mention a project: features or images as arrays, and pandas, scikit-learn or PyTorch working on them.',
          },
        ],
        followUps: [
          'What is the difference between a view and a copy?',
          'How do you filter an array with two conditions?',
          'Why use np.minimum() instead of np.min()?',
          'What is broadcasting?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [AR, VEC, IDX],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'NumPy and pandas',
            front: 'What is NumPy used for, and how is it different from pandas?',
            back: 'NumPy gives fast arrays of numbers, such as features, images and model weights, with maths on whole arrays in compiled code. pandas is built on NumPy and adds labelled tables: named columns of mixed types, missing values, grouping and joins. Use NumPy for numeric arrays and pandas for tables.',
          },
          {
            title: 'List vs array',
            front: 'What is the difference between a Python list and a NumPy array?',
            back: 'A list can mix types and stores pointers to separate Python objects. An array holds one type, packed side by side, and supports element-wise maths: `arr * 2` doubles every value, while `lst * 2` repeats the list. Arrays use less memory and are much faster for numbers; lists suit mixed items that grow often.',
          },
          {
            title: 'Vectorization in ML',
            front: 'What is vectorization in ML, and why is it faster than a Python loop?',
            back: 'Vectorization means one operation on whole arrays instead of a Python loop. In ML, `((y_pred - y_true) ** 2).mean()` gives the mean squared error over all samples in one line. The loop then runs in compiled C over one type in one block of memory, often tens of times faster than Python.',
          },
          {
            title: 'shape, ndim, size, dtype',
            front: 'What do shape, ndim, size and dtype tell you about an array?',
            back: '`shape` gives the length of each axis, such as (3, 4) for 3 rows and 4 columns. `ndim` is the number of axes, here 2. `size` is the number of elements, 12. `dtype` is the type every element shares, such as float64. Checking shapes and dtypes first catches many bugs in ML code.',
          },
          {
            title: 'a[1:5, :] vs a[1:5]',
            front: 'In NumPy, what is the difference between a[1:5, :] and a[1:5]?',
            back: 'There is none: both select rows 1 to 4 with every column, as a view of the same data. Leaving out later axes means taking all of them. The difference that matters is a[1] versus a[1:2]. A single index drops the axis and gives a 1-D row; a slice keeps it.',
          },
          {
            title: 'View vs copy',
            front: 'What is the difference between a view and a copy in NumPy?',
            back: 'A view shares memory with the original array. Basic slices such as `a[1:3]` are views, so changing them changes `a`. Reading with a boolean mask or a list of positions makes a copy. Assigning through a mask, as in `a[a < 0] = 0`, still changes `a`. Call `.copy()` when you need an independent slice, and check with `np.shares_memory(a, b)`.',
          },
          {
            title: 'np.min vs np.minimum',
            front: 'Why would you use np.minimum() instead of np.min()?',
            back: '`np.min(a)` reduces an array to its single smallest value. `np.minimum(a, b)` compares two arrays element by element, with broadcasting, and keeps the smaller of each pair. So `np.minimum(fees, 50)` caps every fee at 50, and `np.maximum(x, 0)` is ReLU. `np.clip(x, low, high)` sets both limits at once.',
          },
          {
            title: 'Filtering with masks',
            front: 'How do you filter an array with two conditions?',
            back: 'A comparison like `a > 30` gives a boolean mask, and `a[mask]` keeps the True elements. For two conditions, wrap each in brackets and join them with `&` for and, or `|` for or: `a[(a > 30) & (a < 37)]`. Python’s `and` fails on arrays. `mask.sum()` counts the matches.',
          },
          {
            title: 'Image overflow',
            front:
              'You brighten an image by adding 100 to its uint8 array, and white areas turn dark. Why?',
            back: 'uint8 holds only 0 to 255, and NumPy array maths wraps around silently, so 250 + 100 becomes 94. Convert first, for example `img.astype(np.int16) + 100`, then `np.clip` the result to 0 and 255 and convert back to uint8. Always check the dtype when working with images.',
          },
          {
            title: 'NumPy in your projects',
            front: 'How have you used NumPy in your projects?',
            back: 'Name the steps where NumPy did the work, and mention only what you really did. For example: “pandas loaded the sensor file, and `.to_numpy()` gave me an array. A mask found the failed -999 readings and replaced them with the mean. `np.where` then turned readings into labels, with no loops.”',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'NumPy arrays: key takeaways',
      depthRank: 1,
      conceptKeys: [AR, VEC, IDX],
      body: {
        takeaways: [
          'An array holds one dtype in one block of memory; check shape, ndim, size and dtype first.',
          'Vectorised operations run on whole arrays in compiled code, so avoid Python loops over numbers.',
          'Operators and ufuncs work element by element; np.min reduces, np.minimum compares pairs.',
          'One index drops an axis and a slice keeps it; a missing axis means all of it.',
          'Masks filter by condition: bracket each condition and join them with & or |.',
          'Slices are views that share memory; masks and position lists make copies.',
        ],
        remember: [
          'a[1] is 1-D, a[1:2] is 2-D',
          'Slice = view, mask = copy',
          'uint8 wraps past 255',
        ],
      },
    },
  ],
};
