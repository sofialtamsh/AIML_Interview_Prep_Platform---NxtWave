# Deploying the platform

How the pieces fit, what each one costs, and the exact steps, in order. Written for the first
deployment; [Updating later](#updating-later) covers every deployment after it.

## What runs where

| Piece | Service | Why there |
|---|---|---|
| Student app (`apps/student`) | Vercel | Static site; Vercel serves it fast and gives free HTTPS on your domain |
| Admin app (`apps/admin`) | Vercel, a second project | Same, on its own subdomain |
| API, with email and the nightly clean-up inside it | Render web service | A server that keeps running and holds a job queue; Vercel functions can't |
| Database | Render Postgres | Next to the API, in the same region, with daily backups |
| Email (password reset, admin invites) | Brevo | Free for 300 emails a day |
| "Continue with Google" | Google Cloud | Free |

Each Vercel app forwards `/api/...` to the API (the `rewrites` in its `vercel.json`), so the browser
only ever talks to your own domain and sign-in cookies stay first-party.

## What it costs (check each site's pricing page; these were the figures in November 2026)

| Item | Plan | Per month |
|---|---|---|
| Render web service | Starter (never sleeps) | about $7 |
| Render Postgres | Basic 256 MB | about $6 |
| Vercel | Hobby | $0, but Hobby is for personal, non-commercial use; a company project may need Pro (about $20 per team member) |
| Brevo | Free, 300 emails a day | $0 |
| Google sign-in | | $0 |

Why not the free tiers: a free Render server sleeps after 15 minutes without traffic and takes up
to a minute to wake, so the first student each morning waits; a free Render database is deleted
after 30 days; Neon's free database allows 100 compute hours a month, and the job queue checks the
database every few seconds, which uses that up.

## 0. Before you push: make the repository private

`github.com/sofialtamsh/AIML_Interview_Prep_Platform---NxtWave` is **public** today. The work since
the first commit includes things that must not be public:

- `apps/api/data/hiring-intelligence/`: the interview data (company names and questions);
- `docs/11-mle-interview-evidence.md` and `tools/hiring-intelligence/`;
- every lesson, quiz answer and interview answer.

On GitHub: **Settings → General → Danger Zone → Change visibility → Private**. Then commit and
push. `.env` (your local passwords and keys) and `deploy/data/` (database exports) are git-ignored
and never pushed; check `git status` before committing anyway.

## 1. Export the content from your computer

The curriculum, the published lessons and the practice data live in your local database. This
copies them without any account, student progress or activity:

```bash
pnpm infra:up                      # Docker Desktop must be running
bash deploy/export-content.sh      # → deploy/data/prep-content-<date>.sql
```

The last lines list what is inside: 0 users, the topics, units and published lessons.

## 2. Create the API and the database on Render

1. Sign up at render.com with GitHub and allow access to the repository.
2. **New → Blueprint**, pick the repository. Render reads `render.yaml` and shows the database
   `nxtwave-prep-db` and the web service `nxtwave-prep-api`, both in Singapore.
3. It asks for the values marked `sync: false`. Fill what you know now:
   - `STUDENT_APP_URL`: the student address, e.g. `https://prep.yourdomain.com`
   - `ADMIN_APP_URL`: the admin address, e.g. `https://admin.prep.yourdomain.com`
   - `MAIL_FROM`: e.g. `NxtWave Prep <no-reply@prep.yourdomain.com>`
   - Leave the Brevo and Google values empty for now (steps 3 and 4); the app runs without them.
4. **Apply**. The first deploy installs, builds, runs the database migrations and starts the API.
   When it shows **Live**, open `https://<the service's .onrender.com address>/api/health`: it
   should say `{"status":"ok"}`. Note that address; Vercel needs it in step 5.

## 3. Load the content into the production database

1. Render → `nxtwave-prep-db` → **Connections** → copy the **External Database URL**.
2. On your computer:

   ```bash
   bash deploy/restore-content.sh "<External Database URL>" deploy/data/prep-content-<date>.sql
   ```

   It asks you to type `ERASE`: it empties the production database first. Do this once, now,
   before any student signs up.
3. Render → `nxtwave-prep-api` → **Manual Deploy → Restart service**.

## 4. Create your admin account

Render → `nxtwave-prep-api` → **Shell**:

```bash
node apps/api/dist/create-admin.js --email you@nxtwave.co.in --name "Your Name"
```

It prints an invite link (and emails it once Brevo is set up). Open it and choose a password.
Repeat for every admin; add `--role ADMIN` for someone who should not manage other admins.

## 5. Put the two apps on Vercel

1. In both `apps/student/vercel.json` and `apps/admin/vercel.json`, replace
   `https://REPLACE-WITH-YOUR-API.onrender.com` with the Render address from step 2. Commit and push.
2. vercel.com → **Add New → Project** → import the repository.
   - **Root Directory**: `apps/student`. Leave the build settings alone (they come from
     `vercel.json`). **Deploy**.
3. Again for the admin app, with **Root Directory** `apps/admin`.
4. Each project → **Settings → Domains** → add the address you chose (`prep.yourdomain.com`,
   `admin.prep.yourdomain.com`) and add the DNS record Vercel shows at your domain provider.
5. If those addresses differ from what you entered in step 2, update `STUDENT_APP_URL` and
   `ADMIN_APP_URL` on Render (**Environment**), and save: Render restarts the API.

**Reusing the practice-questions link instead.** The existing Vercel project behind
`nxtwave-aiml-practice-questions.vercel.app` can serve the student app, so students keep the link
they already have. In that project: **Settings → Git → Disconnect**, then **Connect** this
repository; **Settings → Build and Deployment → Root Directory** `apps/student`, with "Include files
outside the root directory" on; then **Deployments → Redeploy**. The address then opens the full
platform (sign-in first; the practice questions are its Practice tab), and the old page's own click
tracking (`api/track`) stops, since Admin → Analytics replaces it. Use that address as
`STUDENT_APP_URL` on Render and in the Google redirect URI. The admin app still needs its own
project (step 3 above).

## 6. Email with Brevo (free, 300 a day)

1. Sign up at brevo.com (no card needed).
2. **Settings → Senders, domains and dedicated IPs → Domains → Add a domain**: your domain. Add the
   DNS records Brevo shows (DKIM and DMARC) at your domain provider and click **Verify**. Without
   this, Gmail and Outlook put the emails in spam or refuse them.
3. **Senders → Add a sender**: the address in `MAIL_FROM`.
4. **SMTP & API → SMTP**: note the **login**, then **Generate a new SMTP key**.
5. Render → `nxtwave-prep-api` → **Environment**: `SMTP_USER` = the login, `SMTP_PASS` = the key.
   Save.
6. Check: on the student site, **Forgot password?** with your own email. The email should arrive
   within a minute.

## 7. "Continue with Google"

1. console.cloud.google.com → create a project, e.g. "NxtWave Prep".
2. **APIs & Services → OAuth consent screen**: user type **External**; app name "NxtWave Prep";
   support email; authorised domain: your domain. Scopes: only the defaults (email, profile,
   openid), so Google needs no review. **Publish app** so any Google account can sign in, not only
   listed test users.
3. **Credentials → Create credentials → OAuth client ID → Web application**. Under **Authorised
   redirect URIs** add all four:

   ```
   https://prep.yourdomain.com/api/v1/auth/google/callback
   https://admin.prep.yourdomain.com/api/v1/admin/auth/google/callback
   http://localhost:5310/api/v1/auth/google/callback
   http://localhost:5320/api/v1/admin/auth/google/callback
   ```

4. Copy the **Client ID** and **Client secret** into Render (`GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`) and into your local `.env` to try it locally.
5. The button appears on the student login and sign-up pages by itself. A student who signs in with
   Google for the first time gets an account straight away; one who already signed up with the same
   email is linked to it. On the admin side, Google sign-in works only for admins who already have
   an account, from the domains in `ADMIN_GOOGLE_ALLOWED_DOMAINS` (`nxtwave.co.in`).

## 8. Check it like a student

- Sign up with an email, and once more with **Continue with Google** in a private window.
- Onboarding ends on the Learn tab; open Machine Learning and start Linear regression.
- The Practice tab opens the question hub; **Solve Question** opens NxtWave Academy in a new tab.
- **Forgot password?** sends an email.
- Admin → **Analytics** lists the students you just created, active today.

## Updating later

- **Code**: push to `main`. Vercel rebuilds both apps; Render rebuilds the API and runs any new
  database migrations before switching over. Nothing else to do.
- **A new or changed lesson**: lessons are written in `apps/api/src/modules/content/library`. After
  pushing, load them in production from Render → **Shell**:

  ```bash
  cd apps/api && npx tsx src/cli/sync-lessons.ts linear-regression
  ```

  This opens a new version **In review**; publish it in Admin → Lessons as usual. Students keep the
  published version until then.
- **The Practice tab's questions** are a copy of the `nxtwave-ml-prep` project's data (see
  `apps/student/src/features/practice-hub`). After changing its question sheet, run
  `npm run questions` there, copy `src/data/questions.generated.json` (and `data/categories.json` if
  it changed) into `apps/student/src/features/practice-hub/data/`, then commit and push.
- **Backups**: Render backs up the paid database every day. Download one now and then from
  `nxtwave-prep-db` → **Recovery**.

## Settings reference

All set in `render.yaml`, or on Render → **Environment** for the ones marked there `sync: false`.

| Setting | Value in production |
|---|---|
| `NODE_ENV` | `production` |
| `API_HOST`, `API_PORT` | `0.0.0.0`, `10000` |
| `TRUST_PROXY` | `true` (requests come through Vercel and Render) |
| `RUN_JOBS_IN_API` | `true` (email and clean-up run inside the API; no separate worker) |
| `DATABASE_URL` | filled in by Render from the database |
| `STUDENT_APP_URL`, `ADMIN_APP_URL` | your two Vercel addresses, `https://…`, no trailing slash |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | `smtp-relay.brevo.com`, `587`, `false` |
| `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | from Brevo (step 6) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud (step 7) |
| `REGISTRATION_POLICY_DEFAULT` | `OPEN`: anyone with the link can sign up. Admins can switch to an enrolled-students list later in Admin → Access |
| `AI_PROVIDER`, `ANTHROPIC_API_KEY` | AI content agents stay off until a key is added |
