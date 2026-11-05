import type { StudentSection } from '@app/content';
import { cn } from '@app/ui';
import { useId, useMemo, useState } from 'react';
import { chunkerVerdict, chunkWords, phraseSpan, wordsOf } from '../chunker';
import { Rich } from '../rich';
import { Verdict } from './code-sections';

type WidgetSection = Extract<StudentSection, { kind: 'WIDGET' }>;

export function WidgetView({ s }: { s: WidgetSection }) {
  switch (s.body.widget) {
    case 'chunker':
      return <Chunker body={s.body} />;
    default:
      return null;
  }
}

function Chunker({ body }: { body: Extract<WidgetSection['body'], { widget: 'chunker' }> }) {
  const { text, size: sizeRange, overlap: overlapRange, highlight } = body.params;
  const [size, setSize] = useState(sizeRange.default);
  const [overlap, setOverlap] = useState(overlapRange.default);
  const words = useMemo(() => wordsOf(text), [text]);
  const chunks = useMemo(
    () => chunkWords(words.length, size, overlap),
    [words.length, size, overlap],
  );
  const span = useMemo(
    () => (highlight ? phraseSpan(text, highlight.phrase) : null),
    [text, highlight],
  );
  const verdict = span ? chunkerVerdict(chunks, span) : null;
  const stored = chunks.reduce((a, c) => a + (c.end - c.start), 0);

  return (
    <div className="grid gap-4">
      {body.prompt && <Rich text={body.prompt} className="text-[15px]" />}
      <div className="grid gap-4 rounded-2xl border border-line bg-surface-2 p-4 sm:grid-cols-2">
        <Slider label="Chunk size" unit="words" range={sizeRange} value={size} onChange={setSize} />
        <Slider
          label="Overlap"
          unit="words"
          range={overlapRange}
          value={overlap}
          onChange={setOverlap}
        />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted" aria-live="polite">
        <span>
          <strong className="font-mono text-ink">{chunks.length}</strong> chunks
        </span>
        <span>
          <strong className="font-mono text-ink">{stored}</strong> words stored for {words.length}{' '}
          words of text
          {stored > words.length &&
            ` (+${Math.round(((stored - words.length) / words.length) * 100)}%)`}
        </span>
      </div>

      {highlight && verdict && (
        <Verdict
          tone={verdict.wholeIn !== null ? 'ok' : 'bad'}
          text={
            verdict.wholeIn !== null
              ? `Chunk ${verdict.wholeIn + 1} holds the whole answer, so retrieval can find it in one piece.`
              : `The answer is split across chunks ${verdict.touching.map((t) => t + 1).join(' and ')}. Neither chunk has the full sentence.`
          }
        />
      )}

      <ol className="grid gap-2">
        {chunks.map((c) => {
          const holds = verdict?.wholeIn === c.index;
          return (
            <li
              key={`${c.start}-${c.end}`}
              className={cn(
                'rounded-xl border bg-surface px-3.5 py-2.5 transition-colors',
                holds
                  ? 'border-ok'
                  : verdict?.touching.includes(c.index)
                    ? 'border-bad/50'
                    : 'border-line',
              )}
            >
              <span className="mb-1 flex items-center gap-2 font-mono text-[11px] font-semibold text-muted">
                CHUNK {c.index + 1} · {c.end - c.start} words
                {c.overlapWords > 0 && <span className="text-g3">· {c.overlapWords} repeated</span>}
              </span>
              <p className="text-[13.5px] leading-relaxed">
                {words.slice(c.start, c.end).map((w, j) => {
                  const pos = c.start + j;
                  const repeated = j < c.overlapWords;
                  const inAnswer = span !== null && pos >= span[0] && pos < span[1];
                  return (
                    <span
                      key={pos}
                      className={cn(
                        repeated && 'rounded-[3px] bg-g3/15 text-ink',
                        inAnswer &&
                          'bg-warn-bg font-medium text-ink underline decoration-warn decoration-2 underline-offset-2',
                      )}
                    >
                      {w}{' '}
                    </span>
                  );
                })}
              </p>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-g3/25" aria-hidden /> Repeated from the previous
          chunk
        </span>
        {highlight && (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-warn-bg ring-1 ring-warn" aria-hidden />{' '}
            {highlight.label}
          </span>
        )}
      </div>
    </div>
  );
}

function Slider({
  label,
  unit,
  range,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
        <span className="font-mono text-[14px] font-bold text-ink">
          {value} <span className="text-[11.5px] font-medium text-muted">{unit}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--brand)]"
      />
      <div className="flex justify-between font-mono text-[10.5px] text-muted">
        <span>{range.min}</span>
        <span>{range.max}</span>
      </div>
    </div>
  );
}
