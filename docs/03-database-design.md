# 03 · Database Design

PostgreSQL 17, managed with Prisma 7 migrations. The source of truth is `apps/api/prisma/schema.prisma`. This document explains the *why* and the shape. Tables are added phase by phase (marked **[P1]**, **[P2]**, …).

## 1. Conventions

| Rule | Detail |
|---|---|
| Primary keys | `uuid` v7 (`@default(uuid(7))`). Time-ordered, so B-tree friendly, and not guessable. Exception: high-volume append-only logs use `bigint` identity. |
| Naming | Prisma models in `PascalCase`, tables and columns in `snake_case` via `@@map` / `@map` |
| Timestamps | `created_at`, `updated_at` on every mutable table. `timestamptz` everywhere. |
| Audit fields | `created_by_id` / `updated_by_id` on admin-managed tables. Full before/after in `audit_log`. |
| Deletes | Soft: `status = ARCHIVED` or `deleted_at`. Hard deletes only for sessions and tokens. |
| Enums | Postgres enums for stable sets (statuses, user role). **Tables** for anything admins configure (roles, brackets, depth levels). |
| JSON | `jsonb` only for *document-shaped* data validated by Zod: section bodies, question options, job I/O, change summaries. Anything we filter or join on is a real column. |
| Multi-tagging | Explicit join tables with composite PKs and reverse indexes. Never comma-separated tags or polymorphic tag tables (keeps FK integrity). |

## 2. Domain overview

```mermaid
flowchart LR
  ID[Identity] --> GOAL[Goals & Roadmap]
  CAT[Catalog] --> CUR[Curriculum]
  CAT --> GOAL
  CUR --> GOAL
  CUR --> CON[Content]
  CUR --> QB[Questions]
  CON --> LRN[Learning progress]
  QB --> PRC[Practice]
  ID --> LRN
  ID --> PRC
  AG[Agents & AI] --> CON
  AG --> CUR
  AG --> QB
```

The **curriculum taxonomy** (Topic → Subtopic) is the spine. Content modules, questions, roadmap items, progress and analytics all hang off `subtopic_id`. That shared metadata is what connects *Learn* and *Practice*.

---

## 3. Identity [P1]

```mermaid
erDiagram
  USER ||--o| STUDENT_PROFILE : has
  USER ||--o| ADMIN_PROFILE : has
  USER ||--o{ SESSION : has
  USER ||--o{ AUTH_TOKEN : has
  USER ||--o{ AUDIT_LOG : "acts in"
  USER {
    uuid id PK
    text email UK "lower-cased"
    text password_hash
    enum role "STUDENT|ADMIN|SUPER_ADMIN"
    enum status "ACTIVE|SUSPENDED|DELETED"
    timestamptz email_verified_at
    timestamptz last_login_at
  }
  STUDENT_PROFILE {
    uuid user_id PK,FK
    text full_name
    text timezone
    int onboarding_step
    timestamptz onboarding_completed_at
  }
  ADMIN_PROFILE {
    uuid user_id PK,FK
    text full_name
    uuid invited_by_id FK
  }
  SESSION {
    text id PK "sha256(token)"
    uuid user_id FK
    enum audience "STUDENT|ADMIN"
    timestamptz expires_at
    timestamptz idle_expires_at
    timestamptz last_seen_at
    timestamptz revoked_at
    text ip
    text user_agent
  }
  AUTH_TOKEN {
    uuid id PK
    uuid user_id FK
    enum type "EMAIL_VERIFICATION|PASSWORD_RESET|ADMIN_INVITE"
    text token_hash UK
    timestamptz expires_at
    timestamptz used_at
  }
  AUDIT_LOG {
    bigint id PK
    uuid actor_id FK
    text action
    text entity_type
    text entity_id
    jsonb before
    jsonb after
    text ip
  }
```

## 4. Catalog [P2]

