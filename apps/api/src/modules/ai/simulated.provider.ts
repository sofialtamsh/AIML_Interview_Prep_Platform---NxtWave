import { type AiCallRequest, type AiCallResult, AiError, type AiProvider } from './types.ts';

/**
 * A deterministic stand-in for Claude (AI_PROVIDER=simulated; never allowed in production).
 * It reads the same <lesson_context> block a real call receives and returns valid, clearly
 * labelled placeholder output, so the whole pipeline (jobs, verification, evaluation, review
 * UI) can be exercised in tests and demos without an API key or any cost.
 */
export class SimulatedProvider implements AiProvider {
  readonly name = 'simulated' as const;

  async call(req: AiCallRequest): Promise<AiCallResult> {
    if (req.signal?.aborted) throw new AiError('cancelled', 'The job was cancelled.');
    const context = readJson(req.user, 'lesson_context') as SimContext;
    const out =
      req.task === 'LESSON_PLAN'
        ? plan(context)
        : req.task === 'LESSON_DRAFT'
          ? draft(context)
          : req.task === 'LESSON_EVALUATION'
            ? evaluate(readJson(req.user, 'lesson') as { sections?: Array<{ key: string }> })
            : rewrite(readJson(req.user, 'current_step') as Record<string, unknown>);
    const text = JSON.stringify(out);
    return {
      text,
      model: 'simulated',
      stopReason: 'end_turn',
      usage: {
        inputTokens: Math.ceil(
          (req.user.length + req.system.reduce((a, s) => a + s.text.length, 0)) / 4,
        ),
        outputTokens: Math.ceil(text.length / 4),
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    };
  }
}

interface SimContext {
  subtopic: { title: string };
  concepts: Array<{ key: string; name: string }>;
  depths: Array<{ rank: number }>;
  plan?: { sections: PlannedStep[] };
  batch?: string[];
}

interface PlannedStep {
  key: string;
  kind: string;
  title: string;
  depthRank: number;
  slotKey?: string;
  conceptKeys: string[];
  purpose: string;
}

function readJson(text: string, tag: string): unknown {
  const m = new RegExp(`<${tag}>\\n?([\\s\\S]*?)\\n?</${tag}>`).exec(text);
  if (!m?.[1]) throw new AiError('invalid_output', `Simulated provider: no <${tag}> block`);
  return JSON.parse(m[1]);
}

const NOTE = 'Simulated draft: add an AI key for a real lesson.';

function plan(c: SimContext) {
  const ranks = c.depths.map((d) => d.rank);
  const shallow = Math.min(...ranks);
  const deep = Math.max(...ranks);
  const concept = c.concepts[0] ? [c.concepts[0].key] : [];
  const t = c.subtopic.title;
  const step = (
    key: string,
    kind: string,
    title: string,
    depthRank: number,
    extra: Partial<PlannedStep> = {},
  ) => ({
    key,
    kind,
    title,
    depthRank,
    conceptKeys: concept,
    purpose: `${title}.`,
    ...extra,
  });
  return {
    title: t,
    subtitle: `${NOTE}`,
    objectives: [
      { key: 'explain', text: `Explain ${t} in plain words`, minDepthRank: 1 },
      { key: 'apply', text: `Apply ${t} and explain the trade-offs`, minDepthRank: deep },
    ],
    sections: [
      step('hook', 'HOOK', `Why ${t} matters`, 1),
      step('idea', 'EXPLANATION', 'The simple idea', 1),
      step('bites', 'CARD_DECK', 'Three bites to remember', 1),
      step('code', 'CODE_EXAMPLE', 'See it in code', 1),
      step('check', 'KNOWLEDGE_CHECK', 'Quick check', 1),
      ...(deep > shallow ? [step('deeper', 'EXPLANATION', 'Going deeper', deep)] : []),
      step('pitfall', 'CALLOUT', 'A common trap', 1),
      step('summary.basic', 'SUMMARY', 'What to remember', 1, { slotKey: 'summary' }),
      ...(deep > 1
        ? [step('summary.deep', 'SUMMARY', 'What to remember', deep, { slotKey: 'summary' })]
        : []),
    ],
  };
}

function body(kind: string, title: string) {
  const name = title.replace(/[^A-Za-z0-9 ]/g, '').trim() || 'idea';
  switch (kind) {
    case 'HOOK':
      return {
        scenario: `You are in an interview and they ask about **${title}**. Could you explain it in one minute? (${NOTE})`,
        bridge: 'This lesson gets you there, one small step at a time.',
      };
    case 'CARD_DECK':
      return {
        layout: 'swipe',
        cards: [
          { title: 'What it is', front: `The one-line idea behind ${title}.`, emoji: '💡' },
          { title: 'Why it matters', front: 'Where it shows up in real systems.', emoji: '🚀' },
          { title: 'Watch out', front: 'The mistake most people make first.', emoji: '⚠️' },
        ],
      };
    case 'CODE_EXAMPLE':
      return {
        language: 'python',
        code: `steps = ["notice the problem", "apply ${name}", "check the result"]\nfor i, step in enumerate(steps, 1):\n    print(i, step)`,
        annotations: [{ from: 1, to: 1, note: 'A tiny list stands in for real data.' }],
        runnable: true,
        packages: [],
      };
    case 'KNOWLEDGE_CHECK':
      return {
        items: [
          {
            key: 'core',
            type: 'mcq',
            prompt: `Which statement about ${title} is true?`,
            options: [
              { id: 'a', text: 'It is a trade-off you measure.' },
              { id: 'b', text: 'It never needs testing.' },
            ],
            answer: { correct: ['a'] },
            explanation: 'Real systems measure trade-offs instead of guessing.',
          },
        ],
      };
    case 'CALLOUT':
      return {
        tone: 'pitfall',
        title: 'A common trap',
        body: `Do not copy settings for ${title} from a blog post without measuring.`,
      };
    case 'SUMMARY':
      return {
        takeaways: [`${title} is a trade-off.`, 'Measure before you choose.'],
        remember: ['Measure, do not guess'],
      };
    default:
      return {
        blocks: [{ type: 'paragraph', text: `${title}: the idea in plain words. (${NOTE})` }],
      };
  }
}

function draft(c: SimContext) {
  const steps = c.plan?.sections ?? [];
  const sections = (c.batch ?? []).map((key) => {
    const p = steps.find((s) => s.key === key);
    if (!p) throw new AiError('invalid_output', `Simulated provider: no planned step "${key}"`);
    return {
      key: p.key,
      kind: p.kind,
      title: p.title,
      depthRank: p.depthRank,
      ...(p.slotKey ? { slotKey: p.slotKey } : {}),
      conceptKeys: p.conceptKeys,
      body: body(p.kind, c.subtopic.title),
    };
  });
  return { sections };
}

const DIMENSIONS = [
  'correctness',
  'depth_fit',
  'objective_alignment',
  'style',
  'code_quality',
  'prerequisites',
  'redundancy',
  'hallucination_risk',
  'interview_relevance',
];

function evaluate(lesson: { sections?: Array<{ key: string }> }) {
  const first = lesson.sections?.[0]?.key ?? 'lesson';
  return {
    scores: DIMENSIONS.map((dimension) => ({
      dimension,
      score: dimension === 'style' ? 3 : 4,
      reason: 'Simulated review: replace with a real evaluation by adding an AI key.',
    })),
    issues: [
      {
        sectionKey: first,
        severity: 'minor',
        dimension: 'style',
        problem: 'The hook is generic (simulated content).',
        suggestion: 'Open with a specific, relatable scenario.',
      },
    ],
    summary: 'Simulated evaluation. The structure is valid; the content is placeholder text.',
    verdict: 'ready_for_review',
  };
}

function rewrite(current: Record<string, unknown>) {
  const title = typeof current.title === 'string' ? current.title : String(current.key);
  const base = title.replace(/ \(rewritten\)$/, '').slice(0, 85);
  return { ...current, title: `${base} (rewritten)` };
}
