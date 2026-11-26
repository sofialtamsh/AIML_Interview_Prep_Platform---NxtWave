import { describe, expect, it } from 'vitest';
import {
  angleDeg,
  broadcast,
  broadcastAdd,
  cosine,
  elementwise,
  filterRows,
  formatArray,
  l1,
  l2,
  maskCells,
  matmul,
  reduce,
  select,
  shapeText,
  transpose,
} from './numpy-explorers';

// Expected printouts come from NumPy 2.5.4 (and match 2.4.6, the version in the browser).
const SALES = [
  [12, 15, 9, 14],
  [8, 6, 10, 7],
  [20, 18, 22, 25],
];
const MARKS = [
  [78, 85, 62, 90],
  [92, 70, 88, 65],
  [55, 60, 71, 82],
  [83, 91, 79, 74],
  [67, 58, 94, 88],
];
const A = [
  [80, 90, 70],
  [60, 75, 95],
];
const W = [
  [0.5, 0.2],
  [0.3, 0.3],
  [0.2, 0.5],
];

describe('printing like NumPy', () => {
  it('pads whole numbers and lines up decimal points', () => {
    expect(formatArray([40, 39, 41, 46])).toBe('[40 39 41 46]');
    expect(formatArray([118, 295, 472, 94.4, 141.6], true)).toBe('[118.  295.  472.   94.4 141.6]');
    expect(formatArray([-1.5, 2.25], true)).toBe('[-1.5   2.25]');
    expect(formatArray([40 / 3, 13, 41 / 3, 46 / 3], true)).toBe(
      '[13.33333333 13.         13.66666667 15.33333333]',
    );
    expect(formatArray([12.5, 7.75, 21.25], true)).toBe('[12.5   7.75 21.25]');
    expect(
      formatArray(matmul(A, W).ok ? (matmul(A, W) as { result: number[][] }).result : [], true),
    ).toBe('[[81.  78. ]\n [71.5 82. ]]');
    expect(formatArray([[50], [31], [85]])).toBe('[[50]\n [31]\n [85]]');
    expect(formatArray(166 / 12, true)).toBe('13.833333333333334');
    expect(formatArray(81, true)).toBe('81.0');
  });

  it('writes shapes the way NumPy does', () => {
    expect(shapeText([4, 3])).toBe('(4, 3)');
    expect(shapeText([3])).toBe('(3,)');
    expect(shapeText([])).toBe('()');
    expect(shapeText([4, 3], true)).toBe('(4,3)');
  });
});

describe('slicing and masks', () => {
  it('slices give views with the expected shapes', () => {
    const cols = select('marks', MARKS, { kind: 'all' }, { kind: 'slice', start: 2, stop: 4 });
    expect(cols.expression).toBe('marks[:, 2:]');
    expect(cols.shape).toEqual([5, 2]);
    expect(formatArray(cols.result as number[][])).toBe(
      '[[62 90]\n [88 65]\n [71 82]\n [79 74]\n [94 88]]',
    );
    expect(cols.kind).toBe('view');

    const one = select('marks', MARKS, { kind: 'index', i: 1 }, { kind: 'all' });
    expect(one.shape).toEqual([4]);
    expect(one.shorter).toBe('marks[1]');
    expect(formatArray(one.result as number[])).toBe('[92 70 88 65]');

    const block = select('marks', MARKS, { kind: 'slice', start: 1, stop: 2 }, { kind: 'all' });
    expect(block.shape).toEqual([1, 4]);
    expect(formatArray(block.result as number[][])).toBe('[[92 70 88 65]]');

    const empty = select('marks', MARKS, { kind: 'slice', start: 2, stop: 2 }, { kind: 'all' });
    expect(empty.shape).toEqual([0, 4]);

    const cell = select('marks', MARKS, { kind: 'index', i: 3 }, { kind: 'index', i: 1 });
    expect(cell.result).toBe(91);
    expect(cell.shape).toEqual([]);
    expect(cell.kind).toBe('scalar');
  });

  it('masks and row filters give copies', () => {
    const m = maskCells('marks', MARKS, 85);
    expect(formatArray(m.result as number[])).toBe('[90 92 88 91 94 88]');
    expect(m.shape).toEqual([6]);
    expect(m.kind).toBe('copy');
    const f = filterRows('marks', MARKS, 0, 70);
    expect(f.expression).toBe('marks[marks[:, 0] > 70]');
    expect(formatArray(f.result as number[][])).toBe(
      '[[78 85 62 90]\n [92 70 88 65]\n [83 91 79 74]]',
    );
    expect(f.shape).toEqual([3, 4]);
  });
});

