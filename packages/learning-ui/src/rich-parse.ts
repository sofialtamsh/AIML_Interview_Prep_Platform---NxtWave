/**
 * Parser for the lesson markdown subset (docs/07 §5): **bold**, *italic* / _italic_, `code`,
 * [links](https://…) and glossary chips [[term:embedding]]. It produces a small tree that is
 * rendered as React text nodes, so nothing in content is ever interpreted as HTML.
 */

export type RichNode =
  | { type: 'text'; text: string }
  | { type: 'break' }
  | { type: 'strong'; children: RichNode[] }
  | { type: 'em'; children: RichNode[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: RichNode[] }
  | { type: 'term'; term: string; label: string };

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i;
const WORDISH = /[\p{L}\p{N}]/u;

/** Paragraphs are separated by a blank line. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function parseRich(text: string): RichNode[] {
  const out: RichNode[] = [];
  let buffer = '';
  const flush = () => {
    if (buffer) out.push({ type: 'text', text: buffer });
    buffer = '';
  };
  let i = 0;
  while (i < text.length) {
    const c = text[i] as string;
    const rest = text.slice(i);

    if (c === '\n') {
      flush();
      out.push({ type: 'break' });
      i++;
      continue;
    }
    if (c === '`') {
      const end = text.indexOf('`', i + 1);
      if (end > i + 1) {
        flush();
        out.push({ type: 'code', text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith('[[')) {
      const end = text.indexOf(']]', i + 2);
      if (end > i + 2) {
        const inner = text.slice(i + 2, end);
        const [rawTerm, label] = inner.startsWith('term:')
          ? [inner.slice(5), inner.slice(5)]
          : [inner, inner];
        const [term, shown] = rawTerm.includes('|')
          ? (rawTerm.split('|', 2) as [string, string])
          : [rawTerm, label];
        flush();
        out.push({ type: 'term', term: term.trim().toLowerCase(), label: shown.trim() });
        i = end + 2;
        continue;
      }
    }
    if (c === '[') {
      const close = text.indexOf('](', i + 1);
      const end = close > 0 ? text.indexOf(')', close + 2) : -1;
      if (close > i + 1 && end > close + 2) {
        const href = text.slice(close + 2, end).trim();
        if (SAFE_URL.test(href)) {
          flush();
          out.push({ type: 'link', href, children: parseRich(text.slice(i + 1, close)) });
          i = end + 1;
          continue;
        }
      }
    }
    if (rest.startsWith('**')) {
      const end = text.indexOf('**', i + 2);
      if (end > i + 2) {
        flush();
        out.push({ type: 'strong', children: parseRich(text.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if ((c === '*' || c === '_') && opensEmphasis(text, i)) {
      const end = closingEmphasis(text, i + 1, c);
      if (end > i + 1) {
        flush();
        out.push({ type: 'em', children: parseRich(text.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    buffer += c;
    i++;
  }
  flush();
  return out;
}

/** `snake_case` and `2*3` are not emphasis: the marker must start a word. */
function opensEmphasis(text: string, i: number) {
  const before = text[i - 1];
  const after = text[i + 1];
  return (
    (before === undefined || !WORDISH.test(before)) && after !== undefined && !/\s/.test(after)
  );
}

function closingEmphasis(text: string, from: number, marker: string) {
  for (let j = from; j < text.length; j++) {
    if (text[j] === '\n') return -1;
    if (text[j] !== marker) continue;
    const before = text[j - 1];
    const after = text[j + 1];
    if (before !== undefined && !/\s/.test(before) && (after === undefined || !WORDISH.test(after)))
      return j;
  }
  return -1;
}

/** Plain text of a rich string, e.g. for aria labels and search. */
export function richToPlain(text: string): string {
  const walk = (nodes: RichNode[]): string =>
    nodes
      .map((n) => {
        switch (n.type) {
          case 'text':
            return n.text;
          case 'break':
            return '\n';
          case 'code':
            return n.text;
          case 'term':
            return n.label;
          default:
            return walk(n.children);
        }
      })
      .join('');
  return walk(parseRich(text));
}
