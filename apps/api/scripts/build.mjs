// Production bundle for the API, worker and CLI.
// Workspace packages (@app/*) ship TypeScript source, so they are bundled in;
// every npm dependency stays external and is installed normally in the runtime image.
import { copyFileSync, readFileSync, rmSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies).filter((d) => !d.startsWith('@app/'));

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true });

await build({
  entryPoints: {
    main: 'src/main.ts',
    worker: 'src/worker.ts',
    'create-admin': 'src/cli/create-admin.ts',
    'bootstrap-catalog': 'src/cli/bootstrap-catalog.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node24',
  sourcemap: true,
  external: [...external, ...external.map((d) => `${d}/*`)],
  // Some CommonJS dependencies call require(); give ESM output a real one.
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

// The Python sandbox runs as its own locked-down process, so it ships as a separate file
// next to the bundles (python-runner.ts finds it beside itself).
copyFileSync(
  new URL('../src/modules/ai/python-sandbox.mjs', import.meta.url),
  new URL('../dist/python-sandbox.mjs', import.meta.url),
);
