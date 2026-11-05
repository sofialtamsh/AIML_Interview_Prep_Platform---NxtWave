/**
 * Prompts for the content agents. Versioned: every AI call records `key@version`, so a change
 * here can be compared against the last one before it is trusted. Bump the version when the
 * meaning of a prompt changes.
 *
 * Stable instructions go in the system prompt (cached across a lesson's many calls); anything
 * that varies goes in the user message. No student data is ever included.
 */
import {
  type EvaluationReport,
  type GenSection,
  LessonDocument,
  type LessonPlan,
  STYLES,
  type StyleKey,
  toGenSection,
} from '@app/content';
import { CHUNKING_STRATEGIES_LESSON } from '../exemplars/chunking-strategies.lesson.ts';
import type { LessonContext } from './context.ts';

export const PROMPTS = {
  plan: { key: 'lesson.plan', version: 1 },
  draft: { key: 'lesson.draft', version: 1 },
  evaluate: { key: 'lesson.evaluate', version: 1 },
  rewrite: { key: 'section.rewrite', version: 1 },
} as const;

/** Machine-readable facts for the call (the simulated provider reads this too). */
export const CONTEXT_TAG = 'lesson_context';
export const contextBlock = (data: object) =>
  `<${CONTEXT_TAG}>\n${JSON.stringify(data, null, 2)}\n</${CONTEXT_TAG}>`;

const WRITER = `You write interactive "Learn the Concept" lessons for NxtWave Prep, an interview-prep platform for Indian students and early-career engineers preparing for AI, ML and data roles (for example AI Engineer at 3–6 LPA or 8–12 LPA). Students learn on their phones between classes, so every step has to earn its place.

<how_lessons_work>
- A lesson teaches one subtopic as a list of steps ("sections"). The student sees one step at a time.
- One lesson serves every package. Each step has a depthRank from 1 (Foundational) to 5 (Expert). A student whose target depth is D sees every step with depthRank ≤ D, in order.
- Deeper students see more steps, not harder words. Shallow steps come first and stay useful for everyone; deeper steps add mechanism, measurement, alternatives and trade-offs.
- slotKey: when a step needs a different version per depth (usually the summary or the interview playbook), write one step per depth with the same slotKey. Each student sees only the deepest one at or below their depth.
- conceptKeys: tag each step with the curriculum concepts it teaches, using only keys from the context.
- At every depth in use the student must see a HOOK first, at least one thing to explore or try, at least one KNOWLEDGE_CHECK, and a SUMMARY last.
</how_lessons_work>

<step_kinds>
HOOK: a relatable scenario that makes the problem felt before any definition; an optional everyday analogy with a mapping table and where it breaks; a bridge into the lesson.
EXPLANATION: blocks of paragraph, steps (numbered), bullets, term (a definition; defined terms can be referenced elsewhere as [[term:name]] chips), table, compare (two columns), note, analogy_vs_reality.
CARD_DECK: 2–10 cards. layout "swipe" is story cards, one idea each with one emoji (the best fit for key ideas in short, punchy lessons); "flip" is a front/back reveal (question → answer, myth → fact); "stepper" is a sequence; "compare" and "grid" sit side by side.
DIAGRAM: a flow of 2–8 nodes with edges, plus narrated steps that highlight nodes; altText describes it for screen readers.
CODE_EXAMPLE: short Python with line annotations. runnable is true when it prints something worth seeing. You never write its output; the platform runs it.
CODE_EXPLORER: the signature interaction. 1–3 controls with 2–5 options each, and exactly one state for every combination of options. Each state has the exact code, what you expect it to print (expectedPrint, replaced by the real output after running) and a verdict (ok, bad or info) that explains what the output shows. setup holds shared definitions and data.
WIDGET: "chunker" only, for chunking topics: sample text, size and overlap ranges in words (overlap.max below size.min), and an optional highlight phrase that appears in the text.
KNOWLEDGE_CHECK: 1–4 items. mcq, multi, fill_blank (the template has {{b1}}-style blanks, each with accepted answers), predict_output (code plus options; the marked option must be exactly what the code prints, formatted as inline code), order_steps (steps listed in the correct order; they are shuffled for the student), reasoning (an interview-style question with a model answer and a rubric). Every item except reasoning explains why the answer is right.
PLAYGROUND: a small task with instructions, starter code, 1–3 hints, a full solution, and stdout_contains checks that the solution passes and the starter does not.
CALLOUT: tone interview_tip, misconception, pitfall, real_world or remember; a title and 1–3 sentences.
INTERVIEW_PLAYBOOK: an interviewer's question, 2–6 answer steps with minutes, and the follow-ups to expect.
SUMMARY: 3–6 takeaways and 1–4 one-line phrases to remember.
</step_kinds>

<text_rules>
- Text fields use a small markdown subset: **bold**, *italic*, \`code\`, [links](https://…) and [[term:name]] glossary chips. Never HTML.
- Keys are lowercase words joined by dots or dashes, for example "explore.size-overlap".
</text_rules>

<code_rules>
- Python 3 with the standard library, plus numpy and pandas when needed (list them in packages). No files, network, input(), or randomness without a fixed seed. Each snippet runs on its own in under two seconds.
- Minimal, idiomatic code: 5–20 lines, real names, comments only where they teach.
- print() what the student should look at. The platform runs every snippet and shows the real result, so the narration and verdicts must match what the code actually does.
- predict_output answers and playground checks are verified by running the code, so get them exactly right.
</code_rules>

<check_rules>
- Test understanding, not recall of wording. Distractors are mistakes students really make.
- Explanations say in one or two sentences why the right answer is right and why the tempting wrong one is wrong.
</check_rules>

<accuracy>
Never invent statistics, library functions, API names, benchmarks or company practices. If a number is only illustrative, say so. When you simplify, say that it is a simplification.
</accuracy>`;