describe('aggregating along an axis', () => {
  it('matches NumPy for every axis and keepdims', () => {
    expect(formatArray(reduce(SALES, 'sum', 0).result as number[])).toBe('[40 39 41 46]');
    const k = reduce(SALES, 'sum', 1, true);
    expect(k.shape).toEqual([3, 1]);
    expect(formatArray(k.result as number[][])).toBe('[[50]\n [31]\n [85]]');
    expect(formatArray(reduce(SALES, 'mean', 0).result as number[], true)).toBe(
      '[13.33333333 13.         13.66666667 15.33333333]',
    );
    expect(formatArray(reduce(SALES, 'mean', 1).result as number[], true)).toBe(
      '[12.5   7.75 21.25]',
    );
    expect(formatArray(reduce(SALES, 'mean', null).result as number, true)).toBe(
      '13.833333333333334',
    );
    expect(reduce(SALES, 'argmax', null).result).toBe(11);
    expect(formatArray(reduce(SALES, 'argmax', 1).result as number[])).toBe('[1 2 3]');
    expect(formatArray(reduce(SALES, 'max', 0, true).result as number[][])).toBe('[[20 18 22 25]]');
    expect(reduce(SALES, 'sum', 0).groups).toHaveLength(4);
    expect(reduce(SALES, 'sum', 1).groups).toHaveLength(3);
  });

  it('argmax picks the first of equal largest values', () => {
    expect(reduce([[3, 7, 7]], 'argmax', 1).result).toEqual([1]);
  });
});

describe('broadcasting', () => {
  it('compares shapes from the right', () => {
    const ok = broadcast([4, 3], [3]);
    expect(ok.ok && ok.shape).toEqual([4, 3]);
    const outer = broadcast([4, 1], [1, 3]);
    expect(outer.ok && outer.shape).toEqual([4, 3]);
    const scalar = broadcast([4, 3], []);
    expect(scalar.ok && scalar.shape).toEqual([4, 3]);
  });

  it('gives NumPy’s exact error when sizes clash', () => {
    const bad = broadcast([4, 3], [4]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.message).toBe('operands could not be broadcast together with shapes (4,3) (4,) ');
    }
  });

  it('adds the demo values like NumPy', () => {
    expect(formatArray(broadcastAdd([4, 3], [3]) ?? [])).toBe(
      '[[  1  12  23]\n [ 31  42  53]\n [ 61  72  83]\n [ 91 102 113]]',
    );
    expect(formatArray(broadcastAdd([4, 1], [1, 3]) ?? [])).toBe(
      '[[ 1  2  3]\n [11 12 13]\n [21 22 23]\n [31 32 33]]',
    );
    expect(formatArray(broadcastAdd([4, 3], []) ?? [])).toBe(
      '[[  1  11  21]\n [ 31  41  51]\n [ 61  71  81]\n [ 91 101 111]]',
    );
    expect(broadcastAdd([4, 3], [4])).toBeNull();
  });
});

describe('vectors', () => {
  it('computes norms, cosine and angle', () => {
    expect(l2({ x: 3, y: 4 })).toBe(5);
    expect(l1({ x: 3, y: 4 })).toBe(7);
    expect(cosine({ x: 3, y: 4 }, { x: 4, y: 1 })).toBeCloseTo(0.7761140001162655, 12);
    expect(cosine({ x: 3, y: 4 }, { x: 4, y: -3 })).toBe(0);
    expect(cosine({ x: 3, y: 4 }, { x: -3, y: -4 })).toBe(-1);
    expect(cosine({ x: 0, y: 0 }, { x: 1, y: 2 })).toBeNull();
    expect(angleDeg({ x: 1, y: 0 }, { x: 0, y: 2 })).toBeCloseTo(90, 10);
  });
});

describe('matrix multiplication', () => {
  it('matches NumPy for products in both orders', () => {
    const wm = matmul(W, A);
    expect(wm.ok && formatArray(wm.result, true)).toBe(
      '[[52.  60.  54. ]\n [42.  49.5 49.5]\n [46.  55.5 61.5]]',
    );
    const aat = matmul(A, transpose(A));
    expect(aat.ok && formatArray(aat.result)).toBe('[[19400 18200]\n [18200 18250]]');
  });

  it('gives NumPy’s errors for a size clash and for * on different shapes', () => {
    const bad = matmul(A, A);
    expect(!bad.ok && bad.message).toBe(
      'matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 2 is different from 3)',
    );
    const star = elementwise(A, W);
    expect(!star.ok && star.message).toBe(
      'operands could not be broadcast together with shapes (2,3) (3,2) ',
    );
  });
});
