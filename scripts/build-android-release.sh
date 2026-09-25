#!/usr/bin/env bash
#
# build-android-release.sh
#
# Build a release APK bundle that can be installed on Android devices via USB
# without needing Metro bundler or WiFi connection.
#
# This script:
#   1. Bundles the JavaScript code into the APK
#   2. Builds a signed release APK
#   3. Outputs the APK location for easy transfer to device
#
# Usage:
#   ./scripts/build-android-release.sh
#
set -euo pipefail

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;35m########  %s\033[0m\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }
info() { printf "\033[1;36m[info]\033[0m %s\n" "$1"; }

# --- Preflight checks -----------------------------------------------------
if [[ ! -d "android" ]]; then
  err "Android directory not found. Are you in the right project?"
  exit 1
fi

if [[ ! -f "android/gradlew" ]]; then
  err "Gradle wrapper not found in android directory"
  exit 1
fi

# --- Clean previous builds ------------------------------------------------
log "Step 1/4  Cleaning previous builds"
cd android
./gradlew clean
cd ..

# --- Bundle JavaScript ----------------------------------------------------
log "Step 2/4  Bundling JavaScript for release"
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# --- Create assets directory if it doesn't exist -------------------------
mkdir -p android/app/src/main/assets

# --- Build release APK ----------------------------------------------------
log "Step 3/4  Building release APK"
cd android
./gradlew assembleRelease
cd ..

# --- Find and display the APK location -----------------------------------
log "Step 4/4  Build complete!"

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
if [[ -f "$APK_PATH" ]]; then
  APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
  info "✅ Release APK built successfully!"
  info "📱 APK Location: $APK_PATH"
  info "📦 APK Size: $APK_SIZE"
  info ""
  info "🔌 To install on your Vivo device:"
  info "   1. Enable Developer Options and USB Debugging on your device"
  info "   2. Connect device via USB"
  info "   3. Run: adb install \"$APK_PATH\""
  info "   or"
  info "   4. Transfer the APK to your device and install manually"
else
  err "❌ APK not found at expected location: $APK_PATH"
  err "Check the build logs above for errors"
  exit 1
fi