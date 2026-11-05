/**
 * Runs Python in the student's own browser with Pyodide, inside a Web Worker: no access to the
 * page, and the main thread can terminate it if code runs too long (docs/09 risk R6).
 */

interface PyodideLike {
  loadPackage(names: string[]): Promise<unknown>;
  setStdout(o: { batched: (s: string) => void }): void;
  setStderr(o: { batched: (s: string) => void }): void;
  runPythonAsync(code: string, opts?: { globals?: unknown }): Promise<unknown>;
  globals: { get(name: string): (() => { destroy(): void }) | undefined };
}

type Inbound = { id: number; code: string; packages: string[]; indexURL: string };

const scope = self as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((e: MessageEvent<Inbound>) => void) | null;
};

let runtime: Promise<PyodideLike> | null = null;
const loaded = new Set<string>();

function load(indexURL: string) {
  runtime ??= (async () => {
    const mod = (await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)) as {
      loadPyodide(opts: { indexURL: string }): Promise<PyodideLike>;
    };
    return mod.loadPyodide({ indexURL });
  })();
  return runtime;
}

/** Keeps the frames from the student's code and drops Pyodide's own. */
function cleanTraceback(message: string) {
  const lines = message.split('\n');
  const first = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (first < 0)
    return lines
      .filter((l) => !l.includes('/lib/python'))
      .join('\n')
      .trim();
  return ['Traceback (most recent call last):', ...lines.slice(first)].join('\n').trim();
}

scope.onmessage = async (e) => {
  const { id, code, packages, indexURL } = e.data;
  let stdout = '';
  let stderr = '';
  try {
    scope.postMessage({ id, type: 'status', status: 'loading' });
    const py = await load(indexURL);
    const missing = packages.filter((p) => !loaded.has(p));
    if (missing.length) {
      await py.loadPackage(missing);
      for (const p of missing) loaded.add(p);
    }
    py.setStdout({ batched: (s) => (stdout += `${s}\n`) });
    py.setStderr({ batched: (s) => (stderr += `${s}\n`) });
    // A fresh namespace per run, so one snippet never leaks into the next.
    const makeDict = py.globals.get('dict');
    const globals = makeDict?.();
    scope.postMessage({ id, type: 'status', status: 'running' });
    const started = performance.now();
    try {
      await py.runPythonAsync(code, { globals });
      scope.postMessage({
        id,
        type: 'result',
        ok: true,
        stdout,
        stderr,
        error: null,
        ms: Math.round(performance.now() - started),
      });
    } catch (err) {
      scope.postMessage({
        id,
        type: 'result',
        ok: false,
        stdout,
        stderr,
        error: cleanTraceback(err instanceof Error ? err.message : String(err)),
        ms: Math.round(performance.now() - started),
      });
    } finally {
      globals?.destroy();
    }
  } catch (err) {
    runtime = null;
    scope.postMessage({
      id,
      type: 'result',
      ok: false,
      stdout,
      stderr,
      error: `Python could not start: ${err instanceof Error ? err.message : String(err)}. Check your connection and try again.`,
      ms: 0,
      loadFailed: true,
    });
  }
};
