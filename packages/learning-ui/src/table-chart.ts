/**
 * A picture of a slide's table, worked out from the table itself: its highlighted column drawn as
 * bars, so the numbers a student reads in the rows are also seen side by side. Nothing is
 * authored for it and nothing can drift from the table, because the table is the only source.
 *
 * Two shapes:
 * - `sum`: the rows are parts of the total in the table's last line (a prediction built from an
 *   intercept and two terms). Drawn as one bar split into its parts.
 * - `bars`: one bar per row from a zero line, below it for a negative number (residuals).
 *
 * No chart is offered where one would mislead or crowd the slide: a column that is not all
 * numbers, fewer than three rows, more than seven, or nothing but zeros.
 */

export interface TableForChart {
  columns: readonly string[];
  cells: ReadonlyArray<readonly string[]>;
  totals?: readonly string[];
  highlight?: number;
}

export type TableChart =
  | {
      kind: 'sum';
      /** The highlighted column's name. */
      name: string;
      parts: Array<{ label: string; value: number; shown: string }>;
      /** What the parts add up to, as the table words it ("Prediction") and prints it ("11.43"). */
      total: { label: string; shown: string };
    }
  | {
      kind: 'bars';
      name: string;
      /** The first column's name: what each bar stands for. */
      by: string;
      bars: Array<{ label: string; value: number; shown: string }>;
    };

/** A plain number as a table prints it: "+1", "−0.43", "1,200", "3.35". Anything else is not one. */
export function cellNumber(text: string): number | null {
  const t = text.trim().replace(/−/g, '-').replace(/,/g, '').replace(/^\+/, '');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

const MIN_ROWS = 3;
const MAX_ROWS = 7;

export function tableChart(table: TableForChart): TableChart | null {
  const h = table.highlight;
  if (h === undefined || h < 0 || h >= table.columns.length) return null;
  const rows = table.cells;
  if (rows.length < MIN_ROWS || rows.length > MAX_ROWS) return null;
  const values = rows.map((r) => cellNumber(r[h] ?? ''));
  if (values.some((v) => v === null)) return null;
  const nums = values as number[];
  if (nums.every((v) => v === 0)) return null;
  const name = table.columns[h] ?? '';
  // The first column names the rows, unless it is the charted column itself.
  const labelOf = (i: number) => (h === 0 ? String(i + 1) : (rows[i]?.[0] ?? String(i + 1)));
  const marks = nums.map((value, i) => ({ label: labelOf(i), value, shown: rows[i]?.[h] ?? '' }));

  const totalText = table.totals?.[h];
  const total = totalText === undefined ? null : cellNumber(totalText);
  if (total !== null && total > 0 && nums.length <= 5 && nums.every((v) => v > 0)) {
    const sum = nums.reduce((a, b) => a + b, 0);
    // The table rounds what it prints, so the parts may miss the printed total by a rounding step.
    if (Math.abs(sum - total) <= Math.max(0.011, Math.abs(total) * 0.006)) {
      return {
        kind: 'sum',
        name,
        parts: marks,
        total: { label: h === 0 ? '' : (table.totals?.[0] ?? ''), shown: totalText ?? '' },
      };
    }
  }
  return { kind: 'bars', name, by: h === 0 ? '' : (table.columns[0] ?? ''), bars: marks };
}
