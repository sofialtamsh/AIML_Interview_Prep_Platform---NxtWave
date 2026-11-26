/**
 * Python & NumPy for AI → Linear algebra essentials for AI.
 *
 * Evidence (Hiring Intelligence, all families, Jan–Oct 2026; internal only, never quoted to
 * students): implement matrix multiplication with NumPy and in plain Python, transpose a matrix,
 * what np.linalg.norm does, how cosine similarity works, "what cosine value did you use and why",
 * and computing scores against many vectors. Interviewers at 8+ LPA add batch similarity as one
 * matrix multiply and vector-search follow-ups. One bar for every package for now, aimed at 8–12
 * LPA and kept simple, so every section is depth 1. Outputs were checked with NumPy 2.5 and 2.4
 * (the browser runs 2.4); both print the same.
 */
import type { LessonDocumentInput } from '@app/content';

const DOT = 'linalg.dot-product';
const NORM = 'linalg.vector-norms';
const MM = 'linalg.matmul';

const DOT_CODE = `import numpy as np

marks = np.array([80, 90, 70])
weights = np.array([0.5, 0.3, 0.2])
total = 0
for m, w in zip(marks, weights):
    total += m * w
print(total)
print(np.dot(marks, weights), marks @ weights)
print((marks * weights).sum())`;

const NORM_CODE = `import numpy as np

v = np.array([3, 4])
print(np.linalg.norm(v), np.sqrt((v ** 2).sum()))
print(np.linalg.norm(v, 1), np.abs(v).sum())
a = np.array([1, 2])
b = np.array([4, 6])
print(np.linalg.norm(a - b))
print(np.abs(a - b).sum())`;

const COSINE_CODE = `import numpy as np

def cosine(a, b):
    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))

a = np.array([3.0, 4.0])
print(cosine(a, np.array([6.0, 8.0])))
print(cosine(a, np.array([4.0, -3.0])))
u = a / np.linalg.norm(a)
print(u, np.linalg.norm(u))`;

const MATMUL_CODE = `import numpy as np

marks = np.array([[80, 90, 70],
                  [60, 75, 95]])
weights = np.array([[0.5, 0.2],
                    [0.3, 0.3],
                    [0.2, 0.5]])
scores = marks @ weights
print(scores.shape)
print(scores)
print(marks[1] @ weights[:, 1])`;

const TRAPS = `import numpy as np

A = np.array([[1, 2], [3, 4]])
B = np.array([[0, 1], [1, 0]])
print(A * B)
print(A @ B)
print(B @ A)
C = np.ones((2, 3))
print((A @ C).shape)
try:
    C @ A
except ValueError:
    print("C @ A fails:", C.shape, A.shape)`;

const BY_HAND = `def matmul(A, B):
    n, k, m = len(A), len(B), len(B[0])
    if len(A[0]) != k:
        raise ValueError("inner sizes differ")
    C = [[0] * m for _ in range(n)]
    for i in range(n):
        for j in range(m):
            for t in range(k):
                C[i][j] += A[i][t] * B[t][j]
    return C

print(matmul([[1, 2], [3, 4]], [[0, 1], [1, 0]]))`;

const BATCH = `import numpy as np

Q = np.array([[0.8, 0.6, 0.0],
              [0.0, 0.0, 1.0]])
D = np.array([[1.0, 0.0, 0.0],
              [0.0, 1.0, 0.0],
              [0.6, 0.8, 0.0],
              [0.0, 0.6, 0.8]])
scores = Q @ D.T
print(scores.shape)
print(scores)
print(scores.argmax(axis=1))
print(np.argsort(-scores[0])[:2])`;

const LAYER = `import numpy as np

rng = np.random.default_rng(0)
X = rng.random((32, 784))
W = rng.random((784, 128))
b = np.zeros(128)
H = np.maximum(X @ W + b, 0)
print(H.shape)`;

