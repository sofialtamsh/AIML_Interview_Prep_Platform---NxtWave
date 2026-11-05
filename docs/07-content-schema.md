# 07 · Content Schema

**Principle:** content generation is separate from content rendering. Every piece of learning material is stored as **typed, versioned JSON**. The schemas are defined once in `packages/content-schema` (Zod) and used by:
- the **Content Agent** (Zod → JSON Schema for structured LLM output),
- the **API** (validation before saving, depth resolution, answer stripping),
- the **renderer** `packages/learning-ui` (the student app *and* the admin preview render the same JSON with the same components).

No generated HTML or JavaScript is ever stored or executed. Interactivity comes from a **vetted widget registry** that generated content can only *configure*.

---

## 1. Module types

| Type | Anchored to | Purpose | Typical length |
|---|---|---|---|
| `SUBTOPIC_LESSON` | a subtopic | The main *Learn the Concept* lesson, depth-layered, shared across roles and brackets | 15–60 min (depends on depth) |
| `QUESTION_PRIMER` | a question | "Learn the idea first" before solving one question (the prototype's model). Usually **assembled** from lesson sections tagged with the question's concepts, plus 1–3 question-specific steps (pitfalls, the exact trick). | 5–8 min |
| `CASE_STUDY` | a topic (e.g. ML system design) | Progressive, interactive design walkthrough ending in a 45-minute interview answer plan | 15–25 min |

All three use the same section kinds and renderer.

## 2. Module version envelope

```ts
ModuleVersion {
  moduleId, type, versionNumber, status,            // DRAFT|AI_GENERATED|UNDER_REVIEW|APPROVED|PUBLISHED|ARCHIVED
  title, subtitle,
  objectives: Objective[],                          // { key, text, minDepthRank, conceptKeys[] }
  prerequisites: { subtopicIds[], conceptKeys[] },
  sections: SectionRef[]                            // ordered pointers to immutable SectionRevisions
}
```

## 3. Section envelope

```ts
Section {
  key: string            // stable across versions, e.g. "hook", "explore.chunk-size"
  kind: SectionKind
  title?: string
  depthRank: 1..5        // minimum depth that sees this section
  slotKey?: string       // variant group: the deepest variant <= student depth is shown
  roleScope: RoleSlug[]  // [] = all roles; slugs (e.g. "ai-engineer") keep lesson files portable
  conceptKeys: string[]  // concepts this section teaches (links Learn ↔ Practice)
  gate?: { type: "complete_activity", allowSkip: true }   // progressive unlock (case studies)
  estimatedMinutes: number
  body: SectionBody      // discriminated by kind, see §4
  meta: { generatedBy?: { jobId, promptKey, promptVersion, model }, sourceRefs?: string[] }
}
```

## 4. Section kinds

| Kind | What the student experiences | Body (abridged) |
|---|---|---|
| `HOOK` | A relatable scenario or question that makes the concept feel needed. The simple idea comes before the formal one. | `{ scenario: Rich, provocation?: string, analogy?: { text, mapping: [{ everyday, technical }], whereItBreaks }, bridge: Rich }` |
| `EXPLANATION` | Short paragraphs, step lists, terms and comparisons. Can include **inline choices** inside sentences (Mathigon-style). | `{ blocks: Block[] }`, see §5 |
| `CARD_DECK` | Interactive cards: flip, expand, step through, compare | `{ layout: "flip"\|"stack"\|"stepper"\|"compare"\|"grid", cards: Card[] }` |
| `DIAGRAM` | An SVG diagram with step-by-step highlights and narration | `{ type: "flow"\|"layers"\|"sequence"\|"cycle", nodes[], edges[], steps?: [{ title, narration, highlight: nodeIds[] }], caption, altText }` |
| `CODE_EXAMPLE` | Highlighted code with line annotations and an optional **Run** button (Pyodide) | `{ language, code, annotations: [{ lines:[a,b], note }], runnable, packages[], expectedOutput? }` |
| `CODE_EXPLORER` | **The prototype's signature interaction.** Change toggles or sliders and watch the code, the output table and the verdict update. Bug vs fix, `inner` vs `left`, sort direction × keep. | see §6 |
| `WIDGET` | A vetted interactive simulation from the registry (chunk-size slider, RRF fusion, latency budget, loss/threshold explorer…) | `{ widget: WidgetType, params: <per-widget Zod schema>, prompt?: Rich, verdicts?: [...] }`, see §7 |
| `KNOWLEDGE_CHECK` | Quick checks with instant, explained feedback (graded on the server) | `{ items: CheckItem[] }`: `mcq`, `multi`, `fill_blank`, `predict_output`, `order_steps`, `reasoning` |
| `PLAYGROUND` | Editable code with instructions, hints, reset, checks and a solution reveal | `{ language, starterCode, instructions: Rich, hints[], solution, checks: [{ type: "stdout_contains"\|"var_equals"\|"df_equals", ... }], datasets?: Table[] }` |
| `VIDEO` | A short explainer with status and a fallback | `{ videoAssetId?, script: { objective, scenes: [{ narration, visual, seconds }] }, fallbackSectionKey }` |
| `CALLOUT` | Small, high-signal notes | `{ tone: "interview_tip"\|"misconception"\|"pitfall"\|"real_world"\|"remember"\|"analogy_vs_reality", title, body: Rich }` |
| `INTERVIEW_PLAYBOOK` | How to structure the interview answer (e.g. a 45-minute plan) plus follow-ups to expect | `{ totalMinutes, steps: [{ title, minutes, detail }], followUps: string[] }` |
| `SUMMARY` | Key takeaways, what to remember, objectives met, what's next | `{ takeaways: Rich[], remember: string[], objectivesCheck: [{ objectiveKey, sectionKeys[] }], next?: { label, target } }` |

## 5. Rich text and blocks

- `Rich` = a **safe markdown subset**: bold, italic, inline code, links (allow-listed), and glossary references `[[term:embedding]]` that render as tap-to-define chips. No raw HTML.
- `Block` = `paragraph` · `steps` (numbered) · `bullets` · `term` · `equation` (KaTeX, Advanced and above) · `table` · `compare` (two columns) · `analogy_vs_reality` · `note` · `prose_choice`.
- `prose_choice`: a sentence with inline blanks, `"Very small chunks lose their {{c1}}."` with `choices: { c1: { options: ["context","speed","storage"], correct: 0, feedback } }`. Graded on the server like knowledge checks.

## 6. `CODE_EXPLORER` (state-driven, execution-verified)

```ts
{
  datasets: Table[],                         // named input tables (columns, rows), e.g. customers, orders
  controls: Control[],                       // segmented | chips | slider (bounded, stepped)
  codeTemplate: string,                      // "pd.merge(customers, orders, ..., how='{{how}}')"
  states: [{                                 // one per reachable control combination (or a bounded slider grid)
    when: { how: "inner" },
    code: string,                            // the exact code for this state
    output: { kind: "table"|"text"|"chart", value, highlight?: { rows?: number[], tone: "ok"|"bad"|"hl"|"dim" } },
    verdict: { tone: "ok"|"bad"|"info", text: Rich }
  }],
  defaultState: { ... }
}
```

**How it stays correct.** When content is generated, the worker **executes every state's code in a Pyodide sandbox** against the datasets and **replaces the LLM's claimed outputs with the real outputs**. If execution fails or the result contradicts the verdict text, the section is flagged in the evaluation report. Students therefore see *real* pandas and NumPy behaviour, not hallucinated output. Optional "live" mode lets the student edit the code and re-run it in their own browser.

## 7. Widget registry (vetted interactive templates)

Widgets are React components written and tested by developers. Generated content picks a `widget` and fills its typed `params`. Initial set (inspired by the prototype's case studies, targeted at the pilot topics):

| Widget | Teaches | Params (abridged) |
|---|---|---|
| `slider-tradeoff` | Two metrics moving against each other as a parameter changes | parameter range, two series (formula from an allow-listed set or point table), labels, target |
| `pipeline-stages` | A data or ML pipeline stage by stage (raw → split → explode → count) | stages: [{ label, code, outputTable }] |
| `chunker` | Chunk size and overlap vs context loss | sample text, size and overlap ranges, highlight phrase |
| `similarity-playground` | Cosine vs dot product vs Euclidean, the effect of normalization | 2–6 small vectors (2-D for plotting) and their labels |
| `vector-space-2d` | Nearest neighbours, query vs documents | points with labels, query point, k range |
| `rank-compare` | Embeddings vs BM25 vs hybrid ranking lists | ranked lists, correct item |
| `rank-fusion` | Reciprocal rank fusion with k | two or more ranked lists, k range, predict-first flag |
| `latency-budget` | Precompute vs live features under a budget | features: [{ label, liveMs, freshnessNeed }], budget |
| `threshold-histogram` | Error distribution, buffers, asymmetric loss and quantiles | samples or histogram, penalty ratio |
| `feature-toggle-gauge` | Feature selection, leakage traps, error gauge | features: [{ label, gain, isLeak?, isNoise? }], target |
| `timeline-lanes` | Parallel legs and bottlenecks (e.g. delivery ETA) | lanes: [{ label, min, max, default }] |
| `calendar-grid` | Streaks and gaps-and-islands patterns | users × days activity |
| `cost-calculator` | Token, caching and cost estimates | inputs with ranges, formula id |

Unknown widget types or invalid params fail validation and are never saved. Every widget has a text-only fallback for screen readers and print.

## 8. Knowledge check items

```ts
mcq            { prompt: Rich, options: [{ id, text }], answer: { correct: [id] }, explanation: Rich }
multi          { ...mcq, answer: { correct: [id, id] } }
fill_blank     { template: "groupby('user_id').{{b1}}() + 1", answer: { b1: ["cumcount"] }, explanation }
predict_output { code, language, options?: [...], answer: { correct | expected: string }, explanation }
order_steps    { steps: [{ id, text }], answer: { order: [id...] }, explanation }
reasoning      { prompt, modelAnswer: Rich, rubric: string[] }                 // self-assessed: submit, see the model answer, then rate
```
`answer` fields are **removed** by the API before delivery and used only for server-side grading.
The server only grades revisions in the student's current published lesson at their depth, so drafts and deeper sections can't be probed for answers. As implemented in Phase 4A, the schema lives in `packages/content` and the renderers in `packages/learning-ui`.

## 9. Question schema (bank)

```ts
Question {
  id, publicCode, sourceDataset, externalId,
  type: MCQ_SINGLE | MCQ_MULTI | FILL_BLANK | OUTPUT_PREDICTION | CONCEPTUAL | SCENARIO | CODING | SQL | DEBUG_CODE | SYSTEM_DESIGN,
  technologies: string[],                     // Python | Pandas | NumPy | SQL | PyTorch … (filter facet)
  title, stem: Rich, codeSnippet?, codeLanguage?,
  options?: [{ id, text }],                   // never includes correctness
  answer: {...},                              // server-only (correct ids / expected output / model answer / reference solution)
  explanation: Rich,
  difficulty: EASY | MEDIUM | HARD | EXPERT,
  answerDepth: BRIEF | STANDARD | DETAILED,
  suggestedMinutes,                           // "Try to finish in 15 minutes"
  whyAsked?: Rich,                            // "Why interviewers ask this"
  expectedOutput?: Rich,
  followUps: string[],                        // "Follow-ups the interviewer may ask"
  conceptKeys: string[],                      // what it tests → links to lesson sections
  tags: { roles[], brackets[], topics[], subtopics[], companies[] },   // all many-to-many; empty = unscoped
  solveMode: IN_APP | EXTERNAL_PORTAL,
  external?: { system: "NXTWAVE_PORTAL", externalId /* s_id */, url? },
  datasets?: Table[],                         // for in-app pandas/SQL practice
  provenance: { file, row, url?, author?, license?, importedAt },
  status: DRAFT | UNDER_REVIEW | PUBLISHED | ARCHIVED
}
```
**Company tags** ("Asked at Amazon") must have provenance. They come from the dataset or a cited source, never inferred by AI.

## 10. Import format (CSV / XLSX / JSON)

One row per question. Multi-value cells use `|`. Unknown columns are kept in `provenance.extra`.

| Column | Required | Example |
|---|---|---|
| `external_id` | recommended | `Q-PD-0042` or the portal `s_id` |
| `type` | ✓ | `MCQ_SINGLE` (aliases accepted: "mcq", "multiple choice") |
| `title` | ✓ (non-MCQ) | `Latest Employee Salary Records` |
| `question` | ✓ | stem text or markdown |
| `options` | MCQ | `inner|left|outer|cross` |
| `correct_answer` | auto-gradable types | `inner` or `A` or `1` |
| `explanation` |  | text |
| `difficulty` | ✓ | `Easy|Medium|Hard|Expert` (aliases: E/M/H, 1–4) |
| `roles` / `brackets` / `topics` / `subtopics` / `concepts` / `companies` |  | `AI Engineer|ML Engineer` · `8-12|12+` · `RAG` · `Chunking` |
| `answer_depth`, `suggested_minutes`, `why_asked`, `expected_output`, `follow_ups` |  | … |
| `code`, `code_language` |  | … |
| `solve_mode`, `portal_sid`, `portal_url` |  | `EXTERNAL_PORTAL`, `33995184-…` |
| `source`, `author`, `license` |  | provenance |

The pipeline: **parse → normalize** (aliases, trimming, casing) **→ validate** (Zod per type) **→ map tags** (taxonomy aliases; unmapped labels are queued for admin mapping) **→ dedupe** (exact hash plus trigram similarity ≥ 0.85 against the bank *and* within the file) **→ admin review** (accept, skip or merge per row, bulk actions) **→ commit** (transaction, idempotent on `source_dataset + external_id`).

## 11. Feedback targets

Every rendered unit has a stable address so feedback is precise:
`{ targetType: SECTION | LESSON | QUESTION | PRIMER | CASE_STUDY | PAGE, moduleVersionId?, sectionKey?, sectionRevisionId?, questionId?, page? }`
Section thumbs-down tags (*Too fast · Hard words · Visual did not help · Content error*) flow into the admin **Content issues** queue, attached to the exact revision that was shown.