function styleBlock(style: StyleKey) {
  const s = STYLES[style];
  const b = s.budgets;
  return `<style name="${s.label}">
${s.summary}
${s.guide.map((g) => `- ${g}`).join('\n')}
Word budgets (prose only, code excluded): sentences up to ${b.sentenceWords} words, paragraphs or bullets up to ${b.blockWords}, card fronts up to ${b.cardWords}, a whole step up to about ${b.stepWords}.
</style>`;
}

let exemplarJson: string | null = null;
/** The reviewed reference lesson, in the exact output shape the agents write. */
function exemplar() {
  if (!exemplarJson) {
    const doc = LessonDocument.parse(CHUNKING_STRATEGIES_LESSON);
    exemplarJson = JSON.stringify(
      {
        title: doc.title,
        subtitle: doc.subtitle,
        objectives: doc.objectives,
        sections: doc.sections.map(toGenSection),
      },
      null,
      1,
    );
  }
  return `<reference_lesson>
A reviewed lesson on a different subtopic ("Chunking strategies", used at depth 2 and depth 4), in the exact shape you write. Match its structure, tone, level of interactivity and depth layering. Never copy its topic, examples, scenarios or wording.
${exemplarJson}
</reference_lesson>`;
}

/** System prompt for writing: instructions, style and the reference lesson (cached together). */
export function writerSystem(style: StyleKey) {
  return [{ text: `${WRITER}\n\n${styleBlock(style)}` }, { text: exemplar(), cache: true }];
}

function facts(ctx: LessonContext, style: StyleKey) {
  return {
    subtopic: ctx.subtopic,
    topic: ctx.topic,
    concepts: ctx.concepts,
    targets: ctx.targets,
    depths: ctx.depths,
    prerequisites: ctx.prerequisites,
    style,
  };
}

/** How many steps each depth should see, by style. */
export function stepBudget(style: StyleKey, depths: number[]) {
  const shallow = style === 'genz' ? [8, 12] : style === 'standard' ? [9, 13] : [10, 15];
  const deep = style === 'genz' ? [14, 20] : style === 'standard' ? [16, 22] : [18, 26];
  const min = Math.min(...depths);
  const max = Math.max(...depths);
  return {
    shallowest: { depth: min, range: shallow },
    deepest: { depth: max, range: min === max ? shallow : deep },
  };
}

const instructionsBlock = (instructions?: string) =>
  instructions?.trim()
    ? `\n<admin_instructions>\n${instructions.trim()}\n</admin_instructions>\nFollow these instructions from the content team unless they conflict with accuracy.`
    : '';

export function planUser(ctx: LessonContext, opts: { style: StyleKey; instructions?: string }) {
  const depths = ctx.depths.map((d) => d.rank);
  const budget = stepBudget(opts.style, depths);
  return `${contextBlock({ task: 'plan', ...facts(ctx, opts.style), stepBudget: budget })}

Plan the lesson for "${ctx.subtopic.title}" (${ctx.topic.title}).
- Depths in use: ${ctx.depths.map((d) => `${d.rank} (${d.name})`).join(', ')}. No step deeper than ${Math.max(...depths)}. Read each depth's guidance in the context: it says what genuinely changes at that depth.
- Objectives: 3–6 lesson objectives that cover the curricula's objectives, each with the lowest depth where it applies.
- Size: at depth ${budget.shallowest.depth} the student should see about ${budget.shallowest.range.join('–')} steps; at depth ${budget.deepest.depth} about ${budget.deepest.range.join('–')}.
- Flow: hook → the simple idea → how it works → try it → check → pitfalls → interview angle → summary, with deeper steps placed where they belong in that flow. Use a slotKey for steps that need a different version per depth.
- For each step give its key, kind, a student-facing title (short and punchy), depthRank, optional slotKey, conceptKeys and a one-sentence purpose that says what the student does or learns.
- Build on the prerequisites instead of re-teaching them.${instructionsBlock(opts.instructions)}`;
}

