# 01 · Product Requirements Document (PRD)

| | |
|---|---|
| Status | v1.0: Blueprint (Phase 0) |
| Date | 2026-11-03 |
| Owner | NxtWave DSML Content Team |
| Sources | Master prompt · Additional mandatory requirements · Question bank & dual-path instructions |

---

## 1. What we are building

A personalized technical learning and interview-preparation platform. A student says *"I want to be an **AI Engineer** earning **8–12 LPA**, I know a bit of Python, and I have **2 hours a day** until **15 January**."* The platform answers with:

1. **A roadmap**: exactly which topics and subtopics matter for that role and pay band, in what order, at what depth, and how long each will take on their schedule.
2. **"Learn the Concept"**: interactive lessons for each subtopic. They open with a hook, explain things simply, then go as deep as that student's target needs, with cards, diagrams, runnable code, short videos and quick checks.
3. **"Practice Questions"**: questions from the existing NxtWave question bank, filtered to the same topic, role, pay band and difficulty, with feedback and explanations.
4. **Progress**: what is done, what is next, what is running late, and which subtopics need another look.

Admins run the machine behind it. They define roles and pay bands, curate the curriculum (with help from AI research agents), generate and review content through AI agents with human approval, import and manage the question bank, and watch every student's progress.

### What makes it different
| Traditional LMS / Q&A site | This platform |
|---|---|
| Same course for everyone | Curriculum resolved per *role × pay band × prior knowledge × time* |
| Depth = "beginner / advanced course" | Depth set **per subtopic**: the same RAG lesson goes deeper for an 8–12 LPA target than for 3–6 LPA, while NumPy may stay intermediate for both |
| Long text documents | Short, interactive, conversational sections rendered from structured content |
| Questions bolted on separately | Learn and Practice share one taxonomy and link to each other |
| Static content | AI-assisted research → curriculum → content, always behind human review |

---

## 2. Users

### 2.1 Student
- Mostly final-year and early-career learners, many on mobile, Gen Z.
- Wants to know exactly what to study and why, in short sessions, without boredom.
- Sees **only their own** goal, roadmap, progress and practice history.

### 2.2 Admin
| Admin type | Typical person | Can do |
|---|---|---|
| `ADMIN` | Content team member, curriculum designer, reviewer | Catalog, curriculum, content, agents, question bank, student tracking, analytics |
| `SUPER_ADMIN` | Platform owner | Everything above, plus managing admin accounts, AI providers/models/keys config, platform settings |

Admins use a **separate admin application**. Students never see admin tools, agents, research, drafts or unpublished content. This is enforced on the backend, not just hidden in the UI.

---

## 3. Personalization model

The package bracket is a **starting configuration, not the only signal**.

| Signal | Source | What it changes | What it never does |
|---|---|---|---|
| **Career role** | Onboarding | Which topics and subtopics are in the roadmap | – |
| **Package bracket** | Onboarding | Target depth and priority **per subtopic**, the question difficulty mix | Doesn't make *every* topic harder. Depth is researched per subtopic. |
| **Prior knowledge** | Onboarding self-rating per skill area (later: diagnostic quiz from the question bank) | Fast-tracks foundations the student already knows (collapsed refreshers), shortens time estimates | Doesn't lower the target depth |
| **Available time** | Daily minutes, study days per week, optional deadline | Schedule, daily and weekly targets, feasibility warnings | Doesn't silently drop topics or reduce depth. The student chooses any trade-off. |
| **Performance** (later) | Knowledge checks, practice attempts | "Revisit" recommendations, practice difficulty | Doesn't count as mastery on its own |

---

## 4. Scope

### 4.1 Pilot scope (first validation release)
The architecture supports every role and bracket. Initial **data and generation** are deliberately limited:

| Dimension | Pilot | Rest |
|---|---|---|
| Career roles | **AI Engineer** live | ML Engineer, Data Analyst, Data Scientist (and Data Engineer, from the prototype) seeded as *Next up* / *Planned* |
| Package brackets | **Two live: 3–6 LPA and 8–12 LPA** (proposed, chosen for maximum depth contrast; admin-configurable) | 6–8 LPA and Above 12 LPA seeded as *Next up* |
| Major topics | **3** (proposed below) | Added later via research → curriculum agents |
| Subtopics | **3 per topic → 9 lessons** | – |
| Learning experience | **Complete** for each pilot subtopic: hook, explanations, cards, diagram(s), runnable code, knowledge checks, video workflow, evaluation and approval | – |
| Question bank | The **existing** ~1,000-question dataset is imported and tagged; practice is live for pilot subtopics | No new bank is generated |

