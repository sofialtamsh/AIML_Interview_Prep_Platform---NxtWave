import { describe, expect, it } from 'vitest';
import { chunkerVerdict, chunkWords, phraseSpan, wordsOf } from './chunker';
import { highlightLines, tokenizePython } from './highlight';
import { layerNodes } from './layout';
import { sameOutput } from './python/runner';
import { parseRich, richToPlain, splitParagraphs } from './rich-parse';

describe('rich text', () => {
  it('parses the markdown subset', () => {
    expect(parseRich('Use **overlap** with `chunk_words` and *care*.')).toEqual([
      { type: 'text', text: 'Use ' },
      { type: 'strong', children: [{ type: 'text', text: 'overlap' }] },
      { type: 'text', text: ' with ' },
      { type: 'code', text: 'chunk_words' },
      { type: 'text', text: ' and ' },
      { type: 'em', children: [{ type: 'text', text: 'care' }] },
      { type: 'text', text: '.' },
    ]);
    expect(parseRich('See [[term:embedding]] and [[vector database]]')).toEqual([
      { type: 'text', text: 'See ' },
      { type: 'term', term: 'embedding', label: 'embedding' },
      { type: 'text', text: ' and ' },
      { type: 'term', term: 'vector database', label: 'vector database' },
    ]);
  });

  it('never treats snake_case or maths as emphasis', () => {
    expect(richToPlain('call snake_case_name and 2*3*4')).toBe('call snake_case_name and 2*3*4');
    expect(parseRich('snake_case_name')).toEqual([{ type: 'text', text: 'snake_case_name' }]);
  });

  it('only links to http(s) URLs', () => {
    expect(parseRich('[docs](https://example.com/a)')[0]).toMatchObject({
      type: 'link',
      href: 'https://example.com/a',
    });
    for (const bad of ['[x](javascript:alert(1))', '[x](data:text/html,hi)', '[x](/relative)']) {
      expect(parseRich(bad).some((n) => n.type === 'link')).toBe(false);
    }
  });

  it('keeps markup-looking text as plain text and splits paragraphs', () => {
    expect(parseRich('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
    expect(splitParagraphs('One.\n\nTwo.\n \nThree.')).toEqual(['One.', 'Two.', 'Three.']);
  });
});

describe('python highlighter', () => {
  it('labels keywords, names, strings, comments and numbers', () => {
    const kinds = tokenizePython('def f(x):\n    return print("hi", 3)  # done')
      .filter((t) => t.kind !== 'plain')
      .map((t) => [t.kind, t.text]);
    expect(kinds).toEqual([
      ['keyword', 'def'],
      ['def', 'f'],
      ['keyword', 'return'],
      ['builtin', 'print'],
      ['string', '"hi"'],
      ['number', '3'],
      ['comment', '# done'],
    ]);
  });

  it('keeps every character and splits multi-line strings into lines', () => {
    const code = 'doc = """a\nb"""\nx = 1';
    const lines = highlightLines(code);
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => l.map((t) => t.text).join('')).join('\n')).toBe(code);
    expect(lines[1]?.[0]).toEqual({ kind: 'string', text: 'b"""' });
  });
});

describe('chunker widget', () => {
  const text = 'a b c d e f g';
  it('matches the lesson’s chunk_words exactly', () => {
    // print(chunk_words("a b c d e f g", size=3, overlap=1)) → ['a b c', 'c d e', 'e f g']
    const words = wordsOf(text);
    const chunks = chunkWords(words.length, 3, 1);
    expect(chunks.map((c) => words.slice(c.start, c.end).join(' '))).toEqual([
      'a b c',
      'c d e',
      'e f g',
    ]);
    expect(chunks.map((c) => c.overlapWords)).toEqual([0, 1, 1]);
    // size 6, no overlap, from the lesson's fixed-size example: 14 words → 6 + 6 + 2.
    const policy =
      'UPI refunds usually arrive within 3 to 5 working days. Wallet refunds are instant.';
    expect(chunkWords(wordsOf(policy).length, 6, 0).map((c) => c.end - c.start)).toEqual([6, 6, 2]);
  });

  it('tells whether one chunk holds the whole answer', () => {
    const doc =
      'Refunds for prepaid orders go back to the original payment method. UPI refunds usually arrive within 3 to 5 working days. Wallet refunds are instant.';
    const span = phraseSpan(doc, 'UPI refunds usually arrive within 3 to 5 working days.');
    expect(span).toEqual([11, 21]);
    const n = wordsOf(doc).length;
    expect(chunkerVerdict(chunkWords(n, 12, 0), span as [number, number])).toEqual({
      wholeIn: null,
      touching: [0, 1],
    });
    expect(chunkerVerdict(chunkWords(n, 12, 10), span as [number, number]).wholeIn).not.toBeNull();
  });
});

describe('diagram layout and outputs', () => {
  it('puts each node after its furthest predecessor', () => {
    expect(
      layerNodes(
        ['a', 'b', 'c', 'd'],
        [
          { from: 'a', to: 'b' },
          { from: 'a', to: 'c' },
          { from: 'b', to: 'd' },
          { from: 'c', to: 'd' },
        ],
      ),
    ).toEqual([['a'], ['b', 'c'], ['d']]);
    expect(layerNodes(['x', 'y'], [])).toEqual([['x', 'y']]);
  });

  it('compares program output ignoring trailing whitespace', () => {
    expect(sameOutput('0 a\n1 b\n', '0 a\n1 b')).toBe(true);
    expect(sameOutput('0 a', '0 b')).toBe(false);
  });
});
