#!/usr/bin/env bash
#
# run-on-device-debug.sh
#
# Builds a Debug build of Amori (much faster than Release),
# installs it on the connected iPhone over USB, and launches it.
#
# Debug builds are faster but require Metro to be running for JS updates.
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
SCHEME="Amori"
CONFIGURATION="Debug"
WORKSPACE="ios/Amori.xcworkspace"
BUNDLE_ID="com.candice.amori"
# Default device (Candice's iPhone). Override by passing a UDID as $1.
DEFAULT_UDID="00008140-000E1CA40A2B001C"

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }

# --- Pick the target device ----------------------------------------------
CONNECTED_DEVICES="$(
  xcrun xctrace list devices 2>/dev/null \
    | sed -n '/== Devices ==/,/== Devices Offline ==/p' \
    | grep -iE "iphone|ipad" || true
)"

if [[ -n "${1:-}" ]]; then
  UDID="$1"
  if ! echo "$CONNECTED_DEVICES" | grep -q "$UDID"; then
    warn "Requested device $UDID is not listed as connected. Trying anyway..."
  fi
else
  if echo "$CONNECTED_DEVICES" | grep -q "$DEFAULT_UDID"; then
    UDID="$DEFAULT_UDID"
  else
    UDID="$(echo "$CONNECTED_DEVICES" | head -n1 | sed -E 's/.*\(([0-9A-Fa-f-]+)\)[[:space:]]*$/\1/')"
  fi
fi

if [[ -z "${UDID:-}" ]]; then
  err "No connected iPhone/iPad found."
  exit 1
fi

log "Target device UDID: $UDID"

# --- Kill any stale processes --------------------------------------------
if pgrep -f "xcodebuild -workspace Amori" >/dev/null 2>&1; then
  warn "Stopping previous xcodebuild process..."
  pkill -f "xcodebuild -workspace Amori" 2>/dev/null || true
  sleep 2
fi

# --- Build + install + launch (Debug mode for speed) --------------------
log "Building $SCHEME ($CONFIGURATION) and installing on the device..."
log "Debug build should be much faster than Release."

npx react-native run-ios \
  --udid "$UDID" \
  --mode "$CONFIGURATION"

log "Done. Amori ($BUNDLE_ID) is installed and running on your iPhone."
log "Note: This is a Debug build, so Metro needs to be running for JS updates."