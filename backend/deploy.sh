#!/usr/bin/env bash
#
# Deploy the Amori backend to EC2.
#
# What it does:
#   1. Builds the API Docker image for linux/amd64 locally (the EC2 box is too
#      small to build .NET itself).
#   2. Saves + gzips the image and copies it to the instance over SSH.
#   3. Loads the image on the box and restarts the stack via docker compose.
#   4. Waits for the public health check to go green.
#
# Prerequisites (local):
#   - Docker Desktop running, with buildx (ships with Docker Desktop)
#   - SSH key present (see SSH_KEY below)
#
# The remote box must already be provisioned (Docker installed, ~/amori/.env
# present, ~/amori/backend/docker-compose.prod.yml present). That one-time
# setup was done during the initial deploy.
#
# Usage:
#   ./deploy.sh                # build + deploy
#   ./deploy.sh --skip-build   # reuse the last-built local image, just ship it
#   SSH_HOST=1.2.3.4 ./deploy.sh   # override any config via env vars
#
set -euo pipefail

# ── Config (override via environment variables) ───────────────────────────────
SSH_HOST="${SSH_HOST:-51.20.141.199}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/AmoriKey.pem}"
IMAGE_NAME="${IMAGE_NAME:-amori-api:latest}"
REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/amori}"          # where .env + backend/ live
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"  # relative to REMOTE_DIR/backend
HEALTH_URL="${HEALTH_URL:-http://${SSH_HOST}:5001/api/health}"
PLATFORM="${PLATFORM:-linux/amd64}"

# Directory this script lives in (so it works from anywhere)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="${SCRIPT_DIR}/Amori.Api"

SKIP_BUILD=false
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=true

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[OK] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[ERROR] %s\033[0m\n' "$*" >&2; exit 1; }

SSH="ssh -i ${SSH_KEY} -o StrictHostKeyChecking=accept-new ${SSH_USER}@${SSH_HOST}"
SCP_TARGET="${SSH_USER}@${SSH_HOST}"

# ── Preflight checks ──────────────────────────────────────────────────────────
[[ -f "${SSH_KEY}" ]] || die "SSH key not found at ${SSH_KEY} (set SSH_KEY=...)"
command -v docker >/dev/null 2>&1 || die "docker not found on PATH"
docker info >/dev/null 2>&1 || die "Docker daemon not running (start Docker Desktop)"
[[ -f "${API_DIR}/Dockerfile" ]] || die "Dockerfile not found at ${API_DIR}/Dockerfile"

log "Deploying Amori backend to ${SSH_USER}@${SSH_HOST}"

# ── 1. Build the image (linux/amd64) ──────────────────────────────────────────
if [[ "${SKIP_BUILD}" == "true" ]]; then
  log "Skipping build (--skip-build); reusing local image ${IMAGE_NAME}"
  docker image inspect "${IMAGE_NAME}" >/dev/null 2>&1 \
    || die "Local image ${IMAGE_NAME} not found — run without --skip-build first"
else
  log "Building ${IMAGE_NAME} for ${PLATFORM} ..."
  docker buildx build --platform "${PLATFORM}" -t "${IMAGE_NAME}" --load "${API_DIR}"
  ok "Image built"
fi

# ── 2. Save + ship the image ──────────────────────────────────────────────────
TARBALL="$(mktemp -t amori-api-XXXX).tar.gz"
trap 'rm -f "${TARBALL}"' EXIT

log "Saving image to tarball ..."
docker save "${IMAGE_NAME}" | gzip > "${TARBALL}"
ok "Saved ($(du -h "${TARBALL}" | cut -f1))"

log "Copying image to ${SSH_HOST} ..."
scp -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new "${TARBALL}" "${SCP_TARGET}:${REMOTE_DIR}/amori-api.tar.gz"
ok "Copied"

# ── 3. Sync the compose file (in case it changed) ─────────────────────────────
log "Syncing ${COMPOSE_FILE} ..."
scp -i "${SSH_KEY}" -o StrictHostKeyChecking=accept-new \
  "${SCRIPT_DIR}/${COMPOSE_FILE}" \
  "${SCP_TARGET}:${REMOTE_DIR}/backend/${COMPOSE_FILE}"
ok "Synced"

# ── 4. Load image + restart the stack on the box ──────────────────────────────
log "Loading image and restarting stack on ${SSH_HOST} ..."
# shellcheck disable=SC2087
${SSH} bash -s <<REMOTE
set -euo pipefail
cd "${REMOTE_DIR}/backend"

echo "  loading image..."
sudo docker load < "${REMOTE_DIR}/amori-api.tar.gz"
rm -f "${REMOTE_DIR}/amori-api.tar.gz"

echo "  recreating containers..."
sudo docker compose --env-file "${REMOTE_DIR}/.env" -f "${COMPOSE_FILE}" up -d

echo "  pruning old images..."
sudo docker image prune -f >/dev/null 2>&1 || true
REMOTE
ok "Stack restarted"

# ── 5. Wait for health ────────────────────────────────────────────────────────
log "Waiting for API health at ${HEALTH_URL} ..."
for i in $(seq 1 30); do
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "${HEALTH_URL}" || true)"
  if [[ "${code}" == "200" ]]; then
    ok "API is healthy (HTTP 200)"
    log "Deploy complete."
    exit 0
  fi
  sleep 2
done

die "API did not become healthy in time. Check logs:
  ${SSH} 'sudo docker logs amori-api --tail 50'"
