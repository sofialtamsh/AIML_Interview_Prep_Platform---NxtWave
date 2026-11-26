/**
 * The maths behind the NumPy explorers: slicing and masks, aggregating along an axis,
 * broadcasting, vectors and matrix multiplication. Results, shapes, printouts and error messages
 * follow NumPy 2 (checked against NumPy 2.4 and 2.5), so the explorers show what students see when
 * they run the same code.
 */

export type Grid = number[][];
export type Shape = number[];

// ───────────── Printing like NumPy ─────────────

/** A shape the way NumPy writes it: (4, 3), (3,) or (). */
export function shapeText(shape: Shape, compact = false): string {
  const sep = compact ? ',' : ', ';
  if (shape.length === 0) return '()';
  if (shape.length === 1) return `(${shape[0]},)`;
  return `(${shape.join(sep)})`;
}

/** One float the way NumPy's default printing writes it before padding: 13.33333333, 81., 7.75. */
function floatParts(v: number): [string, string] {
  const fixed = v.toFixed(8).replace(/0+$/, '');
  const [int = '0', frac = ''] = fixed.split('.');
  // -0.00000000 prints as -0.
  return [int === '-0' && v > -5e-9 ? '0' : int, frac];
}

/**
 * Prints a 1-D or 2-D array (or a single number) like `print(arr)` in NumPy: whole-number arrays
 * pad every value to the widest; float arrays line up the decimal points. Scientific notation is
 * not supported, so keep values between 0.0001 and 100,000,000.
 */
export function formatArray(data: number | number[] | Grid, float = false): string {
  if (typeof data === 'number') {
    // A single NumPy float prints like a Python float: 81.0, 13.833333333333334.
    if (!float) return String(data);
    return Number.isInteger(data) ? `${data}.0` : String(data);
  }
  const flat = (data as Array<number | number[]>).flat() as number[];
  let cell: (v: number) => string;
  if (!float) {
    const width = Math.max(1, ...flat.map((v) => String(v).length));
    cell = (v) => String(v).padStart(width);
  } else {
    const parts = flat.map(floatParts);
    const iw = Math.max(1, ...parts.map(([i]) => i.length));
    const fw = Math.max(0, ...parts.map(([, f]) => f.length));
    cell = (v) => {
      const [i, f] = floatParts(v);
      return `${i.padStart(iw)}.${f.padEnd(fw)}`;
    };
  }
  if (!Array.isArray(data[0])) return `[${(data as number[]).map(cell).join(' ')}]`;
  const rows = (data as Grid).map((r) => `[${r.map(cell).join(' ')}]`);
  return `[${rows.join('\n ')}]`;
}

// ───────────── Indexing, slicing and masks ─────────────

export type AxisPick =
  | { kind: 'all' }
  | { kind: 'slice'; start: number; stop: number }
  | { kind: 'index'; i: number };

/** The positions an axis pick keeps, in order (a slice with start ≥ stop keeps none). */
export function pickPositions(p: AxisPick, n: number): number[] {
  if (p.kind === 'all') return Array.from({ length: n }, (_, i) => i);
  if (p.kind === 'index') return [p.i];
  const out: number[] = [];
  for (let i = Math.max(0, p.start); i < Math.min(n, p.stop); i++) out.push(i);
  return out;
}

/** The code for one axis pick: ":", "1:3", ":2", "3:" or "2". */
export function pickText(p: AxisPick, n: number): string {
  if (p.kind === 'all') return ':';
  if (p.kind === 'index') return String(p.i);
  const a = p.start === 0 ? '' : String(p.start);
  const b = p.stop >= n ? '' : String(p.stop);
  return `${a}:${b}`;
}

export interface Selection {
  /** "row,col" keys of the picked cells. */
  cells: Set<string>;
  /** The result: a number (one cell), a 1-D or a 2-D array. */
  result: number | number[] | Grid;
  shape: Shape;
  expression: string;
  /** The same selection written more briefly, when there is one (marks[1:3, :] is marks[1:3]). */
  shorter?: string;
  /** Basic slicing gives a view that shares memory; masks give a new copy; one cell gives a number. */
  kind: 'view' | 'copy' | 'scalar';
}

/** name[rows, cols] with each axis taken as all, a slice or one index. */
export function select(name: string, g: Grid, rows: AxisPick, cols: AxisPick): Selection {
  const R = g.length;
  const C = g[0]?.length ?? 0;
  const rs = pickPositions(rows, R);
  const cs = pickPositions(cols, C);
  const cells = new Set(rs.flatMap((r) => cs.map((c) => `${r},${c}`)));
  const rowText = pickText(rows, R);
  const colText = pickText(cols, C);
  const expression = `${name}[${rowText}, ${colText}]`;
  const shorter = cols.kind === 'all' ? `${name}[${rowText}]` : undefined;
  const at = (r: number, c: number) => g[r]?.[c] ?? 0;
  if (rows.kind === 'index' && cols.kind === 'index') {
    return { cells, result: at(rows.i, cols.i), shape: [], expression, kind: 'scalar' };
  }
  if (rows.kind === 'index') {
    return {
      cells,
      result: cs.map((c) => at(rows.i, c)),
      shape: [cs.length],
      expression,
      shorter,
      kind: 'view',
    };
  }
  if (cols.kind === 'index') {
    return {
      cells,
      result: rs.map((r) => at(r, cols.i)),
      shape: [rs.length],
      expression,
      kind: 'view',
    };
  }
  return {
    cells,
    result: rs.map((r) => cs.map((c) => at(r, c))),
    shape: [rs.length, cs.length],
    expression,
    shorter,
    kind: 'view',
  };
}