```mermaid
erDiagram
  CAREER_ROLE ||--o{ ROLE_SKILL_AREA : weights
  SKILL_AREA ||--o{ ROLE_SKILL_AREA : in
  PACKAGE_BRACKET ||--o{ BRACKET_DIFFICULTY_POLICY : defines
  CAREER_ROLE {
    uuid id PK
    text slug UK
    text title
    text tagline
    text description
    jsonb competencies "string[]"
    jsonb interview_focus "string[]"
    text icon_key
    enum availability "LIVE|COMING_SOON|HIDDEN"
    int sort_order
  }
  PACKAGE_BRACKET {
    uuid id PK
    text code UK "e.g. LPA_8_12"
    text label "8–12 LPA"
    numeric min_lpa
    numeric max_lpa "null = open-ended"
    text expectations "plain-language summary"
    enum availability
    int sort_order
  }
  DEPTH_LEVEL {
    int rank PK "1..5"
    text code UK "FOUNDATIONAL..EXPERT"
    text name
    text description
    text generation_guidance "what changes at this depth"
  }
  SKILL_AREA {
    uuid id PK
    text slug UK
    text name
    text description
  }
  BRACKET_DIFFICULTY_POLICY {
    uuid bracket_id PK,FK
    enum difficulty PK "EASY|MEDIUM|HARD|EXPERT"
    int weight "0..100"
  }
  PLATFORM_SETTING {
    text key PK
    jsonb value
  }
```

## 5. Curriculum [P3]

```mermaid
erDiagram
  SKILL_AREA ||--o{ TOPIC : groups
  TOPIC ||--o{ SUBTOPIC : contains
  TOPIC ||--o{ TOPIC_PREREQUISITE : requires
  SUBTOPIC ||--o{ SUBTOPIC_PREREQUISITE : requires
  CAREER_ROLE ||--o{ ROLE_CURRICULUM : has
  PACKAGE_BRACKET ||--o{ ROLE_CURRICULUM : has
  ROLE_CURRICULUM ||--o{ ROLE_CURRICULUM_ITEM : lists
  SUBTOPIC ||--o{ ROLE_CURRICULUM_ITEM : "included as"
  DEPTH_LEVEL ||--o{ ROLE_CURRICULUM_ITEM : "target depth"
  TOPIC ||--o{ TAXONOMY_ALIAS : "known as"
  SUBTOPIC ||--o{ TAXONOMY_ALIAS : "known as"
  TOPIC {
    uuid id PK
    text slug UK
    text title
    text summary
    uuid skill_area_id FK
    enum status "DRAFT|ACTIVE|ARCHIVED"
  }
  SUBTOPIC {
    uuid id PK
    uuid topic_id FK
    text slug "UK(topic_id, slug)"
    text title
    text summary
    int sort_order
    int complexity "1..5"
    enum status
  }
  ROLE_CURRICULUM {
    uuid id PK
    uuid role_id FK
    uuid bracket_id FK
    int version "UK(role, bracket, version)"
    enum status "DRAFT|PUBLISHED|SUPERSEDED"
    text change_note
    timestamptz published_at
  }
  ROLE_CURRICULUM_ITEM {
    uuid id PK
    uuid role_curriculum_id FK
    uuid subtopic_id FK "UK(curriculum, subtopic)"
    enum priority "HIGH|MEDIUM|LOW"
    int target_depth_rank FK
    bool is_optional
    jsonb learning_objectives "string[]"
    text implementation_expectation
    int estimate_minutes_override
    text rationale
    enum origin "ADMIN|AI_PROPOSAL"
  }
```

- **Topics and subtopics are global** and shared across roles. Role and bracket specificity lives in `role_curriculum_item`. This is how "Python" serves both AI Engineers and Data Analysts at different depths without duplication.
- **One published curriculum per role × bracket**, enforced by a partial unique index (`WHERE status = 'PUBLISHED'`). Publishing a new version marks the previous one `SUPERSEDED` and triggers roadmap *proposals*.
- **Prerequisite graph** (`topic_prerequisite`, `subtopic_prerequisite`) is validated acyclic on every write.
- `taxonomy_alias` maps external labels (from datasets, research, job descriptions) to subtopics and topics. It is used by the question importer and research agents.

## 6. Goals and roadmap [P2/P3]

