# 09 · Delivery Plan, Testing Strategy and Risks

## 1. Phases

The order follows the instructions: **content engine before video**, the **dual Learn/Practice path visible from day one**, and **pilot scope first** (AI Engineer · 2 brackets · 3 topics × 3 subtopics). Each phase ends with a written phase report (implemented, functional, decisions, DB/API changes, tests and results, known issues, next).

| # | Phase | Scope | Exit criteria (verified end to end, not just UI) |
|---|---|---|---|
| 0 | **Blueprint** | This documentation set, gap analysis vs the manager's prototype and competitors | Docs reviewed |
| 1 | **Foundation** | pnpm monorepo, Fastify API + worker skeleton, Postgres via Docker, Prisma, config validation, logging, errors, security headers, rate limits, **auth** (student signup/login/logout, verification, reset, change password, admin login, invites CLI), RBAC + audiences, audit log, both SPAs (design tokens, routing, auth screens, app shells), Mailpit, test harness, `pnpm check` | Signup → verify → login → logout works in both apps against the real DB. Student is denied on every admin route (automated test). All checks green. |
| 2 | **Catalog and onboarding** | Roles, brackets (LIVE / NEXT_UP / PLANNED / HIDDEN), depth levels, skill areas, companies, cohorts and allow-list; admin CRUD; student onboarding (role → bracket → self-check → time); goal storage; "notify me" interest; dashboard shell | A new student completes onboarding and lands on a personalized dashboard. Admin edits a role and the student sees it with no deploy. |
| 3 | **Curriculum and planner** | Topics, subtopics, concepts, prerequisites (DAG), role × bracket curriculum editor with publish and versions, planner engine, roadmap versions and proposals, roadmap UI, topic page with **both path tiles**, **pilot curriculum seeded** | Two students (3–6 vs 8–12) get different, dated roadmaps. Changing time re-plans with a preview. Publishing a curriculum change creates a proposal the student can accept. |
| 4 | **Content engine** ⭐ | `content-schema` + `learning-ui` packages; all section kinds and the first widgets; CODE_EXPLORER; Pyodide runner; CMS (versions, revisions, edit, diff, review, publish); depth resolution and fast-track; lesson player; server-graded checks; progress and resume; question primers; feedback on every step; **AI gateway + Content Generation + Evaluation + Section Regeneration agents**; golden exemplar; pilot lessons generated and reviewed | An admin generates a pilot lesson, the evaluator reports on it, the admin regenerates one section, compares 3–6 vs 8–12, approves and publishes. A student sees the right depth, does checks, runs code and resumes later. |
| 5 | **Question bank and practice** | QB schema, import (CSV / XLSX / JSON) with validation, alias mapping, AI tag suggestions, dedupe and commit; admin QB management; retrieval and ranking; practice UI (Learn \| Solve tabs, nudge, in-app grading, portal deep link); attempts and stats; concept mastery and revisit links; XP and streaks | The supplied bank imports with a clean validation report. A student practices RAG/Chunking questions filtered to their bracket, gets graded feedback, and is sent back to the exact lesson section after misses. |
| 6 | **Research and curriculum agents** | Explore, Research and Curriculum agents, sources, findings, reports (verified vs inferred), proposals → materialize | An admin researches "AI Engineer 8–12 LPA" and gets a cited report and a curriculum proposal that can be merged into the taxonomy |
| 7 | **Video and system design** | Video script → provider abstraction → async render → storage → player with fallback; case-study module type + the first case study (RAG support assistant); guided coding exercises | Video generated, reviewed and playing with fallback. A case study is playable with progressive unlock. |
| 8 | **Analytics and admin dashboards** | Overview, student tracking with filters, learning and practice analytics, **lesson impact (learned-first vs skipped)**, feedback analytics and content-issue triage, interest demand, AI usage and cost | Numbers on dashboards match SQL ground truth on seeded data |
| 9 | **Hardening and deployment** | Playwright E2E, authz matrix, load test, security review, accessibility audit, Docker images, CI/CD, staging, backups, monitoring | A staging environment passes the E2E suite and checklists |
| 10 | **Future** | Adaptive practice, spaced repetition, interview mode (timer + AI feedback on explanations), mock interviews, AI answer evaluation, coding assessments (server sandbox), top-N ranking, readiness prediction, other roles and brackets live, NxtWave SSO | – |