/** name[name > t]: every cell above t, read row by row into a 1-D copy. */
export function maskCells(name: string, g: Grid, t: number): Selection {
  const cells = new Set<string>();
  const result: number[] = [];
  g.forEach((row, r) => {
    row.forEach((v, c) => {
      if (v > t) {
        cells.add(`${r},${c}`);
        result.push(v);
      }
    });
  });
  return {
    cells,
    result,
    shape: [result.length],
    expression: `${name}[${name} > ${t}]`,
    kind: 'copy',
  };
}

/** name[name[:, col] > t]: whole rows whose value in one column is above t, as a 2-D copy. */
export function filterRows(name: string, g: Grid, col: number, t: number): Selection {
  const keep = g.map((row, r) => ((row[col] ?? 0) > t ? r : -1)).filter((r) => r >= 0);
  const C = g[0]?.length ?? 0;
  const cells = new Set(keep.flatMap((r) => Array.from({ length: C }, (_, c) => `${r},${c}`)));
  return {
    cells,
    result: keep.map((r) => [...(g[r] ?? [])]),
    shape: [keep.length, C],
    expression: `${name}[${name}[:, ${col}] > ${t}]`,
    kind: 'copy',
  };
}

// ───────────── Aggregating along an axis ─────────────

export type AxisOp = 'sum' | 'mean' | 'max' | 'min' | 'argmax';
export type AxisChoice = null | 0 | 1;

export interface Reduction {
  result: number | number[] | Grid;
  shape: Shape;
  /** Mean gives floats; everything else stays whole numbers. */
  float: boolean;
  /** For each answer, the "row,col" cells that went into it (one group per answer). */
  groups: Array<Array<[number, number]>>;
}

function reduceList(xs: number[], op: AxisOp): number {
  if (op === 'sum') return xs.reduce((a, b) => a + b, 0);
  if (op === 'mean') return xs.reduce((a, b) => a + b, 0) / xs.length;
  if (op === 'max') return Math.max(...xs);
  if (op === 'min') return Math.min(...xs);
  // argmax: the first position of the largest value, like NumPy.
  let best = 0;
  xs.forEach((v, i) => {
    if (v > (xs[best] ?? -Infinity)) best = i;
  });
  return best;
}

/** arr.op(axis=…, keepdims=…). With axis None, argmax gives a position in the flattened array. */
export function reduce(g: Grid, op: AxisOp, axis: AxisChoice, keepdims = false): Reduction {
  const R = g.length;
  const C = g[0]?.length ?? 0;
  const float = op === 'mean';
  if (axis === null) {
    const all = g.flat();
    const v = reduceList(all, op);
    const groups = [g.flatMap((row, r) => row.map((_, c) => [r, c] as [number, number]))];
    return keepdims
      ? { result: [[v]], shape: [1, 1], float, groups }
      : { result: v, shape: [], float, groups };
  }
  if (axis === 0) {
    const out = Array.from({ length: C }, (_, c) =>
      reduceList(
        g.map((row) => row[c] ?? 0),
        op,
      ),
    );
    const groups = Array.from({ length: C }, (_, c) =>
      Array.from({ length: R }, (_, r) => [r, c] as [number, number]),
    );
    return keepdims
      ? { result: [out], shape: [1, C], float, groups }
      : { result: out, shape: [C], float, groups };
  }
  const out = g.map((row) => reduceList(row, op));
  const groups = g.map((row, r) => row.map((_, c) => [r, c] as [number, number]));
  return keepdims
    ? { result: out.map((v) => [v]), shape: [R, 1], float, groups }
    : { result: out, shape: [R], float, groups };
}

// ───────────── Broadcasting ─────────────

export interface AxisCheck {
  /** Sizes on this axis, or undefined where the array has fewer axes (it counts as 1). */
  a?: number;
  b?: number;
  out: number;
  rule: 'equal' | 'stretch-a' | 'stretch-b' | 'mismatch';
}

export type Broadcast =
  | { ok: true; shape: Shape; axes: AxisCheck[] }
  | { ok: false; axes: AxisCheck[]; message: string };