```mermaid
erDiagram
  USER ||--o{ STUDENT_GOAL : sets
  STUDENT_GOAL ||--|| ROADMAP : drives
  ROADMAP ||--o{ ROADMAP_VERSION : versions
  ROADMAP_VERSION ||--o{ ROADMAP_ITEM : schedules
  ROLE_CURRICULUM ||--o{ ROADMAP_VERSION : "computed from"
  USER ||--o{ STUDENT_SKILL_RATING : rates
  STUDENT_GOAL {
    uuid id PK
    uuid student_id FK
    uuid role_id FK
    uuid bracket_id FK
    int daily_minutes
    int[] study_weekdays "0=Sun..6"
    date start_date
    date deadline "nullable"
    bool is_active "one active per student"
  }
  STUDENT_SKILL_RATING {
    uuid student_id PK
    uuid skill_area_id PK
    int level "0 new · 1 basics · 2 comfortable · 3 confident"
  }
  ROADMAP_VERSION {
    uuid id PK
    uuid roadmap_id FK
    int version_number
    enum status "PROPOSED|ACTIVE|SUPERSEDED|DECLINED"
    enum trigger "INITIAL|SETTINGS_CHANGE|CURRICULUM_UPDATE|REPLAN"
    uuid role_curriculum_id FK
    jsonb inputs_snapshot
    jsonb change_summary
    int total_minutes
    date planned_end_date
    bool deadline_feasible
  }
  ROADMAP_ITEM {
    uuid id PK
    uuid roadmap_version_id FK
    uuid subtopic_id FK
    int sequence
    int target_depth_rank
    enum priority
    bool is_optional
    bool fast_track
    int estimated_minutes
    date planned_start
    date planned_end
  }
```

Item *status* (done / in progress / upcoming / delayed) is **derived at read time** from progress and dates, never stored, so it can't go stale.

## 7. Content [P4]

```mermaid
erDiagram
  SUBTOPIC ||--|| LEARNING_MODULE : "has one"
  LEARNING_MODULE ||--o{ MODULE_VERSION : versions
  LEARNING_MODULE ||--o{ SECTION_REVISION : "section history"
  MODULE_VERSION ||--o{ MODULE_VERSION_SECTION : composes
  SECTION_REVISION ||--o{ MODULE_VERSION_SECTION : "used by"
  MODULE_VERSION ||--o{ CONTENT_REVIEW : reviewed
  MODULE_VERSION ||--o{ CONTENT_EVALUATION : evaluated
  SECTION_REVISION ||--o| VIDEO_ASSET : "video for"
  LEARNING_MODULE {
    uuid id PK
    uuid subtopic_id FK,UK
    uuid published_version_id FK
  }
  MODULE_VERSION {
    uuid id PK
    uuid module_id FK
    int version_number
    enum status "DRAFT|AI_GENERATED|UNDER_REVIEW|APPROVED|PUBLISHED|ARCHIVED"
    uuid based_on_version_id FK
    uuid generation_job_id FK
    text change_note
    timestamptz published_at
  }
  SECTION_REVISION {
    uuid id PK "immutable"
    uuid module_id FK
    text section_key "stable across versions"
    enum kind "HOOK|EXPLANATION|CARD_DECK|DIAGRAM|CODE_EXAMPLE|PLAYGROUND|KNOWLEDGE_CHECK|VIDEO|CALLOUT|SUMMARY"
    text title
    int depth_rank "min depth that sees it"
    text slot_key "variant group, nullable"
    uuid[] role_scope "empty = all roles"
    jsonb body "Zod-validated per kind"
    int estimated_minutes
    text content_hash
    jsonb generation_meta "prompt key@version, model, job"
  }
  MODULE_VERSION_SECTION {
    uuid module_version_id PK
    text section_key PK
    uuid section_revision_id FK
    int order_index
  }
```

**Why immutable section revisions.** A module version is just an ordered list of pointers to revisions. Regenerating only the coding example creates **one** new revision and a new version that reuses every other pointer. Section history, version diff (compare pointers per `section_key`), rollback and "this lesson changed since you finished it" all become trivial and cheap.

## 8. Learning progress [P4]

| Table | Purpose | Key columns / indexes |
|---|---|---|
| `module_progress` | One row per student × subtopic: resume point and completion | `UK(student_id, subtopic_id)`, `status`, `completed_section_keys text[]`, `last_section_key`, `module_version_id` seen, `time_spent_sec`, `completed_at` |
| `knowledge_check_attempt` | Lesson check answers (reinforcement, **not** practice) | `(student_id, section_revision_id)`, `item_key`, `is_correct`, `response jsonb` |
| `learning_event` | Append-only analytics stream (section viewed, card flipped, code run, video played…) | `bigint` id, `(student_id, created_at)`, `(subtopic_id, type, created_at)`. Monthly partitions at scale. |

