# 04 · API Design

REST + JSON over HTTPS, versioned under `/api/v1`. Every request and response schema is a Zod schema in `packages/contracts`. The OpenAPI document is generated from them and served at `/api/docs` in non-production environments.

## 1. Conventions

| Topic | Rule |
|---|---|
| Namespaces | `/api/v1/auth/*` (student auth) · `/api/v1/admin/auth/*` (admin auth) · `/api/v1/student/*` (student data, **always scoped to the session user**) · `/api/v1/admin/*` (admin) · `/api/v1/public/*` (catalog for signup and onboarding screens) |
| Auth | HttpOnly session cookie. Student and admin sessions have different *audiences* and are only accepted on their own namespace. |
| CSRF | State-changing requests must carry `Content-Type: application/json` (or multipart for uploads) and an allow-listed `Origin` |
| IDs | UUIDv7 strings. Human-friendly codes (e.g. `Q-000123`) are display-only. |
| Pagination | Admin tables: `?page=1&pageSize=25` → `{ items, page, pageSize, total }`. Feeds and logs: `?cursor=…&limit=…` → `{ items, nextCursor }` |
| Filtering and sorting | Explicit query params (`?roleId=&bracketId=&status=&sort=-createdAt`). Never raw query strings into SQL. |
| Errors | `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {...}, "requestId": "…" } }` with matching HTTP status. Codes: `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `RATE_LIMITED` 429, `INTERNAL` 500. |
| Timestamps | ISO-8601 UTC. Dates (`plannedStart`) as `YYYY-MM-DD` in the student's timezone. |
| Idempotency | Progress and attempt endpoints accept a client `Idempotency-Key`. Upserts where natural. |
| Rate limits | Global per IP. Strict on auth endpoints. Per-user limits on attempts and code-run logging. |

## 2. Auth

| Method & path | Purpose |
|---|---|
| `POST /auth/register` | Student signup `{ email, password, fullName }`. Subject to the registration policy (open / allow-list / invite). |
| `POST /auth/login` · `POST /auth/logout` | Student session |
| `GET /auth/me` | Current student, profile and onboarding state |
| `POST /auth/verify-email` `{ token }` · `POST /auth/resend-verification` | Email verification |
| `POST /auth/forgot-password` `{ email }` · `POST /auth/reset-password` `{ token, password }` | Reset (always 200 on forgot, to avoid account enumeration) |
| `POST /auth/change-password` | Requires the current password. Revokes other sessions. |
| `POST /admin/auth/login` · `POST /admin/auth/logout` · `GET /admin/auth/me` | Admin session (separate audience) |
| `POST /admin/auth/accept-invite` `{ token, password, fullName }` | Admin onboarding via invite |

## 3. Student API (`/api/v1/student`)

| Area | Endpoints |
|---|---|
| Catalog | `GET /catalog` (live and coming-soon roles, brackets with plain-language expectations, skill areas) |
| Onboarding and goal | `GET /onboarding` · `PUT /onboarding/role` · `PUT /onboarding/bracket` · `PUT /onboarding/skills` · `PUT /onboarding/schedule` · `POST /onboarding/complete` → creates goal + roadmap v1 · `GET /goal` · `POST /goal/preview` (plan preview for new settings) · `PUT /goal/schedule` (apply → new roadmap version) · `POST /goal/change-target` (role or bracket) |
| Dashboard | `GET /dashboard`: next best action, today's plan, streak, XP and level, weekly target, delayed items, revisit nudges, question of the day |
| Roadmap | `GET /roadmap` (active version, items with derived status, totals) · `GET /roadmap/versions` · `GET /roadmap/proposal` · `POST /roadmap/proposal/accept` · `POST /roadmap/proposal/decline` · `POST /roadmap/replan` |
| Topics | `GET /topics/:topicId`: topic page with **both paths** (learn progress, practice stats) and subtopics with depth badge and reason |
| Learn | `GET /lessons/:subtopicId` (resolved lesson: depth-filtered, fast-track flags, answers stripped) · `PUT /lessons/:subtopicId/progress` `{ sectionKey, completed, timeSpentSec }` · `POST /lessons/:subtopicId/checks/:sectionKey/:itemKey` → graded result + explanation · `POST /lessons/:subtopicId/complete` |
| Primers | `GET /questions/:questionId/primer`: "Learn the idea first" (sections assembled from concept tags plus question-specific steps) |
| Practice | `GET /practice/questions?topicId=&subtopicId=&conceptKey=&difficulty=&type=&company=&status=&sort=` (no answers) · `GET /practice/questions/:id` · `POST /practice/questions/:id/attempts` → `{ result, correctAnswer, explanation, xpGained }` · `POST /practice/questions/:id/self-assessment` · `POST /practice/questions/:id/portal-opened` · `GET /practice/stats?topicId=` |
| Case studies | `GET /case-studies` · `GET /case-studies/:id` · `PUT /case-studies/:id/progress` |
| Progress | `GET /progress`: learning vs practice (separately), by topic, subtopic and concept, difficulty, activity heatmap, XP history |
| Feedback | `POST /feedback` `{ target, rating?, thumbs?, tags[], text? }` |
| Interest | `POST /interest` `{ kind: ROLE\|BRACKET\|TOPIC\|CASE_STUDY, id }` ("Notify me when live") |
| Search | `GET /search?q=` (command palette: own roadmap topics, published questions, case studies) |
| Profile | `GET /profile` · `PUT /profile` (name, timezone, target companies) |

## 4. Admin API (`/api/v1/admin`)

| Area | Endpoints (CRUD unless noted) |
|---|---|
| Catalog | `/roles` · `/brackets` · `/depth-levels` · `/skill-areas` · `/difficulty-policy` · `/companies` |
| Curriculum | `/topics` · `/subtopics` · `/concepts` · `/prerequisites` (DAG-validated) · `/taxonomy-aliases` · `/curricula?roleId=&bracketId=` · `POST /curricula/:id/publish` (validates, supersedes the previous one, enqueues roadmap proposals) · `GET /curricula/:id/diff/:otherId` |
| Content | `/modules` · `GET /modules/:id/versions` · `GET /module-versions/:id` · `GET /module-versions/:id/preview?roleId=&bracketId=&knowledge=` (same resolution as students) · `GET /module-versions/:id/compare?bracketA=&bracketB=` · `PATCH /module-versions/:id/sections/:key` (manual edit → new revision) · `POST /module-versions/:id/submit-review` · `POST /module-versions/:id/review` `{ decision, notes }` · `POST /module-versions/:id/publish` · `GET /module-versions/:a/diff/:b` · `GET /sections/:moduleId/:key/history` |
| Agents and jobs | `POST /jobs` `{ type, input }` (generate lesson, regenerate section, evaluate, explore, research, curriculum, tag questions) · `GET /jobs?type=&status=` · `GET /jobs/:id` (+ logs, cost) · `POST /jobs/:id/cancel` · `POST /jobs/:id/retry` |
| Research | `/research/sources` · `/research/findings` · `/research/reports` · `/curriculum-proposals` · `POST /curriculum-proposals/:id/materialize` |
| Question bank | `/questions` (search, filter, bulk patch tags and status) · `POST /questions/imports` (multipart upload) · `GET /questions/imports/:id` (validation report, unmapped labels, duplicates) · `PATCH /questions/imports/:id/rows` (decisions) · `POST /questions/imports/:id/commit` · `GET /questions/:id/duplicates` · `POST /questions/:id/publish` · `POST /questions/:id/archive` |
| Students | `GET /students?roleId=&bracketId=&cohortId=&progressMin=&progressMax=&completedTopicId=&activeSince=&q=` · `GET /students/:id` (full track: goal, roadmap, learning, practice, activity) · `PATCH /students/:id` (status) · `/cohorts` · `/allowlist` (enrolled emails) |
| Analytics | `GET /analytics/overview` · `/analytics/learning` (completion, drop-off sections, most and least completed) · `/analytics/practice` (accuracy by subtopic and difficulty) · `/analytics/lesson-impact` (solve rate learned-first vs skipped, learn→solve conversion, skip reasons) · `/analytics/feedback` · `/analytics/ai-usage` · `/analytics/interest` |
| Feedback | `GET /feedback?targetType=&tag=` · `/content-issues` (triage queue, status, link to section revision) |
| Integrations | `/integrations/portal` (deep-link template, solved-status sync config and runs) |
| AI config (super admin) | `/ai/providers` · `/ai/routes` · `/ai/pricing` · `/ai/prompts` (versions, activate) |
| Platform (super admin) | `/admins` (invite, deactivate) · `/settings` (registration policy, publishing policy, practice allowance…) · `GET /audit-log` |

## 5. Authorization matrix (enforced and tested)

| Caller → namespace | public | auth (student) | student | admin auth | admin | super-admin-only |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| Anonymous | ✓ | login, register, reset | ✗ 401 | login, invite | ✗ 401 | ✗ 401 |
| Student session | ✓ | ✓ | ✓ (own data only) | ✗ | ✗ 401 (wrong audience) | ✗ |
| Admin session | ✓ | ✗ | ✗ 401 (wrong audience) | ✓ | ✓ | ✗ 403 |
| Super admin session | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |

An automated test enumerates every registered admin and super-admin route and asserts denial for anonymous and student sessions.
