#!/usr/bin/env bash
#
# run-simulator-release.sh
#
# Builds a Release build (JavaScript bundled, no Metro needed) and runs in iOS Simulator
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
SCHEME="Amori"
CONFIGURATION="Release"
SIMULATOR_NAME="iPhone 16 Pro"

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }

# --- Kill any stale processes --------------------------------------------
if pgrep -f "xcodebuild -workspace Amori" >/dev/null 2>&1; then
  warn "Stopping previous xcodebuild process..."
  pkill -f "xcodebuild -workspace Amori" 2>/dev/null || true
  sleep 2
fi

# --- Build + install + launch (Release mode with bundled JS) ------------
log "Building $SCHEME ($CONFIGURATION) with bundled JavaScript for iOS Simulator..."
log "This creates a standalone app that doesn't need Metro."

npx react-native run-ios \
  --simulator "$SIMULATOR_NAME" \
  --mode "$CONFIGURATION"

log "Done. Amori is running standalone in the iOS Simulator (no Metro needed)."