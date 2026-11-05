# Development Progress Tracker

| Phase | Status | Date |
|---|---|---|
| 0 · Blueprint (docs 01–10, gap analysis vs the manager's prototype and competitors) | ✅ Done | 2026-11-03 |
| 1 · Foundation (monorepo, API, DB, auth, RBAC, both app shells) | ✅ Done | 2026-11-03 |
| 2 · Catalog and onboarding | ✅ Done | 2026-11-03 |
| 3 · Curriculum and planner (dual-path topic page) | ✅ Done | 2026-11-03 |
| 3.1 · Smart planner (prep timeline, paces, week by week, calendar) | ✅ Done | 2026-11-03 |
| 4 · Content engine ⭐ (AI generation + evaluation, lesson player) | 🚧 4A + 4B done (lessons, player, AI agents); 4C pilot lessons next | 2026-11-05 (4B) |
| 5 · Question bank and practice | Planned | – |
| 6 · Research and curriculum agents | Planned | – |
| 7 · Video and system design case studies | Planned | – |
| 8 · Analytics and admin dashboards | Planned | – |
| 9 · Hardening and deployment | Planned | – |

---

## Phase 4B report: AI content agents (2026-11-05)
4B adds the AI side of the content engine: the content team can have a lesson drafted, reviewed and improved by AI, in a short Gen Z style by default, while a person still approves everything before students see it. Real generation needs an API key in the server `.env`. Without one, AI is off (the buttons say so), and a **simulated** provider lets the whole workflow be tried and tested.

### 1. What was implemented
- **"Write with AI"** on any lesson, with a style:
  - **Gen Z bites** (default): punchy, one idea per card, story cards with emoji, ≤ 28 words per card and ≤ 16 per sentence.
  - **Standard**.
  - **Deep dive**.
  - Optional instructions ("use a cricket example", "show pandas").
- **The generation pipeline** (Content Generation agent):
  1. Read the curriculum: each package's depth, objectives, concepts and prerequisites. No student data is used.
  2. **Plan** the lesson (steps, depth layers, objectives), checked structurally. Every depth in use must open with a hook, have something to try, have a check, and end with a summary.
  3. **Write the steps in batches of 5.**
  4. **Run every piece of code** in a sandbox. Real outputs replace whatever the AI claimed. Playground solutions must pass their checks. "Predict the output" questions must mark what the code really prints.
  5. **Save as an "AI draft"** (version status `AI_GENERATED`, origin AI). Every step records its job, prompt version, model and code-check results.
  6. **Queue the AI review.**
- **AI review** (Content Evaluation agent), on its own tab:
  - Computed checks run first: code runs, readability per step against the style's word budgets, and the depth checklist.
  - Then an AI reviewer scores 9 dimensions: correctness, depth per package, objectives, style, code, prerequisites, repetition, made-up claims, interview relevance.
  - It lists issues per step (blocking, major or minor) with a concrete fix.
  - Failed code checks are always blocking. Verdict: ready for human review, needs changes, or blocking issues.
  - It can be re-run on any version, including imported lessons.
- **Rewrite one step with AI** (Section Regeneration agent):
  - From Preview, Edit or an issue in the AI review ("Fix with AI").
  - One-tap presets: ✂️ Shorter · 🧩 Simpler words · ✨ More Gen Z · 🔁 Add an analogy · 📍 Add an example · 🎛️ Make it interactive · 🛠️ Fix review notes. A free-text instruction can be added.
  - Reviewer notes and evaluator findings for that step are passed to the AI.
  - Only that step changes. Its code is re-run, and **Undo** restores the previous version (identical content reuses the original revision).
  - A rewrite is refused if someone edited the step in the meantime.
- **Story cards for students**: a new card layout, `swipe`, with an optional emoji per card.
  - One idea per card, with story-style progress bars and a big emoji.
  - Works with touch or mouse drag, arrow keys and buttons; screen readers announce "Card 2 of 3".
  - Emoji also show on flip and grid cards.
- **Live job tracking** in the lesson workspace:
  - stage and progress ("Writing steps (part 2 of 2)"), cost so far, a log, and a **Stop** button;
  - failures shown with their reason;
  - the new draft opens automatically when it is ready.
- **Admin → AI page**:
  - provider status (Claude, simulated or off; **never the key**);
  - spend today, 7 days and 30 days; spend by task; recent jobs; prices;
  - **which model and effort each task uses**, editable by super admins only and audited.
- **AI gateway** (server only), the single path for every AI call:
  - model route per task, provider call, Zod validation, **one repair attempt** with the exact problems, and a usage record per call (tokens, cost, latency, prompt key@version);
  - a per-job budget (`AI_JOB_BUDGET_USD`, default $5) stops a job as soon as it is exceeded;
  - cancel stops a job at its next checkpoint and aborts the in-flight AI call;
  - refusals and errors are recorded and shown, never retried blindly.
- **Claude adapter** (official `@anthropic-ai/sdk` 1.4.0):
  - Claude Opus 5.5 for every task by default, at effort "high";
  - streaming, structured outputs (JSON Schema from our Zod schemas), prompt caching of the stable instructions and the reference lesson;
  - **server-side refusal fallback enabled** (`fallbacks: "default"`), so a safety false positive retries on another model instead of failing the job.

### 2. Functional and verified end to end
Browser check in headless Edge on an isolated stack (its own database, API, **worker** and apps) with the simulated provider and the real code sandbox. 0 console errors.

| Flow | Result |
|---|---|
| AI page shows "Simulated AI", routes and usage | ✓ |
| RAG fundamentals (no lesson) → Write with AI → Gen Z bites + "Use a cricket example" → live job card → draft opens in Preview | ✓ |
| AI review tab: verdict, 9 scores, issue with "Fix with AI", code checks, readability per step | ✓ |
| Rewrite one step (Shorter + More Gen Z) → "AI rewrote …" banner → Undo restores it | ✓ |
| Submit → approve → publish → student swipes the story cards on desktop and phone | ✓ |

### 3. Decisions
- **Human approval stays mandatory.** AI writes drafts and reviews; it never submits, approves or publishes. The reference lesson I wrote stays "In review" for the content team.
- **AI-friendly schemas, real validation.** Structured outputs can't express open maps or tuples, so the AI fills a generation-friendly shape that is converted and validated by the real lesson schema. Anything invalid gets one repair, with the exact problems listed.
- **Outputs are never trusted from the AI.** Code runs in a sandbox: Pyodide (the same runtime students use) in a separate Node process with **no environment variables**. Node's permission model allows file access only to Pyodide and its package cache. Each snippet has a time limit, and endless loops are killed.
- **Prompts are versioned in code** (`lesson.plan@1`, …). Every revision and usage row records the version, so prompt changes can be compared before they're trusted. An admin prompt editor is deferred.
- **Gen Z, but plain English:** punchy and fun, at most one emoji per card, no slang that English-as-a-second-language learners would need explained, and accuracy never traded away.
- **The simulated provider is never allowed in production** (the environment check refuses it).

### 4. Database and API changes
- Migrations:
  - `20261105051702_ai_agents`: `agent_job`, `agent_job_log`, `ai_usage_record`, `ai_model_route`, `ai_model_pricing`, `content_evaluation`. Partial unique indexes allow **one running generation per lesson** and **one rewrite per step**.
  - `lesson_style`: `module_version.style`.
- Admin API:
  - `/admin/content`: `POST lessons/:id/generate`, `POST versions/:id/evaluate`, `GET versions/:id/evaluation`, `POST versions/:id/sections/:key/rewrite`. Each returns 202 and the job.
  - `/admin/ai`: `GET status`, `PUT routes/:task` (super admin), `GET jobs`, `GET jobs/:id`, `POST jobs/:id/cancel`.
- Worker: queues `ai.lesson.generate`, `ai.lesson.evaluate` and `ai.section.rewrite`, never auto-retried. A finished draft queues its own review.
- Environment: `ANTHROPIC_API_KEY`, `AI_PROVIDER` (auto | anthropic | simulated | off), `AI_JOB_BUDGET_USD`, `PYODIDE_CACHE_DIR`.
- Packages:
  - `@app/content`: styles and readability checks, generation schemas and converters, plan checks, evaluation report, JSON Schema sanitizer, `swipe` layout and card emoji.
  - `@app/contracts`: `ai.ts`.

### 5. Tests and results
`pnpm check` is green: lint, typecheck on all 7 packages, **334 tests** (308 API, 13 content, 10 renderers, 3 contracts), and production builds. No keys, SDK or demo credentials are in the browser bundles.

New tests:
- **6 AI integration tests:**
  - full generation (plan → write → run code → AI draft → review), with provenance and usage records;
  - one-repair success and failure;
  - refusal and budget stops;
  - cancel, no curriculum, and no key;
  - rewrite with stale and duplicate guards, plus undo;
  - AI settings permissions.
- **2 sandbox tests:**
  - reproduces every output of the reference lesson;
  - replaces claimed outputs, catches a wrong answer key, and kills an endless loop.
- **2 schema tests:** the AI schemas use only accepted JSON Schema, and every reference step converts both ways.

### 6. Known issues and notes
- **Real Claude generation has not been run yet:** there is no API key on this machine. Everything is built and tested with the simulated provider. Once a key is in `.env`, the first real lessons should be generated and reviewed (Phase 4C).
- **Cost** at default settings (Opus 5.5, effort high) is estimated at about $1–3 per lesson draft plus review. The job budget stops anything above $5.
- The first code check after a restart takes a few seconds while Python loads, and numpy or pandas download once.
- Prompt templates are edited in code for now (versioned). An admin prompt editor and golden-set comparisons come with Phase 6 tooling.

### 7. Next
- **Add the API key** to `.env` (`ANTHROPIC_API_KEY=…`), then restart the API and worker.
- **4C**: generate the pilot lessons (9 subtopics), review and publish them.
- Or the **question bank import** (no key needed).

---

## Phase 4A report: Lessons, lesson player and content review (2026-11-04)
Phase 4 is split in three. **4A** (this report) delivers everything that does not need an LLM: lesson storage with full history, the admin review and publishing workflow, the shared renderers, the student lesson player with in-browser Python, server-graded checks, progress feeding the roadmap, and feedback on every step. **4B** adds the AI gateway and the generation, evaluation and section-regeneration agents (needs an LLM API key). **4C** generates and reviews the pilot lessons.

### 1. What was implemented
- **Lesson storage with history** (docs/03 §7).
  - One lesson per subtopic, shared by every role and package. Each student sees the depth their target needs.
  - A version is an ordered list of pointers to **immutable section revisions**. Editing one step creates exactly one new revision, and identical content reuses its revision (SHA-256 of the canonical JSON). History, "what changed vs live", rollback and "updated since you finished" all come from this.
  - Status flow: Draft / AI draft → In review → Approved → Published (the previous one becomes Superseded). A reviewer can request changes (back to draft, with notes per step) or reject (archived). At most one published and one working version per lesson, enforced in SQL.
  - Concurrent edits are safe: every save carries the version's edit counter, so two editors can never overwrite each other silently.
  - **Nothing reaches students until a person approves and publishes it.** AI output (4B) will arrive as "AI draft" and go through the same review.
- **Admin → Lessons** (new menu item).
  - Index: every subtopic with the curricula that use it and how deep (e.g. AI 3–6 LPA · Beginner, AI 8–12 LPA · Advanced), status counts, and filters (needs review, not started).
  - Lesson workspace with five tabs:
    - **Preview**: the lesson exactly as a student with a given target and prior knowledge sees it, with the same renderers. Checks grade, code runs, and reviewers can add a note to any step.
    - **Compare packages**: two targets side by side (steps, minutes, objectives), highlighting what only one side gets.
    - **Edit**: a step-by-step JSON editor with live validation and a live preview, a full-document editor (reorder, add, remove), and JSON download. Errors point to the exact field (e.g. `sections.3.body.items.0.answer`).
    - **Checklist & history**: for each depth in use, whether it opens with a hook, has something to try, has a check, ends with a summary, and shows real outputs, plus lesson minutes vs the roadmap budget. Also the review history and all versions.
    - **Student feedback**: average rating, thumbs per step with reasons, and comments. Students are anonymous here.
  - Actions by status: import JSON, submit, approve / request changes / reject, publish (with a change note), unpublish, discard, start a new draft from any version (rollback).
- **Shared lesson renderers** (`packages/learning-ui`), used by the student player and the admin preview:
  - All 12 step kinds: hook (scenario, analogy, where it breaks), explanation blocks, flip / stepper / compare cards, flow diagrams with step-by-step highlights (vertical on phones), code with line annotations, the **code explorer** (flip settings and watch the code, output and verdict change), the **chunker widget**, knowledge checks, the coding playground, callouts, the interview playbook and the summary.
  - Six check types: single and multiple choice, fill in the blank, predict the output, put steps in order, and written answers that the student compares with a model answer before rating themselves.
  - **Python in the browser** (Pyodide v314.0.7, pinned): runs in a Web Worker with a 10-second limit and a fresh namespace per run. "Run it yourself" shows whether the result matches the lesson's verified output. The playground checks the output, offers hints one at a time, keeps the student's draft in their browser, and shows the solution only when asked.
  - Safe rich text: bold, italic, code, http(s) links and glossary chips, rendered as text nodes. HTML in content is rejected on save and never interpreted.
- **Student lesson player** (`/learn/:topic/:subtopic`, full screen, loaded only when opened):
  - One step at a time, with a progress bar, a step outline (a sheet on phones), resume where you left off, and a lesson intro with objectives for your depth.
  - Fast-track: steps the student said they already know are marked "Quick refresher" and can be skipped. They are optional for completion.
  - Continue on a check unlocks once every question has an answer, right or wrong.
  - Completion screen: time, checks right, objectives met, a 5-face rating with tags and "What would make this an 11★ lesson?", the next lesson on the roadmap, and Practice (coming with the question bank).
- **Progress feeds the roadmap.** A finished lesson marks its roadmap item Done, adds to done minutes and stops it being scheduled on re-plans. The topic page shows each lesson's state (Start / Continue x% / Review) and minutes at the student's depth. The Learn tile turns "Ready".
- **Feedback everywhere (the 11★ loop):** thumbs on every step, with reasons on thumbs-down (too fast, hard words, the visual didn't help, something looks wrong, too basic). Each one is tied to the exact revision shown, so a fix can target it. Plus the end-of-lesson rating and a floating Feedback button on every page.
- **Reference lesson** "Chunking strategies" (22 steps, depth-layered: 10 steps for 3–6 LPA, 20 for 8–12 LPA). It is loaded by `pnpm db:bootstrap` and the dev seed **as In review**. It is never published automatically.

### 2. Functional and verified end to end
Browser check in headless Edge on an **isolated stack** (its own database, API on 4100 and apps on 5410/5420), so your local data was not touched. Desktop and phone sizes, 0 console errors.

| Flow | Result |
|---|---|
| Admin opens Lessons → sees 1 waiting for review → previews as 3–6 LPA (checks grade locally) → compares 3–6 (10 steps, 19 min) vs 8–12 (20 steps, 48 min) → checklist → edit is read-only while in review → approves → publishes | ✓ |
| Student (8–12 LPA) opens RAG → Learn tile "Ready" → starts the lesson → runs the fixed-size example in the browser (matches the lesson output) → explores size × overlap (verdict changes; a live run matches the stored output) → answers checks graded by the server → solves the playground (all checks pass) → thumbs-down with a reason on a step → finishes all 20 steps → rates the lesson | ✓ |
| Topic page then shows "Review lesson"; roadmap marks the subtopic Done | ✓ |
| Phone: lesson intro, steps sheet, vertical diagram, topic page | ✓ |
| Admin sees the rating, the flagged step and the comment in Student feedback | ✓ |

### 3. Decisions
- **Lessons are not tied to a package.** One lesson per subtopic with depth-ranked steps and variant slots. Each package sees its own depth, so content written once serves 3–6 and 8–12 differently. Reviewers see both in Compare.
- **Role-specific steps use role slugs** (e.g. `ai-engineer`), so lesson files stay portable between environments.
- **Answers never reach the browser before an attempt.** Students get a stripped copy, and the response schema strips again. Grading only accepts revisions in the student's current published lesson at their depth, so drafts and deeper sections cannot be probed.
- **Access follows the student's own track.** A lesson outside their roadmap looks exactly like one that doesn't exist (404).
- **Learning progress is tracked separately from practice.** Finishing a lesson is not mastery. Checks are reinforcement and every try is kept.
- **Study time is capped** at 30 minutes per save and pauses while the tab is hidden.
- **The admin preview grades in the browser** with the full document (admins can see answers anyway), using the same grading code as the server.

### 4. Database and API changes
- Migration `20261104055121_content_progress`:
  - `learning_module`, `module_version`, `section_revision`, `section_concept`, `module_version_section`, `content_review`, `module_progress`, `knowledge_check_attempt`, `feedback`.
  - Partial unique indexes: one published and one working version per lesson; one thumbs per student per step revision; one rating per student per lesson version.
  - CHECK constraints on depth, minutes, rating, completion consistency and feedback targets.
  - Concepts used by lesson steps can't be deleted (friendly 409). They can still be renamed.
- Admin API, under `/api/v1/admin/content`:
  - `GET lessons`, `GET lessons/:subtopicId`, `GET lessons/:subtopicId/feedback`, `POST lessons/:subtopicId/versions` (import or copy).
  - `GET versions/:id`, `PUT versions/:id/document`, `PUT versions/:id/sections/:key`.
  - `POST versions/:id/submit | review | publish | unpublish | discard`.
- Student API, under `/api/v1/student`:
  - `GET lessons/:topic/:subtopic`, `PUT …/progress`, `POST …/checks`, `POST …/solution`, `POST …/complete`.
  - `POST feedback`.
  - The topic page gains per-subtopic lesson state and learn counts.
- Packages:
  - `@app/content`: canonical form, reviewer checklist (`depthReport`), written answers rated after the model answer.
  - New `@app/learning-ui`.
  - `@app/contracts`: `content.ts`.
- Dev tooling: the Vite proxy target can be overridden (`API_PROXY_TARGET`), used for the isolated browser check.

### 5. Tests and results
`pnpm check` is green:
- lint;
- typecheck on all 7 packages;
- **306 tests** (282 API, 11 content, 10 renderers, 3 contracts);
- production builds, with no demo credentials in the bundles.

New:
- 16 lesson integration tests: import validation with exact paths, one working version, the full review flow, one new revision per edited step, the stale-edit guard, reject / unpublish / discard, concept protection, exemplar loaded once and never published, depth per package, answers never sent, own-track only, server grading and draft probing refused, written-answer flow, progress → completion → roadmap Done → topic page, "updated since you finished", fast-track completion, solution on request, and feedback aggregation.
- 10 renderer unit tests: rich-text safety, the highlighter, the chunker against the lesson's Python output, and the diagram layout.

Fixed along the way: two older admin-login tests had a date bug (a fixed 3 Nov test clock against a real "today"). They now use the test clock.

### 6. Known issues and notes
- **Lesson time vs roadmap budget:** the reference lesson takes about 19 min at 3–6 LPA and 48 min at 8–12 LPA. The planner budgets 40 and 90 min, plus 25% for practice. The checklist flags the gap. Recommendation: let the planner use the published lesson's real minutes once more lessons exist. That would re-plan roadmaps, so it should arrive as a proposal students accept.
- When the SPAs get a Content-Security-Policy (Phase 9), it must allow `cdn.jsdelivr.net` (Pyodide) and `'wasm-unsafe-eval'`.
- The first Run downloads Python (about 10 MB, cached afterwards). The player says so while it loads.
- Not yet built: video steps (Phase 7), question primers (Phase 5), analytics events beyond progress, attempts and feedback (Phase 8).

### 7. Next
- **4B · AI gateway and agents**: provider config (keys only in server env), Content Generation, Evaluation and Section Regeneration agents, prompt versions, cost tracking, and code execution that replaces claimed outputs. **Needs an LLM API key.**
- **Question bank** (planned Phase 5): it does not need an LLM, so it can come before 4B if the key takes time. See the open questions.

---

## Phase 3.1: Smart planner (2026-11-03)
Requested after Phase 3: instead of only saving study time, tell students how long their prep takes, suggest a pace that fits their deadline, and show them the plan.

- **Live prep timeline** in onboarding (time step and review) and on My plan, updating as the student edits.
  - Example: "Your target needs about 15 h 45 min of study across 9 subtopics. At 60 min on Mon–Sat, you finish in 3 weeks, by Fri, 20 Nov."
  - It works before a goal exists, so students see the timeline before they commit.
- **Deadline fit with revision time:**
  - Fits with room: "That leaves 64 days before your deadline for revision and practice."
  - Tight: "You finish right on your deadline. Leave about 2 days for revision and mock interviews."
  - Late: by how many days, with the existing one-tap fixes.
  - The revision buffer is about 15% of the time to the deadline, kept between 2 and 7 days.
- **Suggested paces** (tap to fill the form; nothing saves until the student confirms):
  - With a deadline: **Recommended** (the lightest daily time that still leaves the revision buffer), **Just in time**, or **Study every day** when the chosen days can't make it. When the chosen time already leaves plenty of room, these show as lighter options.
  - Without a deadline: Light / Steady / Intensive (30 / 60 / 90 min) with their finish dates.
- **Week-by-week planner**: Roadmap → *Week by week*. Each week shows its study days and minutes, what you study and what you finish, and highlights "This week". The same weeks appear in onboarding review and My plan.
- **Add to calendar**: an `.ics` download with one event per study day, listing the subtopics and their minutes (RFC 5545, stable event IDs per plan version). Works with Google Calendar, Outlook and Apple Calendar.
- The finish-date card shows the days before (or after) the deadline. The plan save button is now "Save and re-plan", with "Undo changes".
- API:
  - `POST /student/onboarding/plan-preview`
  - `GET /student/roadmap/calendar.ics`
  - `POST /student/roadmap/preview-schedule` now also returns paces, revision days, spare days and weeks.
  - The roadmap response gains `weeks` and `daysToSpare`.
- Planner engine:
  - New: `allocateDays` (minutes per study day), `groupByWeek`, `minDailyMinutes` (search over 5-minute steps) and `suggestPaces`.
  - Fixed a zero-minute weekend entry in the day allocation, found by the new tests.
- Tests: 5 new planner unit tests and 4 integration tests. These cover exact paces for a deadline (25 min recommended, 20 just in time), the onboarding preview, the week plan matching the roadmap dates, and a calendar file with 16 events and ≤ 75-octet lines. Browser checks on desktop and mobile showed 0 console errors.

---

## Phase 3 report: Curriculum and planner (2026-11-03)

### 1. What was implemented
- **Curriculum structure** (shared by every role): topics → subtopics → concepts, with prerequisites between topics and between subtopics.
  - Concepts are the finest skill tag (e.g. `rag.retrieval.rrf`). Lessons (Phase 4) and questions (Phase 5) will link to them.
  - Prerequisite loops are rejected when saving, so the planner can always find an order.
- **Role × package curricula, versioned**: for each target, which subtopics are in, at what depth (1–5), how important, whether optional, the learning objectives, a hands-on expectation, an optional time override and the reasoning behind the depth.
  - Draft → publish, with one live version and at most one draft, both enforced by the database.
  - Every publish keeps history with a change note and is audited.
- **Pilot curriculum v1** (`pnpm db:bootstrap`, insert-only like the catalog): AI Engineer at 3–6 and 8–12 LPA, over **Python & NumPy → Embeddings & Vector Search → RAG**: 3 topics, 9 subtopics, 28 concepts.
  - 3–6 LPA: lighter depths, and advanced retrieval is optional.
  - 8–12 LPA: Advanced depth on the GenAI topics.
  - Marked as a draft for content-team review and Research Agent validation (Phase 6).
- **Planner engine** (pure, unit-tested):
  - Orders subtopics by prerequisites, with stable tie-breaks: topic order, priority, then subtopic order.
  - Estimates time from depth × complexity, plus 25% for practice. Admins can override any estimate.
  - **Fast-tracks** topics the student rated themselves well in (15–30% quicker). The **depth never drops**.
  - Packs the work onto the student's study days at their daily minutes.
  - **Deadline check with explicit options**: study N min a day, add a study day, move the deadline, or leave the optional items for last. Nothing is dropped silently.
- **Roadmaps with immutable versions**: one roadmap per goal.
  - It is created when onboarding finishes. If the target has no published curriculum yet, it waits and is built the moment one is published.
  - Changing your time or self-check re-plans from today as a new version. Saving the same settings again changes nothing.
  - **Re-plan from today** when behind. It is a no-op if the dates would not change.
  - Changing your target gives the new goal its own roadmap; the old one is kept.
  - **When admins publish an update, students get a proposal, never a silent change.** It lists what is new, what is removed, depth changes, time and finish-date changes, and the student accepts or declines.
    - Wording-only edits (objectives, rationale) apply directly, with the same dates.
    - A pending proposal survives a schedule change and is re-made after it.
  - Statuses (Done / In progress / Behind / Up next / Coming up) are derived when the roadmap is read, never stored.
- **Student UI**:
  - **Roadmap** page: a topic journey with status icons, a depth meter, Must-know / Optional / Fast-track badges, dates, minutes, expandable learning objectives, a finish date, total and weekly time, a deadline card with one-tap fixes, a behind-schedule banner with re-plan, and the update banner and dialog.
  - **Topic page with both "Learn the Concept" and "Practice Questions" visible from day one.** Both are marked "Coming soon", and Practice has a working *Notify me*. It also shows a plain-language note on why this depth for your package, plus each subtopic's objectives and concepts.
  - **Home**: an "Up next" card with *Start here*, plus journey progress by topic.
  - **My plan**: a **live preview** before saving ("If you save, you finish on Wed, 11 Nov (3 days earlier). That fits your deadline.").
  - Phones get a bottom tab bar (Home · Roadmap · My plan).
- **Admin UI**:
  - **Curriculum → Role curricula**: a role × package matrix (version, item count, students, draft badge). The editor groups subtopics by topic, with include, depth, priority and optional controls, and expandable objectives, rationale, expectation and time override.
    - Live diff against the published version (New · Removing · Was Advanced).
    - Save draft, discard, and publish with a change note. The publish dialog says how many students will get an update.
    - Version history.
  - **Curriculum → Topics & subtopics**: create and edit topics and subtopics, prerequisite pickers, archive, and concept add/delete.
  - **Students → detail** now shows the student's own roadmap (read-only, the same plan the student sees), flagging when they are behind, will miss the deadline, or have an update waiting.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Onboarding creates the first roadmap in prerequisite order; exact minutes and dates (945 min, ends Thu 19 Nov at 60 min Mon–Sat) | Integration test |
| 3–6 vs 8–12 LPA give different roadmaps (455 vs 945 min; optional/Foundational vs Advanced retrieval) | Integration test |
| Fast-track shortens confident topics without lowering depth | Integration test |
| No curriculum → "almost ready" → admin publishes → first roadmap (not a proposal) | Integration test |
| Schedule preview saves nothing; saving re-plans as v2; an identical save is a no-op; self-check changes re-plan | Integration tests |
| Impossible deadline → exact options (90 min/day, add Sunday, move deadline) | Integration test |
| Time travel 5 days → items "Behind" → re-plan from today → no-op on repeat | Integration test |
| Publish → proposal with named changes → accept / decline; only that target's students; wording-only applies directly; proposal survives a schedule change (v2 active, v3 proposed) | Integration tests |
| Change target → new roadmap, old kept | Integration test |
| Topic page: subtopics, concepts, depth note, Learn + Practice tiles, topic notify-me; 404 outside the student's track | Integration tests |
| Admins can open any student's roadmap; students cannot | Integration test + authorization matrix |
| Taxonomy CRUD, duplicate slugs and keys, prerequisite loops (subtopic, self, topic), draft/discard/publish/history, draft validation, audit | Integration tests (`admin-curriculum.test.ts`) |
| Student Home, Roadmap (collapsed and expanded), Topic and Plan preview on desktop and mobile; admin matrix, editor diff, publish dialog, taxonomy, subtopic dialog, student roadmap | Headless Edge, 0 console errors. The update banner and deadline card were rendered by modifying responses in the browser, so no test data was published to the dev database |

### 3. Decisions
- **Curriculum updates are proposals.** A student's plan only changes when they say so (settings changes and re-plans are their own actions). Wording-only edits apply directly because no dates change.
- **Feasibility is computed live** ("if you keep going from today"), while dates come from the saved version. Students see reality without the plan moving under them.
- Proposals are created inline when publishing. That is a few milliseconds per student, fine for pilot cohorts; it moves to a queue job before scale (Phase 9).
- Learning progress arrives with lessons (Phase 4). Until then nothing can be marked done, so "Behind" appears as dates pass, and re-planning fixes it.
- The pilot depths and objectives are a v1 for the content team to review. Everything is editable in the console without a deploy.

### 4. Database and API changes
- Migration `curriculum_roadmaps`:
  - New tables: `topic`, `topic_prerequisite`, `subtopic`, `subtopic_prerequisite`, `concept`, `role_curriculum`, `role_curriculum_item`, `roadmap`, `roadmap_version`, `roadmap_item`.
  - Partial unique indexes: one published and one draft curriculum per target; one active and one proposed version per roadmap.
  - CHECK constraints on complexity and against self-prerequisites.
- Student API: `/student/roadmap`, `roadmap/preview-schedule`, `roadmap/replan`, `roadmap/proposal/{accept,decline}`, `topics/:slug`.
- Admin API:
  - `/admin/curriculum/{taxonomy, topics, subtopics, concepts}`
  - `/admin/curriculum/curricula`, plus `curricula/target` (overview), `target/draft` (PUT, DELETE) and `target/publish`
  - `/admin/students/:id/roadmap`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 225 tests passed** (13 planner unit, 19 roadmap, 9 curriculum admin, plus everything earlier) **· all apps build.** Production bundles were re-checked: no demo credentials.

### 6. Known issues and notes
- The Learn and Practice tiles are "Coming soon" by design until Phases 4 and 5.
- The dev database has extra test students from browser runs, so the 8–12 LPA cell shows several students.

### 7. Next: Phase 4 · Content engine ⭐
Structured lesson JSON for each subtopic × depth, an AI generation pipeline behind a provider-agnostic gateway, automatic evaluation, admin review and approval, and the explorable lesson player. Learning progress feeds the roadmap statuses. **Needed from you:** an LLM provider API key.

---

## Phase 2.1: Google sign-in and demo accounts (2026-11-03)
- **Continue with Google** for students and admins: Authorization Code flow with PKCE, ID token verified against Google keys (issuer, audience, expiry, nonce), single-use server-side state bound to the browser by a cookie (login-CSRF safe), and open-redirect-safe `next`.
  - Students are created (verified email, respecting the sign-up policy and cohorts) or linked to an existing account by Google id or email.
  - Admins are **never created** by Google: the account must exist, a pending invite is accepted by signing in, and an optional company-domain lock applies.
  - The button is hidden until Google credentials are configured.
  - New tables: `user_identity`, `oauth_login_attempt` (purged daily).
- **Demo accounts for local checks**: a demo super admin and a demo student with a goal (dev seed), shown on the login screens with **Fill demo details** in local development only. Verified that production bundles contain neither the credentials nor local paths.
- **Signup hint follows the sign-up policy** (any email · enrolled email · closed).
- Fixed a build issue found along the way: loading the repo-root `.env` into Vite silently produced development builds. Removed; demo values now live in dev-only `apps/*/.env.development`.
- Tests: 10 new Google sign-in tests (PKCE, linking, CSRF, single use, cancel/failure/unverified, policy, staff-vs-student, open redirect, admin-only, invite acceptance, domain lock). **150 tests passing.**

---

## Phase 2 report: Catalog and onboarding

### 1. What was implemented
- **Catalog (admin-configurable, no deploys)**:
  - Career roles: title, badge code and colour, tagline, description, competencies, interview focus, and skill areas with importance. Availability `LIVE / NEXT_UP / PLANNED / HIDDEN`.
  - Package brackets: LPA range, headline, and plain-language expectations, with a per-bracket **question difficulty mix**.
  - The 5-level **depth scale**, with editable generation guidance.
  - Skill areas and companies.
- **Catalog bootstrap** (`pnpm db:bootstrap`): real initial configuration.
  - AI Engineer is LIVE; ML Engineer is Next up; Data Scientist, Data Analyst and Data Engineer are Planned.
  - 3–6 and 8–12 LPA are LIVE; 6–8 and 12+ are Next up.
  - Also seeds 5 depth levels, 8 skill areas and 25 companies.
  - Idempotent: only inserts what's missing and never overwrites admin edits.
- **Student onboarding**: role → package → self-check → time → review → celebration.
  - Only LIVE options are selectable. Upcoming ones show "Notify me", which is captured as demand.
  - A **draft is saved at every step**, so a refresh resumes where the student left off.
  - Focus moves to each new question for keyboard and screen-reader users.
  - Deadline validation runs in the student's timezone (1 week to 3 years).
- **Goal model**:
  - Exactly one active goal per student, enforced by a **database partial unique index**.
  - Schedule edits.
  - Changing role or package starts a new goal and keeps the old one as history.
  - Skill self-ratings can be updated later.
- **Student UI**: the onboarding flow, a personalized Home (target, weekly hours, deadline countdown, study days, self-check), and **My plan** (change target, edit time, edit self-check).
- **Admin UI**:
  - **Students**: search, role, package, cohort, onboarding and status filters, shareable filter URLs, pagination. A detail view shows the goal, self-check and cohorts, with **suspend** (signed out instantly) and reactivate.
  - **Catalog**: tabbed editors for roles, packages (difficulty-mix sliders), depth levels, skill areas and companies, with usage and demand counts.
  - **Access**: registration policy (super admin), cohorts, and a **bulk enrollment list** of emails or whole domains. Students who sign up through it join the cohort automatically.
  - **Overview**: adds a "Goal set" KPI and students by role and by package.
- **Email moved to the job queue**: the API enqueues, and the worker delivers with retries and backoff. Payloads with links are deleted an hour after delivery. User actions never wait on SMTP: signup went from tens of seconds (SMTP timeout) to **0.26 s**.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Signup → onboarding (all 4 steps + review) → celebration → personalized Home → My plan → change-target dialog | Headless-Edge journey on desktop and mobile, including a **page reload mid-onboarding** that resumes the draft, 0 console errors |
| Only LIVE roles and packages selectable, deadline window, minutes and days validation | Integration tests |
| One active goal per student (the DB rejects a second one) | Integration test |
| Change target keeps history, schedule and skills update | Integration tests |
| Notify-me is idempotent and shown in the catalog | Integration test |
| Admin catalog edits are audited with before/after. Bootstrap is idempotent and preserves edits. | Integration tests |
| Students list filters (role, package, cohort, onboarding, search) and overview breakdowns | Integration tests |
| Suspend → signed out immediately and login refused | Integration test |
| Enrollment list (emails + domains, invalid lines reported, duplicates skipped) → ALLOWLIST policy → auto cohort membership | Integration test |
| Only super admins change the registration policy | Integration test |
| Every new route is protected (authorization matrix auto-covers them) | Matrix test |
| Email is enqueued by the API and delivered by the worker to Mailpit | Unit tests + live run |

### 3. Decisions
- Pilot defaults were applied as configuration, so admins can change them any time.
- Email is delivered through the queue (production-grade, retryable) instead of inline SMTP.
- In dev, `127.0.0.1` is used instead of `localhost`, because on this machine WSL's relay intercepts IPv6 `localhost` on our ports.

### 4. Database and API changes
- Migration `catalog_goals_cohorts`:
  - New tables: `career_role`, `package_bracket`, `depth_level`, `skill_area`, `role_skill_area`, `company`, `bracket_difficulty_policy`, `cohort`, `cohort_member`, `student_goal`, `student_skill_rating`, `interest_signal`.
  - New columns: `student_profile.onboarding_draft`, `enrollment_allowlist.cohort_id`.
  - Constraints: a partial unique index for the active goal, plus CHECK constraints.
- Student API: `/student/{catalog, onboarding, onboarding/complete, goal, goal/schedule, goal/target, skills, interest}`.
- Admin API:
  - `/admin/catalog/{roles, brackets, brackets/:id/difficulty-policy, depth-levels/:rank, skill-areas, companies}`
  - `/admin/students` (list, detail, update)
  - `/admin/access/{cohorts, allowlist, registration}`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 140 tests passed · all apps build.**

### 6. Known issues and notes
- The Home "Your roadmap" card states honestly that the roadmap opens in the next update (Phase 3).
- The dev database contains test students created by the browser runs.

### 7. Next: Phase 3 · Curriculum and planner
Topics, subtopics, concepts and prerequisites. The role × package curriculum editor with publish and versions. The planner engine (ordering, packing, feasibility) and roadmap versions and proposals. The roadmap UI and the **topic page with both Learn and Practice tiles**. The pilot curriculum seed.

---

## Phase 1 report: Foundation

### 1. What was implemented
- **Monorepo** (pnpm workspaces): `apps/api`, `apps/student`, `apps/admin`, `packages/contracts`, `packages/ui`. Biome lint and format, strict TypeScript, and a single `pnpm check` quality gate.
- **Infrastructure**: Docker Compose with Postgres 17 and Mailpit. Env validated with Zod at startup. In production, config comes only from real environment variables.
- **API** (Fastify 5): structured JSON logs (pino, secrets redacted), request IDs, the documented error envelope, Helmet security headers, global and per-route rate limits, a CSRF origin guard (the admin namespace accepts only the admin origin), OpenAPI docs (non-production), and health/readiness endpoints.
- **Identity**:
  - Student signup, login, logout and a session probe.
  - Email verification (resend invalidates older links).
  - Forgot and reset password (no account enumeration; signs out every session).
  - Change password (keeps only the current session) and profile edit (name, timezone).
  - Admin login, logout and session, invite-only admin onboarding, and a super-admin invite API and UI.
  - A CLI to create the first admin, and a dev seed.
- **Security model**:
  - Argon2id hashing (OWASP parameters).
  - Opaque random session tokens, stored hashed. HttpOnly, SameSite=Lax cookies, separate per audience (`nwp_sid` on `/api/v1`, `nwp_asid` on `/api/v1/admin`).
  - Student sessions slide for 30 days. Admin sessions last 12 hours absolute with a 2-hour idle timeout.
  - Guards run at `onRequest`, so unauthenticated calls are refused before body parsing.
  - Registration policy: `OPEN` / `ALLOWLIST` (enrolled emails or domains) / `INVITE_ONLY`.
  - Audit log for admin logins, failed admin logins, invites, password resets and changes, and registrations.
- **Worker** (pg-boss): runs as its own process, with a daily scheduled job that purges dead sessions and tokens.
- **Student app**:
  - Signup, login, forgot, reset and verify-email screens in the prototype's split layout.
  - Signed-in shell, Home (verification banner with resend), and Profile & security.
  - Client-side validation uses the same Zod contracts as the server.
  - A global 401 handler returns the student to sign-in when the session ends.
- **Admin app**: a separate build and origin, with login, accept-invite, forgot and reset screens, a sidebar shell, an Overview with live KPIs, and an Admins page (list plus invite with a copyable link).
- **Design system**: NxtWave-blue tokens (light and dark), Geist and JetBrains Mono (self-hosted), and shared components: Button, TextField with show/hide password, Alert, Card, Logo, PasswordMeter. Reduced-motion support.

### 2. Functional and verified end to end
| Flow | Verified by |
|---|---|
| Signup → session cookie → verification email (Mailpit) → verify → verified | Integration tests, and a live run through the Vite proxy and Mailpit |
| Login (generic errors), logout revokes the server session (cookie replay fails) | Integration tests |
| Forgot → reset → all sessions revoked → old password fails, new works, link single-use | Integration tests |
| Change password keeps only the current device | Integration tests |
| ALLOWLIST and INVITE_ONLY registration policies | Integration tests |
| Admin login, invite → accept → admin session. A regular admin can't manage admins. | Integration tests, and live via the admin proxy |
| Session expiry (student sliding 30 days; admin 2h idle / 12h absolute) | Tests with an injected clock |
| **Authorization matrix**: every non-public route refuses anonymous callers and wrong-audience sessions. New routes are covered automatically. | Test auto-enumerates routes. A mutation test (guard removed) made it fail as expected. |
| CSRF origin guard, rate limiting (11th login attempt → 429), security headers | Tests and a live production-bundle smoke test |
| Production bundle boots, connects to the DB, hides API docs | `node dist/main.js` smoke test |
| UI renders correctly (desktop 1440 px and mobile 390 px, light and dark) with no unexpected console errors | Headless Edge screenshots of every screen |

### 3. Important architectural decisions
- **TypeScript end to end**, so Zod contracts are shared by the API validation, the frontend forms, and (from Phase 4) the LLM structured outputs.
- **In-house session auth** instead of JWTs or a SaaS provider: instant revocation, audience separation, no per-student cost.
- **Two separate SPAs**: the admin code is never shipped to students.
- **Postgres-backed queue (pg-boss)**: no Redis needed yet.
- **Pinned mature versions**: TypeScript 5.9 (not 7), Prisma 7.10 (not the 8 RC), React Router 7. Very new releases are avoided because pnpm's minimum release age is enforced and not bypassed.

### 4. Database and API changes
- Migration `init_identity`: `app_user`, `student_profile`, `admin_profile`, `session`, `auth_token`, `enrollment_allowlist`, `audit_log`, `platform_setting`.
- Endpoints:
  - `/api/health`, `/api/ready`
  - `/api/v1/auth/{session,register,login,logout,me,verify-email,resend-verification,forgot-password,reset-password,change-password}`
  - `/api/v1/student/profile` (GET, PATCH)
  - `/api/v1/admin/auth/{session,login,logout,me,forgot-password,reset-password,accept-invite}`
  - `/api/v1/admin/{overview,admins,admins/invites}`

### 5. Tests and results
`pnpm check` → **lint clean · typecheck clean · 52 tests passed** (49 API integration and unit tests against real Postgres, 3 contract tests) **· all 3 apps build.**

### 6. Known issues and notes
- Dev ports: Postgres uses **45432** (first 56432, moved on 2026-11-04 after Windows reserved 56374–56473; ports below 49152 stay outside those dynamic reservations). This machine also runs a native PostgreSQL on 5433. The apps use **5310/5320** because 5173 was taken by another local app.
- Per-email login throttling is IP-based only for now (per-account lockout comes with Redis-backed rate limits at scale).
- The JS bundle is about 145 KB gzipped per app. Route-level code splitting arrives with the larger Phase 2–4 screens.
- Email uses Mailpit in development. A production SMTP or SES provider still needs choosing.

### 7. Remaining (carried to later phases)
Cohorts and allowlist management UI (Phase 2), Playwright E2E suite (Phase 9), deployment pipeline (Phase 9).

### 8. Next phase: Phase 2 · Catalog and onboarding
Roles and brackets (`LIVE / NEXT_UP / PLANNED / HIDDEN`), depth levels, skill areas, companies, cohorts and allowlist (admin CRUD). Student onboarding (role → package → self-check → time). Goal storage, "Notify me" interest, and the personalized dashboard shell.

### Open questions for the product owner
1. **LLM provider access**: which API keys can we use (Anthropic / OpenAI / Gemini / Azure)? Needed by Phase 4.
2. **Question bank**: please share the existing ~1,000-question file (or a sample), and **confirm its source and licence**. Several prototype question slugs match public StrataScratch titles. The bank is in a Google Sheet (asked 2026-11-04). The importer will take a sheet link shared as "Anyone with the link can view", or a CSV/XLSX download, with a column-mapping step. Please share the header row and 5–10 sample rows.
3. **Pilot brackets** (proposed: 3–6 LPA and 8–12 LPA) and **pilot topics** (proposed: Python & NumPy → Embeddings & Vector Search → RAG).
4. **Registration**: open sign-up, or enrolled-only (`ALLOWLIST`) as in the prototype?
5. **Brand**: final product name and logo (tokens are ready to re-theme).
6. **NxtWave Learning Portal**: do we get API or Metabase access for solved-status sync?
