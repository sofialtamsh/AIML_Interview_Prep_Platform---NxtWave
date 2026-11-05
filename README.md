# NxtWave Prep: Personalized AI Learning & Interview Preparation

Students pick a **target role** and **target package**. The platform builds a roadmap around their time, teaches every concept **at the depth that package demands**, and connects each lesson to the **real interview questions** that test it. Admins run curriculum, AI-assisted content, the question bank and analytics from a separate console.

> Status: **Phase 4B (AI content agents) complete**: AI drafts, AI review, one-step rewrites, story cards. Real generation needs `ANTHROPIC_API_KEY`; 4C (pilot lessons) next. See [docs/PROGRESS.md](docs/PROGRESS.md).

## Repository

```
apps/
  api/        Fastify API + background worker (TypeScript, Prisma, PostgreSQL, pg-boss)
  student/    Student web app (React + Vite + Tailwind)   → http://localhost:5310
  admin/      Admin console (React + Vite + Tailwind)     → http://localhost:5320
packages/
  contracts/  Zod schemas shared by API and apps (request/response contracts)
  ui/         Design tokens, shared components, API client, form helpers
docs/         Product, architecture, data, API, AI and delivery documentation
infra/        Local infrastructure helpers (Postgres init scripts)
```

## Local setup

**Prerequisites:** Node.js 24, pnpm 11, Docker Desktop.

```bash
cp .env.example .env          # local configuration (no real secrets needed for dev)
pnpm install                  # installs everything and generates the Prisma client
pnpm infra:up                 # Postgres (127.0.0.1:45432) + Mailpit (http://localhost:8025)
pnpm db:deploy                # apply database migrations
pnpm db:seed                  # catalog + pilot curriculum, demo admin, demo student with a roadmap
pnpm dev                      # API :4000, student app :5310, admin app :5320
pnpm dev:worker               # (separate terminal) background jobs, incl. sending all email
```

| What | Where |
|---|---|
| Student app | http://localhost:5310 · demo student `demo.student@prep.local` / `Demo-Student-2026!` (or sign up with any email; emails arrive in Mailpit) |
| Admin console | http://localhost:5320 · demo super admin `admin@prep.local` / `ChangeMe-Admin-2026!` |
| Dev inbox (verification, reset and invite emails) | http://localhost:8025 |
| API docs (OpenAPI, non-production only) | http://localhost:4000/api/docs |

The login screens show a **Fill demo details** box in local development only (from `apps/*/.env.development`, which production builds never load).

**Continue with Google** appears once `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set (see `.env.example` for the redirect URIs). Students are created or linked automatically. Admins must already be invited, and `ADMIN_GOOGLE_ALLOWED_DOMAINS` limits admin Google sign-in to company domains.

In production, `pnpm db:bootstrap` inserts only the missing catalog and pilot-curriculum rows. It never overwrites admin edits.

Create more admins with `pnpm admin:create --email you@nxtwave.co.in` (prints an invite link), or invite them from **Admins** in the console.

## Quality gate

```bash
pnpm check        # Biome lint + typecheck + all tests (real Postgres) + production builds
```

API tests run against the separate `prep_test` database, which is recreated from the migrations on every run.

## Documentation

| Doc | Contents |
|---|---|
| [01 · Product requirements](docs/01-product-requirements.md) | Personas, personalization model, scope, functional and non-functional requirements, journeys, gaps and resolutions |
| [02 · System architecture](docs/02-system-architecture.md) | Components, stack and the reasons for it, security, reliability, deployment |
| [03 · Database design](docs/03-database-design.md) | ERDs per domain, tables, indexes, versioning |
| [04 · API design](docs/04-api-design.md) | Conventions, endpoint catalog, authorization matrix |
| [05 · Personalization engine](docs/05-personalization-engine.md) | Depth model, lesson resolution, planner, practice retrieval, mastery, XP |
| [06 · AI architecture](docs/06-ai-architecture.md) | Gateway, agents, content pipeline, evaluation, safety |
| [07 · Content schema](docs/07-content-schema.md) | Structured lesson sections, widgets, question schema, import format |
| [08 · UX strategy](docs/08-ux-strategy.md) | Design language, screens, admin IA, microcopy, accessibility |
| [09 · Delivery plan](docs/09-delivery-plan.md) | Phases with exit criteria, testing strategy, risk register |
| [10 · Gap analysis](docs/10-gap-analysis.md) | Spec vs the manager's prototype vs StrataScratch / TensorTonic |
| [Progress tracker](docs/PROGRESS.md) | Phase status and phase reports |
