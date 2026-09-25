#!/usr/bin/env bash
#
# build-ios-release.sh
#
# Build a release iOS app bundle that can be installed on iOS devices
#
# This script:
#   1. Bundles the JavaScript code
#   2. Builds the iOS project for release
#   3. Creates an .ipa file (if archive is successful)
#
# Usage:
#   ./scripts/build-ios-release.sh
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
if [[ ! -d "ios" ]]; then
  err "iOS directory not found. Are you in the right project?"
  exit 1
fi

if ! command -v xcodebuild &> /dev/null; then
  err "Xcode command line tools not found. Please install Xcode."
  exit 1
fi

# --- Bundle JavaScript ----------------------------------------------------
log "Step 1/3  Bundling JavaScript for release"
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/

# --- Clean previous builds ------------------------------------------------
log "Step 2/3  Cleaning previous iOS builds"
cd ios
xcodebuild clean -workspace Amori.xcworkspace -scheme Amori
cd ..

# --- Build for device -----------------------------------------------------
log "Step 3/3  Building iOS release"
cd ios
xcodebuild \
  -workspace Amori.xcworkspace \
  -scheme Amori \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath build/Amori.xcarchive \
  archive

if [[ -d "build/Amori.xcarchive" ]]; then
  info "✅ iOS archive built successfully!"
  info "📱 Archive Location: ios/build/Amori.xcarchive"
  info ""
  info "🔌 To install on your iOS device:"
  info "   1. Open Xcode"
  info "   2. Go to Window > Organizer"
  info "   3. Select the Amori archive"
  info "   4. Click 'Distribute App' and follow the wizard"
  info "   or"
  info "   5. Use Xcode to install directly on connected device"
else
  err "❌ Archive not found. Check the build logs above for errors"
  exit 1
fi

cd ..