**Proposed pilot topics (AI Engineer).** They form a prerequisite chain, run fully in a browser Python sandbox (NumPy / scikit-learn), and show strong depth contrast between brackets:

1. **Python & NumPy for AI**: arrays and vectorization · broadcasting and array operations · linear-algebra essentials (dot product, norms)
2. **Embeddings & Vector Search**: what embeddings are · similarity measures (cosine, dot, Euclidean) · vector databases and ANN indexing
3. **Retrieval-Augmented Generation (RAG)**: why RAG and the core pipeline · chunking strategies · retrieval quality (hybrid search, reranking, evaluation)

> The final pilot topics must be confirmed by an admin. They can be validated or replaced using the Research Agent once it is built.

### 4.2 Not in the MVP (designed for, built later)
Full adaptive practice engine · mock interviews · AI interview/answer evaluation · coding assessments with server-side grading · top-10 student ranking · predictive analytics · the remaining roles and brackets' content.

---

## 5. Functional requirements

Priority: **P1** essential for MVP · **P2** core learning experience · **P3** future (architecture only).

### AUTH: Authentication and accounts
| ID | Requirement | P |
|---|---|---|
| AUTH-1 | Student self-registration with email + password (strong password policy) | P1 |
| AUTH-2 | Login / logout for students (student app) and admins (admin app) with separate sessions | P1 |
| AUTH-3 | Email verification (link). Unverified students can onboard; verification can be made mandatory via a setting | P1 |
| AUTH-4 | Forgot and reset password via single-use, time-limited link. Reset revokes all sessions | P1 |
| AUTH-5 | Change password, edit profile | P1 |
| AUTH-6 | No public admin signup. The first super admin is created by CLI, later admins are invited by a super admin | P1 |
| AUTH-7 | Backend-enforced RBAC (`STUDENT`, `ADMIN`, `SUPER_ADMIN`) plus session *audience* (student app vs admin app) | P1 |
| AUTH-8 | Brute-force protection (rate limits), session expiry, session revocation | P1 |

### CAT: Catalog configuration
| ID | Requirement | P |
|---|---|---|
| CAT-1 | Admin CRUD for career roles (description, competencies, skill categories, interview topics, availability: live / coming soon / hidden) without code changes | P1 |
| CAT-2 | Admin CRUD for package brackets (label, LPA range, description of expectations, availability, order) | P1 |
| CAT-3 | Configurable depth levels (default: Foundational, Beginner, Intermediate, Advanced, Expert) with generation guidance per level | P1 |
| CAT-4 | Skill areas used for prior-knowledge self-rating, mapped to topics | P1 |
| CAT-5 | Per-bracket question difficulty distribution policy | P1 |

### ONB: Onboarding and goals
| ID | Requirement | P |
|---|---|---|
| ONB-1 | After signup, guided flow: role → package → skill self-rating → study time (daily minutes, days/week, optional deadline) | P1 |
| ONB-2 | Show *why* each choice matters (what the role and package level expect) | P1 |
| ONB-3 | Only *live* roles and brackets are selectable. Coming-soon ones are visible but disabled | P1 |
| ONB-4 | Student can change study time or deadline any time (recalculates the plan) and change role or bracket (creates a new goal and roadmap, keeps history) | P1 |

### ROAD: Roadmap and study planner
| ID | Requirement | P |
|---|---|---|
| ROAD-1 | Generate a personalized roadmap from the published role × bracket curriculum: topics, subtopics, objectives, priority, depth, duration, order, dependencies, implementation expectations | P1 |
| ROAD-2 | Schedule onto the student's calendar: total duration, daily and weekly targets, per-topic timeline | P1 |
| ROAD-3 | Show completed / in-progress / upcoming / **delayed** items and overall completion % | P1 |
| ROAD-4 | Deadline feasibility check with explicit options (more daily time, later deadline, defer optional items) | P1 |
| ROAD-5 | Roadmaps are **versioned**. Student-initiated changes create a new version with a change summary. Admin curriculum changes create a **proposed** version the student accepts. Nothing changes silently | P1 |
| ROAD-6 | Progress carries over across roadmap versions | P1 |

