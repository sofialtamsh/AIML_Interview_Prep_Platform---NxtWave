import { describe, expect, it } from 'vitest';
import { cellNumber, tableChart } from './table-chart';

describe('cellNumber', () => {
  it('reads the ways a table prints a number', () => {
    expect(cellNumber('+1')).toBe(1);
    expect(cellNumber('-1')).toBe(-1);
    expect(cellNumber('−0.43')).toBe(-0.43);
    expect(cellNumber(' 1,200 ')).toBe(1200);
    expect(cellNumber('3.35')).toBe(3.35);
  });

  it('refuses anything that is not a plain number', () => {
    for (const text of ['', 'b', '1.625 × 4', '-ln(0.266)', '82%', '₹4,000', '1e3', '0.5.1'])
      expect(cellNumber(text)).toBeNull();
  });
});

describe('tableChart', () => {
  const prediction = {
    columns: ['Term', 'Calculation', 'Value'],
    cells: [
      ['Intercept', 'b', '3.35'],
      ['Years', '1.625 × 4', '6.50'],
      ['Projects', '0.525 × 3', '1.575'],
    ],
    totals: ['Prediction', 'add them up', '11.43'],
    highlight: 2,
  };

  it('draws parts that add up to the printed total as one split bar', () => {
    const chart = tableChart(prediction);
    expect(chart?.kind).toBe('sum');
    if (chart?.kind !== 'sum') return;
    expect(chart.parts.map((p) => p.label)).toEqual(['Intercept', 'Years', 'Projects']);
    expect(chart.parts.map((p) => p.shown)).toEqual(['3.35', '6.50', '1.575']);
    expect(chart.total).toEqual({ label: 'Prediction', shown: '11.43' });
  });

  it('falls back to bars when the last line is not the sum of the rows', () => {
    const chart = tableChart({ ...prediction, totals: ['Mean', '', '3.81'] });
    expect(chart?.kind).toBe('bars');
  });

  it('draws residuals as bars on both sides of zero, named by the first column', () => {
    const chart = tableChart({
      columns: ['Years', 'Actual salary', 'Predicted (2x + 3)', 'Residual'],
      cells: [
        ['1', '6', '5', '+1'],
        ['2', '6', '7', '-1'],
        ['3', '9', '9', '0'],
        ['4', '11', '11', '0'],
      ],
      highlight: 3,
    });
    expect(chart?.kind).toBe('bars');
    if (chart?.kind !== 'bars') return;
    expect(chart.name).toBe('Residual');
    expect(chart.by).toBe('Years');
    expect(chart.bars.map((b) => b.value)).toEqual([1, -1, 0, 0]);
    expect(chart.bars.map((b) => b.label)).toEqual(['1', '2', '3', '4']);
  });

  it('keeps zeros out of a split bar: a part of nothing is not a part', () => {
    const chart = tableChart({
      columns: ['Residual', 'Squared'],
      cells: [
        ['+1', '1'],
        ['0', '0'],
        ['-1', '1'],
      ],
      totals: ['Sum', '2'],
      highlight: 1,
    });
    expect(chart?.kind).toBe('bars');
  });

  it('offers no chart where one would mislead or crowd the slide', () => {
    const base = { columns: ['Row', 'Value'], highlight: 1 };
    const rows = (n: number) => Array.from({ length: n }, (_, i) => [String(i + 1), String(i + 1)]);
    expect(tableChart({ ...base, cells: rows(3), highlight: undefined })).toBeNull();
    expect(tableChart({ ...base, cells: rows(2) })).toBeNull();
    expect(tableChart({ ...base, cells: rows(8) })).toBeNull();
    expect(
      tableChart({
        ...base,
        cells: [
          ['1', '0'],
          ['2', '0'],
          ['3', '0'],
        ],
      }),
    ).toBeNull();
    expect(
      tableChart({
        ...base,
        cells: [
          ['1', '2'],
          ['2', '-ln(0.3)'],
          ['3', '4'],
        ],
      }),
    ).toBeNull();
    expect(tableChart({ ...base, cells: rows(3), highlight: 5 })).toBeNull();
  });
});