/** NumPy's broadcasting rule, applied axis by axis from the right. */
export function broadcast(a: Shape, b: Shape): Broadcast {
  const n = Math.max(a.length, b.length);
  const axes: AxisCheck[] = [];
  for (let k = 0; k < n; k++) {
    const da = a[a.length - n + k];
    const db = b[b.length - n + k];
    const sa = da ?? 1;
    const sb = db ?? 1;
    if (sa === sb) axes.push({ a: da, b: db, out: sa, rule: 'equal' });
    else if (sa === 1) axes.push({ a: da, b: db, out: sb, rule: 'stretch-a' });
    else if (sb === 1) axes.push({ a: da, b: db, out: sa, rule: 'stretch-b' });
    else axes.push({ a: da, b: db, out: Math.max(sa, sb), rule: 'mismatch' });
  }
  if (axes.some((x) => x.rule === 'mismatch')) {
    return {
      ok: false,
      axes,
      message: `operands could not be broadcast together with shapes ${shapeText(a, true)} ${shapeText(b, true)} `,
    };
  }
  return { ok: true, shape: axes.map((x) => x.out), axes };
}

/** Values laid out as a 2-D grid for drawing: a scalar is 1 × 1 and a 1-D array is one row. */
export function asGrid(flat: number[], shape: Shape): Grid {
  const rows = shape.length === 2 ? (shape[0] ?? 1) : 1;
  const cols = shape.length === 0 ? 1 : (shape[shape.length - 1] ?? 1);
  return Array.from({ length: rows }, (_, r) => flat.slice(r * cols, r * cols + cols));
}

/** A = 0, 10, 20, … and B = 1, 2, 3, … in the given shapes, so every sum shows who met whom. */
export function demoValues(shape: Shape, which: 'a' | 'b'): number[] {
  const size = shape.reduce((p, s) => p * s, 1);
  return Array.from({ length: size }, (_, i) => (which === 'a' ? i * 10 : i + 1));
}

/** A + B with broadcasting, as a 2-D grid (null if the shapes clash). */
export function broadcastAdd(a: Shape, b: Shape): Grid | null {
  const bc = broadcast(a, b);
  if (!bc.ok) return null;
  const ga = asGrid(demoValues(a, 'a'), a);
  const gb = asGrid(demoValues(b, 'b'), b);
  const shape = bc.shape;
  const rows = shape.length === 2 ? (shape[0] ?? 1) : 1;
  const cols = shape.length === 0 ? 1 : (shape[shape.length - 1] ?? 1);
  const at = (g: Grid, r: number, c: number) => {
    const rr = g.length === 1 ? 0 : r;
    const row = g[rr] ?? [];
    return row[row.length === 1 ? 0 : c] ?? 0;
  };
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => at(ga, r, c) + at(gb, r, c)),
  );
}

// ───────────── Vectors ─────────────

export interface Vec {
  x: number;
  y: number;
}

export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const l2 = (a: Vec) => Math.hypot(a.x, a.y);
export const l1 = (a: Vec) => Math.abs(a.x) + Math.abs(a.y);
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

/** a / ‖a‖, or null for the zero vector (it has no direction). */
export function unit(a: Vec): Vec | null {
  const n = l2(a);
  return n === 0 ? null : { x: a.x / n, y: a.y / n };
}

/** Cosine similarity, or null when either vector is all zeros (NumPy would divide by zero). */
export function cosine(a: Vec, b: Vec): number | null {
  const n = l2(a) * l2(b);
  if (n === 0) return null;
  return Math.max(-1, Math.min(1, dot(a, b) / n));
}

/** The angle between a and b in degrees, or null for a zero vector. */
export function angleDeg(a: Vec, b: Vec): number | null {
  const c = cosine(a, b);
  return c === null ? null : (Math.acos(c) * 180) / Math.PI;
}

// ───────────── Matrix multiplication ─────────────

export const transpose = (g: Grid): Grid => (g[0] ?? []).map((_, c) => g.map((row) => row[c] ?? 0));

const shapeOf = (g: Grid): Shape => [g.length, g[0]?.length ?? 0];

export type Product =
  | { ok: true; result: Grid; shape: Shape }
  | { ok: false; message: string; shape?: undefined };

/** x @ y, with NumPy's error when the inner sizes differ. */
export function matmul(x: Grid, y: Grid): Product {
  const [m = 0, n = 0] = shapeOf(x);
  const [k = 0, p = 0] = shapeOf(y);
  if (n !== k) {
    return {
      ok: false,
      message: `matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size ${k} is different from ${n})`,
    };
  }
  const result = Array.from({ length: m }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let s = 0;
      for (let t = 0; t < n; t++) s += (x[i]?.[t] ?? 0) * (y[t]?.[j] ?? 0);
      return s;
    }),
  );
  return { ok: true, result, shape: [m, p] };
}

/** x * y element by element, with broadcasting (both are 2-D here). */
export function elementwise(x: Grid, y: Grid): Product {
  const bc = broadcast(shapeOf(x), shapeOf(y));
  if (!bc.ok) return { ok: false, message: bc.message };
  const [rows = 0, cols = 0] = bc.shape;
  const at = (g: Grid, r: number, c: number) => {
    const row = g[g.length === 1 ? 0 : r] ?? [];
    return row[row.length === 1 ? 0 : c] ?? 0;
  };
  return {
    ok: true,
    result: Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => at(x, r, c) * at(y, r, c)),
    ),
    shape: bc.shape,
  };
}

/** Rounds away float noise (0.1 + 0.2) before printing: 12 significant digits are plenty here. */
export const clean = (v: number) => Number.parseFloat(v.toPrecision(12));
