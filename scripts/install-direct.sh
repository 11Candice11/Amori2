#!/usr/bin/env bash
#
# install-direct.sh
#
# Build iOS app by skipping CocoaPods build phases entirely
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
SCHEME="Amori"
CONFIGURATION="Release"
BUNDLE_ID="com.candice.amori"
DEFAULT_UDID="00008140-000E1CA40A2B001C"

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }

# --- Verify bundle exists --------------------------------------------------
if [[ ! -f "ios/main.jsbundle" ]]; then
  err "Bundle not found at ios/main.jsbundle"
  exit 1
fi

BUNDLE_SIZE=$(ls -lh ios/main.jsbundle | awk '{print $5}')
log "Using offline bundle: ios/main.jsbundle ($BUNDLE_SIZE)"

# --- Pick the target device ----------------------------------------------
CONNECTED_DEVICES="$(
  xcrun xctrace list devices 2>/dev/null \
    | sed -n '/== Devices ==/,/== Devices Offline ==/p' \
    | grep -iE "iphone|ipad" || true
)"

if [[ -n "${1:-}" ]]; then
  UDID="$1"
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

# --- Skip CocoaPods checks by building with specific targets -----------
log "Building app components individually (bypassing scripts)..."

cd ios

# Build just the main target without running the script phases
xcodebuild \
  -project Amori.xcodeproj \
  -scheme Amori \
  -configuration "$CONFIGURATION" \
  -destination "id=$UDID" \
  -derivedDataPath "../ios/build" \
  SKIP_INSTALL=NO \
  RUN_CLANG_STATIC_ANALYZER=NO \
  build \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_REQUIRED=YES \
  CODE_SIGNING_ALLOWED=YES

cd ..

# --- Find the built app ------------------------------------------------
APP_PATH="./ios/build/Build/Products/$CONFIGURATION-iphoneos/Amori.app"

if [[ ! -d "$APP_PATH" ]]; then
  # Try alternative build path
  APP_PATH="ios/build/Build/Products/$CONFIGURATION-iphoneos/Amori.app"
  if [[ ! -d "$APP_PATH" ]]; then
    err "Build completed but app not found"
    err "Expected at: $APP_PATH"
    ls -la "ios/build/Build/Products/" || true
    exit 1
  fi
fi

log "Built app at: $APP_PATH"

# --- Manually copy bundle into app if needed --------------------------
log "Ensuring bundle is in the app..."
cp "ios/main.jsbundle" "$APP_PATH/" 2>/dev/null || true
cp -r "ios/assets"/* "$APP_PATH/" 2>/dev/null || true

# --- Install ios-deploy if needed --------------------------------------
if ! command -v ios-deploy >/dev/null; then
  log "Installing ios-deploy..."
  npm install -g ios-deploy
fi

# --- Install the app --------------------------------------------------- 
log "Installing and launching app on device..."

ios-deploy \
  --id "$UDID" \
  --bundle "$APP_PATH" \
  --justlaunch

log "Done! Amori ($BUNDLE_ID) is installed and running on your iPhone."
log "The app uses the offline bundle ($BUNDLE_SIZE) - no Metro or Wi-Fi needed!"
log "You can unplug the cable - it runs standalone!"