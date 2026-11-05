/**
 * A small, dependency-free Python highlighter. It only labels spans of text; rendering
 * escapes everything, so code is never interpreted as markup.
 */

export type TokenKind =
  | 'keyword'
  | 'builtin'
  | 'string'
  | 'comment'
  | 'number'
  | 'def'
  | 'deco'
  | 'plain';
export interface Token {
  kind: TokenKind;
  text: string;
}

const KEYWORDS = new Set(
  (
    'and as assert async await break class continue def del elif else except finally for from ' +
    'global if import in is lambda nonlocal not or pass raise return try while with yield match case ' +
    'None True False'
  ).split(' '),
);
const BUILTINS = new Set(
  (
    'print len range enumerate zip sorted reversed list dict set tuple str int float bool sum min max ' +
    'abs round open isinstance map filter any all type super object iter next repr format hash id input'
  ).split(' '),
);

const STRING =
  /^(?:[rRbBuUfF]{0,2})("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/;
const NUMBER = /^(?:0[xX][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?j?|\.\d+)/;
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;

export function tokenizePython(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let afterDef = false;
  const push = (kind: TokenKind, text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind && kind === 'plain') last.text += text;
    else out.push({ kind, text });
  };
  while (i < code.length) {
    const rest = code.slice(i);
    const c = code[i] as string;
    if (c === '#') {
      const end = code.indexOf('\n', i);
      const text = end < 0 ? rest : code.slice(i, end);
      push('comment', text);
      i += text.length;
      continue;
    }
    const str = STRING.exec(rest);
    if (str && (/['"]/.test(c) || /^[rRbBuUfF]{1,2}['"]/.test(rest))) {
      push('string', str[0]);
      i += str[0].length;
      continue;
    }
    if (c === '@' && (i === 0 || code[i - 1] === '\n' || /\s/.test(code[i - 1] as string))) {
      const m = /^@[A-Za-z_][\w.]*/.exec(rest);
      if (m) {
        push('deco', m[0]);
        i += m[0].length;
        continue;
      }
    }
    const ident = IDENT.exec(rest);
    if (ident) {
      const word = ident[0];
      if (afterDef) {
        push('def', word);
        afterDef = false;
      } else if (KEYWORDS.has(word)) {
        push('keyword', word);
        afterDef = word === 'def' || word === 'class';
      } else if (BUILTINS.has(word) && code[i + word.length] === '(') {
        push('builtin', word);
      } else {
        push('plain', word);
      }
      i += word.length;
      continue;
    }
    const num = NUMBER.exec(rest);
    if (num && (i === 0 || !/[\w.]/.test(code[i - 1] as string))) {
      push('number', num[0]);
      i += num[0].length;
      continue;
    }
    push('plain', c);
    i++;
  }
  return out;
}

/** Tokens split into lines (strings and comments may span lines). */
export function highlightLines(code: string, language = 'python'): Token[][] {
  const tokens: Token[] =
    language === 'python' ? tokenizePython(code) : [{ kind: 'plain', text: code }];
  const lines: Token[][] = [[]];
  for (const t of tokens) {
    const parts = t.text.split('\n');
    parts.forEach((part, idx) => {
      if (idx > 0) lines.push([]);
      if (part) (lines[lines.length - 1] as Token[]).push({ kind: t.kind, text: part });
    });
  }
  return lines;
}
