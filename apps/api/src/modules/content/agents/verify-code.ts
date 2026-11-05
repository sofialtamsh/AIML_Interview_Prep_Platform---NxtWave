/**
 * Execution verification (docs/06 §3, step 3): every runnable piece of lesson code is run in
 * the sandbox and the real output replaces whatever the writer claimed. Students only ever see
 * outputs that Python actually produced.
 */
import type { Section } from '@app/content';
import type { PythonResult, PythonRunner, PythonSnippet } from '../../ai/python-runner.ts';

export interface CodeCheck {
  sectionKey: string;
  /** What was run: "example", "state size=12&overlap=0", "solution", "starter", "question predict". */
  target: string;
  status: 'ok' | 'warning' | 'failed';
  message: string;
}

const lastLine = (s: string | null) => (s ?? '').trim().split('\n').at(-1) ?? '';
const clean = (s: string) => s.replace(/\s+$/gm, '').trim();
const normalize = (s: string) =>
  s
    .replace(/^`+|`+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Silences prints from earlier lesson code that a question builds on ("using chunk_words from above"). */
const withContext = (context: string[], code: string) =>
  context.length
    ? `import sys as _s, io as _io\n_o = _s.stdout\n_s.stdout = _io.StringIO()\n${context.join('\n\n')}\n_s.stdout = _o\n${code}`
    : code;

export async function verifyLessonCode(
  sections: Section[],
  python: PythonRunner,
): Promise<{ sections: Section[]; checks: CodeCheck[] }> {
  type Job = { snippet: PythonSnippet; apply: (r: PythonResult) => void };
  const jobs: Job[] = [];
  // Questions run second, building only on example code that really ran.
  const questionJobs: Array<(context: string[], packages: string[]) => Job> = [];
  const checks: CodeCheck[] = [];
  const out = sections.map((s) => structuredClone(s));
  const workingCode: string[] = [];
  const workingPackages = new Set<string>();

  for (const s of out) {
    switch (s.kind) {
      case 'CODE_EXAMPLE': {
        if (!s.body.runnable) break;
        const body = s.body;
        jobs.push({
          snippet: { code: body.code, packages: body.packages },
          apply: (r) => {
            if (r.ok) {
              body.expectedOutput = clean(r.stdout) || '(no output)';
              workingCode.push(body.code);
              for (const p of body.packages) workingPackages.add(p);
              checks.push({
                sectionKey: s.key,
                target: 'example',
                status: 'ok',
                message: 'Runs; output recorded',
              });
            } else {
              delete body.expectedOutput;
              checks.push({
                sectionKey: s.key,
                target: 'example',
                status: 'failed',
                message: `The code fails: ${lastLine(r.error)}`,
              });
            }
          },
        });
        break;
      }
      case 'CODE_EXPLORER': {
        const body = s.body;
        for (const st of body.states) {
          const label = `state ${Object.entries(st.when)
            .map(([k, v]) => `${k}=${v}`)
            .join('&')}`;
          const claimed = st.output.kind === 'text' ? st.output.value : null;
          jobs.push({
            snippet: { code: `${body.setup ?? ''}\n${st.code}`, packages: body.packages },
            apply: (r) => {
              if (!r.ok) {
                st.output = { kind: 'text', value: lastLine(r.error) };
                checks.push({
                  sectionKey: s.key,
                  target: label,
                  status: 'failed',
                  message: `The code fails: ${lastLine(r.error)}`,
                });
                return;
              }
              const real = clean(r.stdout);
              st.output = { kind: 'text', value: real || '(no output)' };
              const matched = claimed !== null && clean(claimed) === real;
              checks.push({
                sectionKey: s.key,
                target: label,
                status: matched ? 'ok' : 'warning',
                message: matched
                  ? 'Runs; output matches what the writer expected'
                  : 'Runs; the real output differs from what the writer expected, so check the verdict text still fits',
              });
            },
          });
        }
        break;
      }
      case 'PLAYGROUND': {
        const body = s.body;
        const passes = (stdout: string) => body.checks.every((c) => stdout.includes(c.value));
        jobs.push({
          snippet: { code: body.solution, packages: body.packages },
          apply: (r) => {
            const ok = r.ok && passes(r.stdout);
            checks.push({
              sectionKey: s.key,
              target: 'solution',
              status: ok ? 'ok' : 'failed',
              message: ok
                ? 'The solution passes every check'
                : r.ok
                  ? 'The solution runs but does not pass every check'
                  : `The solution fails: ${lastLine(r.error)}`,
            });
          },
        });
        jobs.push({
          snippet: { code: body.starterCode, packages: body.packages },
          apply: (r) => {
            if (r.ok && passes(r.stdout)) {
              checks.push({
                sectionKey: s.key,
                target: 'starter',
                status: 'warning',
                message: 'The starter code already passes every check, so there is nothing to do',
              });
            }
          },
        });
        break;
      }
      case 'KNOWLEDGE_CHECK': {
        for (const item of s.body.items) {
          if (item.type !== 'predict_output') continue;
          // Only examples that come before this question in the lesson.
          const before = out
            .slice(0, out.indexOf(s))
            .flatMap((x) => (x.kind === 'CODE_EXAMPLE' && x.body.runnable ? [x.body.code] : []));
          questionJobs.push((working, packages) => ({
            snippet: {
              code: withContext(
                before.filter((c) => working.includes(c)),
                item.code,
              ),
              packages,
            },
            apply: (r) => {
              const marked = item.options.find((o) => o.id === item.answer.correct[0]);
              if (!r.ok) {
                checks.push({
                  sectionKey: s.key,
                  target: `question ${item.key}`,
                  status: 'failed',
                  message: `The question's code fails: ${lastLine(r.error)}`,
                });
                return;
              }
              const real = normalize(clean(r.stdout));
              const ok = marked !== undefined && normalize(marked.text) === real;
              checks.push({
                sectionKey: s.key,
                target: `question ${item.key}`,
                status: ok ? 'ok' : 'failed',
                message: ok
                  ? 'The marked answer is what the code really prints'
                  : `The marked answer does not match the real output: ${real.slice(0, 160)}`,
              });
            },
          }));
        }
        break;
      }
      default:
        break;
    }
  }

  const runAll = async (batch: Job[]) => {
    if (batch.length === 0) return;
    const results = await python.run(batch.map((j) => j.snippet));
    batch.forEach((j, i) => {
      const r = results[i];
      if (r) j.apply(r);
    });
  };
  await runAll(jobs);
  await runAll(questionJobs.map((make) => make(workingCode, [...workingPackages])));
  return { sections: out, checks };
}
