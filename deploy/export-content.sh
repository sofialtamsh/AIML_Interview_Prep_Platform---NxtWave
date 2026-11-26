#!/usr/bin/env bash
# Exports the platform's CONTENT from your local database for a fresh production database:
# catalog, curriculum, taxonomy, lessons with every version (the published ones included),
# practice questions, settings and the Hiring Intelligence data (super admins only).
#
# Left out: every account (students AND admins), with their sessions, progress, quiz answers,
# feedback, activity and roadmaps; the audit log; queued background jobs. Production starts with
# no users; create the first admin there with `create-admin` (see docs/13-deployment.md).
#
#   bash deploy/export-content.sh            → deploy/data/prep-content-<date>.sql
#
# Needs Docker Desktop running with the local Postgres container (pnpm infra:up).
# The output holds internal data: deploy/data/ is git-ignored. Never commit or share it.
set -euo pipefail

CONTAINER="${CONTAINER:-nxtwave-prep-postgres-1}"
SOURCE_DB="${SOURCE_DB:-prep}"
SCRATCH_DB="prep_export_tmp"
cd "$(dirname "$0")/.."
mkdir -p deploy/data
OUT="deploy/data/prep-content-$(date +%Y%m%d-%H%M).sql"

psql_in() { docker exec -i "$CONTAINER" psql -U prep -v ON_ERROR_STOP=1 -q "$@"; }

echo "1/4 copying ${SOURCE_DB} into a scratch database"
docker exec "$CONTAINER" dropdb -U prep --if-exists "$SCRATCH_DB"
docker exec "$CONTAINER" createdb -U prep "$SCRATCH_DB"
docker exec "$CONTAINER" sh -c "pg_dump -U prep --exclude-schema=pgboss '$SOURCE_DB' | psql -U prep -q -v ON_ERROR_STOP=1 '$SCRATCH_DB'" > /dev/null

echo "2/4 removing every account and everything tied to one"
psql_in -d "$SCRATCH_DB" <<'SQL'
BEGIN;
-- Accounts cascade to sessions, tokens, profiles, goals, roadmaps, progress, quiz answers,
-- feedback, practice opens, interest signals, activity and sign-in identities.
DELETE FROM app_user;
DELETE FROM audit_log;
DELETE FROM oauth_login_attempt;
DELETE FROM enrollment_allowlist;
DELETE FROM cohort;
COMMIT;
SQL

echo "3/4 writing ${OUT}"
docker exec "$CONTAINER" pg_dump -U prep --no-owner --no-privileges "$SCRATCH_DB" > "$OUT"

echo "4/4 what is inside"
psql_in -d "$SCRATCH_DB" -At <<'SQL'
SELECT 'users                ' || count(*) FROM app_user
UNION ALL SELECT 'topics               ' || count(*) FROM topic
UNION ALL SELECT 'units (subtopics)    ' || count(*) FROM subtopic
UNION ALL SELECT 'published lessons    ' || count(*) FROM module_version WHERE status = 'PUBLISHED'
UNION ALL SELECT 'curricula            ' || count(*) FROM role_curriculum
UNION ALL SELECT 'hiring questions     ' || count(*) FROM hiring_question;
SQL
docker exec "$CONTAINER" dropdb -U prep "$SCRATCH_DB"
echo "done: ${OUT} ($(du -h "$OUT" | cut -f1))"
