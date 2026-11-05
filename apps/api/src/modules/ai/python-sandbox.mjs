// Runs AI-written Python for lesson verification, isolated from the API.
//
// The parent (python-runner.ts) starts this file in its own Node process with:
//   - an empty environment (no API keys, no database URL),
//   - Node's permission model: read access only to Pyodide and its package cache, write access
//     only to that cache, no child processes, no workers, no native addons,
//   - a hard time limit per snippet (the parent kills this process when it is exceeded).
// Python runs inside Pyodide (WebAssembly) with a fresh namespace per snippet, the same runtime
// students use in their browser, so verified outputs match what they will see.
//
// Protocol (IPC): parent → { type: 'run', id, code, packages } ; child → { type: 'result', id, … }
import { constants as fsConstants } from 'node:fs';
import { constants as osConstants } from 'node:os';
import { pathToFileURL } from 'node:url';

// Pyodide's file-system layer reads Node's flag constants through the legacy process.binding,
// which the permission model blocks. Hand it exactly that table and nothing else.
process.binding = (name) => {
  if (name === 'constants') return { fs: fsConstants, os: osConstants };
  throw new Error(`process.binding("${name}") is not available in the sandbox`);
};

// Pyodide is imported by its real file path, so this process never needs to read node_modules.
const indexURL = process.argv[2];
const packageCacheDir = process.argv[3];
const { loadPyodide } = await import(pathToFileURL(`${indexURL}pyodide.mjs`).href);

let py;
const loaded = new Set();

function cleanTraceback(message) {
  const lines = String(message).split('\n');
  const first = lines.findIndex((l) => l.includes('File "<exec>"'));
  if (first < 0)
    return lines
      .filter((l) => !l.includes('/lib/python'))
      .join('\n')
      .trim();
  return ['Traceback (most recent call last):', ...lines.slice(first)].join('\n').trim();
}

async function runtime() {
  py ??= await loadPyodide({ indexURL, packageCacheDir, stdout: () => {}, stderr: () => {} });
  return py;
}

process.on('message', async (msg) => {
  if (msg?.type !== 'run') return;
  const started = performance.now();
  let stdout = '';
  let stderr = '';
  try {
    const p = await runtime();
    const missing = (msg.packages ?? []).filter((x) => !loaded.has(x));
    if (missing.length) {
      await p.loadPackage(missing, { messageCallback: () => {}, errorCallback: () => {} });
      for (const x of missing) loaded.add(x);
    }
    p.setStdout({ batched: (s) => (stdout += `${s}\n`) });
    p.setStderr({ batched: (s) => (stderr += `${s}\n`) });
    const globals = p.globals.get('dict')();
    const t0 = performance.now();
    try {
      await p.runPythonAsync(msg.code, { globals });
      process.send({
        type: 'result',
        id: msg.id,
        ok: true,
        stdout,
        stderr,
        error: null,
        ms: Math.round(performance.now() - t0),
      });
    } catch (err) {
      process.send({
        type: 'result',
        id: msg.id,
        ok: false,
        stdout,
        stderr,
        error: cleanTraceback(err?.message ?? err),
        ms: Math.round(performance.now() - t0),
      });
    } finally {
      globals.destroy();
    }
  } catch (err) {
    process.send({
      type: 'result',
      id: msg.id,
      ok: false,
      stdout,
      stderr,
      error: `Python could not start: ${err?.message ?? err}`,
      ms: Math.round(performance.now() - started),
      startFailed: true,
    });
  }
});

process.send({ type: 'ready' });