## 9. Question bank and practice [P5]

```mermaid
erDiagram
  QUESTION ||--o{ QUESTION_ROLE : "tagged role"
  QUESTION ||--o{ QUESTION_BRACKET : "tagged bracket"
  QUESTION ||--o{ QUESTION_TOPIC : "tagged topic"
  QUESTION ||--o{ QUESTION_SUBTOPIC : "tagged subtopic"
  QUESTION_IMPORT_BATCH ||--o{ QUESTION_IMPORT_ROW : stages
  QUESTION_IMPORT_ROW }o--o| QUESTION : "becomes"
  QUESTION ||--o{ QUESTION_ATTEMPT : attempted
  QUESTION {
    uuid id PK
    text public_code UK "Q-000123"
    text source_dataset
    text external_id "UK(source_dataset, external_id)"
    enum type "MCQ_SINGLE|MCQ_MULTI|CONCEPTUAL|CODING|SCENARIO|OUTPUT_PREDICTION|SYSTEM_DESIGN|FILL_BLANK"
    text stem
    text code_snippet
    text code_language
    jsonb options "[{id,text}] — no answers here"
    jsonb answer "server-only: correct ids / expected output / model answer"
    text explanation
    enum difficulty "EASY|MEDIUM|HARD|EXPERT"
    enum answer_depth "BRIEF|STANDARD|DETAILED"
    enum status "DRAFT|UNDER_REVIEW|PUBLISHED|ARCHIVED"
    jsonb provenance "file,row,url,author,license"
    text normalized_hash "exact-dupe detection"
    tsvector search "generated, GIN"
  }
  QUESTION_ATTEMPT {
    uuid id PK
    uuid student_id FK
    uuid question_id FK
    jsonb response
    enum result "CORRECT|INCORRECT|PARTIAL|SELF_ASSESSED"
    int self_rating
    int time_spent_sec
  }
```

- **Answers live in a separate column (`answer`)** that the student DTO never selects. Leaking the answer before submission is impossible by construction.
- **Near-duplicates** are found with `pg_trgm` similarity on the normalized stem (GIN trigram index). Semantic duplicates (`pgvector`) come later.
- **Empty tag sets mean "unscoped"**: an imported question with no role tag applies to all roles, and one with no bracket tag falls back to the bracket difficulty policy. Admin lists flag untagged questions for review.
- `question_import_row` keeps raw and normalized data, validation errors, duplicate candidates and the admin's decision, so imports are auditable and resumable.

## 10. Agents and AI [P4/P6]

| Table | Purpose |
|---|---|
| `agent_job` | Every async unit of work: `type`, `status`, `input`, `output`, `parent_job_id`, attempts, error, `cost_usd`, tokens, `created_by_id` |
| `agent_job_log` | Step-by-step log lines for a job (`bigint` id) |
| `ai_provider_config` | Provider type, base URL, **env-var name** of the API key (never the key), active flag |
| `ai_model_route` | Task → provider + model + params (temperature, max tokens, timeout, retries) + fallback route |
| `ai_model_pricing` | Per-model token prices (effective-dated) used to compute cost |
| `prompt_template` | `UK(key, version)`, system and user templates, output schema key, status, notes |
| `ai_usage_record` | One row per LLM call: task, model, prompt key@version, tokens, cost, latency, status, job |
| `content_evaluation` | Evaluation Agent report per module version: scores, issues per section, verdict |
| `content_review` | Human decisions: APPROVED / REJECTED / CHANGES_REQUESTED, with notes |
| `research_source` | URL or document, fetch time, hash, robots check, status |
| `research_finding` | Extracted item (topic, skill, question reference, trend) with quote, source and confidence |
| `research_report` | Synthesized report. Every claim is `VERIFIED` (has sources and quotes) or `INFERRED` |
| `curriculum_proposal` | Curriculum Agent output → admin review → materialized into curriculum tables |
| `video_asset` | Script, provider, provider job ID, status, storage key, duration, error |

