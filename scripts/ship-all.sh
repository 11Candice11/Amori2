#!/usr/bin/env bash
#
# ship-all.sh
#
# One command to ship a full Amori release:
#   1. Redeploy the backend API to EC2   (backend/deploy.sh)
#   2. Build + install the iOS app on the connected iPhone (scripts/run-on-device.sh)
#
# The backend is deployed first: the mobile app talks to it, so we want the API
# running the new code before the phone gets a fresh build.
#
# Usage:
#   ./scripts/ship-all.sh                 # deploy API, then build+install iOS app
#   ./scripts/ship-all.sh --skip-build    # reuse the last-built API image, still ship it
#   ./scripts/ship-all.sh --api-only      # deploy the backend only
#   ./scripts/ship-all.sh --ios-only      # build + install the iOS app only
#   ./scripts/ship-all.sh --ios-only <UDID>   # target a specific device for the iOS build
#
# Any env vars understood by backend/deploy.sh (SSH_HOST, SSH_KEY, ...) are
# passed straight through since we just invoke that script.
#
set -euo pipefail

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

DEPLOY_SCRIPT="$PROJECT_ROOT/backend/deploy.sh"
DEVICE_SCRIPT="$SCRIPT_DIR/run-on-device.sh"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;35m########  %s\033[0m\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }

# --- Parse flags ----------------------------------------------------------
RUN_API=true
RUN_IOS=true
SKIP_BUILD=false
DEVICE_UDID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --api-only)   RUN_IOS=false ;;
    --ios-only)   RUN_API=false ;;
    --skip-build) SKIP_BUILD=true ;;
    -h|--help)
      sed -n '2,20p' "$0"   # print the usage header above
      exit 0
      ;;
    *)
      # First non-flag argument is treated as a device UDID for the iOS build.
      if [[ -z "$DEVICE_UDID" ]]; then
        DEVICE_UDID="$1"
      else
        err "Unexpected argument: $1"
        exit 1
      fi
      ;;
  esac
  shift
done

# --- Preflight ------------------------------------------------------------
if [[ "$RUN_API" == true && ! -x "$DEPLOY_SCRIPT" ]]; then
  err "Backend deploy script not found or not executable: $DEPLOY_SCRIPT"
  exit 1
fi
if [[ "$RUN_IOS" == true && ! -x "$DEVICE_SCRIPT" ]]; then
  err "iOS device script not found or not executable: $DEVICE_SCRIPT"
  exit 1
fi

# --- 1. Backend ------------------------------------------------------------
if [[ "$RUN_API" == true ]]; then
  log "Step 1/2  Redeploying backend API"
  if [[ "$SKIP_BUILD" == true ]]; then
    "$DEPLOY_SCRIPT" --skip-build
  else
    "$DEPLOY_SCRIPT"
  fi
else
  log "Skipping backend (--ios-only)"
fi

# --- 2. iOS app ------------------------------------------------------------
if [[ "$RUN_IOS" == true ]]; then
  log "Step 2/2  Building + installing iOS app on device"
  if [[ -n "$DEVICE_UDID" ]]; then
    "$DEVICE_SCRIPT" "$DEVICE_UDID"
  else
    "$DEVICE_SCRIPT"
  fi
else
  log "Skipping iOS app (--api-only)"
fi

log "All done."
