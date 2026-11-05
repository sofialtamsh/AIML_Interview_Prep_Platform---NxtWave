# 06 · AI Architecture: Agents, Gateway and Content Pipeline

**Rules that never bend**
1. AI works **only in the admin pipeline**, triggered on demand by an admin. Students never see agents, drafts, research or prompts.
2. AI output is **structured, schema-validated, execution-verified where possible, evaluated, and approved by a human** before any student sees it.
3. No framework lock-in. Agents are plain TypeScript modules over our own gateway, and the job system is pg-boss.
4. No fabrication. Research claims are either **VERIFIED** (with a fetched source and quote) or explicitly **INFERRED**. Company tags on questions are never inferred.

---

> **Implemented in Phase 4B (2026-11-05).** Code: `apps/api/src/modules/ai` (gateway, Claude and simulated providers, jobs, Python sandbox) and `apps/api/src/modules/content/agents` (prompts, generation, evaluation, rewrite). Prompts live in code as versioned templates for now. Writing styles (Gen Z bites / Standard / Deep dive) and their word budgets: `packages/content/src/style.ts`.

## 1. AI Gateway (`apps/api/src/modules/ai`)

```
agent code ──► gateway.run(task, promptKey, vars, outputSchema)
                 │  1. resolve route: task → provider + model + params (DB: ai_model_route, with fallback)
                 │  2. render prompt: prompt_template(key, active version) + vars
                 │  3. call provider adapter (Anthropic | OpenAI-compatible | …) with timeout and retries
                 │  4. parse → validate against Zod schema → on failure: 1 repair attempt with the validation errors
                 │  5. record ai_usage_record (tokens, cost, latency, prompt key@version, job id, status)
                 └─► typed result (or a typed error)
```

| Concern | Design |
|---|---|
| **Providers** | `AiProvider` interface: `generate({ model, system, messages, outputSchema?, maxTokens, temperature, timeoutMs, signal })`. Adapters: Anthropic (Claude) and OpenAI-compatible (OpenAI, Azure OpenAI, Gemini via its OpenAI-compatible endpoint, vLLM / Ollama for local). |
| **Routing** | Per task, from the DB, editable by super admins, with a fallback route. Defaults (Claude family, swappable): research and curriculum → *Opus*, content generation → *Opus* during the pilot (quality first, small volume, then benchmark *Sonnet* on the golden set), evaluation → *Opus*, ideally a **different provider** than the generator when available (cross-model judging reduces correlated errors), extraction and tagging → *Haiku*, video script → *Sonnet*. |
| **Prompts** | `prompt_template(key, version)`. Seeded from versioned files in the repo, editable as new versions in admin. Every output records `promptKey@version`, so changes can be compared on the golden set before activation. |
| **Structured output** | Zod → JSON Schema → provider-native structured output or tool-call. Always re-validated with Zod on our side. |
| **Retries** | Transient errors (429, 5xx, timeouts): exponential backoff with jitter, max 3. Validation failures: 1 repair. Content-policy or refusal: no retry, surfaced to the admin. |
| **Cost control** | Per-job token budget (abort when exceeded). Daily org budget alert. Prompt caching for repeated long context (curriculum, style guide, exemplars). Pricing table per model in DB. |
| **Secrets** | Keys only in env or a secret manager. `ai_provider_config` stores the env-var *name*. The admin UI shows "configured ✓", never the value. |

---

## 2. Agents

Each agent is a module with a typed `input`, a typed `output`, the tools it may use, and a **human gate** after it.

| Agent | Input | Tools | Output (stored) | Human gate |
|---|---|---|---|---|
| **Explore** | Admin URLs (+ optional credential reference), role focus | `fetchPage` (robots-aware, rate-limited, size-capped), `extractMainText`, LLM extraction | `research_source` + `research_finding` rows: topics, concepts, question *references* (not copies), each with quote, URL, timestamp | Admin reviews findings, marks useful ones |
| **Research** | Role, brackets, admin sources, explore findings, optional web search | `webSearch` (provider abstraction), `fetchPage`, LLM synthesis | `research_report`: skills, interview expectations, depth by bracket, emerging tech, each claim `VERIFIED` (sources and quotes) or `INFERRED` | Admin reads it, accepts or rejects claims |
| **Curriculum** | Accepted research report, existing taxonomy | taxonomy lookup | `curriculum_proposal`: topics, subtopics, concepts, prerequisites, per-bracket depth, priority, objectives, estimates, rationale citing report claims | Admin edits, then **materializes** it into curriculum tables (draft) |
| **Content Generation** | Subtopic, role(s), per-bracket target depths, objectives, concepts, style guide, golden exemplar, **existing bank questions for the subtopic** (to avoid duplicating them in checks) | LLM, **Pyodide code runner** (in the worker) | `module_version` (status `AI_GENERATED`) with section revisions | Goes to Evaluation |
| **Section Regeneration** | A module version, a section key, admin instructions ("simpler words", "add an Indian example", "fix: output is wrong") | same as above | A new revision for **one** section → new module version | Evaluation, then review |
| **Content Evaluation** | Module version, depth profile, objectives, execution results | LLM (judge), code runner, schema checks | `content_evaluation`: rubric scores, per-section issues (severity, evidence, suggested fix), verdict | Admin approves, rejects or requests changes |
| **Question Tagger** | Imported questions without good tags | LLM, taxonomy lookup | *Suggested* subtopics, concepts and difficulty with confidence. Applied only when the admin accepts (bulk-accept for high confidence). | Admin accepts or edits suggestions |
| **Feedback Triage** (P2) | Student feedback on a section (tags and text) | LLM clustering | Issue clusters with a proposed fix → a one-click Section Regeneration job | Admin |
| **Video Script** (Phase 7) | Approved section(s) | LLM | Scene-by-scene script (narration ≤ 150 wpm, visuals referencing diagram nodes) | Admin before rendering |

