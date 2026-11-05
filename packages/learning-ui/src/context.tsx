import type { CheckResponse, CheckResult } from '@app/content';
import { createContext, type ReactNode, useContext } from 'react';

export interface AttemptRecord {
  response: CheckResponse;
  result: CheckResult;
}

/**
 * What a rendered lesson needs from its host. The student app grades on the server; the admin
 * preview grades locally against the full document. The renderers are identical either way.
 */
export interface LessonRuntime {
  grade(input: {
    sectionKey: string;
    revisionId: string;
    itemKey: string;
    response: CheckResponse;
  }): Promise<CheckResult>;
  solution(input: { sectionKey: string; revisionId: string }): Promise<string>;
  /** Earlier tries, keyed `${sectionKey}#${itemKey}`. */
  attempts: ReadonlyMap<string, AttemptRecord>;
  /** Term (lower case) → definition, from the lesson's term blocks. */
  glossary: ReadonlyMap<string, string>;
  onAttempt?(sectionKey: string, itemKey: string, record: AttemptRecord): void;
  /** Prefix for per-viewer drafts kept in this browser (playground code). */
  storagePrefix: string;
}

const Ctx = createContext<LessonRuntime | null>(null);

export function LessonRuntimeProvider({
  value,
  children,
}: {
  value: LessonRuntime;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLessonRuntime(): LessonRuntime {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Lesson sections must be rendered inside <LessonRuntimeProvider>');
  return ctx;
}

/** Glossary from the lesson's own definitions ("term" blocks). */
export function glossaryOf(sections: Array<{ kind: string; body: unknown }>): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of sections) {
    if (s.kind !== 'EXPLANATION') continue;
    const blocks = (
      s.body as { blocks: Array<{ type: string; term?: string; definition?: string }> }
    ).blocks;
    for (const b of blocks) {
      if (b.type === 'term' && b.term && b.definition) map.set(b.term.toLowerCase(), b.definition);
    }
  }
  return map;
}

/** localStorage that never throws (private windows, blocked storage). */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: drafts just aren't kept */
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