## 11. Additions from the manager's prototype

| Table | Purpose | Key columns |
|---|---|---|
| `concept` [P3] | Finest skill tag under a subtopic. Links lesson sections, questions and mastery. | `id`, `subtopic_id`, `key` UK (e.g. `rag.chunking.size-tradeoff`), `name`, `description` |
| `section_concept` / `question_concept` [P4/P5] | Many-to-many concept tags | composite PKs + reverse indexes |
| `company` [P2] | "Asked at" companies (Amazon, Swiggy, PhonePe…) | `id`, `slug` UK, `name`, `logo_key` |
| `question_company` [P5] | Company tags **with provenance** | `question_id`, `company_id`, `source` (dataset / URL), `added_by_id` |
| `cohort` / `cohort_member` [P2] | Batches such as "DSML Cohort 7" | `cohort(id, name, starts_on, ends_on)`, `cohort_member(cohort_id, student_id)` |
| `enrollment_allowlist` [P1/P2] | Emails or domains allowed to register under the `ALLOWLIST` policy | `id`, `email` or `domain`, `cohort_id?`, `added_by_id`, `used_at` |
| `learning_module.type` [P4] | `SUBTOPIC_LESSON` \| `QUESTION_PRIMER` \| `CASE_STUDY`. Anchor is `subtopic_id` **or** `question_id` **or** `topic_id` (CHECK constraint: exactly one). | – |
| `case_study_progress` [P7] | Per student × case study: unlocked step, done steps (skipped flag) | `UK(student_id, module_id)` |
| `feedback` [P4] | Thumbs and ratings from students | `id`, `student_id`, `target_type`, `module_version_id?`, `section_key?`, `section_revision_id?`, `question_id?`, `page?`, `thumbs?`, `rating 1–5?`, `tags text[]`, `text`, `created_at` |
| `content_issue` [P8] | Admin triage of feedback clusters | `id`, `target`, `status OPEN\|IN_PROGRESS\|FIXED\|WONTFIX`, `feedback_count`, `assignee_id`, `fix_job_id?` |
| `interest_signal` [P2] | "Notify me" on Next-up / Planned items | `UK(student_id, kind, target_id)`, `notified_at` |
| `question_primer_choice` [P5] | First-visit choice and skip nudge per question (Learn first vs Solve, skip reasons) | `UK(student_id, question_id)`, `choice`, `skip_reasons text[]`, `nudged_at` |
| `external_solve_status` [P5] | Solved status synced from the NxtWave portal | `UK(student_id, question_id)`, `status`, `source`, `synced_at`, `external_ref` |
| `portal_sync_run` [P5] | Each sync execution (Metabase / CSV) | `id`, `source`, `rows_seen`, `rows_matched`, `status`, `error` |

`question` gains: `title`, `suggested_minutes`, `why_asked`, `expected_output`, `follow_ups jsonb`, `solve_mode IN_APP|EXTERNAL_PORTAL`, `external_system`, `external_id` (portal `s_id`), `datasets jsonb`.
`career_role.availability` / `package_bracket.availability` / `topic.availability` use `LIVE | NEXT_UP | PLANNED | HIDDEN`.

## 12. Key indexes (summary)

| Query | Index |
|---|---|
| Session lookup per request | PK on `session.id` (token hash) |
| Student's active goal and roadmap | `student_goal(student_id) WHERE is_active` |
| Published curriculum for role × bracket | partial unique `(role_id, bracket_id) WHERE status='PUBLISHED'` |
| Practice retrieval | `question_subtopic(subtopic_id, question_id)`, `question(status, difficulty)`, role and bracket join reverse indexes |
| Question search | GIN on `question.search`, GIN trigram on normalized stem |
| Student progress views | `module_progress(student_id)`, `question_attempt(student_id, created_at)` |
| Admin student filters | `student_goal(role_id, bracket_id)`, `module_progress(subtopic_id, status)` |
| Analytics | `learning_event(subtopic_id, type, created_at)` |

## 13. Data lifecycle
- Sessions and tokens: purged daily after expiry.
- `learning_event`: 18 months hot, then archived or aggregated.
- Account deletion: the user row is anonymized (email → hash), and events and attempts are kept anonymized for aggregate analytics.