### Research integrity rules
- A claim is `VERIFIED` only if the worker fetched the source and the quoted text is present in it (checked programmatically). Otherwise it is `INFERRED`.
- No invented statistics, company interview experiences or citations. Sources are listed with fetch dates.
- Explore and Research respect robots.txt and site terms, store **references and short quotes**, and never republish third-party question banks.

---

## 3. Content generation pipeline (one subtopic)

```
[Admin] Generate lesson ─► Job: CONTENT_GENERATION
   1. Plan       : outline sections per depth (additive vs slot variants), concepts per section, widgets to use
   2. Draft      : generate sections in batches (structured output per section kind)
   3. Verify     : schema-validate · execute every CODE_EXAMPLE / CODE_EXPLORER state / PLAYGROUND solution
                   in Pyodide · replace claimed outputs with real outputs · flag mismatches
   4. Estimate   : compute section minutes
   5. Save       : module_version (AI_GENERATED) + section revisions + generation meta
   ─► Job: CONTENT_EVALUATION (auto-chained)
   6. Evaluate   : rubric per section and overall → report
   ─► status UNDER_REVIEW ─► [Admin] preview as 3–6 vs 8–12 side by side · edit · regenerate one section
   ─► [Admin] Approve ─► APPROVED ─► [Admin] Publish ─► PUBLISHED (students see it; roadmaps notified)
```
Every stage writes `agent_job_log` lines and has its own status, so failures are resumable from the failed stage.

### Evaluation rubric (each 1–5, plus blocking flags)
| Dimension | Checks |
|---|---|
| Technical correctness | Facts, formulas, terminology. Any statement contradicted by execution results is **blocking**. |
| Depth fit | Each depth layer adds mechanism, alternatives, measurement and trade-offs (not just harder words). The 3–6 view is not overloaded, and the 8–12 view is genuinely deeper. |
| Objective alignment | Every objective is taught and checked by at least one section |
| Pedagogy and style | Hook before definition. Analogy explicitly bounded ("where the analogy breaks"). Plain, conversational language. One idea per section. No walls of text. |
| Code quality | Runs, idiomatic, minimal, outputs match the narration |
| Prerequisites | Terms used are defined here or covered by a listed prerequisite |
| Redundancy | No repeated explanations across sections or layers |
| Hallucination risk | Unverifiable claims, fake APIs or libraries, invented numbers are flagged |
| Interview relevance | Interview tips and pitfalls are realistic and useful |

### Content style guide (injected into every generation prompt)
- **Plain, conversational English**, like a great mentor talking to one student. Short sentences. Avoid idioms and slang, because many learners use English as a second language. Define every term the first time it appears.
- **Order:** hook → simple idea → precise definition → how it works (steps) → try it (interactive) → pitfalls → interview angle → summary.
- **Relatable, mostly Indian contexts** where natural (UPI payments, food-delivery ETAs, IRCTC queues, cricket stats), always technically accurate.
- **Analogies are labelled as analogies**, each with a "where the analogy breaks" note.
- **Show, don't tell**: prefer a `CODE_EXPLORER` or `WIDGET` over a paragraph whenever a behaviour can be seen.
- **Depth honesty**: higher depth adds reasoning, measurement and trade-offs, never fluff.

### Golden exemplars
For the pilot, one subtopic lesson is hand-crafted and reviewed to the bar we want (structure, tone, interactivity, depth layering). It serves as a few-shot exemplar for generation, the reference for the evaluator, and a renderer test fixture.

---

## 4. Orchestration and job model

- **Queue:** pg-boss queues per job type. Concurrency per queue (e.g. generation 2, evaluation 2, import 1). Singleton keys stop duplicate runs (one generation per module at a time).
- **States:** `QUEUED → RUNNING → AWAITING_APPROVAL → SUCCEEDED | FAILED | CANCELLED`. Admins can cancel (cooperative abort via `AbortSignal`) and retry from the failed stage.
- **Chaining:** a parent job spawns child jobs (generation → evaluation). The parent's status aggregates its children.
- **Observability:** live job log in the admin UI (polling), tokens, cost and latency per job, and an AI usage dashboard by task, model and day.

---

## 5. Safety and privacy
- No student PII in prompts. Student feedback text is scrubbed of emails and phone numbers before triage.
- Generated content passes a safe-markdown sanitizer, and widgets are param-only.
- Admin-entered URLs are fetched server-side with SSRF protection: allow http(s) only, block private IP ranges, cap response size and time.
