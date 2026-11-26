#!/usr/bin/env bash
# Loads a content export (deploy/export-content.sh) into a production database.
# It ERASES that database first, so run it once, on a new empty database, before students use it.
#
#   bash deploy/restore-content.sh "<External Database URL from Render>" deploy/data/prep-content-....sql
#
# Runs psql inside the local Postgres container, so nothing else needs installing.
set -euo pipefail

URL="${1:?Pass the production database URL (Render: the External Database URL)}"
FILE="${2:?Pass the .sql file made by deploy/export-content.sh}"
CONTAINER="${CONTAINER:-nxtwave-prep-postgres-1}"

echo "This ERASES everything in the target database and loads ${FILE}."
read -r -p "Type ERASE to continue: " answer
[ "$answer" = "ERASE" ] || { echo "Stopped. Nothing was changed."; exit 1; }

docker exec -i "$CONTAINER" psql "$URL" -v ON_ERROR_STOP=1 -q <<'SQL'
DROP SCHEMA IF EXISTS pgboss CASCADE;
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
SQL
docker exec -i "$CONTAINER" psql "$URL" -v ON_ERROR_STOP=1 -q --single-transaction < "$FILE"
docker exec -i "$CONTAINER" psql "$URL" -At -c "SELECT 'published lessons: ' || count(*) FROM module_version WHERE status = 'PUBLISHED'"
echo "Loaded. Restart the API on Render, then create the first admin (docs/13-deployment.md, step 4)."
