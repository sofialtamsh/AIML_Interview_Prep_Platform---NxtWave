import { type ChildProcess, fork } from 'node:child_process';
import { mkdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PythonSnippet {
  code: string;
  packages: string[];
}

export interface PythonResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  ms: number;
  timedOut?: boolean;
}

export interface PythonRunner {
  /** Runs each snippet in a fresh namespace, in order. Never throws for a snippet's own error. */
  run(snippets: PythonSnippet[]): Promise<PythonResult[]>;
}

const STARTUP_LIMIT_MS = 180_000; // first start may download numpy/pandas
const SNIPPET_LIMIT_MS = 15_000;

/**
 * Runs AI-written Python in a locked-down child process (see python-sandbox.mjs): no
 * environment variables, file access limited to Pyodide and its package cache, and a time
 * limit per snippet. A snippet that runs too long kills the process; the rest continue in a
 * fresh one.
 */
export class SandboxedPythonRunner implements PythonRunner {
  private readonly script: string;
  private readonly pyodideDir: string;
  private readonly cacheDir: string;

  constructor(opts: { cacheDir?: string; snippetLimitMs?: number } = {}) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    this.script = path.join(here, 'python-sandbox.mjs');
    const require = createRequire(import.meta.url);
    // pyodide's package.json is not an exported subpath; resolve its main entry instead.
    this.pyodideDir = realpathSync(path.dirname(require.resolve('pyodide')));
    this.cacheDir = path.resolve(opts.cacheDir ?? path.join(process.cwd(), '.cache', 'pyodide'));
    this.limitMs = opts.snippetLimitMs ?? SNIPPET_LIMIT_MS;
  }

  private readonly limitMs: number;

  private start(): Promise<ChildProcess> {
    mkdirSync(this.cacheDir, { recursive: true });
    const sep = path.sep;
    const child = fork(this.script, [`${this.pyodideDir}${sep}`, `${this.cacheDir}${sep}`], {
      env: {},
      execArgv: [
        '--permission',
        `--allow-fs-read=${this.script}`,
        `--allow-fs-read=${this.pyodideDir}${sep}*`,
        `--allow-fs-read=${this.cacheDir}${sep}*`,
        `--allow-fs-write=${this.cacheDir}${sep}*`,
        '--max-old-space-size=512',
      ],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('The Python sandbox did not start in time'));
      }, 30_000);
      child.once('message', (m: { type?: string }) => {
        if (m?.type === 'ready') {
          clearTimeout(timer);
          resolve(child);
        }
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`The Python sandbox exited during start (code ${code})`));
      });
    });
  }

  async run(snippets: PythonSnippet[]): Promise<PythonResult[]> {
    const results: PythonResult[] = [];
    let child: ChildProcess | null = null;
    let first = true;
    try {
      for (const [i, s] of snippets.entries()) {
        child ??= await this.start();
        // The first snippet includes loading Python (and maybe packages), so it gets longer.
        const limit = first ? STARTUP_LIMIT_MS : this.limitMs;
        const r = await this.runOne(child, i, s, limit);
        first = false;
        if (r.timedOut || r.restart) {
          child.kill();
          child = null;
          first = true;
        }
        results.push(r.result);
      }
    } finally {
      child?.kill();
    }
    return results;
  }

  private runOne(
    child: ChildProcess,
    id: number,
    s: PythonSnippet,
    limit: number,
  ): Promise<{ result: PythonResult; timedOut?: boolean; restart?: boolean }> {
    return new Promise((resolve) => {
      const done = (v: { result: PythonResult; timedOut?: boolean; restart?: boolean }) => {
        clearTimeout(timer);
        child.off('message', onMessage);
        child.off('exit', onExit);
        resolve(v);
      };
      const onMessage = (
        m: PythonResult & { type?: string; id?: number; startFailed?: boolean },
      ) => {
        if (m?.type !== 'result' || m.id !== id) return;
        done({
          result: { ok: m.ok, stdout: m.stdout, stderr: m.stderr, error: m.error, ms: m.ms },
          restart: m.startFailed,
        });
      };
      const onExit = () =>
        done({
          result: {
            ok: false,
            stdout: '',
            stderr: '',
            error: 'Python stopped unexpectedly',
            ms: 0,
          },
          restart: true,
        });
      const timer = setTimeout(
        () =>
          done({
            result: {
              ok: false,
              stdout: '',
              stderr: '',
              error: `Stopped after ${Math.round(limit / 1000)} seconds (an endless loop?)`,
              ms: limit,
              timedOut: true,
            },
            timedOut: true,
          }),
        limit,
      );
      child.on('message', onMessage);
      child.once('exit', onExit);
      child.send({ type: 'run', id, code: s.code, packages: s.packages });
    });
  }
}
