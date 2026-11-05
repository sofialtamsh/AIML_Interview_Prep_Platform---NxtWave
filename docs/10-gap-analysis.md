# 10 · Gap Analysis: Spec × Manager's Prototype × Competitors

Inputs compared:
1. **Our spec**: the master prompt, the additional requirements, and the question bank / dual-path instructions.
2. **The manager's prototype**: *"NxtWave ML Interview Prep, MVP preview"* (claude.ai artifact). It is a single-file interactive prototype, studied from its source code, not only its screens.
3. **Competitors**: StrataScratch and TensorTonic, from public pages, Nov 2026. Details are in §5.

---

## 1. What the prototype gets right (keep and build on)

| Prototype idea | How it works there | What we do with it |
|---|---|---|
| **Question-first learning** | Every question has a lesson. The first visit asks *"Learn the idea first"* (recommended) or *"Go straight to the question"*. | Adopted as **question primers** (`QUESTION_PRIMER`), assembled from depth-layered lesson sections via **concept tags**, so there is no duplicate content (doc 07 §1, doc 05 §0) |
| **Explorable explanations** | Live DataFrames, toggles (inner vs left, sort direction × keep), sliders, clickable rows, code that updates with the controls, ok/bad verdict banners, bug-vs-fix demos | **`CODE_EXPLORER`** section kind with **execution-verified states** (Pyodide) plus a **widget registry** the AI configures but never codes (doc 07 §6–7) |
| **Inline choices in prose** (Mathigon style) and progressive unlock | Case-study sentences contain choices, and the next step unlocks after the activity (skip allowed) | `prose_choice` blocks and section `gate` (doc 07 §5, §3) |
| **ML System Design track** | Interactive ETA and RAG case studies with sliders, simulations and a 45-minute answer plan | `CASE_STUDY` module type plus the `INTERVIEW_PLAYBOOK` section. First case study: the RAG support assistant (Phase 7). |
| **Question enrichment** | Suggested time, *Why interviewers ask this*, *Expected output*, *Follow-ups*, "Asked at" companies | Added to the question schema (doc 07 §9), with **company tags requiring provenance** |
| **Solve in the NxtWave Learning Portal** | Deep link by `s_id` plus a solved-status refresh (Metabase planned) | `solveMode = EXTERNAL_PORTAL`, deep links on day one, a sync connector in Phase 5 (doc 03 §11) |
| **Skip nudge with reasons** | Modal listing what you'd miss, reason chips, "Read the takeaways (1 min)" | QFL-3. Skip reasons feed the *lesson impact* analytics. |
| **11★ feedback everywhere** | Thumbs per step, 5-face cards, "What would make this 11★?", a floating feedback button | FB-1…3. Feedback links to the **exact section revision** and can trigger a **one-click section regeneration**, which closes the quality loop the prototype opens. |
| **Measuring whether lessons work** | Solve rate learned-first vs skipped, skip rate, learn→solve conversion | ADM-6 *Lesson impact* dashboard, computed from real events |
| **Delight** | XP derived from progress, levels, confetti (reduced-motion aware), count-ups, streak, QOTD, rotating warm-up tile, ⌘K palette | ENG-1…6, with XP **computed server-side** so it can't be forged |
| **Enrolled-only access, cohorts** | "Use your NxtWave course account", batch "DSML Cohort 7" | Registration policy `ALLOWLIST`, plus cohorts (ACC-1, ACC-2) |
| **Status language** | Live / Next up / Planned with "Notify me" | Unified availability enum plus interest capture as a demand signal |
| **Visual language** | NxtWave blue, Geist + JetBrains Mono, dot grid, crisp "interview desk" look | Adopted as our design tokens, with Gen Z energy added (doc 08 §2) |

## 2. What the prototype doesn't have yet (what our platform adds)

