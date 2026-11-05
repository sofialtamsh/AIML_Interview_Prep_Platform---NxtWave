import type { StudentSection } from '@app/content';
import { Badge, Button, cn } from '@app/ui';
import {
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Eye,
  Info,
  Lightbulb,
  RotateCcw,
  ThumbsUp,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { CodeBlock, OutputPanel, RunButton, RunHint, useRunner } from '../code';
import { safeStorage, useLessonRuntime } from '../context';
import { sameOutput } from '../python/runner';
import { Rich } from '../rich';

type Of<K extends StudentSection['kind']> = Extract<StudentSection, { kind: K }>;

// ───────────── Code example ─────────────

export function CodeExampleView({ s }: { s: Of<'CODE_EXAMPLE'> }) {
  const { code, annotations, runnable, packages, expectedOutput, language } = s.body;
  const [active, setActive] = useState<number | null>(null);
  const runner = useRunner();
  const range = active === null ? null : (annotations[active]?.lines ?? null);
  const live = runner.result;
  const matches =
    live && expectedOutput !== undefined && live.ok && sameOutput(live.stdout, expectedOutput);

  return (
    <div className="grid gap-3">
      <CodeBlock code={code} language={language} highlight={range} />
      {annotations.length > 0 && (
        <ol className="grid gap-1.5" aria-label="What each part does">
          {annotations.map((a, i) => (
            <li key={`${a.lines.join('-')}:${a.note}`}>
              <button
                type="button"
                aria-pressed={active === i}
                onClick={() => setActive(active === i ? null : i)}
                onFocus={() => setActive(i)}
                className={cn(
                  'flex w-full gap-3 rounded-xl border px-3 py-2 text-left text-[13.5px] transition',
                  active === i
                    ? 'border-brand bg-brand-soft'
                    : 'border-line bg-surface hover:border-line-2',
                )}
              >
                <span className="shrink-0 font-mono text-[11.5px] font-semibold text-brand">
                  {a.lines[0] === a.lines[1] ? `L${a.lines[0]}` : `L${a.lines[0]}–${a.lines[1]}`}
                </span>
                <Rich text={a.note} inline />
              </button>
            </li>
          ))}
        </ol>
      )}
      {runnable && (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <RunButton
              busy={runner.busy}
              state={runner.state}
              label={live ? 'Run again' : 'Run it yourself'}
              onClick={() => runner.run(code, packages)}
            />
            <RunHint state={runner.state} busy={runner.busy} />
          </div>
          {live ? (
            <OutputPanel
              title={`Your run · ${live.ms} ms`}
              text={live.stdout}
              error={live.error}
              tone={live.ok ? (matches ? 'ok' : 'neutral') : 'bad'}
              badge={
                matches ? (
                  <Badge tone="ok">Matches the lesson</Badge>
                ) : live.ok && expectedOutput !== undefined ? (
                  <Badge tone="warn">Different output</Badge>
                ) : null
              }
            />
          ) : (
            expectedOutput !== undefined && <OutputPanel title="Output" text={expectedOutput} />
          )}
        </div>
      )}
    </div>
  );
}

// ───────────── Code explorer ─────────────

type ExplorerState = Of<'CODE_EXPLORER'>['body']['states'][number];

export function CodeExplorerView({ s }: { s: Of<'CODE_EXPLORER'> }) {
  const { prompt, setup, controls, states, defaultState, packages } = s.body;
  const [choice, setChoice] = useState<Record<string, string>>(defaultState);
  const [seen, setSeen] = useState<Set<string>>(() => new Set([signature(controls, defaultState)]));
  const [showSetup, setShowSetup] = useState(false);
  const runner = useRunner();

  const sig = signature(controls, choice);
  const state = states.find((st) => signature(controls, st.when) === sig) as
    | ExplorerState
    | undefined;

  const pick = (id: string, value: string) => {
    const next = { ...choice, [id]: value };
    setChoice(next);
    setSeen((prev) => new Set(prev).add(signature(controls, next)));
    runner.clear();
  };

  return (
    <div className="grid gap-4">
      {prompt && <Rich text={prompt} className="text-[15px]" />}
      <div className="grid gap-3 rounded-2xl border border-line bg-surface-2 p-3.5 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
        {controls.map((c) => (
          <fieldset key={c.id} className="grid gap-1.5">
            <legend className="mb-1.5 eyebrow">{c.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {c.options.map((o) => {
                const on = choice[c.id] === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => pick(c.id, o.value)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 font-mono text-[12.5px] font-semibold transition',
                      on
                        ? 'border-ink bg-ink text-surface'
                        : 'border-line-2 bg-surface text-ink-2 hover:border-ink-2',
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <span className="text-[12.5px] text-muted">
        You have tried {seen.size} of {states.length} combinations
      </span>

      {setup && (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            aria-expanded={showSetup}
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            <ChevronDown
              className={cn('size-4 transition', showSetup && 'rotate-180')}
              aria-hidden
            />
            {showSetup ? 'Hide' : 'Show'} the setup code
          </button>
          {showSetup && <CodeBlock code={setup} label="setup (runs first)" />}
        </div>
      )}

      {state && (
        <div className="grid gap-3" aria-live="polite">
          <CodeBlock code={state.code} />
          {state.output.kind === 'text' ? (
            <OutputPanel text={state.output.value} />
          ) : (
            <ExplorerTable output={state.output} />
          )}
          <Verdict tone={state.verdict.tone} text={state.verdict.text} />
          <div className="flex flex-wrap items-center gap-3">
            <RunButton
              variant="secondary"
              busy={runner.busy}
              state={runner.state}
              label="Run this for real"
              onClick={() => runner.run(`${setup ?? ''}\n${state.code}`, packages)}
            />
            <RunHint state={runner.state} busy={runner.busy} />
          </div>
          {runner.result && (
            <OutputPanel
              title={`Live run · ${runner.result.ms} ms`}
              text={runner.result.stdout}
              error={runner.result.error}
              tone={runner.result.ok ? 'ok' : 'bad'}
              badge={
                state.output.kind === 'text' &&
                runner.result.ok &&
                sameOutput(runner.result.stdout, state.output.value) ? (
                  <Badge tone="ok">Same as above</Badge>
                ) : null
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

const signature = (controls: Array<{ id: string }>, when: Record<string, string>) =>
  controls.map((c) => `${c.id}=${when[c.id] ?? ''}`).join('&');

function ExplorerTable({
  output,
}: {
  output: Extract<ExplorerState['output'], { kind: 'table' }>;
}) {
  const lit = new Set(output.highlightRows);
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable regions must be keyboard-focusable (WCAG 2.1.1)
    <div className="overflow-x-auto rounded-xl border border-line" tabIndex={0}>
      <table className="w-full border-collapse text-left font-mono text-[12.5px]">
        <thead className="bg-surface-2">
          <tr>
            {output.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-1.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* A row's position is its identity: highlightRows refers to positions. */}
          {output.rows
            .map((cells, at) => ({ cells, at }))
            .map((row) => (
              <tr
                key={row.at}
                className={cn(
                  'border-t border-line',
                  lit.has(row.at) ? 'bg-warn-bg' : 'bg-surface',
                )}
              >
                {row.cells
                  .map((cell, at) => ({ cell, at }))
                  .map((c) => (
                    <td key={c.at} className="px-3 py-1.5">
                      {c.cell}
                    </td>
                  ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export function Verdict({ tone, text }: { tone: 'ok' | 'bad' | 'info'; text: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : Info;
  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-xl border px-4 py-3 text-[14px] text-ink',
        tone === 'ok' && 'border-ok/35 bg-ok-bg',
        tone === 'bad' && 'border-bad/35 bg-bad-bg',
        tone === 'info' && 'border-line bg-surface-2',
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-brand',
        )}
        aria-hidden
      />
      <Rich text={text} />
    </div>
  );
}

// ───────────── Playground ─────────────

export function PlaygroundView({ s }: { s: Of<'PLAYGROUND'> }) {
  const { instructions, starterCode, hints, checks, packages, hasSolution } = s.body;
  const runtime = useLessonRuntime();
  const storageKey = `${runtime.storagePrefix}:playground:${s.revisionId}`;
  const [code, setCode] = useState(() => safeStorage.get(storageKey) ?? starterCode);
  const [hintsShown, setHintsShown] = useState(0);
  const [solution, setSolution] = useState<string | null>(null);
  const [loadingSolution, setLoadingSolution] = useState(false);
  const runner = useRunner();

  useEffect(() => {
    const t = setTimeout(() => {
      if (code === starterCode) safeStorage.remove(storageKey);
      else safeStorage.set(storageKey, code);
    }, 400);
    return () => clearTimeout(t);
  }, [code, starterCode, storageKey]);

  const results = useMemo(
    () =>
      runner.result
        ? checks.map((c) => ({
            ...c,
            pass: runner.result?.ok === true && runner.result.stdout.includes(c.value),
          }))
        : null,
    [runner.result, checks],
  );
  const allPass = results?.every((r) => r.pass) ?? false;

  const reveal = async () => {
    setLoadingSolution(true);
    try {
      setSolution(await runtime.solution({ sectionKey: s.key, revisionId: s.revisionId }));
    } finally {
      setLoadingSolution(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <span className="eyebrow">Your task</span>
        <Rich text={instructions} className="mt-1.5 text-[14.5px]" />
      </div>

      <CodeEditor value={code} onChange={setCode} label="Your code" />

      <div className="flex flex-wrap items-center gap-2">
        <RunButton
          variant="primary"
          busy={runner.busy}
          state={runner.state}
          label="Run and check"
          onClick={() => runner.run(code, packages)}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCode(starterCode);
            runner.clear();
          }}
          disabled={code === starterCode}
        >
          <RotateCcw className="size-3.5" aria-hidden /> Reset
        </Button>
        {hintsShown < hints.length && (
          <Button size="sm" variant="ghost" onClick={() => setHintsShown(hintsShown + 1)}>
            <Lightbulb className="size-3.5" aria-hidden />{' '}
            {hintsShown === 0 ? 'Get a hint' : 'Another hint'}
          </Button>
        )}
        <RunHint state={runner.state} busy={runner.busy} />
      </div>

      {hintsShown > 0 && (
        <ol className="grid gap-1.5">
          {hints.slice(0, hintsShown).map((h, i) => (
            <li
              key={h}
              className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn-bg px-3.5 py-2 text-[13.5px] text-ink"
            >
              <span className="font-mono text-[11.5px] font-bold text-warn">Hint {i + 1}</span>
              <Rich text={h} inline />
            </li>
          ))}
        </ol>
      )}

      {runner.result && (
        <OutputPanel
          text={runner.result.stdout}
          error={runner.result.error}
          tone={runner.result.ok ? (allPass ? 'ok' : 'neutral') : 'bad'}
        />
      )}

      <ul className="grid gap-1.5" aria-label="Checks">
        {(results ?? checks.map((c) => ({ ...c, pass: null as boolean | null }))).map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-[13.5px]">
            {c.pass === null ? (
              <CircleDashed className="size-4 text-muted" aria-hidden />
            ) : c.pass ? (
              <CheckCircle2 className="size-4 text-ok" aria-hidden />
            ) : (
              <XCircle className="size-4 text-bad" aria-hidden />
            )}
            <span className={cn(c.pass === false && 'text-ink', c.pass === null && 'text-ink-2')}>
              {c.label}
            </span>
            <span className="sr-only">
              {c.pass === null ? 'not run yet' : c.pass ? 'passed' : 'not yet'}
            </span>
          </li>
        ))}
      </ul>

      {allPass && (
        <div className="flex items-center gap-2.5 rounded-xl border border-ok/35 bg-ok-bg px-4 py-3 text-[14px] font-medium text-ink animate-rise">
          <ThumbsUp className="size-4 text-ok" aria-hidden /> Every check passes. Nicely done.
        </div>
      )}

      {hasSolution && (
        <div className="grid gap-2">
          {solution === null ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-fit"
              onClick={reveal}
              loading={loadingSolution}
            >
              <Eye className="size-3.5" aria-hidden />{' '}
              {allPass ? 'Compare with our solution' : 'Show the solution'}
            </Button>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="eyebrow">Our solution</span>
                <Button size="sm" variant="ghost" onClick={() => setCode(solution)}>
                  Use it in the editor
                </Button>
              </div>
              <CodeBlock code={solution} label="solution" />
            </>
          )}
          {!allPass && solution === null && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted">
              <TriangleAlert className="size-3.5" aria-hidden /> Try a hint first. You learn more by
              getting it working yourself.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** A plain, accessible code editor: a textarea with line numbers and Tab indenting. */
export function CodeEditor({
  value,
  onChange,
  label,
  minRows = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const lines = Math.max(minRows, value.split('\n').length);
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const el = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = el;
    const next = `${value.slice(0, a)}    ${value.slice(b)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = a + 4;
    });
  };
  return (
    <div className="overflow-hidden rounded-xl border border-line-2 bg-surface focus-within:border-brand">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-1.5">
        <span className="font-mono text-[11px] font-semibold tracking-wide text-muted uppercase">
          {label}
        </span>
        <span className="text-[11px] text-muted">Tab indents · Esc then Tab leaves</span>
      </div>
      <div className="grid grid-cols-[2.75rem_1fr] font-mono text-[12.5px] leading-[1.65]">
        <div
          className="bg-surface-2/60 py-2.5 pr-3 text-right text-muted/70 select-none"
          aria-hidden
        >
          {Array.from({ length: lines }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: line numbers are positional
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={ref}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              (e.currentTarget as HTMLTextAreaElement & { dataset: DOMStringMap }).dataset.escaped =
                '1';
              return;
            }
            if ((e.currentTarget as HTMLTextAreaElement).dataset.escaped === '1') {
              (e.currentTarget as HTMLTextAreaElement).dataset.escaped = '';
              if (e.key === 'Tab') return; // let focus move on
            }
            onKeyDown(e);
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          wrap="off"
          rows={lines}
          className="resize-none overflow-x-auto bg-transparent px-3 py-2.5 whitespace-pre text-ink outline-none"
        />
      </div>
    </div>
  );
}
