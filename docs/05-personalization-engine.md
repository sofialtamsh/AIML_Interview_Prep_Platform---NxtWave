# 05 · Personalization Engine

The deterministic core of the product: given a student, decide **what** to learn, **how deep**, **in what order**, **by when**, and **which questions** to practice. Every engine here is a **pure function** (no I/O) in `*.engine.ts`, unit-tested with fixtures. Services load data, call the engine and persist the result.

```
          ┌────────── inputs ──────────┐
 Student ─┤ goal: role, bracket,       │
          │ daily minutes, weekdays,   │        ┌─────────────────────────┐
          │ start, deadline            │──────► │ 1. Curriculum selection │── items (subtopic, priority, target depth, objectives)
          │ skill self-ratings         │        └─────────────────────────┘
          │ progress & performance     │        ┌─────────────────────────┐
          └────────────────────────────┘──────► │ 2. Depth resolution     │── per-subtopic lesson: sections at the right depth, fast-track flags
 Admin-published curriculum + content ────────► └─────────────────────────┘
                                                ┌─────────────────────────┐
                                        ──────► │ 3. Planner              │── ordered, dated roadmap version + feasibility
                                                └─────────────────────────┘
                                                ┌─────────────────────────┐
 Question bank (multi-tagged) ────────────────► │ 4. Practice retrieval   │── ranked question list per topic/subtopic/concept
                                                └─────────────────────────┘
                                                ┌─────────────────────────┐
 Attempts, checks, feedback ──────────────────► │ 5. Mastery & revisit    │── weak concepts, revisit links, spaced review, next best action
                                                └─────────────────────────┘
```

---

## 0. The taxonomy that connects everything

```
Skill area ─┐
            └─ Topic (major) ─ Subtopic ─ Concept
                                  │           │
         Learning module ─────────┘           ├── tagged on lesson sections
         (one per subtopic)                   ├── tagged on questions ("conceptsTested")
                                              └── tracked in mastery
```

**Concept** is the finest-grained, reusable skill tag, e.g. `pandas.merge.join-type`, `rag.chunking.size-tradeoff`, `retrieval.hybrid.rrf`. It is the glue that makes Learn ↔ Practice precise:
- "**Learn the idea first**" on a question opens exactly the lesson sections that teach that question's concepts (a *question primer*).
- "Struggling with chunking questions?" links to the **exact section**, not just the lesson.
- Mastery is tracked per concept, so weak spots are specific.

Concepts are created by admins or proposed by the Curriculum Agent. Question imports map labels onto concepts via `taxonomy_alias`.

---

## 1. Depth model

### 1.1 Depth levels (configurable table, default five)

| Rank | Level | What actually changes at this depth (generation guidance) |
|---|---|---|
| 1 | **Foundational** | Intuition, analogy, "why it exists", vocabulary. No math, no code beyond one-liners. |
| 2 | **Beginner** | Core mechanism step by step, simple working code, the standard happy path, common terms defined |
| 3 | **Intermediate** | Alternatives and when to use each, parameters that matter, debugging, typical pitfalls, a realistic implementation |
| 4 | **Advanced** | Internals and math where they inform decisions, evaluation and metrics, optimization, architectural trade-offs, failure modes |
| 5 | **Expert** | Production scale: latency, cost and reliability budgets, multi-stage systems, research-level variants, designing under constraints, system-design interview depth |

> Depth is **not** "harder vocabulary". Each step adds *mechanism, alternatives, measurement and trade-offs*. The Evaluation Agent checks this explicitly.

### 1.2 Where target depth comes from
`role_curriculum_item.target_depth_rank` is set **per role × bracket × subtopic** by admins, optionally proposed by the Research and Curriculum agents from evidence. Example for AI Engineer:

| Subtopic | 3–6 LPA | 8–12 LPA | Why they differ (or don't) |
|---|---|---|---|
| NumPy arrays and vectorization | Intermediate | Intermediate | A tool skill: expected equally, it isn't a differentiator |
| Similarity measures | Beginner | Advanced | 8–12 interviews probe the cosine vs dot product choice and normalization effects |
| Chunking strategies | Beginner | Advanced | 8–12 expects choosing a strategy per document type and evaluating it |
| Hybrid search, reranking and evaluation | *excluded / optional* | Advanced | Mostly asked at higher bands |

This is what "don't assume a higher package means everything is harder" means in data.

### 1.3 Lesson resolution (per student, per subtopic)

Inputs: the module's **published** version (ordered sections), the student's target depth `D` for the subtopic, role `R`, prior-knowledge level `K` for the subtopic's skill area (0 = new … 3 = confident).

```ts
function resolveLesson(sections, D, R, K): ResolvedSection[] {
  // 1. Role scope: drop sections scoped to other roles
  let s = sections.filter(x => x.roleScope.length === 0 || x.roleScope.includes(R));

  // 2. Depth filter
  //    - additive sections (no slot): include if depthRank <= D
  //    - slot variants (same slotKey, different depthRank): pick the single deepest variant <= D
  const additive = s.filter(x => !x.slotKey && x.depthRank <= D);
  const slots = groupBy(s.filter(x => x.slotKey), x => x.slotKey)
      .map(group => maxBy(group.filter(x => x.depthRank <= D), x => x.depthRank))
      .filter(Boolean);
  s = keepOriginalOrder([...additive, ...slots]);

  // 3. Prior knowledge → fast-track (never removes content, never lowers D)
  //    confident (K=3): sections with depthRank <= D-2 become collapsed refreshers
  //    comfortable (K=2): sections with depthRank <= 1 (foundational) become collapsed refreshers
  //    Hooks, knowledge checks and summaries are never fast-tracked.
  return s.map(x => ({ ...x, fastTrack: isFastTrack(x, D, K) }));
}
```

- **Additive sections** reuse foundational material across brackets. **Slot variants** replace one section with a deeper version (e.g. `code.simple-rag` @ Beginner vs `code.production-rag` @ Advanced). So content is never duplicated per bracket.
- The resolved lesson is cacheable by `(moduleVersionId, D, R, fastTrackMode)`.
- **Answers are stripped** from knowledge-check bodies before they reach the client. Grading happens on the server.

### 1.4 Lesson time estimate
`minutes = Σ section.estimatedMinutes × (fastTrack ? 0.3 : 1)`. Section estimates come from the content itself: words ÷ 180 wpm + per-activity defaults (card deck 30 s per card, check 45 s per item, code run 2 min, video length) + diagram steps × 20 s. If no published module exists yet, the curriculum estimate per depth is used (default table: 25 / 40 / 60 / 90 / 120 min for ranks 1–5 × subtopic complexity factor 0.8–1.4).

---

## 2. Curriculum selection

```ts
function selectItems(curriculum: RoleCurriculum /* published for role × bracket */, completed: Set<SubtopicId>) {
  return curriculum.items
    .filter(i => i.included)
    .map(i => ({ ...i, done: completed.has(i.subtopicId) }));
}
```
- Optional (`is_optional`) items are included by default but are the first candidates to defer if time is short (the student decides).
- Progress is keyed by **subtopic**, not by roadmap version, so it carries over when the curriculum or plan changes.

---

## 3. Planner (roadmap scheduling)

### 3.1 Inputs
`items` (with estimates), prerequisite DAG (subtopic and topic edges), `dailyMinutes`, `studyWeekdays`, `startDate` (or today for replans), optional `deadline`, completed subtopics, and a practice allowance (setting, default +25% of lesson time per subtopic, because Practice is part of preparing).

### 3.2 Algorithm
1. **Order**: topological sort of subtopics using subtopic prerequisites plus topic prerequisites (topic A → B expands to "all of B's included subtopics before any of A's"). Ties are broken by topic sequence, then priority (HIGH > MEDIUM > LOW), then subtopic `sort_order`. Cycles are rejected when the curriculum is published, so the planner can assume a DAG.
2. **Size**: `itemMinutes = ceil5(lessonMinutes + practiceAllowance)`.
3. **Pack** day by day: walk the calendar from the start date, only on study weekdays, filling `dailyMinutes` capacity. Items may span days. Record `plannedStart` and `plannedEnd`. Completed items are not scheduled.
4. **Totals**: total minutes, study days, calendar days, planned end date, daily and weekly targets, per-topic rollup (first start → last end).
5. **Feasibility** (if a deadline is set): if `plannedEnd > deadline` the plan is *infeasible* and the engine returns **options**, never a silent fix:
   - `increaseDaily`: minimum daily minutes that meet the deadline, `ceil(remaining / studyDaysUntilDeadline)`, capped at a sane maximum (e.g. 360)
   - `extendDeadline`: the computed end date
   - `deferOptional`: minutes saved by deferring optional and LOW-priority items, and whether that alone fits
   - `addStudyDays`: the effect of adding one more weekday

### 3.3 Derived item status (computed at read time)
| Status | Rule |
|---|---|
| `DONE` | Module progress is COMPLETED |
| `IN_PROGRESS` | Started, not completed, `plannedEnd ≥ today` |
| `DELAYED` | Not completed and `plannedEnd < today` |
| `UP_NEXT` | First not-started item in sequence |
| `UPCOMING` | Everything else |

Overall completion = done minutes ÷ total minutes (weighted, so a 2-hour lesson counts more than a 20-minute one).

### 3.4 Versioning: never change the plan silently
| Trigger | Behaviour |
|---|---|
| Student finishes onboarding | Version 1, `ACTIVE`, trigger `INITIAL` |
| Student edits time, days or deadline | Preview the diff → confirm → new `ACTIVE` version (`SETTINGS_CHANGE`). Previous version becomes `SUPERSEDED`. |
| Student falls behind and taps "Replan from today" | New `ACTIVE` version (`REPLAN`) |
| Admin publishes a new curriculum version for the student's role × bracket | A new **`PROPOSED`** version with a change summary (added, removed, depth changed, ±minutes). The student sees "Your roadmap has an update", reviews it, and **accepts** or **keeps the current plan**. |
| Student changes role or bracket | New goal and roadmap. The old one is archived (history kept). Progress on shared subtopics carries over. |

Each `change_summary` is structured (`added[]`, `removed[]`, `depthChanged[]`, `minutesDelta`, `endDateDelta`) so the UI can explain it in plain words.

---

## 4. Practice retrieval

### 4.1 Eligibility (SQL filters, no semantic search needed)
For the student's role `R`, bracket `B` and scope (topic `T`, optionally subtopic `S` and concept `C`):

```sql
SELECT q.* FROM question q
WHERE q.status = 'PUBLISHED'
  AND EXISTS (SELECT 1 FROM question_subtopic qs WHERE qs.question_id = q.id AND qs.subtopic_id = :S)  -- or topic/concept scope
  AND (NOT EXISTS (SELECT 1 FROM question_role qr WHERE qr.question_id = q.id)                       -- unscoped = all roles
       OR EXISTS (SELECT 1 FROM question_role qr WHERE qr.question_id = q.id AND qr.role_id = :R))
  AND (EXISTS (SELECT 1 FROM question_bracket qb WHERE qb.question_id = q.id AND qb.bracket_id = :B)
       OR (NOT EXISTS (SELECT 1 FROM question_bracket qb WHERE qb.question_id = q.id)
           AND q.difficulty = ANY(:difficultiesWithPositiveWeightFor_B)))
  AND q.difficulty = ANY(:requestedDifficulties)   -- student filter, default = all allowed for B
```

### 4.2 Ranking (the default "Recommended" order)
Score per question (higher first):
1. **Not yet attempted** (+3), or attempted and **wrong last time** (+2, it should come back)
2. **Difficulty fit**: the bracket's policy weight for that difficulty (0–1)
3. **Concept need**: +1 if it tests a concept the student is weak on, or has just learned (practice right after learning)
4. **Company relevance**: +0.5 if tagged with a company the student marked as a target (later)
5. Stable pseudo-random tiebreak `hash(studentId, questionId)`, so lists vary between students but stay stable for one student

Other sorts: difficulty, newest, most attempted, company. Filters: difficulty, type, company, status (new / attempted / solved / wrong), "asked at" company.

### 4.3 Default bracket difficulty policy (admin-editable)
| Bracket | Easy | Medium | Hard | Expert |
|---|---:|---:|---:|---:|
| 3–6 LPA | 50 | 45 | 5 | 0 |
| 6–8 LPA | 30 | 50 | 20 | 0 |
| 8–12 LPA | 10 | 45 | 40 | 5 |
| Above 12 LPA | 0 | 20 | 50 | 30 |

---

## 5. Mastery, revisit and next best action

Learning progress and practice performance are **tracked separately and shown separately**. Neither is treated as proof of mastery on its own.

| Signal | Source | Use |
|---|---|---|
| Lesson coverage | Sections completed per concept | "Learned" ≠ "mastered" |
| Check accuracy | Knowledge-check attempts per concept | Early warning |
| Practice accuracy | Question attempts per concept, weighted by difficulty, recency-decayed (half-life 14 days) | Main mastery estimate |
| Self-assessment | Model-answer self-ratings | Weak signal (counted at 50%) |

**Concept mastery score** (0–1) = recency-weighted, difficulty-weighted accuracy, shrunk toward 0.5 when there are fewer than 4 attempts (so 1/1 doesn't read as "mastered").

**Revisit rule:** a concept with mastery < 0.6 after ≥ 3 attempts → "Revisit: *{section title}*" linking to the exact lesson section(s) tagged with that concept, plus 2–3 fresh questions on it.

**Spaced review (P2):** solved questions and completed lessons resurface for quick review at increasing intervals (1, 3, 7, 21 days) as 1-minute "takeaway refreshers" or one practice question. This is "old topics come back before you forget them" (manager's 8★).

**Next best action** (Home "Continue" button), first match wins:
1. Resume an in-progress lesson
2. A due spaced-review item (if ≤ 5 minutes)
3. A revisit recommendation for a weak concept
4. The next `UP_NEXT` roadmap item
5. Practice on the most recently completed subtopic

---

## 6. XP, levels and streaks: derived, never trusted from the client

| Event (server-recorded) | XP |
|---|---:|
| Lesson section completed | 10 |
| Knowledge check correct first try / later | 20 / 5 |
| Lesson completed | 50 |
| Practice question solved (auto-graded correct or external portal solve) | 100 (×1.25 Hard, ×1.5 Expert) |
| Case study step completed | 15 |
| Useful feedback submitted | 5 |

- XP is **computed from progress tables** (like the prototype), so it always matches what the student actually did and can't drift or be forged.
- Levels every 250 XP: *Starter → Explorer → Solver → Pattern finder → Problem cracker → Pro* (names configurable).
- **Streak** = consecutive days (in the student's timezone) with at least one *meaningful* action (a section, check or attempt, not just opening the app).
- Kept humane: no punishing loss messaging. Streak freezes and weekly goals come later. Leaderboards are cohort-scoped and opt-in later.
