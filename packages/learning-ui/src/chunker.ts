/**
 * The logic behind the chunker widget. It mirrors the lesson's `chunk_words` exactly, so the
 * widget and the Python code always agree.
 */

export interface WordChunk {
  index: number;
  /** Word positions [start, end). */
  start: number;
  end: number;
  /** How many leading words repeat the previous chunk. */
  overlapWords: number;
}

export const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean);

export function chunkWords(wordCount: number, size: number, overlap: number): WordChunk[] {
  const step = Math.max(1, size - overlap);
  const chunks: WordChunk[] = [];
  let previousEnd = 0;
  for (let start = 0; start < wordCount; start += step) {
    const end = Math.min(wordCount, start + size);
    chunks.push({
      index: chunks.length,
      start,
      end,
      overlapWords: chunks.length === 0 ? 0 : Math.max(0, previousEnd - start),
    });
    previousEnd = end;
    if (start + size >= wordCount) break;
  }
  return chunks;
}

/** Word positions [start, end) of a phrase inside the text, or null. */
export function phraseSpan(text: string, phrase: string): [number, number] | null {
  const words = wordsOf(text);
  const target = wordsOf(phrase);
  if (target.length === 0) return null;
  for (let i = 0; i + target.length <= words.length; i++) {
    if (target.every((w, j) => words[i + j] === w)) return [i, i + target.length];
  }
  return null;
}

export interface ChunkerVerdict {
  /** The chunk that holds the whole phrase, if any. */
  wholeIn: number | null;
  /** Chunks that hold part of it. */
  touching: number[];
}

export function chunkerVerdict(chunks: WordChunk[], span: [number, number]): ChunkerVerdict {
  const [s, e] = span;
  const whole = chunks.find((c) => c.start <= s && c.end >= e);
  return {
    wholeIn: whole ? whole.index : null,
    touching: chunks.filter((c) => c.start < e && c.end > s).map((c) => c.index),
  };
}
