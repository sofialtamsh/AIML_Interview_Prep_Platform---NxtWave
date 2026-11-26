import type { StudentSection } from '@app/content';
import { Button, cn } from '@app/ui';
import {
  CheckCircle2,
  ChevronDown,
  Eye,
  Info,
  Lightbulb,
  RotateCcw,
  SquareTerminal,
  ThumbsUp,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CodeBlock,
  CodeEditor,
  IdeAction,
  IdleTerminal,
  OutputPanel,
  RunButton,
  RunHint,
  RunMark,
  useRunner,
} from '../code';
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
  const matches = Boolean(
    live?.ok && expectedOutput !== undefined && sameOutput(live.stdout, expectedOutput),
  );
  const run = () => runner.run(code, packages);

  return (
    <div className="grid gap-3">
      <CodeBlock
        code={code}
        language={language}
        highlight={range}
        label="example.py"
        actions={
          runnable ? (
            <RunButton busy={runner.busy} state={runner.state} label="Run" onClick={run} />
          ) : null
        }
      />
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
                <span className="shrink-0 rounded-md bg-ink px-1.5 py-0.5 font-mono text-[11px] font-semibold text-surface">
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
          <RunHint state={runner.state} busy={runner.busy} />
          {/* Code with a Run button never shows its output first: the student runs it to see
              what it prints. The expected output appears only under a run that did not match. */}
          {live ? (
            <>
              <OutputPanel
                title="Terminal"
                text={live.stdout}
                error={live.error}
                ms={live.ms}
                command="python example.py"
                tone={live.ok ? (matches ? 'ok' : 'neutral') : 'bad'}
                badge={expectedOutput !== undefined ? <RunMark ok={matches} /> : null}
              />
              {expectedOutput !== undefined && !matches && (
                <OutputPanel title="Expected output" text={expectedOutput} command={null} />
              )}
            </>
          ) : (
            <IdleTerminal />
          )}
        </div>
      )}
      {!runnable && expectedOutput !== undefined && (
        <OutputPanel title="Output" text={expectedOutput} />
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
  // Which combination the latest run belongs to: a run that finishes after the student has
  // moved on is never shown under another combination's code.
  const [ranFor, setRanFor] = useState<string | null>(null);

  const sig = signature(controls, choice);
  const state = states.find((st) => signature(controls, st.when) === sig) as
    | ExplorerState
    | undefined;
  const ran = ranFor === sig ? runner.result : null;
  const expected = state?.output.kind === 'text' ? state.output.value : null;
  const matches = Boolean(ran?.ok && expected !== null && sameOutput(ran.stdout, expected));
  const run = async () => {
    if (!state) return;
    await runner.run(`${setup ?? ''}\n${state.code}`, packages);
    setRanFor(sig);
  };

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
          {showSetup && <CodeBlock code={setup} label="setup.py" />}
        </div>
      )}

      {state && (
        <div className="grid gap-3" aria-live="polite">
          <CodeBlock
            code={state.code}
            label="explore.py"
            actions={
              <RunButton busy={runner.busy} state={runner.state} label="Run" onClick={run} />
            }
          />
          <RunHint state={runner.state} busy={runner.busy} />
          {/* Every combination starts on an empty terminal. After a run: the student's real
              output with a tick or a cross, the expected output only if theirs differs (a table
              result is always drawn, it has no text to compare), then what the result means. */}
          {ran ? (
            <>
              <OutputPanel
                title="Terminal"
                text={ran.stdout}
                error={ran.error}
                ms={ran.ms}
                command="python explore.py"
                tone={ran.ok ? (matches || expected === null ? 'ok' : 'neutral') : 'bad'}
                badge={expected !== null ? <RunMark ok={matches} /> : null}
              />
              {state.output.kind === 'table' ? (
                <ExplorerTable output={state.output} />
              ) : (
                !matches && (
                  <OutputPanel title="Expected output" text={state.output.value} command={null} />
                )
              )}
              <Verdict tone={state.verdict.tone} text={state.verdict.text} />
            </>
          ) : (
            <IdleTerminal />
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

export function Verdict({
  tone,
  text,
  compact = false,
}: {
  tone: 'ok' | 'bad' | 'info';
  text: string;
  /** A caption under a picture: tighter, so the picture keeps its height. */
  compact?: boolean;
}) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'bad' ? XCircle : Info;
  return (
    <div
      className={cn(
        'flex rounded-xl border text-ink',
        compact ? 'gap-2 px-3 py-2 text-[13px] leading-snug' : 'gap-2.5 px-4 py-3 text-[14px]',
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
  // A test's description usually states the answer ("the slope is 2"), so it works like a hint:
  // hidden until the student asks, or until that test passes and there is nothing left to give away.
  const [testsShown, setTestsShown] = useState(false);
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
  const labelsOpen = testsShown || solution !== null;

  const reveal = async () => {
    setLoadingSolution(true);
    try {
      setSolution(await runtime.solution({ sectionKey: s.key, revisionId: s.revisionId }));
    } finally {
      setLoadingSolution(false);
    }
  };

  const run = () => runner.run(code, packages);
  const passed = results?.filter((r) => r.pass).length ?? 0;

  return (
    <div className="grid gap-3">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2">
          <SquareTerminal className="size-4 text-brand" aria-hidden />
          <span className="text-[13px] font-semibold text-ink">Problem</span>
          <span className="ml-auto font-mono text-[11px] text-muted">
            {checks.length} test{checks.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <Rich text={instructions} className="text-[14.5px]" />
        </div>
      </div>

      <CodeEditor
        value={code}
        onChange={setCode}
        label="Your code"
        filename="solution.py"
        onRun={run}
        actions={
          <>
            {hintsShown < hints.length && (
              <IdeAction onClick={() => setHintsShown(hintsShown + 1)} label="Show a hint">
                <Lightbulb className="size-3.5" aria-hidden /> Hint
              </IdeAction>
            )}
            <IdeAction
              onClick={() => {
                setCode(starterCode);
                runner.clear();
              }}
              disabled={code === starterCode}
              label="Reset to the starter code"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </IdeAction>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <RunButton
          busy={runner.busy}
          state={runner.state}
          label="Run tests"
          shortcut
          onClick={run}
        />
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

      {runner.result ? (
        <OutputPanel
          title="Terminal"
          text={runner.result.stdout}
          error={runner.result.error}
          ms={runner.result.ms}
          command="python solution.py"
          tone={runner.result.ok ? (allPass ? 'ok' : 'neutral') : 'bad'}
        />
      ) : (
        <IdleTerminal hint="Write your code, then Run tests." />
      )}

      <section
        className="overflow-hidden rounded-xl border border-[#1f2a3d] bg-[#070b12] font-mono text-[12.5px]"
        aria-label="Test results"
      >
        <div className="flex items-center justify-between border-b border-[#1f2a3d] bg-[#0b111c] px-3 py-1.5">
          <span className="text-[11px] font-semibold tracking-[0.08em] text-[#8a9bb5] uppercase">
            Tests
          </span>
          <span className="flex items-center gap-3">
            {!labelsOpen && (
              <button
                type="button"
                onClick={() => setTestsShown(true)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#8a9bb5] hover:bg-[#1a2436] hover:text-[#c9d4e5]"
              >
                <Lightbulb className="size-3" aria-hidden /> Show what the tests expect
              </button>
            )}
            <span
              className={cn(
                'text-[11.5px] font-semibold',
                results === null ? 'text-[#5b6b85]' : allPass ? 'text-[#3fb950]' : 'text-[#ffcb6b]',
              )}
            >
              {results === null ? 'not run yet' : `${passed}/${checks.length} passed`}
            </span>
          </span>
        </div>
        <ul className="grid gap-1 px-3.5 py-3">
          {(results ?? checks.map((c) => ({ ...c, pass: null as boolean | null }))).map((c, i) => (
            <li key={c.label} className="flex items-start gap-2.5 text-[#c9d4e5]">
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 text-[10.5px] font-bold',
                  c.pass === null && 'bg-[#1a2436] text-[#5b6b85]',
                  c.pass === true && 'bg-[#238636] text-white',
                  c.pass === false && 'bg-[#da3633] text-white',
                )}
              >
                {c.pass === null ? 'WAIT' : c.pass ? 'PASS' : 'FAIL'}
              </span>
              {labelsOpen || c.pass === true ? (
                <span>{c.label}</span>
              ) : (
                <span className="text-[#5b6b85]">Test {i + 1}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {allPass && (
        <div className="flex items-center gap-2.5 rounded-xl border border-ok/35 bg-ok-bg px-4 py-3 text-[14px] font-medium text-ink animate-rise">
          <ThumbsUp className="size-4 text-ok" aria-hidden /> All tests pass. Nicely done.
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
            <CodeBlock
              code={solution}
              label="our_solution.py"
              actions={
                <IdeAction
                  onClick={() => setCode(solution)}
                  label="Copy the solution into your editor"
                >
                  Use in editor
                </IdeAction>
              }
            />
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

export { CodeEditor };
