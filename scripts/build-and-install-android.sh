#!/usr/bin/env bash
#
# build-and-install-android.sh
#
# Build Amori release APK and install it on connected Android device
#
# Usage:
#   ./scripts/build-and-install-android.sh              # build and install on first device
#   ./scripts/build-and-install-android.sh <device-id>  # build and install on specific device
#
set -euo pipefail

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log() { printf "\033[1;35m########  %s\033[0m\n" "$1"; }

DEVICE_ID="${1:-}"

log "Building and installing Amori for Android"

# Step 1: Build the release APK
log "Step 1/2  Building release APK"
"$SCRIPT_DIR/build-android-release.sh"

# Step 2: Install on device
log "Step 2/2  Installing on device"
if [[ -n "$DEVICE_ID" ]]; then
  "$SCRIPT_DIR/install-on-device.sh" "$DEVICE_ID"
else
  "$SCRIPT_DIR/install-on-device.sh"
fi

log "✅ Build and installation complete!"