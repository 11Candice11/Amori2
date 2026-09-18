#!/usr/bin/env bash
#
# run-on-device.sh
#
# Builds a standalone Release build of Amori (JavaScript bundled into the app),
# installs it on the connected iPhone over USB, and launches it.
#
# Because this is a Release build, the JS is baked into the app — the phone does
# NOT need Metro, a cable, or Wi-Fi to run it afterwards. Just run this script
# again whenever you make code changes to push a fresh build.
#
# Usage:
#   ./scripts/run-on-device.sh            # auto-detect the connected iPhone
#   ./scripts/run-on-device.sh <UDID>     # target a specific device UDID
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
SCHEME="Amori"
CONFIGURATION="Release"
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
# xctrace lists ONLY currently-connected physical devices in the "== Devices =="
# section (offline ones appear under "== Devices Offline =="), and it reports the
# hardware UDID that `react-native run-ios --udid` expects. We use it to both
# verify the phone is online and to auto-discover its UDID.
CONNECTED_DEVICES="$(
  xcrun xctrace list devices 2>/dev/null \
    | sed -n '/== Devices ==/,/== Devices Offline ==/p' \
    | grep -iE "iphone|ipad" || true
)"

if [[ -n "${1:-}" ]]; then
  # Explicit UDID passed in.
  UDID="$1"
  if ! echo "$CONNECTED_DEVICES" | grep -q "$UDID"; then
    warn "Requested device $UDID is not listed as connected. Trying anyway..."
  fi
else
  # Prefer the default device if it is connected; otherwise take the first
  # connected iPhone/iPad we find.
  if echo "$CONNECTED_DEVICES" | grep -q "$DEFAULT_UDID"; then
    UDID="$DEFAULT_UDID"
  else
    # Extract the UDID from the last set of parentheses on the first match.
    UDID="$(echo "$CONNECTED_DEVICES" | head -n1 | sed -E 's/.*\(([0-9A-Fa-f-]+)\)[[:space:]]*$/\1/')"
  fi
fi

if [[ -z "${UDID:-}" ]]; then
  err "No connected iPhone/iPad found."
  err "Make sure the device is plugged in, unlocked, trusted, and has Developer Mode enabled."
  err "Currently detected devices (incl. offline):"
  xcrun xctrace list devices 2>/dev/null | grep -iE "iphone|ipad" >&2 || true
  exit 1
fi

log "Target device UDID: $UDID"

# --- Kill any stale xcodebuild that could hold the build DB lock ----------
if pgrep -f "xcodebuild -workspace Amori" >/dev/null 2>&1; then
  warn "A previous xcodebuild is still running; stopping it to avoid a locked build DB."
  pkill -f "xcodebuild -workspace Amori" 2>/dev/null || true
  sleep 3
fi

# --- Build + install + launch --------------------------------------------
# react-native run-ios with --mode Release runs the "Bundle React Native code
# and images" build phase, which embeds the JS bundle into the .app. It then
# installs and launches on the device via devicectl.
log "Building $SCHEME ($CONFIGURATION) and installing on the device..."
log "First Release build can take several minutes."

npx react-native run-ios \
  --udid "$UDID" \
  --mode "$CONFIGURATION"

log "Done. Amori ($BUNDLE_ID) is installed and running standalone on your iPhone."
log "You can now unplug the cable — it runs without Metro or Wi-Fi."