| Gap in the prototype | Our answer | Phase |
|---|---|---|
| No personalization: the same path for everyone, no package bracket, no time plan | Role × bracket × prior knowledge × time **personalization engine**: a dated roadmap, feasibility options, versioning (doc 05) | 2–3 |
| No adaptive depth | **Depth-layered lessons** (additive + slot variants), per-subtopic target depth, fast-track for known material | 4 |
| Lessons are hand-coded JS, one per question (doesn't scale to 1,000 questions) | **AI content engine** with structured schemas, execution verification, evaluator, human approval, section-level regeneration | 4 |
| No admin side: no CMS, no question management, no import | Full **admin app**: catalog, curriculum, content review/publish/diff, question bank import and management, students, analytics | 1–8 |
| Data in `localStorage`, demo login, sample insights | A real backend: Postgres, secure sessions, RBAC, audit, real analytics from events | 1+ |
| Solve only happens off-platform | Also **in-app** solving: MCQ, output prediction and Python in Pyodide, graded on the server, answers never leaked | 5 |
| Practice and progress are question-level only | **Concept-level mastery**, "revisit this exact section", learning vs practice tracked separately | 5 |
| No research basis for what each role needs | **Research and curriculum agents** with verified vs inferred claims | 6 |
| Videos absent | Video pipeline with fallback | 7 |
| The prototype's own 11★ map lists stars 7–11 as future | We schedule them: 7★ hints + next-question selection (Phase 5 ranking, AI tutor in Phase 10) · **8★ daily plan for your hours** (Phase 3 planner) + spaced review (Phase 10) · 9★ interview mode with AI feedback (Phase 10) · 10★ mentor and mock (Phase 10) · 11★ readiness → partner interviews (future) | – |

## 3. What our original plan was missing (now added because of the prototype)

1. The **question-first** entry point and primers (we only had topic lessons).
2. **Rich, execution-verified interactivity** (we only had cards, diagrams and checks).
3. A **System Design case-study** track.
4. **Question enrichment** fields and **company tags**.
5. **External-portal solving** and status sync, likely where the existing ~1,000-question bank lives.
6. **Pervasive feedback** and a content-issue loop.
7. **XP, levels, streak, QOTD, warm-ups, command palette.**
8. **Lesson impact** analytics.
9. **Enrolled-only registration**, cohorts, and the Data Engineer role.

## 4. Competitor ideas adopted

| Idea | Source | Adoption | Phase |
|---|---|---|---|
| Question page tabs *Learn · Solve · Solution · My attempts · Notes* | TensorTonic | Question page tabs. The solution is revealed after an attempt. Private **notes** per question and lesson. | 5 |
| "Try similar (unsolved)" | TensorTonic | Via concept tags in the practice ranking | 5 |
| **Debug-the-AI-written-code** question type | StrataScratch | New question type `DEBUG_CODE`, a key skill in the AI era | 5 (type), content later |
| Technology facet (Python / Pandas / SQL / NumPy / PyTorch) and SQL dialect | StrataScratch | `technologies` tag on questions, filterable | 5 |
| Hours per module, one obvious starting path | Both | Roadmap shows minutes per item and a "Start here" next-best-action | 3 |
| Socratic **AI tutor** with three intents (*Explain · Hint · Debug*), never gives full solutions, checked against the reference solution | Both | Designed now, built post-pilot: grounded on approved content, rate-limited and cost-capped, no PII | 10 |
| Rubric **AI answer evaluator** with anti-inflation rules (name a real strength, guidance below 9, cardinal-sin caps, accept alternative approaches) | StrataScratch | The rubric design is adopted for conceptual, system-design and interview-mode grading | 10 |
| Timed role-based **readiness assessments** → readiness report → retake loop | TensorTonic | Maps to brackets ("Are you 8–12 ready?"). Also serves as the **diagnostic** that replaces self-rating. | 10 |
| AI interviewer (communication and reasoning) | StrataScratch | Interview mode (the prototype's 9★) | 10 |
| Cohort / college **leaderboards** (verified domain, opt-in) | TensorTonic | Cohort-scoped, opt-in, humane | 10 |
| **Shared interview experiences** (voted) feeding the CMS | TensorTonic | India-specific company intelligence, the provenance source for "asked at" tags | 10 |
| In-browser SQL (sql.js / PGlite) for analyst questions | Both | Behind the `CodeRunner` interface, when the DA role goes live | 10 |
| Build-from-scratch step tracks, mini-analyses (messy data → stakeholder memo) | Both | Future content types on the same section schema | 10 |

## 5. Competitive positioning

| | StrataScratch | TensorTonic | Manager's prototype | **This platform** |
|---|---|---|---|---|
| Personalized by role × package × time | ✗ | ✗ (one linear roadmap) | ✗ | **✓** |
| Adaptive depth per subtopic | ✗ | ✗ | ✗ | **✓** |
| Concept lessons tied to questions | Partial (SQL and Python paths) | ✓ (Theory tab) | ✓ (per question) | **✓ (topic lessons + question primers via concepts)** |
| Explorable, interactive lessons | ✗ | Some visualizations | ✓ (hand-built) | **✓ (registry + execution-verified, AI-scalable)** |
| India context (companies, examples, plain English) | ✗ (US/FAANG) | ✗ | ✓ | **✓** |
| Spaced review | ✗ | ✗ | Planned (8★) | **Designed (Phase 10)** |
| Human-reviewed AI content pipeline | n/a | n/a | n/a | **✓** |
| AI tutor / AI interviewer | ✓ | ✓ / ✗ | Planned (7★/9★) | Designed (Phase 10) |

**Positioning line:** *The only interview-prep platform that builds your plan from your target role, target salary and available time, then teaches each concept at exactly the depth that package demands, and connects every lesson to the real interview questions that test it.*

## 6. IP and compliance guardrails (important)

- **TensorTonic's terms explicitly forbid** copying, scraping, republishing, derivative works (including courses or tutorials based on their content) and AI training on their content. StrataScratch content should be treated as all rights reserved. **We never seed questions, theory, datasets, visualizations or tests from either platform.** Generic exercises (implement sigmoid, a window-function query) are fine with our own statements and tests.
- ⚠️ **Several question slugs in the prototype's content sheet** (`finding-user-purchases`, `finding-updated-records`, `counting-instances-in-text`, `city-with-most-amenities`, `host-popularity-rental-prices`, "Order Details") **appear to match public StrataScratch question titles.** Before the supplied bank is published on this platform, **confirm its source and licence.** The importer stores provenance per question, and the similarity checker can flag near-copies for review.
- **Company tags** ("Asked at Amazon") need evidence (dataset provenance or sourced reports), shown as text tags, **not logos** (logos imply endorsement and carry trademark risk).
- Agent guardrails: the Explore and Research agents store references and short quotes, never full third-party questions. Generation prompts refuse "rewrite this {competitor} question" requests. A similarity check runs before publishing.
- Do not reuse competitor brand names (*StrataAI, Toni, TensorTonic 125, Mini Analyses, Data Labs*) or copy their exact screen designs. Feature mechanics are fine to adopt.
