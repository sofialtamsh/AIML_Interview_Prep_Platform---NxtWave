/**
 * The page side of the Python runtime. One worker per tab, created on the first Run. Code that
 * runs longer than the limit is stopped by terminating the worker (Python can't be interrupted
 * otherwise without cross-origin isolation).
 */
import { useSyncExternalStore } from 'react';

/** Pinned so a CDN update can never change lesson behaviour. Checked 2026-11-04. */
export const PYODIDE_VERSION = '314.0.7';
export const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const RUN_LIMIT_MS = 10_000;

export interface RunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  ms: number;
  timedOut?: boolean;
}

/** idle → (first run) starting → ready; running while code executes. */
export type RunnerState = 'idle' | 'starting' | 'ready' | 'running';

interface Pending {
  resolve: (r: RunResult) => void;
  timer: ReturnType<typeof setTimeout> | null;
}

class PythonRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private state: RunnerState = 'idle';
  private started = false;
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getState = () => this.state;

  private set(state: RunnerState) {
    this.state = state;
    for (const fn of this.listeners) fn();
  }

  private ensureWorker() {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL('./python.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e: MessageEvent) => this.onMessage(e.data);
    worker.onerror = () => this.reset('Python stopped unexpectedly. Try again.');
    this.worker = worker;
    return worker;
  }

  private onMessage(
    msg: {
      id: number;
      type: 'status' | 'result';
      status?: 'loading' | 'running';
      loadFailed?: boolean;
    } & Partial<RunResult>,
  ) {
    const p = this.pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'status') {
      if (msg.status === 'loading' && !this.started) this.set('starting');
      if (msg.status === 'running') {
        this.started = true;
        this.set('running');
        // The time limit covers the student's code, not downloading Python.
        p.timer = setTimeout(() => {
          this.pending.delete(msg.id);
          this.reset(null);
          p.resolve({
            ok: false,
            stdout: '',
            stderr: '',
            error: `Stopped after ${RUN_LIMIT_MS / 1000} seconds. Is there a loop that never ends?`,
            ms: RUN_LIMIT_MS,
            timedOut: true,
          });
        }, RUN_LIMIT_MS);
      }
      return;
    }
    if (p.timer) clearTimeout(p.timer);
    this.pending.delete(msg.id);
    if (msg.loadFailed) this.started = false;
    this.set(this.started ? 'ready' : 'idle');
    p.resolve({
      ok: Boolean(msg.ok),
      stdout: msg.stdout ?? '',
      stderr: msg.stderr ?? '',
      error: msg.error ?? null,
      ms: msg.ms ?? 0,
    });
  }

  private reset(error: string | null) {
    this.worker?.terminate();
    this.worker = null;
    this.started = false;
    this.set('idle');
    for (const [id, p] of this.pending) {
      if (p.timer) clearTimeout(p.timer);
      p.resolve({ ok: false, stdout: '', stderr: '', error: error ?? 'Stopped.', ms: 0 });
      this.pending.delete(id);
    }
  }

  /** Runs are queued: Python's stdout is shared, so two snippets must never interleave. */
  private queue: Promise<unknown> = Promise.resolve();

  run(code: string, packages: string[] = []): Promise<RunResult> {
    const next = this.queue.then(
      () =>
        new Promise<RunResult>((resolve) => {
          const id = ++this.seq;
          this.pending.set(id, { resolve, timer: null });
          this.ensureWorker().postMessage({ id, code, packages, indexURL: PYODIDE_INDEX_URL });
        }),
    );
    this.queue = next.catch(() => undefined);
    return next;
  }
}

export const python = new PythonRunner();

export function usePythonState() {
  return useSyncExternalStore(python.subscribe, python.getState, python.getState);
}

/** Outputs match when they differ only in trailing whitespace. */
export const sameOutput = (a: string, b: string) =>
  a.replace(/\s+$/gm, '').trim() === b.replace(/\s+$/gm, '').trim();