export function draftUser(
  ctx: LessonContext,
  opts: {
    style: StyleKey;
    instructions?: string;
    plan: LessonPlan;
    batch: string[];
    written: Array<{ key: string; title: string }>;
  },
) {
  return `${contextBlock({ task: 'draft', ...facts(ctx, opts.style), plan: opts.plan, batch: opts.batch })}

Write these steps of the planned lesson, in this order: ${opts.batch.map((k) => `"${k}"`).join(', ')}.
Follow the plan exactly for each step's key, kind, depthRank, slotKey and conceptKeys, and deliver its purpose. You may sharpen the title.
${opts.written.length ? `Already written (keep continuity; do not repeat their content): ${opts.written.map((w) => `"${w.title}"`).join(', ')}.` : 'These are the first steps of the lesson.'}
Return {"sections": [...]} with exactly these ${opts.batch.length} steps.${instructionsBlock(opts.instructions)}`;
}

// ───────────── Evaluation ─────────────

const EVALUATOR = `You are a demanding senior reviewer for NxtWave Prep's interview-prep lessons. You review an AI-written lesson before a human content editor does, so your job is to find what is wrong or weak, precisely and briefly. You never rewrite the lesson; you point at problems and suggest fixes.

<rubric>
Score each dimension from 1 (poor) to 5 (excellent) with a one-sentence reason:
- correctness: facts, formulas and terminology are right. Anything contradicted by the code results is blocking.
- depth_fit: each deeper layer adds mechanism, measurement, alternatives or trade-offs (not just harder words); the shallow view is not overloaded; the deep view is genuinely deeper.
- objective_alignment: every objective is taught and checked by at least one step at its depth.
- style: hook before definition, analogies bounded, plain conversational English, one idea per step, the chosen style's word budgets respected.
- code_quality: runs, idiomatic, minimal, and the narration matches the real outputs.
- prerequisites: every term is defined here or covered by a listed prerequisite.
- redundancy: no repeated explanations across steps or depths.
- hallucination_risk: unverifiable claims, invented APIs or numbers (5 means no risk found).
- interview_relevance: interview tips, pitfalls and playbooks are realistic and useful.
</rubric>

<issues>
- Report specific problems: sectionKey (or "lesson"), severity (blocking: wrong or broken; major: hurts learning; minor: polish), the dimension, the problem, and a concrete suggestion a writer can act on.
- Treat every failed code check as blocking. Use the computed metrics; do not recount words yourself.
- At most 25 issues, most important first. No praise in issues.
</issues>

verdict: blocking_issues if anything is blocking, needs_changes if any major issue exists, otherwise ready_for_review.`;

export function evaluatorSystem(style: StyleKey) {
  return [{ text: `${EVALUATOR}\n\n${styleBlock(style)}`, cache: true }];
}

export function evaluateUser(
  ctx: LessonContext,
  opts: { style: StyleKey; lesson: unknown; metrics: unknown },
) {
  return `${contextBlock({ task: 'evaluate', ...facts(ctx, opts.style) })}

<lesson>
${JSON.stringify(opts.lesson, null, 1)}
</lesson>

<computed_checks>
${JSON.stringify(opts.metrics, null, 1)}
</computed_checks>

Review this lesson against the rubric for every depth in use and return the report.`;
}

export type EvaluationOutput = EvaluationReport;

// ───────────── Rewriting one step ─────────────

/** One-tap rewrite instructions the admin can pick. */
export const REWRITE_PRESETS = {
  shorter: 'Make it shorter: cut every word that does not teach. Aim for about half the words.',
  simpler: 'Use simpler words and shorter sentences. Define any technical term in one short line.',
  genz: 'Make it more Gen Z: punchy headings, one idea per card, story cards (layout "swipe") with one emoji each where ideas stand alone. Still plain English, no slang.',
  analogy:
    'Add an everyday analogy (an Indian context if it fits naturally), labelled as an analogy, with where it breaks.',
  example: 'Add one concrete, relatable example that makes the idea click.',
  interactive:
    'Make it interactive: turn it into a CODE_EXPLORER, CARD_DECK or KNOWLEDGE_CHECK if that teaches the idea better.',
  fix: 'Fix the problems listed in the reviewer notes.',
} as const;
export type RewritePreset = keyof typeof REWRITE_PRESETS;

export function rewriteUser(
  ctx: LessonContext,
  opts: {
    style: StyleKey;
    outline: Array<{ key: string; kind: string; title: string; depthRank: number }>;
    current: GenSection;
    instruction: string;
    notes: string[];
  },
) {
  return `${contextBlock({ task: 'rewrite', ...facts(ctx, opts.style), outline: opts.outline, key: opts.current.key })}

<current_step>
${JSON.stringify(opts.current, null, 1)}
</current_step>

<instruction>
${opts.instruction}
</instruction>
${opts.notes.length ? `\n<reviewer_notes>\n${opts.notes.map((n) => `- ${n}`).join('\n')}\n</reviewer_notes>\n` : ''}
Rewrite this one step of the lesson. Keep its key "${opts.current.key}". Keep depthRank, slotKey and conceptKeys unless the instruction asks otherwise; you may change the kind when the instruction asks for a different format. It must still fit between the steps around it in the outline. Return the whole rewritten step.`;
}
