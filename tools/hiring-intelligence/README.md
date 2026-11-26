# Hiring Intelligence analysis (ML Engineer)

Re-runs the analysis behind the ML Engineer interview curriculum
(`apps/api/src/modules/curriculum/mle-curriculum.ts`, write-up in `docs/11-mle-interview-evidence.md`).

## Where the data lives

- **In the repo:** `apps/api/data/hiring-intelligence/hiring-<last interview date>.json.gz`, the
  dashboard's own export (gzip). `pnpm db:bootstrap` (and the dev seed) loads the newest file into
  the database when the database has none.
- **In the platform:** Admin console → **Hiring data**. Super admins only; students never see it.
  It shows the ML Engineer evidence table (recomputed live), every question with filters (curriculum
  topic, theme, round, company, difficulty, CTC band, search) and the job openings. A super admin
  can upload a newer export there; it replaces the current data.

The family and theme rules exist twice, here (`mle.py`, `cluster.py`) and in the API
(`apps/api/src/modules/hiring/hiring-rules.ts`). A test checks that the API copy still reproduces
the published numbers (3,293 questions from 72 companies), so keep both copies in step.

## Refreshing the data

1. Sign in to the Hiring Intelligence dashboard (credentials from the team; never commit them) and
   save the JSON that the app loads from `/api/hiring`.
2. Either upload it in Admin → Hiring data, or save it gzipped as
   `apps/api/data/hiring-intelligence/hiring-<YYYY-MM-DD>.json.gz` and import it from the page.
3. To re-run the offline analysis, with Python 3 (standard library only):

   ```
   python -I mle.py <path>/hiring.json <out-dir>      # role tiers, rounds, domains, topics
   python -I cluster.py <out-dir>                      # interview themes with company coverage
   ```

   `mle.py` imports `decode.py` from `<out-dir>`, so copy `decode.py` there first (or run from
   this folder with `<out-dir>` = this folder's path). Gunzip the repo copy first if you use it.

Outputs: `mle-report.txt` (per tier and CTC band), `themes.txt` (themes, company share, sample
questions), and `mle-questions.json` / `mle-themed.json` (decoded questions).

The theme rules are deliberately simple keyword rules, so every number can be traced back to the
questions that produced it.
