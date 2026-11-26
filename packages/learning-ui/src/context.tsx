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
  /** Which narrator reads the slides aloud: courses alternate between two voices (0 and 1). */
  voice?: number;
  /**
   * Offers the read-aloud voice (the device's text-to-speech) in slide decks. Off unless the
   * host turns it on: with it off, no listen control is drawn and nothing is ever spoken.
   */
  narration?: boolean;
  /**
   * A step with its own inner sequence (a lab's walkthrough) reports where it is, so the host's
   * one "next" button can walk that sequence before it leaves the step. Null when the step ends.
   */
  reportFlow?(flow: StepFlow | null): void;
  /** Leaves this step for the next one in the lesson; absent where there is none (a preview). */
  advance?: { label: string; go(): void };
}

/**
 * Where a step's inner sequence stands: `index` runs 0 … count, and `count` means it is done
 * (a lab's free play, a deck's last slide). The host shows `label` beside its button and puts
 * `next` on the button while the sequence is not done.
 */
export interface StepFlow {
  index: number;
  count: number;
  go(index: number): void;
  /** "Walkthrough · step 2 of 7", "Slide 2 of 6". */
  label: string;
  /** "Next step", "Next slide". */
  next: string;
}

/** The narrator for the lesson on screen; decks outside a lesson use the first voice. */
export function useNarratorVoice(): number {
  return useContext(Ctx)?.voice ?? 0;
}

/** Whether slide decks may read aloud here. Off by default, and outside a lesson. */
export function useNarration(): boolean {
  return useContext(Ctx)?.narration === true;
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

/** The runtime where there is one: parts that also render outside a lesson use this. */
export function useOptionalRuntime(): LessonRuntime | null {
  return useContext(Ctx);
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
