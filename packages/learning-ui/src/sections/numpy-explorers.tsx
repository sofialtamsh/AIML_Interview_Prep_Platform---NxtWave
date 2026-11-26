/**
 * NumPy explorers (WIDGET sections): slice and mask an array, aggregate along an axis, broadcast
 * two shapes, compare two vectors and multiply two matrices. The lesson fills in the data; the
 * maths, printouts and error messages are in ../numpy-explorers.ts and follow NumPy 2, so what
 * students see here is what they get when they run the same code.
 */
import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { type ReactNode, useState } from 'react';
import {
  type AxisChoice,
  type AxisOp,
  type AxisPick,
  angleDeg,
  broadcast,
  broadcastAdd,
  clean,
  cosine,
  demoValues,
  distance,
  dot,
  elementwise,
  filterRows,
  formatArray,
  type Grid,
  l1,
  l2,
  maskCells,
  matmul,
  type Product,
  reduce,
  type Selection,
  type Shape,
  select,
  shapeText,
  transpose,
  unit,
  type Vec,
} from '../numpy-explorers';
import { Rich } from '../rich';
import { Verdict } from './code-sections';
import { Pick } from './data-explorers';
import { linear, NumSlider, Panel, TryThis } from './explorers';

type WidgetBody = Extract<StudentSection, { kind: 'WIDGET' }>['body'];
type Body<W extends WidgetBody['widget']> = Extract<WidgetBody, { widget: W }>;

// ───────────── Shared pieces ─────────────

type ReplLine = { code: string; out?: string; error?: string };

/** A Python prompt in the coding-ground colours: each line of code, then what it prints. */
function Repl({ lines, label }: { lines: ReplLine[]; label: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2a3d] bg-[#070b12] text-[#c9d4e5]">
      <div className="border-b border-[#1f2a3d] bg-[#0b111c] px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-[#8a9bb5] uppercase">
        {label}
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-[1.6]">
        {lines.map((l) => (
          <span key={l.code} className="block">
            <span className="text-[#3fb950]">{'>>> '}</span>
            <span className="text-[#82aaff]">{l.code}</span>
            {l.out !== undefined && <span className="block text-[#e6edf3]">{l.out}</span>}
            {l.error && (
              <span className="block whitespace-pre-wrap break-words text-[#ff7b72]">
                {l.error}
              </span>
            )}
          </span>
        ))}
      </pre>
    </div>
  );
}

const TONES = [
  'border-brand bg-brand-soft',
  'border-ok bg-ok-bg',
  'border-warn bg-warn-bg',
  'border-bad bg-bad-bg',
] as const;

type CellLook = 'pick' | 'dim' | 'plain' | 'ghost' | { group: number; strong?: boolean };

const lookClass = (look: CellLook) => {
  if (look === 'pick') return 'border-brand bg-brand-soft font-bold text-ink';
  if (look === 'dim') return 'border-line bg-surface text-muted/60';
  if (look === 'ghost') return 'border-dashed border-line-2 bg-surface-2 text-muted';
  if (look === 'plain') return 'border-line bg-surface text-ink';
  return cn(
    TONES[look.group % TONES.length],
    'text-ink',
    look.strong && 'font-bold ring-2 ring-ink',
  );
};

