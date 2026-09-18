#!/usr/bin/env bash
#
# Initialise .NET user-secrets for local backend development.
#
# Secrets (the DB connection string and the JWT signing key) are kept OUT of
# appsettings.Development.json and stored in the per-user secret store instead
# (~/.microsoft/usersecrets/<UserSecretsId>/secrets.json), so nothing sensitive
# is committed to the repo.
#
# Safe to re-run: `dotnet user-secrets set` overwrites existing keys.
#
# Usage:
#   ./scripts/setup-dev-secrets.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_DIR="$REPO_ROOT/backend/Amori.Api"
COMPOSE_FILE="$REPO_ROOT/backend/docker-compose.yml"

# ── DB connection details ─────────────────────────────────────────────────────
# Default local values; the password is read from docker-compose.yml when present
# so it always matches the Postgres container you run locally.
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-amori_dev}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

if [[ -z "$DB_PASSWORD" && -f "$COMPOSE_FILE" ]]; then
  # Extract POSTGRES_PASSWORD: <value> from the compose file.
  DB_PASSWORD="$(grep -E 'POSTGRES_PASSWORD:' "$COMPOSE_FILE" | head -1 | sed -E 's/.*POSTGRES_PASSWORD:[[:space:]]*//' | tr -d '"'"'"' \r')"
fi
DB_PASSWORD="${DB_PASSWORD:-postgres}"

CONNECTION_STRING="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}"

# ── JWT signing key ───────────────────────────────────────────────────────────
# A local-only dev key (>= 32 chars). Override by exporting JWT_SECRET_KEY.
JWT_SECRET_KEY="${JWT_SECRET_KEY:-dev-secret-key-change-before-production-use-32chars}"

echo "Initialising user-secrets for $API_DIR"
dotnet user-secrets --project "$API_DIR" init >/dev/null 2>&1 || true
dotnet user-secrets --project "$API_DIR" set "Database:ConnectionString" "$CONNECTION_STRING" >/dev/null
dotnet user-secrets --project "$API_DIR" set "Jwt:SecretKey" "$JWT_SECRET_KEY" >/dev/null

echo "Done. Stored keys:"
dotnet user-secrets --project "$API_DIR" list | sed -E 's/(Password=)[^;]*/\1********/'
