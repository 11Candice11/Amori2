#!/usr/bin/env bash
#
# deploy.sh - the one deploy script for Amori.
#
# Usage:
#   ./deploy.sh api [--skip-build]     Build the API image (linux/amd64), ship it to EC2, restart, wait for health
#   ./deploy.sh ios [UDID]             Release build of the iOS app, installed on a connected iPhone
#   ./deploy.sh android [DEVICE_ID]    Release APK, installed on a connected Android device over USB
#   ./deploy.sh all [--skip-build]     api, then ios
#
# Notes:
#   - Release builds embed the JS bundle, so the phone needs no Metro or Wi-Fi afterwards.
#   - API config can be overridden by env vars: SSH_HOST, SSH_USER, SSH_KEY, IMAGE_NAME,
#     REMOTE_DIR, COMPOSE_FILE, HEALTH_URL, PLATFORM.
#   - API prerequisites: Docker Desktop running, SSH key present. The EC2 box must already be
#     provisioned (Docker installed, ~/amori/.env present). Back up the database before a
#     deploy that includes migrations (see DEVELOPER_GUIDE.md).
#   - iOS prerequisites: iPhone plugged in, unlocked, trusted, Developer Mode on.
#   - Android prerequisites: adb on PATH, USB debugging enabled.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

log()  { printf '\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[OK] %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[ERROR] %s\033[0m\n' "$*" >&2; exit 1; }

usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; }

# ── api ───────────────────────────────────────────────────────────────────────
deploy_api() {
  local skip_build=false
  [[ "${1:-}" == "--skip-build" ]] && skip_build=true

  local SSH_HOST="${SSH_HOST:-13.51.251.5}"
  local SSH_USER="${SSH_USER:-ubuntu}"
  local SSH_KEY="${SSH_KEY:-$HOME/.ssh/AmoriKey.pem}"
  local IMAGE_NAME="${IMAGE_NAME:-amori-api:latest}"
  local REMOTE_DIR="${REMOTE_DIR:-/home/ubuntu/amori}"           # where .env + backend/ live
  local COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"   # relative to REMOTE_DIR/backend
  local HEALTH_URL="${HEALTH_URL:-https://amori.ycare.org/api/health}"
  local PLATFORM="${PLATFORM:-linux/amd64}"
  local BACKEND_DIR="$ROOT/backend"
  local API_DIR="$BACKEND_DIR/Amori.Api"
  local SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)
  local TARGET="${SSH_USER}@${SSH_HOST}"

  [[ -f "$SSH_KEY" ]] || die "SSH key not found at $SSH_KEY (set SSH_KEY=...)"
  command -v docker >/dev/null 2>&1 || die "docker not found on PATH"
  docker info >/dev/null 2>&1 || die "Docker daemon not running (start Docker Desktop)"
  [[ -f "$API_DIR/Dockerfile" ]] || die "Dockerfile not found at $API_DIR/Dockerfile"

  log "Deploying Amori backend to $TARGET"

  if [[ "$skip_build" == true ]]; then
    log "Skipping build; reusing local image $IMAGE_NAME"
    docker image inspect "$IMAGE_NAME" >/dev/null 2>&1 \
      || die "Local image $IMAGE_NAME not found. Run without --skip-build first"
  else
    log "Building $IMAGE_NAME for $PLATFORM ..."
    docker buildx build --platform "$PLATFORM" -t "$IMAGE_NAME" --load "$API_DIR"
    ok "Image built"
  fi

  local tarball
  tarball="$(mktemp -t amori-api-XXXX).tar.gz"
  trap 'rm -f "$tarball"' EXIT
  log "Saving image to tarball ..."
  docker save "$IMAGE_NAME" | gzip > "$tarball"
  ok "Saved ($(du -h "$tarball" | cut -f1))"

  log "Copying image to $SSH_HOST ..."
  scp "${SSH_OPTS[@]}" "$tarball" "$TARGET:$REMOTE_DIR/amori-api.tar.gz"
  ok "Copied"

  log "Syncing $COMPOSE_FILE ..."
  scp "${SSH_OPTS[@]}" "$BACKEND_DIR/$COMPOSE_FILE" "$TARGET:$REMOTE_DIR/backend/$COMPOSE_FILE"
  ok "Synced"

  log "Loading image and restarting stack ..."
  ssh "${SSH_OPTS[@]}" "$TARGET" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR/backend"