/** A small table of numbers with optional row and column headers and per-cell highlighting. */
function GridTable({
  values,
  look,
  rowNames = [],
  colNames = [],
  showIndex = true,
  caption,
  format = String,
  extraCol,
  extraRow,
  onCell,
  selected,
}: {
  values: Grid;
  look?: (r: number, c: number) => CellLook;
  rowNames?: string[];
  colNames?: string[];
  showIndex?: boolean;
  caption?: ReactNode;
  format?: (v: number) => string;
  /** One more cell at the end of each row (axis=1 results). */
  extraCol?: { title: string; cells: Array<{ text: string; group: number }> };
  /** One more row under the table (axis=0 results). */
  extraRow?: { title: string; cells: Array<{ text: string; group: number }> };
  onCell?: (r: number, c: number) => void;
  selected?: [number, number] | null;
}) {
  const cols = values[0]?.length ?? 0;
  const head = showIndex || colNames.length > 0;
  const cell = 'h-7 min-w-9 rounded-md border px-1.5 text-center font-mono text-[12.5px]';
  return (
    <figure className="grid min-w-0 gap-1.5">
      {caption && (
        <figcaption className="text-[12.5px] font-semibold text-ink">{caption}</figcaption>
      )}
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-1">
          {head && (
            <thead>
              <tr>
                {(showIndex || rowNames.length > 0) && <th />}
                {Array.from({ length: cols }, (_, c) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
                  <th key={c} className="px-0.5 text-center text-[11px] font-medium text-muted">
                    {colNames[c] ?? ''}
                    {showIndex && <span className="block font-mono text-[10.5px]">{c}</span>}
                  </th>
                ))}
                {extraCol && (
                  <th className="px-1 text-center text-[11px] font-semibold text-ink">
                    {extraCol.title}
                  </th>
                )}
              </tr>
            </thead>
          )}
          <tbody>
            {values.map((row, r) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
              <tr key={r}>
                {(showIndex || rowNames.length > 0) && (
                  <th className="pr-1 text-right text-[11px] font-medium whitespace-nowrap text-muted">
                    {rowNames[r] ?? ''}
                    {showIndex && <span className="ml-1 font-mono text-[10.5px]">{r}</span>}
                  </th>
                )}
                {row.map((v, c) => {
                  const lk = look ? look(r, c) : 'plain';
                  const isSel = selected?.[0] === r && selected?.[1] === c;
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                    <td key={c} className="p-0">
                      {onCell ? (
                        <button
                          type="button"
                          aria-pressed={isSel}
                          aria-label={`Row ${r}, column ${c}: ${format(v)}`}
                          onClick={() => onCell(r, c)}
                          className={cn(
                            cell,
                            'w-full transition-colors hover:border-brand',
                            isSel ? 'border-brand bg-brand text-white' : lookClass(lk),
                          )}
                        >
                          {format(v)}
                        </button>
                      ) : (
                        <div className={cn(cell, 'grid place-items-center', lookClass(lk))}>
                          {format(v)}
                        </div>
                      )}
                    </td>
                  );
                })}
                {extraCol && (
                  <td className="p-0 pl-1.5">
                    <div
                      className={cn(
                        cell,
                        'grid place-items-center font-bold',
                        lookClass({ group: extraCol.cells[r]?.group ?? 0 }),
                      )}
                    >
                      {extraCol.cells[r]?.text}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {extraRow && (
              <tr>
                {(showIndex || rowNames.length > 0) && (
                  <th className="pt-1.5 pr-1 text-right text-[11px] font-semibold text-ink">
                    {extraRow.title}
                  </th>
                )}
                {extraRow.cells.map((x, c) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional
                  <td key={c} className="p-0 pt-1.5">
                    <div
                      className={cn(
                        cell,
                        'grid place-items-center font-bold',
                        lookClass({ group: x.group }),
                      )}
                    >
                      {x.text}
                    </div>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

const num = (v: number, digits = 3) => String(clean(+v.toFixed(digits)));

// ───────────── Slicing and masks ─────────────

type IndexMode = 'slice' | 'mask' | 'rows';
type PickKind = AxisPick['kind'];
const MODE_NAME: Record<IndexMode, string> = {
  slice: 'Slice',
  mask: 'Mask cells',
  rows: 'Filter rows',
};
const KIND_NAME: Record<PickKind, string> = { all: 'All', slice: 'Slice', index: 'One index' };

function AxisControls({
  title,
  n,
  value,
  onChange,
}: {
  title: string;
  n: number;
  value: AxisPick;
  onChange: (p: AxisPick) => void;
}) {
  const [start, setStart] = useState(value.kind === 'slice' ? value.start : 1);
  const [stop, setStop] = useState(value.kind === 'slice' ? value.stop : Math.min(n, 3));
  const [i, setI] = useState(value.kind === 'index' ? value.i : 1);
  const choose = (k: PickKind) =>
    onChange(
      k === 'all'
        ? { kind: 'all' }
        : k === 'slice'
          ? { kind: 'slice', start, stop }
          : { kind: 'index', i },
    );
  return (
    <div className="grid min-w-0 content-start gap-3">
      <Pick
        label={title}
        options={['all', 'slice', 'index'] as const}
        value={value.kind}
        onChange={choose}
        names={KIND_NAME}
      />
      {value.kind === 'slice' && (
        <>
          <NumSlider
            label="Start (included)"
            value={start}
            min={0}
            max={n}
            step={1}
            shown={String(start)}
            onChange={(v) => {
              setStart(v);
              onChange({ kind: 'slice', start: v, stop });
            }}
          />
          <NumSlider
            label="Stop (left out)"
            value={stop}
            min={0}
            max={n}
            step={1}
            shown={String(stop)}
            onChange={(v) => {
              setStop(v);
              onChange({ kind: 'slice', start, stop: v });
            }}
          />
        </>
      )}
      {value.kind === 'index' && (
        <NumSlider
          label="Index"
          value={i}
          min={0}
          max={n - 1}
          step={1}
          shown={String(i)}
          onChange={(v) => {
            setI(v);
            onChange({ kind: 'index', i: v });
          }}
        />
      )}
    </div>
  );
}

function selectionVerdict(s: Selection, rows: AxisPick, cols: AxisPick, name: string): string {
  const shape = shapeText(s.shape);
  if (s.kind === 'copy') {
    const copy = `Reading with a mask makes a **new copy**: changing the result never changes \`${name}\`. Writing through a mask, as in \`${name}[mask] = 0\`, does change \`${name}\`.`;
    return s.shape.length === 1
      ? `${s.shape[0]} values pass the test. They do not form a rectangle, so NumPy lists them row by row in a **1-D** array, shape **${shape}**. ${copy}`
      : `${s.shape[0]} rows pass the test, and each keeps every column, so the shape is **${shape}**. ${copy}`;
  }
  if (s.kind === 'scalar') {
    return 'Two single indexes pick one cell, so you get **one number**, shape (). Each single index drops its axis.';
  }
  if (s.shape.includes(0)) {
    return `The slice is **empty**, shape ${shape}: a slice keeps positions from start up to, but not including, stop.`;
  }
  const dropped = [rows, cols].filter((p) => p.kind === 'index').length;
  const why =
    dropped > 0
      ? 'A single index drops its axis, so the result has one axis fewer than the array. A slice of length 1 would keep it.'
      : 'Slices keep both axes.';
  return `Shape **${shape}**. ${why} This is a **view**: it shares memory with \`${name}\`, so changing it changes \`${name}\` too.`;
}

export function ArrayIndexExplorer({ body }: { body: Body<'array-index-explorer'> }) {
  const p = body.params;
  const g = p.values;
  const R = g.length;
  const C = g[0]?.length ?? 0;
  const [mode, setMode] = useState<IndexMode>(p.defaultMode);
  const [rows, setRows] = useState<AxisPick>({ kind: 'slice', start: 1, stop: Math.min(R, 3) });
  const [cols, setCols] = useState<AxisPick>({ kind: 'all' });
  const [t, setT] = useState(p.threshold.default);
  const [col, setCol] = useState(0);

  const sel =
    mode === 'slice'
      ? select(p.name, g, rows, cols)
      : mode === 'mask'
        ? maskCells(p.name, g, t)
        : filterRows(p.name, g, col, t);
  const look = (r: number, c: number): CellLook =>
    sel.cells.has(`${r},${c}`) ? 'pick' : mode === 'slice' ? 'plain' : 'dim';
  const colOptions = Array.from({ length: C }, (_, c) => String(c));
  const colNames = Object.fromEntries(
    colOptions.map((c) => [c, p.colNames[Number(c)] ?? `column ${c}`]),
  );
  const printed =
    typeof sel.result === 'number'
      ? String(sel.result)
      : formatArray(sel.result as number[] | Grid);

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <div className="sm:col-span-2">
          <Pick
            label="What to do"
            options={p.modes}
            value={mode}
            onChange={setMode}
            names={MODE_NAME}
          />
        </div>
        {mode === 'rows' && (
          <Pick
            label={`Test on this ${p.colLabel}`}
            options={colOptions}
            value={String(col)}
            onChange={(v) => setCol(Number(v))}
            names={colNames}
          />
        )}
        {mode !== 'slice' && (
          <NumSlider
            label={p.threshold.label}
            value={t}
            min={p.threshold.min}
            max={p.threshold.max}
            step={p.threshold.step}
            shown={String(t)}
            onChange={setT}
          />
        )}
        {mode === 'slice' && (
          <>
            <AxisControls title={`Rows (${p.rowLabel}s)`} n={R} value={rows} onChange={setRows} />
            <AxisControls
              title={`Columns (${p.colLabel}s)`}
              n={C}
              value={cols}
              onChange={setCols}
            />
          </>
        )}
      </Panel>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3">
        <GridTable
          values={g}
          look={look}
          rowNames={p.rowNames}
          colNames={p.colNames}
          caption={
            <span>
              <code className="font-mono">{p.name}</code>, shape {shapeText([R, C])}: one row per{' '}
              {p.rowLabel}, one column per {p.colLabel}
            </span>
          }
        />
        <Repl
          label="Python"
          lines={[
            { code: `print(${sel.expression})`, out: printed },
            { code: `${sel.expression}.shape`, out: shapeText(sel.shape) },
          ]}
        />
        {sel.shorter && (
          <p className="text-[13px] text-muted">
            <code className="font-mono text-ink">{sel.expression}</code> is the same as{' '}
            <code className="font-mono text-ink">{sel.shorter}</code>: leaving out the columns means
            every column.
          </p>
        )}
      </div>

      <div aria-live="polite">
        <Verdict
          tone={sel.kind === 'copy' ? 'info' : 'ok'}
          text={selectionVerdict(sel, rows, cols, p.name)}
        />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Aggregating along an axis ─────────────

type AxisKey = 'none' | '0' | '1';
const AXIS_NAME: Record<AxisKey, string> = { none: 'None', '0': '0', '1': '1' };
const OP_NAME: Record<AxisOp, string> = {
  sum: 'sum',
  mean: 'mean',
  max: 'max',
  min: 'min',
  argmax: 'argmax',
};

export function AxisExplorer({ body }: { body: Body<'axis-explorer'> }) {
  const p = body.params;
  const g = p.values;
  const R = g.length;
  const C = g[0]?.length ?? 0;
  const [op, setOp] = useState<AxisOp>(p.defaultOp);
  const [axisKey, setAxisKey] = useState<AxisKey>('1');
  const [keep, setKeep] = useState<'off' | 'on'>('off');
  const axis: AxisChoice = axisKey === 'none' ? null : axisKey === '0' ? 0 : 1;
  const red = reduce(g, op, axis, keep === 'on');
  const flat = red.result;
  // One answer per group, in group order, for drawing beside the table.
  const answers: number[] =
    typeof flat === 'number' ? [flat] : ((flat as Array<number | number[]>).flat() as number[]);
  const show = (v: number) => (red.float ? num(v, 2) : String(v));
  const groupOf = (r: number, c: number) => (axis === null ? 0 : axis === 0 ? c : r);
  const winner = (r: number, c: number) => {
    if (op !== 'argmax' && op !== 'max' && op !== 'min') return false;
    const k = groupOf(r, c);
    const cells = red.groups[k] ?? [];
    const vals = cells.map(([rr, cc]) => g[rr]?.[cc] ?? 0);
    const target = op === 'min' ? Math.min(...vals) : Math.max(...vals);
    const first = cells.find(([rr, cc]) => (g[rr]?.[cc] ?? 0) === target);
    return first?.[0] === r && first?.[1] === c;
  };
  const args = [axis === null ? '' : `axis=${axis}`, keep === 'on' ? 'keepdims=True' : '']
    .filter(Boolean)
    .join(', ');
  const call = `${p.name}.${op}(${args})`;
  const printed = formatArray(red.result as number | number[] | Grid, red.float);

  const what =
    axis === null ? 'everything' : axis === 0 ? `each ${p.colLabel}` : `each ${p.rowLabel}`;
  const collapse =
    axis === null
      ? `With no axis, every value goes into **one answer**.`
      : axis === 0
        ? `\`axis=0\` runs **down the rows**, so the rows collapse: one answer for ${what} (${C} in all).`
        : `\`axis=1\` runs **across the columns**, so the columns collapse: one answer for ${what} (${R} in all).`;
  const argNote =
    op === 'argmax'
      ? axis === null
        ? ` argmax with no axis gives a position in the **flattened** array: ${answers[0]} is row ${Math.floor((answers[0] ?? 0) / C)}, column ${(answers[0] ?? 0) % C}.`
        : ' argmax gives the **position** of the largest value, not the value itself.'
      : '';
  const keepNote =
    keep === 'on'
      ? ` keepdims keeps ${axis === null ? 'both collapsed axes' : 'the collapsed axis'} with size 1, shape **${shapeText(red.shape)}**, so the result still lines up with \`${p.name}\` for broadcasting.`
      : ` The result has shape **${shapeText(red.shape)}**.`;

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Pick label="Operation" options={p.ops} value={op} onChange={setOp} names={OP_NAME} />
        <Pick
          label="axis"
          options={['none', '0', '1'] as const}
          value={axisKey}
          onChange={setAxisKey}
          names={AXIS_NAME}
        />
        <Pick
          label="keepdims"
          options={['off', 'on'] as const}
          value={keep}
          onChange={setKeep}
          names={{ off: 'False', on: 'True' }}
        />
      </Panel>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3">
        <GridTable
          values={g}
          rowNames={p.rowNames}
          colNames={p.colNames}
          look={(r, c) => ({ group: groupOf(r, c), strong: winner(r, c) })}
          caption={
            <span>
              <code className="font-mono">{p.name}</code>, shape {shapeText([R, C])}: cells of one
              colour make one answer
            </span>
          }
          extraCol={
            axis === 1
              ? { title: op, cells: answers.map((v, r) => ({ text: show(v), group: r })) }
              : undefined
          }
          extraRow={
            axis === 0
              ? { title: op, cells: answers.map((v, c) => ({ text: show(v), group: c })) }
              : undefined
          }
        />
        {axis === null && (
          <p className="text-[13px] text-ink">
            One answer: <span className="font-mono font-bold">{printed}</span>
          </p>
        )}
        <Repl
          label="Python"
          lines={[
            { code: `print(${call})`, out: printed },
            { code: `${call}.shape`, out: shapeText(red.shape) },
          ]}
        />
      </div>

      <div aria-live="polite">
        <Verdict tone="info" text={`${collapse}${argNote}${keepNote}`} />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Broadcasting ─────────────

const shapeName = (s: Shape) => (s.length === 0 ? 'scalar ()' : shapeText(s));

/** The array drawn at the result's size: its own cells solid, the stretched copies dashed. */
function stretched(values: number[], shape: Shape, out: Shape) {
  const own = shape.length === 2 ? shape : [1, shape.length === 0 ? 1 : (shape[0] ?? 1)];
  const [or = 1, oc = 1] = own;
  const target = out.length === 2 ? out : [1, out.length === 0 ? 1 : (out[0] ?? 1)];
  const [tr = 1, tc = 1] = target;
  const at = (r: number, c: number) => values[(or === 1 ? 0 : r) * oc + (oc === 1 ? 0 : c)] ?? 0;
  const grid = Array.from({ length: tr }, (_, r) => Array.from({ length: tc }, (_, c) => at(r, c)));
  const look = (r: number, c: number): CellLook => (r < or && c < oc ? 'plain' : 'ghost');
  return { grid, look };
}

export function BroadcastExplorer({ body }: { body: Body<'broadcast-explorer'> }) {
  const p = body.params;
  const names = Object.fromEntries(p.shapes.map((s, i) => [String(i), shapeName(s)]));
  const options = p.shapes.map((_, i) => String(i));
  const [ia, setIa] = useState(String(p.defaultA));
  const [ib, setIb] = useState(String(p.defaultB));
  const sa = p.shapes[Number(ia)] ?? [];
  const sb = p.shapes[Number(ib)] ?? [];
  const bc = broadcast(sa, sb);
  const va = demoValues(sa, 'a');
  const vb = demoValues(sb, 'b');
  const sum = broadcastAdd(sa, sb);
  const out = bc.ok ? bc.shape : [];
  const A = stretched(va, sa, bc.ok ? out : sa);
  const B = stretched(vb, sb, bc.ok ? out : sb);
  const n = bc.axes.length;

  const ruleText = (rule: string) =>
    rule === 'equal'
      ? 'same size'
      : rule === 'stretch-a'
        ? 'A stretched'
        : rule === 'stretch-b'
          ? 'B stretched'
          : 'clash';
  const fix = (() => {
    if (bc.ok) return '';
    if (sa.length === 2 && sb.length === 1 && sb[0] === sa[0]) {
      return ` To add one value per row, give B shape (${sb[0]}, 1) with \`B[:, None]\` or \`B.reshape(${sb[0]}, 1)\`.`;
    }
    if (sb.length === 2 && sa.length === 1 && sa[0] === sb[0]) {
      return ` To add one value per row, give A shape (${sa[0]}, 1) with \`A[:, None]\`.`;
    }
    return ' Make the clashing sizes equal, or make one of them 1.';
  })();
  // Axes named from the right, the way the rule reads them.
  const axisName = (k: number) =>
    n === 1 ? 'The axis' : k === n - 1 ? 'The last axis' : 'The first axis';
  const sizeOf = (v: number | undefined, who: string) =>
    v === undefined ? `${who} has no axis here (counts as 1)` : `${who} has ${v}`;
  const axisLine = (x: (typeof bc.axes)[number], k: number) => {
    const sizes = `${sizeOf(x.a, 'A')} and ${sizeOf(x.b, 'B')}`;
    if (x.rule === 'equal') {
      return x.a === undefined || x.b === undefined
        ? `${axisName(k)}: ${sizes}, so nothing stretches.`
        : `${axisName(k)}: both have ${x.out}, so nothing stretches.`;
    }
    if (x.rule === 'mismatch') return `${axisName(k)}: ${sizes}. They differ and neither is 1.`;
    const who = x.rule === 'stretch-a' ? 'A' : 'B';
    return `${axisName(k)}: ${sizes}, so ${who} is stretched to ${x.out}.`;
  };
  const verdict = bc.ok
    ? `${bc.axes.map(axisLine).join(' ')} The result has shape **${shapeText(out)}**. Dashed cells are stretched copies: NumPy reuses the values without storing them again.`
    : `${bc.axes
        .map((x, k) => (x.rule === 'mismatch' ? axisLine(x, k) : null))
        .filter(Boolean)
        .join(' ')} So NumPy raises a ValueError.${fix}`;

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Pick label="Shape of A" options={options} value={ia} onChange={setIa} names={names} />
        <Pick label="Shape of B" options={options} value={ib} onChange={setIb} names={names} />
      </Panel>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3">
        <table className="w-max border-separate border-spacing-x-1.5 font-mono text-[12.5px]">
          <caption className="mb-1 text-left font-sans text-[12.5px] font-semibold text-ink">
            Shapes lined up from the right
          </caption>
          <tbody>
            {[
              { name: 'A', sizes: bc.axes.map((x) => x.a) },
              { name: 'B', sizes: bc.axes.map((x) => x.b) },
            ].map((row) => (
              <tr key={row.name}>
                <th className="pr-2 text-left font-sans text-[12px] text-muted">{row.name}</th>
                {row.sizes.map((s, k) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: axes are positional
                  <td key={k} className={cn('text-center', s === undefined && 'text-muted')}>
                    {s ?? '–'}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th className="pr-2 text-left font-sans text-[12px] text-muted">Rule</th>
              {bc.axes.map((x, k) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: axes are positional
                <td key={k} className="text-center">
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 font-sans text-[11.5px] font-semibold',
                      x.rule === 'mismatch'
                        ? 'border-bad bg-bad-bg text-bad'
                        : x.rule === 'equal'
                          ? 'border-line bg-surface-2 text-ink'
                          : 'border-warn bg-warn-bg text-ink',
                    )}
                  >
                    {ruleText(x.rule)}
                  </span>
                </td>
              ))}
            </tr>
            <tr>
              <th className="pr-2 text-left font-sans text-[12px] text-muted">Result</th>
              {bc.axes.map((x, k) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: axes are positional
                <td key={k} className="text-center font-bold">
                  {x.rule === 'mismatch' ? '✗' : x.out}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="text-[12.5px] text-muted">
          A holds 0, 10, 20, … and B holds 1, 2, 3, …, so each sum shows which values met. A missing
          axis (–) counts as 1.
        </p>
        <div className="flex flex-wrap items-start gap-4">
          <GridTable
            values={A.grid}
            look={A.look}
            showIndex={false}
            caption={`A ${shapeText(sa)}${bc.ok && shapeText(sa) !== shapeText(out) ? ' stretched' : ''}`}
          />
          <GridTable
            values={B.grid}
            look={B.look}
            showIndex={false}
            caption={`B ${shapeText(sb)}${bc.ok && shapeText(sb) !== shapeText(out) ? ' stretched' : ''}`}
          />
          {sum && (
            <GridTable
              values={sum}
              look={() => 'pick'}
              showIndex={false}
              caption={`A + B ${shapeText(out)}`}
            />
          )}
        </div>
        <Repl
          label="Python"
          lines={
            bc.ok
              ? [
                  {
                    code: 'print(A + B)',
                    out: formatArray(
                      out.length === 0
                        ? (sum?.[0]?.[0] ?? 0)
                        : out.length === 1
                          ? (sum?.[0] ?? [])
                          : (sum ?? []),
                    ),
                  },
                  { code: '(A + B).shape', out: shapeText(out) },
                ]
              : [{ code: 'A + B', error: `ValueError: ${bc.message}` }]
          }
        />
      </div>

      <div aria-live="polite">
        <Verdict tone={bc.ok ? 'ok' : 'bad'} text={verdict} />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Vectors ─────────────

const signed = (v: number) => (v < 0 ? `(${v})` : String(v));
/** Python's print(round(x, 3)) for a float: 5.0, 0.776. */
const pyRound = (v: number) => {
  const r = clean(Math.round(v * 1000) / 1000);
  return Number.isInteger(r) ? `${r}.0` : String(r);
};

export function VectorExplorer({ body }: { body: Body<'vector-explorer'> }) {
  const p = body.params;
  const R = p.range;
  const [a, setA] = useState<Vec>(p.a);
  const [b, setB] = useState<Vec>(p.b);
  const [mode, setMode] = useState<'raw' | 'unit'>('raw');
  const d = dot(a, b);
  const cos = cosine(a, b);
  const ang = angleDeg(a, b);
  const ua = unit(a);
  const ub = unit(b);

  const S = 260;
  const PAD = 14;
  const sx = linear(-R, R, PAD, S - PAD);
  const sy = linear(-R, R, S - PAD, PAD);
  const ticks = Array.from({ length: 2 * R + 1 }, (_, i) => i - R);
  const arrow = (v: Vec, tone: 'brand' | 'warn', faded = false) => {
    const x2 = sx(v.x);
    const y2 = sy(v.y);
    const len = Math.hypot(x2 - sx(0), y2 - sy(0));
    if (len < 1) return null;
    const ux = (x2 - sx(0)) / len;
    const uy = (y2 - sy(0)) / len;
    const head = `${x2},${y2} ${x2 - 8 * ux + 4 * uy},${y2 - 8 * uy - 4 * ux} ${x2 - 8 * ux - 4 * uy},${y2 - 8 * uy + 4 * ux}`;
    return (
      <g
        className={cn(tone === 'brand' ? 'fill-brand stroke-brand' : 'fill-warn stroke-warn')}
        opacity={faded ? 0.35 : 1}
      >
        <line x1={sx(0)} y1={sy(0)} x2={x2 - 6 * ux} y2={y2 - 6 * uy} strokeWidth={2.5} />
        <polygon points={head} strokeWidth={0} />
      </g>
    );
  };
  // Labels sit beside the arrow tip, on the side with room, so they never leave the picture.
  const label = (v: Vec, text: string, tone: 'brand' | 'warn') => (
    <text
      x={sx(v.x) + (sx(v.x) > S / 2 ? -6 : 6)}
      y={Math.min(S - 6, Math.max(12, sy(v.y) + (v.y >= 0 ? -8 : 16)))}
      fontSize={11}
      textAnchor={sx(v.x) > S / 2 ? 'end' : 'start'}
      className={cn('font-mono font-bold', tone === 'brand' ? 'fill-brand' : 'fill-warn')}
    >
      {text}
    </text>
  );

  const rows: Array<[string, string]> = [
    ['a · b', `${a.x}×${signed(b.x)} + ${a.y}×${signed(b.y)} = ${d}`],
    ['‖a‖₂ (L2 length)', `√(${a.x}² + ${a.y}²) = ${num(l2(a))}`],
    ['‖b‖₂', num(l2(b))],
    ['‖a‖₁ (L1 length)', `|${a.x}| + |${a.y}| = ${l1(a)}`],
    ['cos θ', cos === null ? 'undefined' : `${d} ÷ (${num(l2(a))} × ${num(l2(b))}) = ${num(cos)}`],
    ['angle θ', ang === null ? 'undefined' : `${num(ang, 1)}°`],
    ['distance ‖a − b‖', num(distance(a, b))],
  ];
  if (mode === 'unit' && ua && ub) {
    rows.push(['â · b̂ (unit vectors)', `${num(dot(ua, ub))} = cos θ`]);
  }

  const verdict =
    cos === null
      ? 'One vector is all zeros, so it has **no direction**: the cosine divides 0 by 0, so NumPy warns and gives nan. Real systems skip or fix such vectors.'
      : cos > 0.999
        ? `They point the **same way**: cosine 1. The dot product, ${d}, also grows with the lengths.`
        : cos < -0.999
          ? `They point in **opposite** directions: cosine −1 and a negative dot product, ${d}.`
          : Math.abs(cos) < 1e-9
            ? 'They are at **90 degrees**: the dot product and the cosine are both 0. In search, that means no similarity at all.'
            : cos > 0
              ? `The angle is under 90 degrees, so the dot product is **positive** (${d}) and the cosine is ${num(cos)}. Scale b up and the dot product grows; the cosine stays the same.`
              : `The angle is over 90 degrees, so the dot product is **negative** (${d}) and the cosine is ${num(cos)}.`;

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <NumSlider
          label="a: x"
          value={a.x}
          min={-R}
          max={R}
          step={1}
          shown={String(a.x)}
          onChange={(x) => setA({ ...a, x })}
        />
        <NumSlider
          label="a: y"
          value={a.y}
          min={-R}
          max={R}
          step={1}
          shown={String(a.y)}
          onChange={(y) => setA({ ...a, y })}
        />
        <NumSlider
          label="b: x"
          value={b.x}
          min={-R}
          max={R}
          step={1}
          shown={String(b.x)}
          onChange={(x) => setB({ ...b, x })}
        />
        <NumSlider
          label="b: y"
          value={b.y}
          min={-R}
          max={R}
          step={1}
          shown={String(b.y)}
          onChange={(y) => setB({ ...b, y })}
        />
        <Pick
          label="Show"
          options={['raw', 'unit'] as const}
          value={mode}
          onChange={setMode}
          names={{ raw: 'The vectors', unit: 'Also at length 1' }}
        />
      </Panel>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[minmax(0,260px)_1fr]">
        <svg
          viewBox={`0 0 ${S} ${S}`}
          className="mx-auto block h-auto w-full max-w-[300px]"
          role="img"
          aria-label={`a = (${a.x}, ${a.y}) and b = (${b.x}, ${b.y}). Dot product ${d}${cos === null ? '' : `, cosine ${num(cos)}`}.`}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={sx(t)}
                x2={sx(t)}
                y1={PAD}
                y2={S - PAD}
                className="stroke-line"
                strokeWidth={t === 0 ? 1.4 : 0.6}
              />
              <line
                y1={sy(t)}
                y2={sy(t)}
                x1={PAD}
                x2={S - PAD}
                className="stroke-line"
                strokeWidth={t === 0 ? 1.4 : 0.6}
              />
            </g>
          ))}
          {mode === 'unit' && (
            <circle
              cx={sx(0)}
              cy={sy(0)}
              r={sx(1) - sx(0)}
              className="fill-none stroke-muted"
              strokeDasharray="3 3"
            />
          )}
          {arrow(a, 'brand', mode === 'unit')}
          {arrow(b, 'warn', mode === 'unit')}
          {mode === 'unit' && ua && arrow(ua, 'brand')}
          {mode === 'unit' && ub && arrow(ub, 'warn')}
          {label(a, `a (${a.x}, ${a.y})`, 'brand')}
          {label(b, `b (${b.x}, ${b.y})`, 'warn')}
        </svg>
        <dl className="grid content-start gap-1.5 text-[13px]">
          {rows.map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-[minmax(0,9.5rem)_1fr] gap-2 border-b border-line pb-1"
            >
              <dt className="text-muted">{k}</dt>
              <dd className="font-mono font-semibold break-words text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Repl
        label="The same in NumPy"
        lines={[
          { code: `a = np.array([${a.x}, ${a.y}]); b = np.array([${b.x}, ${b.y}])` },
          { code: 'print(a @ b)', out: String(d) },
          {
            code: 'print(round(np.linalg.norm(a), 3), np.linalg.norm(a, 1))',
            out: `${pyRound(l2(a))} ${l1(a)}.0`,
          },
          {
            code: 'print(round(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)), 3))',
            out:
              cos === null
                ? 'nan  (after an "invalid value encountered in scalar divide" warning)'
                : pyRound(cos),
          },
        ]}
      />

      <div aria-live="polite">
        <Verdict tone={cos === null ? 'bad' : 'info'} text={verdict} />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}

// ───────────── Matrix multiplication ─────────────

type MatOp = 'a@b' | 'b@a' | 'a@a' | 'a@a.T' | 'a*b';

export function MatmulExplorer({ body }: { body: Body<'matmul-explorer'> }) {
  const p = body.params;
  const A = p.a;
  const B = p.b;
  const AT = transpose(A);
  const [op, setOp] = useState<MatOp>(p.defaultOp);
  const [cell, setCell] = useState<[number, number]>([0, 0]);
  const opName: Record<MatOp, string> = {
    'a@b': `${p.aName} @ ${p.bName}`,
    'b@a': `${p.bName} @ ${p.aName}`,
    'a@a': `${p.aName} @ ${p.aName}`,
    'a@a.T': `${p.aName} @ ${p.aName}.T`,
    'a*b': `${p.aName} * ${p.bName}`,
  };
  const pair: Record<MatOp, { left: Grid; right: Grid; ln: string; rn: string }> = {
    'a@b': { left: A, right: B, ln: p.aName, rn: p.bName },
    'b@a': { left: B, right: A, ln: p.bName, rn: p.aName },
    'a@a': { left: A, right: A, ln: p.aName, rn: p.aName },
    'a@a.T': { left: A, right: AT, ln: p.aName, rn: `${p.aName}.T` },
    'a*b': { left: A, right: B, ln: p.aName, rn: p.bName },
  };
  const { left, right, ln, rn } = pair[op];
  const product: Product = op === 'a*b' ? elementwise(left, right) : matmul(left, right);
  // NumPy prints floats only when an operand holds floats: marks @ marks.T stays whole numbers.
  const isFloat = [...left.flat(), ...right.flat()].some((v) => !Number.isInteger(v));
  const fmtCell = (v: number) => num(v, 3);
  const leftNames = {
    'a@b': [p.rowNames, p.innerNames],
    'b@a': [p.innerNames, p.colNames],
    'a@a': [p.rowNames, p.innerNames],
    'a@a.T': [p.rowNames, p.innerNames],
    'a*b': [p.rowNames, p.innerNames],
  }[op];
  const rightNames = {
    'a@b': [p.innerNames, p.colNames],
    'b@a': [p.rowNames, p.innerNames],
    'a@a': [p.rowNames, p.innerNames],
    'a@a.T': [p.innerNames, p.rowNames],
    'a*b': [p.innerNames, p.colNames],
  }[op];
  const resultNames = {
    'a@b': [p.rowNames, p.colNames],
    'b@a': [p.innerNames, p.innerNames],
    'a@a': [[], []],
    'a@a.T': [p.rowNames, p.rowNames],
    'a*b': [[], []],
  }[op];

  const [ci, cj] = product.ok
    ? [
        Math.min(cell[0], (product.result.length || 1) - 1),
        Math.min(cell[1], (product.result[0]?.length || 1) - 1),
      ]
    : [0, 0];
  const isMat = op !== 'a*b';
  const rowOfLeft = left[ci] ?? [];
  const colOfRight = right.map((r) => r[cj] ?? 0);
  const terms = rowOfLeft.map((v, t) => `${v} × ${colOfRight[t]}`);
  const parts = rowOfLeft.map((v, t) => clean(v * (colOfRight[t] ?? 0)));
  const value = product.ok ? (product.result[ci]?.[cj] ?? 0) : 0;
  const lookLeft = (r: number, c: number): CellLook =>
    product.ok && isMat && r === ci
      ? 'pick'
      : product.ok && !isMat && r === ci && c === cj
        ? 'pick'
        : 'plain';
  const lookRight = (r: number, c: number): CellLook =>
    product.ok && isMat && c === cj
      ? { group: 2 }
      : product.ok && !isMat && r === ci && c === cj
        ? { group: 2 }
        : 'plain';

  const ls = shapeText([left.length, left[0]?.length ?? 0]);
  const rs = shapeText([right.length, right[0]?.length ?? 0]);
  const inner = [left[0]?.length ?? 0, right.length];
  const rowName = (resultNames[0] as string[])[ci] ?? `row ${ci}`;
  const colName = (resultNames[1] as string[])[cj] ?? `column ${cj}`;

  const verdict = (() => {
    if (op === 'a*b') {
      return product.ok
        ? '`*` multiplies **element by element**, so each cell pairs the same position in both arrays.'
        : `\`*\` multiplies **element by element**, so the shapes must match or broadcast, and ${ls} and ${rs} do not. \`@\` is the matrix product: it needs only the inner sizes to match.`;
    }
    if (!product.ok) {
      return `The inner sizes clash: ${ls} @ ${rs} needs the columns of the left (${inner[0]}) to equal the rows of the right (${inner[1]}). Transposing one side, as in \`${p.aName} @ ${p.aName}.T\`, can fix it.`;
    }
    const cellText = `Cell (${ci}, ${cj}) is row ${ci} of \`${ln}\` times column ${cj} of \`${rn}\`: ${terms.join(' + ')} = ${parts.join(' + ')} = **${fmtCell(value)}**.`;
    if (op === 'a@b') return `${cellText} That is ${rowName} under ${colName}.`;
    if (op === 'b@a') {
      return `${cellText} The shapes fit, so NumPy computes it, but each cell mixes one ${p.bName} row with one ${p.aName} column: the numbers mean nothing here. **Order matters**: A @ B is not B @ A.`;
    }
    return `${cellText} \`${p.aName} @ ${p.aName}.T\` scores every row against every row with dot products, which is how a batch of similarity scores is computed.`;
  })();

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <Panel>
        <Pick label="Operation" options={p.ops} value={op} onChange={setOp} names={opName} />
        <div className="grid content-center gap-1 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[13px]">
          <span className="eyebrow font-sans">Shapes</span>
          <span>
            {ls} {op === 'a*b' ? '*' : '@'} {rs} →{' '}
            <span className={cn('font-bold', product.ok ? 'text-ok' : 'text-bad')}>
              {product.ok ? shapeText(product.shape) : 'error'}
            </span>
          </span>
          {isMat && (
            <span className="font-sans text-[12px] text-muted">
              Inner sizes {inner[0]} and {inner[1]}:{' '}
              {inner[0] === inner[1] ? 'they match' : 'they clash'}
            </span>
          )}
        </div>
      </Panel>

      <div className="grid gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex flex-wrap items-start gap-4">
          <GridTable
            values={left}
            look={lookLeft}
            rowNames={leftNames[0]}
            colNames={leftNames[1]}
            showIndex={false}
            format={fmtCell}
            caption={<code className="font-mono">{`${ln} ${ls}`}</code>}
          />
          <GridTable
            values={right}
            look={lookRight}
            rowNames={rightNames[0]}
            colNames={rightNames[1]}
            showIndex={false}
            format={fmtCell}
            caption={<code className="font-mono">{`${rn} ${rs}`}</code>}
          />
          {product.ok && (
            <GridTable
              values={product.result}
              rowNames={resultNames[0] as string[]}
              colNames={resultNames[1] as string[]}
              showIndex={false}
              format={fmtCell}
              onCell={(r, c) => setCell([r, c])}
              selected={[ci, cj]}
              caption={
                <span>
                  <code className="font-mono">{shapeText(product.shape)}</code> result: pick a cell
                </span>
              }
            />
          )}
        </div>
        <Repl
          label="Python"
          lines={
            product.ok
              ? [
                  {
                    code: `print(${opName[op]})`,
                    out: formatArray(
                      product.result.map((r) => r.map(clean)),
                      isFloat,
                    ),
                  },
                  { code: `(${opName[op]}).shape`, out: shapeText(product.shape) },
                ]
              : [{ code: opName[op], error: `ValueError: ${product.message}` }]
          }
        />
      </div>

      <div aria-live="polite">
        <Verdict tone={product.ok ? 'ok' : 'bad'} text={verdict} />
      </div>
      <TryThis tasks={p.tasks} />
    </div>
  );
}