### LEARN: Learn the Concept
| ID | Requirement | P |
|---|---|---|
| LEARN-1 | Topic page shows two clear paths: **Learn the Concept** and **Practice Questions** (practice is always visible, even before questions exist) | P1 |
| LEARN-2 | Lesson player renders structured sections: hook, explanation, interactive cards (flip, expand, stepper, compare), callouts (misconception, interview tip, analogy vs reality), summary and takeaways | P1 |
| LEARN-3 | Content is resolved to the student's **target depth** for that subtopic. Fast-tracked foundations appear as collapsible refreshers | P1 |
| LEARN-4 | Visual diagrams with step-by-step reveal | P2 |
| LEARN-5 | Runnable code examples and a playground (Python first), isolated from our servers, with time limits, reset, errors and output | P2 |
| LEARN-6 | Embedded knowledge checks (MCQ, fill-in-the-blank, predict-the-output, reasoning) with instant feedback | P2 |
| LEARN-7 | Short explainer videos with status and graceful fallback to diagram and text | P2 |
| LEARN-8 | Resume from the last position. The completion screen shows what was learned, takeaways and objectives met | P1 |

### PRAC: Practice Questions
| ID | Requirement | P |
|---|---|---|
| PRAC-1 | Retrieve published questions by the student's role, bracket, topic, subtopic and suitable difficulty, using structured filters | P1 |
| PRAC-2 | Question view: MCQ options, code snippet, code editor for coding questions, difficulty and topic badges, navigation | P1 |
| PRAC-3 | Submit → server-side grading where possible → correct/incorrect feedback, explanation, correct answer. **Answers are never sent to the client before submission** (unless an explicit preview mode is enabled) | P1 |
| PRAC-4 | Non-auto-gradable types (conceptual, scenario, system design): reveal the model answer after the attempt, then the student self-assesses. AI evaluation comes later | P1 |
| PRAC-5 | Practice progress per subtopic, tracked **separately** from learning progress | P1 |
| PRAC-6 | Weak-subtopic detection and "revisit this lesson" recommendations | P2 |
| PRAC-7 | Adaptive question selection, mock interviews, AI answer evaluation | P3 |

### QB: Question bank management (admin)
| ID | Requirement | P |
|---|---|---|
| QB-1 | Bulk import from CSV, Excel (.xlsx) and JSON through a staging area: parse → validate → map tags → detect duplicates → admin review → commit | P1 |
| QB-2 | Manual create, edit, archive and delete (soft) | P1 |
| QB-3 | Multi-tagging: many roles, brackets, topics and subtopics per question. Difficulty (Easy / Medium / Hard / Expert), type, expected answer depth, provenance | P1 |
| QB-4 | Duplicate detection (exact + near-duplicate text). Never regenerate questions that already exist | P1 |
| QB-5 | Search, filter, bulk edit tags and status, preview as a student, publish and unpublish | P1 |
| QB-6 | Taxonomy aliases so dataset labels (e.g. "Retrieval Augmented Generation") map onto platform subtopics | P1 |

### CMS: Curriculum and content management
| ID | Requirement | P |
|---|---|---|
| CMS-1 | Topics, subtopics and prerequisites (validated as a DAG), with manual create/edit | P1 |
| CMS-2 | Role × bracket curriculum: included subtopics, priority, target depth, objectives, implementation expectations, estimates. Draft → published versions | P1 |
| CMS-3 | One learning module per subtopic, shared across roles and brackets. Sections are depth-tagged for reuse, never duplicated per bracket | P1 |
| CMS-4 | Content statuses: Draft → AI Generated → Under Review → Approved → Published → Archived. Rejection returns to Draft with notes | P1 |
| CMS-5 | Immutable module versions, per-section revision history, version diff, regenerate **one section** without touching the rest | P1 |
| CMS-6 | Section editor with live preview using the **same renderer** as the student app. Preview as any role × bracket × knowledge profile. Side-by-side bracket comparison | P1 |
| CMS-7 | No auto-publish of AI content unless a super admin enables a publishing policy | P1 |