const SEARCH_HEAD = `import numpy as np

# 3 queries and 5 documents as 4-number embeddings
Q = np.array([[1, 0, 1, 0],
              [0, 2, 0, 2],
              [1, 1, 0, 0]])
D = np.array([[2, 0, 2, 0],
              [0, 1, 0, 1],
              [1, 0, 0, 1],
              [3, 3, 0, 0],
              [0, 0, 1, 1]])

# Raw dot products: long documents tend to win
raw = Q @ D.T
print(raw.argmax(axis=1))
`;
const SEARCH_START = `${SEARCH_HEAD}
# 1. Qn, Dn: every row divided by its own L2 norm
# 2. scores: Qn times Dn transposed (all cosines)
# 3. print scores rounded to 2, then each best document
Qn = Q
Dn = D
scores = Qn @ Dn.T
print(scores.round(2))
print(scores.argmax(axis=1))
`;
const SEARCH_SOLUTION = `${SEARCH_HEAD}
Qn = Q / np.linalg.norm(Q, axis=1, keepdims=True)
Dn = D / np.linalg.norm(D, axis=1, keepdims=True)
scores = Qn @ Dn.T
print(scores.round(2))
print(scores.argmax(axis=1))
`;

export const LINEAR_ALGEBRA_ESSENTIALS_LESSON: LessonDocumentInput = {
  title: 'Linear algebra essentials for AI',
  subtitle:
    'Dot products, vector lengths and matrix multiplication: the maths behind embeddings, similarity search and every neural network layer.',
  objectives: [
    {
      key: 'dot',
      text: 'Compute a dot product by hand and in NumPy, and explain it with angles and lengths',
      minDepthRank: 1,
    },
    {
      key: 'norms',
      text: 'Find L1 and L2 norms and distances, and choose between them',
      minDepthRank: 1,
    },
    {
      key: 'cosine',
      text: 'Compute cosine similarity, and explain why normalised vectors make it a dot product',
      minDepthRank: 1,
    },
    {
      key: 'matmul',
      text: 'Multiply matrices, predict the result shape, and score a batch with one matrix multiply',
      minDepthRank: 1,
    },
  ],
  sections: [
    {
      key: 'hook',
      kind: 'HOOK',
      title: 'How an app scores a match',
      depthRank: 1,
      conceptKeys: [DOT],
      body: {
        scenario:
          'A music app keeps a list of numbers for your taste and one for each song. To score a song, it multiplies the matching numbers and adds them up. That is a dot product, done for every song in the catalogue.',
        animation: {
          name: 'dot-product-steps',
          caption: 'Real use: a weighted score such as a final grade',
        },
        realWorld: {
          title: 'Where this maths runs',
          items: [
            { icon: 'search', label: 'Semantic search', sub: 'Query against every document' },
            { icon: 'music', label: 'Recommendations', sub: 'Your taste against each song' },
            {
              icon: 'brain',
              label: 'Neural networks',
              sub: 'Weights times inputs, layer by layer',
            },
            { icon: 'graduation', label: 'Grades', sub: 'Marks times subject weights' },
          ],
        },
        provocation: 'How would you score 1,000 queries against 10,000 documents without a loop?',
        bridge:
          'Embeddings, similarity search and neural network layers are built from three pieces: dot products, vector lengths and matrix multiplication. Interviews ask for all three, by hand and in NumPy.',
      },
    },
    {
      key: 'slides.dot',
      kind: 'SLIDES',
      title: 'The dot product',
      depthRank: 1,
      conceptKeys: [DOT],
      body: {
        slides: [
          {
            kicker: 'Definition',
            title: 'Multiply the pairs, then add',
            body: 'The **dot product** of two vectors of the same length multiplies matching entries and adds the products. A final grade is one: marks 80, 90 and 70 with weights 0.5, 0.3 and 0.2 give 40 + 27 + 14 = 81.',
            animation: {
              name: 'dot-product-steps',
              caption: 'Real use: a weighted score such as a final grade',
            },
          },
          {
            kicker: 'In code',
            title: 'By hand and in NumPy',
            visual: { type: 'code', code: DOT_CODE, output: '81.0\n81.0 81.0\n81.0' },
            note: '`@` is NumPy’s operator for the dot and matrix product. Both vectors must have the same length.',
            narration:
              'By hand, zip pairs each mark with its weight, and the loop adds up the products: 81. NumPy gives the same answer three ways: np dot, the at operator, and multiplying element by element and then summing.',
          },
          {
            kicker: 'Geometry',
            title: 'What the sign tells you',
            body: 'Geometrically, **a · b = ‖a‖ ‖b‖ cos θ**, where θ is the angle between the vectors. Pointing the same way gives a large positive value. At 90 degrees it is exactly 0, and pointing opposite makes it negative.',
            animation: {
              name: 'dot-angle',
              caption: 'Real use: is this document about the same thing as the query',
            },
          },
          {
            kicker: 'Neural networks',
            title: 'A neuron is a dot product',
            body: 'A neuron multiplies its inputs by its weights and adds them, plus a bias: **w · x + b**. An activation then decides the output. A whole layer is many dot products at once, which is one matrix multiplication.',
            animation: { name: 'neuron', caption: 'Real use: every layer of a neural network' },
          },
          {
            kicker: 'Try it',
            title: 'Dot product by hand',
            try: {
              type: 'code',
              prompt:
                'Compute the dot product of a and b with a loop and zip, then with `@` on NumPy arrays. Print both on one line.',
              starter:
                'import numpy as np\n\na = [2, 3, 1]\nb = [4, 0, 5]\n# loop with zip, then check with @',
              expected: '13 13',
              hint: 'Add up `x * y` for each pair from `zip(a, b)`, then compare with `np.array(a) @ np.array(b)`.',
              packages: ['numpy'],
            },
          },
        ],
      },
    },
    {
      key: 'slides.norms',
      kind: 'SLIDES',
      title: 'Vector length and norms',
      depthRank: 1,
      conceptKeys: [NORM],
      body: {
        slides: [
          {
            kicker: 'Length',
            title: 'L2 and L1 norms',
            body: 'A **norm** measures a vector’s size. The **L2 norm** is the straight-line length: √(3² + 4²) = 5 for (3, 4). The **L1 norm** adds the absolute values, 3 + 4 = 7, like walking along city blocks.',
            animation: {
              name: 'l1-vs-l2-norm',
              caption: 'Real use: distances between points and embeddings',
            },
          },
          {
            kicker: 'In code',
            title: 'Norms and distances',
            visual: { type: 'code', code: NORM_CODE, output: '5.0 5.0\n7.0 7\n5.0\n7' },
            note: 'The distance between two points is the norm of their difference: Euclidean with L2, Manhattan with L1.',
            narration:
              'np linalg norm gives the L2 length of 3 comma 4, which is 5, the same as squaring, summing and taking the root. With 1 as the second argument, it gives the L1 norm, 7, the sum of the absolute values. The distance between two points is the norm of their difference: 5 in a straight line, 7 along the grid.',
          },
          {
            kicker: 'Which one',
            title: 'L1 or L2',
            visual: {
              type: 'compare',
              left: {
                title: 'L1 (Manhattan)',
                items: [
                  'Adds absolute differences',
                  'One big difference counts as it is',
                  'As a penalty (lasso), sets some weights to 0',
                ],
              },
              right: {
                title: 'L2 (Euclidean)',
                items: [
                  'Root of the summed squares',
                  'Big differences count more',
                  'As a penalty (ridge), shrinks all weights a little',
                ],
              },
              better: 'none',
            },
            note: 'L2 is the usual default for distance. L1 is less pulled by one extreme value.',
          },
          {
            kicker: 'Normalise',
            title: 'Unit vectors and cosine',
            body: 'Dividing a vector by its L2 norm gives a **unit vector**, of length 1. The dot product of two unit vectors is their **cosine similarity**. It is 1 for the same direction, 0 at 90 degrees and −1 for opposite ones.',
            visual: {
              type: 'code',
              code: COSINE_CODE,
              output: '1.0\n0.0\n[0.6 0.8] 1.0',
            },
            note: 'Cosine ignores length: (6, 8) is twice as long as (3, 4) but points the same way, so the cosine is 1.',
            narration:
              'cosine divides the dot product by both lengths. 6 comma 8 points the same way as 3 comma 4, so the cosine is 1, even though it is twice as long. 4 comma minus 3 is at 90 degrees, so the cosine is 0. Dividing a by its length gives the unit vector 0.6 comma 0.8, of length 1.',
          },
          {
            kicker: 'In search',
            title: 'Why cosine for embeddings',
            body: 'Embedding models place similar meanings in similar directions. Cosine compares only the direction, so a long document and a short query can still match. If every vector is normalised first, the plain dot product gives the same ranking, and costs less.',
            animation: {
              name: 'embedding-space',
              caption: 'Real use: finding similar words and documents',
            },
          },
          {
            kicker: 'Scenario',
            title: 'Choosing a similarity threshold',
            body: 'Interviewers ask why you chose a cutoff such as cosine 0.6. Answer with evidence. Label real query and document pairs as relevant or not. Then pick the threshold with the best precision and recall for your product.',
            note: 'A higher cutoff gives fewer but surer matches; a lower one finds more but adds noise. The value depends on the embedding model, so recheck it when the model changes.',
          },
          {
            kicker: 'Try it',
            title: 'Write cosine similarity',
            try: {
              type: 'code',
              prompt:
                'Write `cosine(a, b)`. Print the cosine of (1, 2, 2) and (2, 4, 4). On the next line, print the cosine of (1, 0, 0) and (0, 1, 0).',
              starter:
                'import numpy as np\n\ndef cosine(a, b):\n    # dot product divided by both lengths\n    pass\n',
              expected: '1.0\n0.0',
              hint: 'Return `a @ b / (np.linalg.norm(a) * np.linalg.norm(b))`, and call it on NumPy arrays.',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Length and direction',
            try: {
              type: 'choice',
              prompt:
                'Two embeddings have cosine similarity 0.95. You double the length of one. What happens?',
              options: [
                {
                  text: 'The cosine stays 0.95; the dot product doubles',
                  correct: true,
                  feedback:
                    'Right. Cosine depends only on direction; the dot product also grows with length.',
                },
                {
                  text: 'Both the cosine and the dot product double',
                  correct: false,
                  feedback: 'Cosine divides by the lengths, so doubling one length cancels out.',
                },
                {
                  text: 'The cosine becomes 1',
                  correct: false,
                  feedback: 'The direction has not changed, so the cosine stays 0.95.',
                },
              ],
            },
          },
        ],
      },
    },
    {
      key: 'widget.vectors',
      kind: 'WIDGET',
      title: 'Explore dot products and cosine',
      depthRank: 1,
      conceptKeys: [DOT, NORM],
      body: {
        widget: 'vector-explorer',
        prompt:
          'Move the two vectors and watch the dot product, both lengths, the cosine and the angle respond. Switch on length 1 to see the unit vectors.',
        params: {
          range: 5,
          a: { x: 3, y: 4 },
          b: { x: 4, y: 1 },
          tasks: [
            'Set b to (4, −3). What are the dot product and the cosine, and why?',
            'Set b to (2, 1), then to (4, 2). Which numbers double, and which stay the same?',
            'Set b to (−3, −4). What is the cosine now?',
            'Compare the L1 and L2 lengths of a. When would they be equal?',
          ],
        },
      },
    },
    {
      key: 'slides.matmul',
      kind: 'SLIDES',
      title: 'Matrix multiplication',
      depthRank: 1,
      conceptKeys: [MM],
      body: {
        slides: [
          {
            kicker: 'The rule',
            title: 'Row times column',
            body: 'In **A @ B**, each result cell is a dot product: row i of A with column j of B. The inner sizes must match. (2, 3) @ (3, 2) works and gives (2, 2), the outer sizes.',
            animation: {
              name: 'matmul-row-col',
              caption: 'Real use: scoring many students, users or queries at once',
            },
          },
          {
            kicker: 'In code',
            title: 'Two schemes, two students',
            visual: {
              type: 'code',
              code: MATMUL_CODE,
              output: '(2, 2)\n[[81.  78. ]\n [71.5 82. ]]\n82.0',
            },
            note: 'Each column of `weights` is one grading scheme. One matrix multiply grades every student under every scheme.',
            narration:
              'marks holds two students, each with three subjects. weights holds two grading schemes as columns. marks at weights gives a 2 by 2 table: each student under each scheme. Asha gets 81 under scheme 1. The last line checks one cell by hand: Ravi’s row times the second column gives 82.',
          },
          {
            kicker: 'Traps',
            title: 'The @ operator versus *',
            body: '`*` multiplies element by element and needs shapes that broadcast. `@` is the matrix product and needs matching inner sizes. Order matters: A @ B and B @ A usually differ, and one of them may not exist.',
            visual: {
              type: 'code',
              code: TRAPS,
              output:
                '[[0 2]\n [3 0]]\n[[2 1]\n [4 3]]\n[[3 4]\n [1 2]]\n(2, 3)\nC @ A fails: (2, 3) (2, 2)',
            },
            narration:
              'The star multiplies matching positions, so B’s zeros wipe out half of A. The at operator multiplies rows by columns, which swaps A’s columns. B at A swaps its rows instead, a different answer. A at C works, 2 by 2 times 2 by 3. But C at A fails, because C has 3 columns and A has only 2 rows.',
          },
          {
            kicker: 'By hand',
            title: 'Matrix multiplication with loops',
            visual: { type: 'code', code: BY_HAND, output: '[[2, 1], [4, 3]]' },
            note: 'n × m cells, with k multiplications each: O(n·k·m) time. NumPy runs the same maths in optimised compiled code.',
            narration:
              'First check that the columns of A match the rows of B. Then build an n by m result full of zeros. Three nested loops fill it: for each row i and column j, add up A of i t times B of t j over every t. The answer matches NumPy’s.',
          },
          {
            kicker: 'Batch',
            title: 'Score every query at once',
            body: 'Put queries in the rows of Q, shape (2, 3), and documents in the rows of D, shape (4, 3). `Q @ D.T` has shape (2, 4): every query against every document in one step. `argmax(axis=1)` picks each query’s best.',
            animation: {
              name: 'batch-similarity',
              caption: 'Real use: semantic search over thousands of documents',
            },
          },
          {
            kicker: 'In code',
            title: 'Batch scores and top-k',
            visual: {
              type: 'code',
              code: BATCH,
              output: '(2, 4)\n[[0.8  0.6  0.96 0.36]\n [0.   0.   0.   0.8 ]]\n[2 3]\n[2 0]',
            },
            note: 'Every vector here has length 1, so each score is a cosine. Positions count from 0, so 2 and 3 are the third and fourth documents.',
            narration:
              'D transposed turns the documents into columns, so Q at D transposed is a 2 by 4 table of scores. argmax along axis 1 picks the best document for each query. Sorting the negative scores gives the top two for the first query: the third document, then the first.',
          },
          {
            kicker: 'Layer',
            title: 'A neural network layer',
            body: 'A dense layer is one matrix multiply plus a bias. Inputs X have shape (batch, features) and weights W have shape (features, units). A batch of 32 images of 784 pixels times W (784, 128) gives (32, 128).',
            visual: { type: 'code', code: LAYER, output: '(32, 128)' },
            note: 'The bias, shape (128,), broadcasts across the 32 rows, and `np.maximum(..., 0)` is ReLU.',
            narration:
              'X is a batch of 32 inputs with 784 numbers each. W maps 784 inputs to 128 units. X at W gives 32 rows of 128, and the bias is added to every row by broadcasting. np maximum with 0 is the ReLU activation. The output shape is 32 by 128.',
          },
          {
            kicker: 'Try it',
            title: 'Multiply two matrices',
            try: {
              type: 'code',
              prompt: 'Multiply A by B with `@`. Print the result, then its shape.',
              starter:
                'import numpy as np\n\nA = np.array([[1, 0, 2], [0, 1, 1]])\nB = np.array([[1, 2], [0, 1], [3, 0]])\n# multiply, then print the result and its shape',
              expected: '[[7 2]\n [3 1]]\n(2, 2)',
              hint: '`C = A @ B`, then `print(C)` and `print(C.shape)`. (2, 3) @ (3, 2) gives (2, 2).',
              packages: ['numpy'],
            },
          },
          {
            kicker: 'Try it',
            title: 'Predict the shape',
            try: {
              type: 'choice',
              prompt: 'A and B both have shape (5, 3). What is the shape of `A @ B.T`?',
              options: [
                {
                  text: '(5, 5)',
                  correct: true,
                  feedback:
                    'Right. B.T is (3, 5), so (5, 3) @ (3, 5) gives (5, 5): every row of A with every row of B.',
                },
                {
                  text: '(3, 3)',
                  correct: false,
                  feedback: 'That would be `A.T @ B`. Here the outer sizes are 5 and 5.',
                },
                {
                  text: 'It raises an error',
                  correct: false,
                  feedback: 'The inner sizes are 3 and 3, so it works.',
                },
              ],
            },
          },
          {
            kicker: 'Try it',
            title: 'Transpose without NumPy',
            try: {
              type: 'code',
              prompt:
                'Write `transpose(M)` in plain Python, without NumPy. Row j of the result is column j of M, so a (2, 3) matrix becomes (3, 2).',
              starter:
                'def transpose(M):\n    # build each new row from one column of M\n    pass\n\nprint(transpose([[1, 2, 3], [4, 5, 6]]))',
              expected: '[[1, 4], [2, 5], [3, 6]]',
              hint: '`[[row[j] for row in M] for j in range(len(M[0]))]` builds it column by column. `zip(*M)` also works if you turn each tuple into a list.',
            },
          },
        ],
      },
    },
    {
      key: 'widget.matmul',
      kind: 'WIDGET',
      title: 'Explore matrix multiplication',
      depthRank: 1,
      conceptKeys: [MM],
      body: {
        widget: 'matmul-explorer',
        prompt:
          'Two students’ marks and two grading schemes. Pick a result cell to see the row and column that make it. Then switch the operation to see why order and shapes matter.',
        params: {
          aName: 'marks',
          bName: 'weights',
          rowNames: ['Asha', 'Ravi'],
          innerNames: ['Maths', 'Physics', 'Chem'],
          colNames: ['Scheme 1', 'Scheme 2'],
          a: [
            [80, 90, 70],
            [60, 75, 95],
          ],
          b: [
            [0.5, 0.2],
            [0.3, 0.3],
            [0.2, 0.5],
          ],
          ops: ['a@b', 'b@a', 'a@a', 'a@a.T', 'a*b'],
          defaultOp: 'a@b',
          tasks: [
            'Pick Ravi’s Scheme 2 cell. Which row and column make it, and what do they add up to?',
            'Switch to weights @ marks. Why is the result 3 × 3, and does it mean anything?',
            'Try marks @ marks. Which sizes clash, and how does .T fix it?',
            'Try marks * weights. Why does * fail when @ works?',
          ],
        },
      },
    },
    {
      key: 'playground.search',
      kind: 'PLAYGROUND',
      title: 'Batch search with one multiply',
      depthRank: 1,
      conceptKeys: [NORM, MM],
      body: {
        language: 'python',
        instructions:
          'Raw dot products favour long documents. Normalise every query and document to length 1, then score all pairs with one matrix multiply. Print the scores rounded to 2 decimals, then the best document for each query.',
        starterCode: SEARCH_START,
        hints: [
          '`np.linalg.norm(Q, axis=1, keepdims=True)` gives one length per row, shape (3, 1), which broadcasts.',
          '`Qn = Q / np.linalg.norm(Q, axis=1, keepdims=True)`, and the same for D.',
          '`scores = Qn @ Dn.T` has shape (3, 5); `scores.argmax(axis=1)` picks each query’s best document.',
        ],
        solution: SEARCH_SOLUTION,
        checks: [
          {
            type: 'stdout_contains',
            value: '[0.  1.  0.5 0.5 0.5]',
            label:
              'The second query matches the second document perfectly once lengths are removed',
          },
          {
            type: 'stdout_contains',
            value: '[0 1 3]',
            label: 'Best documents by cosine: 0, 1 and 3 (raw dot products said 0, 3 and 3)',
          },
        ],
        packages: ['numpy'],
      },
    },
    {
      key: 'check.basics',
      kind: 'KNOWLEDGE_CHECK',
      title: 'Linear algebra check',
      depthRank: 1,
      conceptKeys: [DOT, NORM, MM],
      body: {
        items: [
          {
            key: 'dot',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nprint(np.array([1, 2, 3]) @ np.array([4, 5, 6]))',
            options: [
              { id: 'a', text: '32' },
              { id: 'b', text: '[ 4 10 18]' },
              { id: 'c', text: '21' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '1 × 4 + 2 × 5 + 3 × 6 = 4 + 10 + 18 = 32. Element-wise `*` would give [ 4 10 18].',
          },
          {
            key: 'norm',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nprint(np.linalg.norm(np.array([6, 8])))',
            options: [
              { id: 'a', text: '10.0' },
              { id: 'b', text: '14.0' },
              { id: 'c', text: '100.0' },
              { id: 'd', text: '14' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The default is the L2 norm: √(36 + 64) = √100 = 10. The L1 norm would be 14.',
          },
          {
            key: 'shape',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nA = np.ones((4, 3))\nB = np.ones((3, 2))\nprint((A @ B).shape)',
            options: [
              { id: 'a', text: '(4, 2)' },
              { id: 'b', text: '(3, 3)' },
              { id: 'c', text: '(4, 3)' },
              { id: 'd', text: 'A ValueError' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The inner sizes, 3 and 3, match, and the result takes the outer sizes: 4 and 2.',
          },
          {
            key: 'zero',
            type: 'mcq',
            prompt: 'Two non-zero vectors have a dot product of 0. What does that tell you?',
            options: [
              { id: 'a', text: 'They are perpendicular: the angle between them is 90 degrees' },
              { id: 'b', text: 'They are identical' },
              { id: 'c', text: 'One is twice as long as the other' },
              { id: 'd', text: 'Their lengths are equal' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'a · b = ‖a‖ ‖b‖ cos θ. With non-zero lengths, it is 0 only when cos θ is 0, at 90 degrees.',
          },
          {
            key: 'star',
            type: 'predict_output',
            prompt: 'What does this print?',
            language: 'python',
            code: 'import numpy as np\n\nA = np.array([[1, 2], [3, 4]])\nprint((A * A).tolist())',
            options: [
              { id: 'a', text: '[[1, 4], [9, 16]]' },
              { id: 'b', text: '[[7, 10], [15, 22]]' },
              { id: 'c', text: '[[2, 4], [6, 8]]' },
              { id: 'd', text: 'An error' },
            ],
            answer: { correct: ['a'] },
            explanation:
              '`*` squares each element. The matrix product `A @ A` would give [[7, 10], [15, 22]].',
          },
          {
            key: 'longdocs',
            type: 'mcq',
            prompt:
              'You rank documents by raw dot product with the query, and long documents keep winning. What is the usual fix?',
            options: [
              { id: 'a', text: 'Normalise the vectors, so the score is cosine similarity' },
              { id: 'b', text: 'Use the L1 norm as the score' },
              { id: 'c', text: 'Sort the scores in ascending order' },
              { id: 'd', text: 'Remove the short documents' },
            ],
            answer: { correct: ['a'] },
            explanation:
              'The dot product grows with length. Dividing by the lengths leaves only direction, which is what meaning is about.',
          },
        ],
      },
    },
    {
      key: 'interview.similarity',
      kind: 'INTERVIEW_PLAYBOOK',
      title: 'Designing fast similarity search',
      depthRank: 1,
      conceptKeys: [NORM, MM],
      body: {
        question: '"How would you find the documents most similar to a query, quickly?"',
        totalMinutes: 3,
        steps: [
          {
            title: 'Embed',
            detail: 'Turn the query and every document into vectors with the same embedding model.',
          },
          {
            title: 'Normalise',
            detail:
              'Divide every vector by its L2 norm once, offline, so a dot product is a cosine.',
          },
          {
            title: 'Score',
            detail:
              'One matrix multiply, `Q @ D.T`, scores every query against every document. With very many queries, multiply in chunks so the scores fit in memory.',
          },
          {
            title: 'Rank',
            detail:
              'Take the top k per row with `np.argpartition`, which finds the k best without sorting the whole row. Then sort only those k.',
          },
          {
            title: 'Scale and measure',
            detail:
              'For millions of documents, use an approximate nearest-neighbour (ANN) index such as HNSW, as vector databases do. Check recall@k: how many of the true top k it finds.',
          },
        ],
        followUps: [
          'Why cosine instead of a plain dot product?',
          'What does np.linalg.norm do?',
          'Write matrix multiplication without NumPy.',
          'How did you choose your similarity threshold?',
        ],
      },
    },
    {
      key: 'interview-questions',
      kind: 'CARD_DECK',
      title: 'Interview questions and answers',
      depthRank: 1,
      conceptKeys: [DOT, NORM, MM],
      body: {
        layout: 'flip',
        cards: [
          {
            title: 'Dot product',
            front: 'What is a dot product, and what does it measure?',
            back: 'Multiply matching entries of two equal-length vectors and add the products: [80, 90, 70] · [0.5, 0.3, 0.2] = 81. Geometrically it equals ‖a‖ ‖b‖ cos θ, so it grows when the vectors are long and point the same way. It is positive for angles under 90 degrees, 0 at 90 and negative beyond.',
          },
          {
            title: 'np.linalg.norm',
            front: 'What does np.linalg.norm do?',
            back: 'It returns the length (norm) of a vector. By default it is the L2 norm, the straight-line length: (3, 4) gives 5.0. With `ord=1` it is the L1 norm, the sum of absolute values: 7.0. `np.linalg.norm(a - b)` is the distance between two points. On a 2-D array, `axis=1` gives one norm per row; without it, one number for the whole matrix.',
          },
          {
            title: 'L1 vs L2',
            front: 'When would you use the L1 norm instead of the L2 norm?',
            back: 'L2 is the usual default; use L1 when one extreme value should not dominate, since L2 squares differences and L1 does not. As penalties, L1 (lasso) sets some weights to exactly 0, selecting features; L2 (ridge) shrinks all weights towards 0. Predicting one constant, L2 error is lowest at the mean and L1 error at the median.',
          },
          {
            title: 'Cosine similarity',
            front: 'How does cosine similarity work, and why use it for embeddings?',
            back: 'Cosine similarity is the dot product divided by both lengths: a · b / (‖a‖ ‖b‖). It compares only direction, from −1 to 1, so a long document and a short query can still match. Embedding models place similar meanings in similar directions. If vectors are normalised once, a plain dot product gives the same ranking.',
          },
          {
            title: 'Choosing a threshold',
            front: 'In your project, why did you choose a cosine similarity threshold of 0.6?',
            back: 'A good answer shows evidence, not a guess. Label real query and document pairs as relevant or not, and compute their cosines. A higher threshold returns fewer but surer matches (higher precision); a lower one finds more relevant ones but adds noise (higher recall). Pick the balance your product needs; recheck it when the model changes.',
          },
          {
            title: 'The matrix product rule',
            front: 'When can you multiply two matrices, and what shape is the result?',
            back: 'A @ B needs the columns of A to equal the rows of B: (n, k) @ (k, m) gives (n, m). Each cell (i, j) is the dot product of row i of A with column j of B. Order matters: B @ A may have a different shape, or may not exist at all.',
          },
          {
            title: '* vs @',
            front: 'What is the difference between * and @ for NumPy arrays?',
            back: '`*` multiplies element by element, so the shapes must match or broadcast. `@` is the matrix product, rows times columns, and needs matching inner sizes. For two 2 × 2 matrices both work, but they give different results. `np.dot` behaves like `@` for 1-D and 2-D arrays.',
          },
          {
            title: 'Matrix multiplication by hand',
            front: 'Write matrix multiplication without NumPy. What is its time complexity?',
            back: 'Check that the columns of A equal the rows of B, then create an n × m result of zeros. Use three nested loops: for each row i and column j, add A[i][t] × B[t][j] over every t. That is n × m cells with k multiplications each: O(n·k·m), or O(n³) for square matrices.',
          },
          {
            title: 'Transpose by hand',
            front: 'Transpose an M × N matrix without NumPy.',
            back: 'The transpose swaps rows and columns, so an M × N matrix becomes N × M. In plain Python, `[[row[j] for row in M] for j in range(len(M[0]))]` builds it column by column. `[list(c) for c in zip(*M)]` is shorter. In NumPy, `M.T` returns a view.',
          },
          {
            title: 'Batch similarity',
            front: 'How would you score 1,000 queries against 10,000 documents efficiently?',
            back: 'Normalise every embedding to length 1. Stack the queries into Q, shape (1000, d), and the documents into D, shape (10000, d). Then `Q @ D.T` gives all ten million cosine scores in one matrix multiply. Take the top k per row with `np.argpartition`. For millions of documents, switch to an approximate index such as HNSW.',
          },
        ],
      },
    },
    {
      key: 'summary',
      kind: 'SUMMARY',
      title: 'Linear algebra: key takeaways',
      depthRank: 1,
      conceptKeys: [DOT, NORM, MM],
      body: {
        takeaways: [
          'A dot product multiplies matching entries and adds them; it equals ‖a‖ ‖b‖ cos θ.',
          'The L2 norm is the straight-line length; the L1 norm adds absolute values.',
          'Cosine similarity compares direction only; on normalised vectors, a dot product gives the same ranking.',
          'A @ B needs matching inner sizes: (n, k) @ (k, m) gives (n, m).',
          '* is element-wise and @ is the matrix product; order matters.',
          'Q @ D.T scores every query against every document in one step.',
        ],
        remember: [
          'Inner sizes must match',
          'Normalise, then dot = cosine',
          '* element-wise, @ matrix',
        ],
      },
    },
  ],
};