sudo docker load < "$REMOTE_DIR/amori-api.tar.gz"
rm -f "$REMOTE_DIR/amori-api.tar.gz"
sudo docker compose --env-file "$REMOTE_DIR/.env" -f "$COMPOSE_FILE" up -d
sudo docker image prune -f >/dev/null 2>&1 || true
REMOTE
  ok "Stack restarted"

  log "Waiting for API health at $HEALTH_URL ..."
  local i code
  for i in $(seq 1 30); do
    code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "$HEALTH_URL" || true)"
    if [[ "$code" == "200" ]]; then
      ok "API is healthy (HTTP 200)"
      return 0
    fi
    sleep 2
  done
  die "API did not become healthy in time. Check logs:
  ssh -i $SSH_KEY $TARGET 'sudo docker logs amori-api --tail 50'"
}

# ── ios ───────────────────────────────────────────────────────────────────────
deploy_ios() {
  local DEFAULT_UDID="00008140-000E1CA40A2B001C"   # Candice's iPhone; pass a UDID to override
  local udid="${1:-}"

  # xctrace lists only connected physical devices under "== Devices ==".
  local connected
  connected="$(xcrun xctrace list devices 2>/dev/null \
    | sed -n '/== Devices ==/,/== Devices Offline ==/p' \
    | grep -iE "iphone|ipad" || true)"

  if [[ -n "$udid" ]]; then
    grep -q "$udid" <<<"$connected" || warn "Device $udid is not listed as connected. Trying anyway ..."
  elif grep -q "$DEFAULT_UDID" <<<"$connected"; then
    udid="$DEFAULT_UDID"
  else
    udid="$(head -n1 <<<"$connected" | sed -E 's/.*\(([0-9A-Fa-f-]+)\)[[:space:]]*$/\1/')"
  fi
  [[ -n "$udid" ]] || die "No connected iPhone/iPad found. Plug it in, unlock it, trust this Mac, enable Developer Mode."

  log "Target device UDID: $udid"

  if pgrep -f "xcodebuild -workspace Amori" >/dev/null 2>&1; then
    warn "A previous xcodebuild is still running; stopping it to avoid a locked build DB."
    pkill -f "xcodebuild -workspace Amori" 2>/dev/null || true
    sleep 3
  fi

  log "Building Amori (Release) and installing. The first Release build can take several minutes."
  npx react-native run-ios --udid "$udid" --mode Release
  ok "Amori is installed and runs standalone (no Metro or Wi-Fi needed)."
}

# ── android ───────────────────────────────────────────────────────────────────
deploy_android() {
  local device_id="${1:-}"
  local apk="android/app/build/outputs/apk/release/app-release.apk"

  [[ -x android/gradlew ]] || die "android/gradlew not found"
  command -v adb >/dev/null 2>&1 || die "adb not found. Install Android SDK Platform Tools"

  log "Bundling JavaScript for release"
  mkdir -p android/app/src/main/assets
  npx react-native bundle \
    --platform android --dev false --entry-file index.js \
    --bundle-output android/app/src/main/assets/index.android.bundle \
    --assets-dest android/app/src/main/res/

  log "Building release APK"
  (cd android && ./gradlew assembleRelease)
  [[ -f "$apk" ]] || die "APK not found at $apk"
  ok "APK built ($(du -h "$apk" | cut -f1)): $apk"

  adb devices | grep -qE "device$" || die "No Android device found. Connect via USB, enable USB debugging, accept the prompt."
  local adb_cmd=(adb)
  [[ -n "$device_id" ]] && adb_cmd=(adb -s "$device_id")

  log "Installing on device"
  "${adb_cmd[@]}" install -r "$apk" \
    || die "Install failed. Try 'adb uninstall com.candice.amori' first, and make sure the device is unlocked."
  ok "Amori installed on Android"
}

# ── dispatch ──────────────────────────────────────────────────────────────────
cmd="${1:-}"
[[ $# -gt 0 ]] && shift
case "$cmd" in
  api)      deploy_api "$@" ;;
  ios)      deploy_ios "$@" ;;
  android)  deploy_android "$@" ;;
  all)      deploy_api "$@"; deploy_ios ;;
  -h|--help|help|"") usage ;;
  *) usage; die "Unknown command: $cmd" ;;
esac