### AGENT: AI agents (admin only, on demand)
| ID | Requirement | P |
|---|---|---|
| AGENT-1 | **Content Generation Agent**: generates a module draft or a single section to the depth profile and content style rules | P2 (pilot-critical) |
| AGENT-2 | **Content Evaluation Agent**: rubric report (correctness, depth fit, objective alignment, code validity checked by actually executing code, redundancy, missing prerequisites, hallucination flags) | P2 (pilot-critical) |
| AGENT-3 | **Explore Agent**: admin-provided URLs → extracted topics, concepts and question references with source and timestamp | P2 |
| AGENT-4 | **Research Agent**: role and bracket expectations with every claim marked *verified* (with source) or *inferred* | P2 |
| AGENT-5 | **Curriculum Agent**: research → proposed topics, subtopics, prerequisites, depth, priority, durations → admin review → materialize | P2 |
| AGENT-6 | Async jobs with status, logs, retries, cancellation, cost and usage, human approval gates | P2 |

### AI: Provider abstraction
| ID | Requirement | P |
|---|---|---|
| AI-1 | Provider-independent gateway (Anthropic, OpenAI-compatible, more later) | P2 |
| AI-2 | Per-task model routing (research, curriculum, generation, evaluation, video script, extraction) with parameters, timeouts, retries, fallback | P2 |
| AI-3 | Versioned prompts, recorded on every generation | P2 |
| AI-4 | Structured output validated against schemas before saving, with an automatic repair attempt | P2 |
| AI-5 | Usage, latency and cost recorded per call and per job. Keys only ever server-side | P2 |

### QFL: Question-first learning (from the manager's prototype)
| ID | Requirement | P |
|---|---|---|
| QFL-1 | Each question page has two tabs, **1 · Learn** (question primer) and **2 · Solve**. On first visit, the student chooses "Learn the idea first" (recommended) or "Go straight to the question". | P1 |
| QFL-2 | **Question primer**: a 5–8 step interactive mini-lesson, assembled from the lesson sections tagged with the question's concepts plus question-specific pitfall steps. Ends with "You are ready for the real question". | P2 |
| QFL-3 | Skip nudge when solving without the primer: shows what the primer teaches, optional skip-reason chips, and "Read the takeaways (1 min)" | P2 |
| QFL-4 | Question enrichment: suggested time, *Why interviewers ask this*, *Expected output*, *Follow-ups the interviewer may ask*, "Asked at" company tags (with provenance), the concepts tested | P1 |
| QFL-5 | **External solve mode**: questions that live in the NxtWave Learning Portal open via a deep link (by `s_id`). Solved status is synced back (Metabase / API / CSV connector) and the student can trigger a manual refresh. | P1 (deep link) · P2 (sync) |