## 2. Testing strategy

| Layer | What | Tooling |
|---|---|---|
| **Unit (pure engines)** | Depth resolution, fast-track, planner (ordering, packing, feasibility, status derivation), retrieval eligibility and ranking, mastery scoring, XP and streak, import normalization and validation, DAG cycle detection | Vitest, table-driven fixtures, ≥ 90% coverage on engines |
| **Contract** | Zod schemas shared by FE and BE. Content-schema fixtures (golden lesson) validate. Every widget's params schema. | Vitest |
| **Integration (API + DB)** | Auth flows, session expiry and revocation, RBAC and audience matrix (auto-enumerated routes), onboarding → roadmap, publish → proposal, import → commit idempotency, answer-stripping (no `answer` field ever in student payloads) | Vitest + Fastify `inject` + a real Postgres test DB (migrated fresh) |
| **Component** | Every section renderer and widget: renders, is keyboard-operable, has a reduced-motion path, and handles empty and error states | Vitest + Testing Library |
| **E2E** | Student: signup → onboarding → roadmap → lesson → check → practice → progress. Admin: generate → evaluate → regenerate section → approve → publish → visible to the student. Import flow. | Playwright (desktop + mobile viewport) |
| **AI quality** | A golden set per pilot subtopic. Rubric scores per prompt version. Regression comparison before activating a new prompt version. Code-execution pass rate. Schema-valid rate. | Eval harness in the worker + admin report |
| **Security** | AuthZ matrix, CSRF/Origin, rate limits, password policy, session fixation, SSRF guard on fetchers, upload limits, dependency audit | Vitest + `pnpm audit` + manual review |
| **Performance** | API p95 under load (lesson fetch, practice list, dashboard), Lighthouse on the student app | k6, Lighthouse CI |
| **Accessibility** | axe checks in E2E, keyboard walkthroughs | @axe-core/playwright |

## 3. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | AI content is wrong or hallucinated | High | High | Structured output, **code execution replaces claimed outputs**, rubric evaluator (cross-model when possible), golden exemplars, mandatory human approval, feedback-driven fix loop |
| R2 | Depth adaptation feels cosmetic | Medium | High | Depth guidance table, slot variants, an evaluator "depth fit" dimension, a side-by-side bracket compare in admin, pilot validation with real students in both brackets |
| R3 | Existing question bank is messy (labels, duplicates, formats) | High | Medium | Staging import, alias mapping UI, AI tag suggestions with admin acceptance, exact and near-duplicate detection, per-row decisions, idempotent re-imports |
| R4 | LLM cost overruns | Medium | Medium | Admin-triggered only, per-job budgets, prompt caching, a cheap model for extraction and tagging, a usage dashboard and alerts |
| R5 | Scraping legal / ToS issues | Medium | High | Admin URLs only, robots.txt, references not copies, no republishing of third-party banks, encrypted credentials only where the terms allow |
| R6 | Student code execution abuse | Low | High | Browser-only Pyodide in a Web Worker (timeout, no network). Server sandbox only later, isolated. |
| R7 | Interactivity vs AI-generation tension (rich widgets are hard to generate) | Medium | High | **Widget registry** (devs build, AI configures) + CODE_EXPLORER with execution-verified states |
| R8 | Integration with the NxtWave portal / Metabase is unknown | Medium | Medium | Deep-link mode works on day one. Solved-status sync behind a connector interface (Metabase API, CSV upload, or webhook) chosen once access is confirmed. |
| R9 | Roadmap estimates don't match reality | Medium | Medium | Content-derived estimates, actual time tracked, calibration factor per subtopic after the pilot |
| R10 | Engagement drop-off | Medium | High | Gen Z UX, short steps, warm-ups, XP and streaks, celebrations, next-best-action, spaced review, feedback every step |
| R11 | Scope creep (manager's vision + spec + competitors) | High | Medium | Strict pilot scope, phase exit criteria, future items parked in Phase 10 |
| R12 | Bus factor / maintainability | Medium | Medium | Docs, typed contracts, tests, conventions, ADRs in docs |