### ENG: Engagement and delight
| ID | Requirement | P |
|---|---|---|
| ENG-1 | XP **derived server-side from real progress**, levels (Starter → Pro), level-up and solve celebrations (reduced-motion aware) | P2 |
| ENG-2 | Daily streak (meaningful activity, in the student's timezone) and a 12-week activity heatmap | P2 |
| ENG-3 | Question of the day. A Home warm-up tile with rotating fill-in-the-blank code drills drawn from the student's next questions. | P2 |
| ENG-4 | Next-best-action "Continue" (resume → due review → revisit weak concept → next roadmap item) | P1 |
| ENG-5 | ⌘K command palette (topics, questions, case studies, pages) and keyboard navigation in lessons | P2 |
| ENG-6 | "Notify me" on Next-up / Planned roles, topics and case studies (captured as admin-visible demand) | P2 |
| ENG-7 | Spaced review of solved questions and completed lessons (1, 3, 7, 21 days) | P3 |

### FB: Feedback loop (the 11★ method)
| ID | Requirement | P |
|---|---|---|
| FB-1 | "Was this step clear? 👍 👎" on every lesson step and check. A thumbs-down offers reason tags (*Too fast, Hard words, Visual did not help, Content error*) plus a note. | P1 |
| FB-2 | A 5-face rating card on lesson, question and case-study completion, with tags and the question **"What would make this an 11★ experience?"** A floating Feedback button on every page. | P2 |
| FB-3 | Admin feedback analytics (ratings by area, top tags, skip reasons, top ideas) and a **Content issues** queue linked to the exact section revision. One click to "regenerate this section with the feedback". | P2 |

### CASE: ML System Design track
| ID | Requirement | P |
|---|---|---|
| CASE-1 | Interactive case studies (catalog filterable by theme, company tags, status) with progressive unlock (skip allowed) and an outline rail | P2 |
| CASE-2 | Each ends with an **interview playbook** (a time-boxed 45-minute answer structure) and the follow-ups to expect | P2 |

### ACC: Access and cohorts
| ID | Requirement | P |
|---|---|---|
| ACC-1 | Registration policy setting: `OPEN`, `ALLOWLIST` (enrolled NxtWave emails or domains uploaded by admin) or `INVITE_ONLY`. The prototype assumes enrolled-only access. | P1 |
| ACC-2 | Cohorts / batches (e.g. "DSML Cohort 7") for students, as an admin filter and future leaderboards | P2 |
| ACC-3 | Future "Sign in with NxtWave" (OIDC SSO) behind the same identity layer | P3 |

### ADM: Admin analytics and tracking
| ID | Requirement | P |
|---|---|---|
| ADM-1 | Student list with filters (role, bracket, progress, completed topics, last active) and a student detail view (roadmap, learning, practice) | P1 |
| ADM-2 | Overview: totals, active students, by role and bracket, completion rates, most- and least-completed topics, engagement | P2 |
| ADM-3 | Content and AI stats: generation volume, approval rates, AI cost by task and model | P2 |
| ADM-4 | Explainable top-N student ranking per role | P3 |
| ADM-6 | **Lesson impact**: solve rate for learned-first vs skipped (lift), learn → solve conversion, skip reasons, per-question funnel | P2 |
| ADM-5 | Audit log of admin actions | P1 |

---

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Performance** | Student app first load < 2.5 s on 4G (LCP). API p95 < 300 ms for reads, excluding AI. All long work (AI, video, imports) runs in background jobs. Pagination on all admin lists. |
| **Security** | OWASP ASVS L2 baseline: Argon2id password hashing, HttpOnly session cookies, CSRF defenses, rate limiting, Zod validation on every input, least-privilege RBAC on the backend, secrets only in env or a secret manager, audit log, no student code on our servers. |
| **Privacy** | Minimal PII (name, email). Aligned with India's DPDP Act 2023: purpose limitation, deletion on request, no student data sent to AI providers. |
| **Reliability** | DB transactions for multi-step writes. Idempotent imports and jobs. Retries with backoff. Daily backups with point-in-time recovery in production. Graceful degradation (video → diagram, AI down → existing content unaffected). |
| **Scalability** | Stateless API and worker scale horizontally. Postgres scales vertically and with read replicas. Content served from DB plus cache, video and assets from object storage and CDN. Supports many roles, brackets, ~10⁵ questions and ~10⁵ students without redesign. |
| **Maintainability** | Modular monolith with clear domain modules. Shared typed contracts. Migrations. ≥ 80% coverage on core engines (depth resolution, planner, retrieval, import). |
| **Accessibility** | WCAG 2.2 AA: keyboard navigation, focus states, contrast, `prefers-reduced-motion`, alt text and text alternatives for diagrams and videos. |
| **Responsiveness** | Student app mobile-first (360 px+). Admin app optimized for desktop and usable on tablet. |
| **Observability** | Structured JSON logs with request IDs, job logs, health and readiness endpoints, error tracking hook, AI cost dashboards. |

---

## 7. Student journey

```
Sign up ─► Verify email (can continue meanwhile) ─► Onboarding
   1. Pick role          (AI Engineer live · others "coming soon")
   2. Pick target package (what this level expects, in plain words)
   3. Quick self-check    ("New / Know basics / Comfortable / Confident" per skill area)
   4. Your time           (minutes/day · days/week · optional deadline)
   ─► "Building your roadmap…" ─► Roadmap reveal (timeline, total days, today's target)

Daily loop:
Home ─► "Continue where you left off" ─► Topic page
   ├─ Learn the Concept ─► hook → explanations → cards → diagram → code → checks → summary ─► ✓ completed
   └─ Practice Questions ─► filtered questions → submit → feedback + explanation
                            └─ struggling? ─► "Revisit: Chunking strategies (section 3)"
Progress ─► learning progress and practice performance (separately) · delayed items · weak subtopics
Settings ─► change time/deadline ─► preview new plan ─► confirm (new roadmap version)
Curriculum updated by admin ─► "Your roadmap has an update" ─► see what changed ─► accept / keep current
```

## 8. Admin journey

```
Login (admin app)
 ├─ Configure: roles · brackets · depth levels · skill areas · difficulty policy
 ├─ Curriculum: topics/subtopics/prereqs ─► role × bracket curriculum (depth, priority, objectives) ─► publish
 │      ↑ optional: Research Agent ─► report (verified vs inferred) ─► Curriculum Agent ─► proposal ─► review ─► materialize
 ├─ Content: pick subtopic ─► Generate (Content Agent, async) ─► Evaluate (Evaluation Agent) ─► review in preview
 │      (as 3–6 vs 8–12 side by side) ─► edit / regenerate one section ─► approve ─► publish ─► students see it
 ├─ Question bank: upload CSV/XLSX/JSON ─► validation report ─► map unknown tags ─► resolve duplicates ─► commit
 │      ─► search/filter/bulk-tag ─► publish
 ├─ Students: filter by role/bracket/progress/activity ─► open a student's track
 ├─ Analytics: completion, engagement, weak topics, practice accuracy, AI usage and cost
 └─ (Super admin) AI providers and models · prompts · admins · settings · audit log
```

---

## 9. Feature breakdown (epics)

| Epic | Features | Phase |
|---|---|---|
| E1 Platform foundation | Monorepo, API, worker, DB, config, logging, errors, CI checks | 1 |
| E2 Identity | Signup, login, sessions, verify, reset, RBAC, admin CLI, audit | 1 |
| E3 Catalog and onboarding | Roles, brackets, depth levels, skill areas, onboarding flow, goals, dashboard shell | 2 |
| E4 Curriculum and planner | Taxonomy, prerequisites, role curriculum versions, planner engine, roadmap versions, roadmap UI, topic page (dual path) | 3 |
| E5 Content engine | Content schema, renderer, CMS, versions and diff, review and publish, depth resolution, lesson player, checks, runnable code, progress, AI gateway, generation and evaluation agents | 4 |
| E6 Question bank and practice | QB schema, import pipeline, admin QB, retrieval, practice UI, grading, stats, revisit recommendations | 5 |
| E7 Research agents | Explore, research and curriculum agents, sources, proposals | 6 |
| E8 Video and playground | Video script → provider → async render → storage → player. Guided coding exercises | 7 |
| E9 Analytics | Admin overview, student tracking, performance, AI cost | 8 |
| E10 Hardening and deploy | E2E, security, performance, deployment, monitoring, backups | 9 |

---

## 10. Gaps and contradictions, and how they are resolved

| # | Tension | Resolution |
|---|---|---|
| 1 | Master spec §8 says the question bank is a *future* module. The later instruction says the dual path and ingestion are needed **from day one**. | The latest instruction wins. QB schema, import, admin management, retrieval and basic practice are MVP (Phase 5). The adaptive practice engine, mock interviews and AI evaluation stay future. The Practice tile is visible from Phase 3. |
| 2 | "Initially support 4 roles and 4 brackets" vs "pilot one role and two brackets". | All 4 roles and 4 brackets are **seeded as configuration**. Only AI Engineer and two brackets are *live*. The others show *Coming soon*. Going live is an admin toggle once their curriculum and content exist. |
| 3 | Spec phase order puts research agents (Phase 4) before the content engine (Phase 5). | Reordered: the **content engine comes first**. It is the core value and the biggest risk, and the user says research agents are used only occasionally. The pilot curriculum is entered by admins; research agents later validate and extend it. Video still comes after the content engine (as instructed). |
| 4 | Two difficulty scales: content **depth** (Foundational…Expert) and question **difficulty** (Easy…Expert). | Kept separate on purpose (they measure different things). Linked through the per-bracket difficulty policy. |
| 5 | "Students should see video generation status" vs "never publish unreviewed AI content". | Videos are generated in the admin pipeline and reviewed. Students only see *availability* ("Video coming soon, here's the visual walkthrough"). No student-triggered generation. |
| 6 | "Do not silently change an approved plan": approved by whom? | The student "approves" by accepting a roadmap version. Student-initiated changes apply immediately with a change summary. Admin-initiated curriculum changes arrive as proposals. |
| 7 | Knowledge checks (in lessons) vs bank questions could duplicate each other. | Knowledge checks are short, lesson-specific reinforcement. The Content Agent receives the subtopic's existing bank questions and must not reproduce them. Knowledge-check results and practice results are tracked separately. |
| 8 | "Prior knowledge" is required as a signal, but no mechanism is specified. | MVP: quick self-rating per skill area. Later: an optional diagnostic built from the question bank. |
| 9 | Explore Agent "access supported websites, use credentials". | Legal and ToS risk. Admin-supplied URLs only, robots.txt respected, rate limited. We store extracted concepts and references, not republished copyrighted text. Credentials are encrypted and site logins are only used where the site's terms allow it. |
| 10 | Coding questions and coding exercises require grading. | MVP runs code in the browser (Pyodide) for learning and practice, with reference solutions revealed after submit. Trustworthy server-side grading (assessments) is a later sandbox service behind the same runner interface. |
| 11 | Conceptual / system-design answers need "expected answer depth" evaluation. | MVP: model answer and rubric shown after the attempt, then self-assessment. AI answer evaluation is Phase 10. |
| 12 | The spec says "Sign up with email and password". The manager's prototype says "No public sign-up, enrolled NxtWave students only". | Both are supported by a **registration policy** setting. Default for the NxtWave deployment: `ALLOWLIST` (enrolled emails). SSO is a later option. |
| 13 | The spec is **topic-first** (roadmap → lessons). The prototype is **question-first** (each question has its own lesson). | Both, joined by **concepts**. Topic lessons are the main path, and question primers are assembled from the same lesson sections via concept tags. No duplicate content. |
| 14 | Spec roles: AI Eng, MLE, DA, DS. The prototype also has **Data Engineer** and calls AI Engineer "GenAI Engineer". | Roles are configuration. Data Engineer is seeded as `PLANNED`. AI Engineer stays the pilot role (described as covering GenAI). |
| 15 | The prototype solves questions in the **NxtWave Learning Portal**. The spec implies an in-app editor. | Per-question `solveMode`: `EXTERNAL_PORTAL` (deep link + status sync) or `IN_APP` (MCQ, output prediction, Pyodide coding). The existing bank keeps working where it lives. |
| 16 | Prototype statuses are *Live / Next up / Planned*. Our draft had *Live / Coming soon / Hidden*. | Unified: `LIVE`, `NEXT_UP`, `PLANNED`, `HIDDEN`. |

## 11. Assumptions
- Single organization (NxtWave), English UI and content first. Copy is centralized so translation stays possible later.
- No payments. Brackets are compensation targets, not plans.
- Students are 16+ and agree to terms at signup.
- The supplied question dataset may be messy. The importer must tolerate and report problems rather than reject the whole file.
- Production hosting will be a mainstream cloud. All components are containerized and cloud-agnostic.

## 12. Open questions (non-blocking for Phases 1–3)
1. **LLM access**: which provider keys can we use (Anthropic, OpenAI, Gemini, Azure)? Needed from Phase 4. Default plan: Claude models via a swappable gateway.
2. **Question bank file**: please share it (or a 20-row sample) so the importer maps its columns and labels correctly.
3. **Pilot brackets**: confirm *3–6 LPA* and *8–12 LPA*.
4. **Pilot topics**: confirm *Python & NumPy → Embeddings & Vector Search → RAG*.
5. **Brand**: product name, logo and brand colors (the design system is token-based, so it can be re-themed at any time).
6. Later: hosting target, email provider, SSO with existing NxtWave accounts, video provider preference.
