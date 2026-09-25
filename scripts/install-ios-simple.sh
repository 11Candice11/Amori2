#!/usr/bin/env bash
#
# install-ios-simple.sh
#
# Simple iOS USB install using ios-deploy, bypassing Xcode build issues
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
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
  err "Run: npx react-native bundle --entry-file index.js --platform ios --dev false --bundle-output ios/main.jsbundle --assets-dest ios/"
  exit 1
fi

BUNDLE_SIZE=$(ls -lh ios/main.jsbundle | awk '{print $5}')
log "Using offline bundle: ios/main.jsbundle ($BUNDLE_SIZE)"

# --- Check for ios-deploy -----------------------------------------------
if ! command -v ios-deploy >/dev/null; then
  log "Installing ios-deploy..."
  npm install -g ios-deploy
fi

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

# --- Check if app already exists on device -------------------------------
log "Looking for existing app builds..."

# Try to find a pre-built app in common locations
POSSIBLE_APPS=(
  "ios/build/Build/Products/Release-iphoneos/Amori.app"
  "ios/build/Build/Products/Debug-iphoneos/Amori.app"
  "/Users/candiceyeatman/Library/Developer/Xcode/DerivedData/Amori*/Build/Products/Release-iphoneos/Amori.app"
  "/Users/candiceyeatman/Library/Developer/Xcode/DerivedData/Amori*/Build/Products/Debug-iphoneos/Amori.app"
)

APP_PATH=""
for possible_app in "${POSSIBLE_APPS[@]}"; do
  if ls $possible_app 2>/dev/null | head -n1 | read app_path; then
    if [[ -d "$app_path" ]]; then
      APP_PATH="$app_path"
      log "Found existing app: $APP_PATH"
      break
    fi
  fi
done

# --- Build if no existing app found ------------------------------------
if [[ -z "$APP_PATH" ]]; then
  log "No pre-built app found. Building in Xcode..."
  log "Please build the app manually in Xcode first:"
  log "1. Open ios/Amori.xcworkspace in Xcode"
  log "2. Select Release configuration"
  log "3. Build (⌘+B) - don't run yet"
  log "4. Then run this script again"
  exit 1
fi

# --- Install using ios-deploy ------------------------------------------
log "Installing app using ios-deploy..."
log "App path: $APP_PATH"

ios-deploy \
  --id "$UDID" \
  --bundle "$APP_PATH" \
  --justlaunch \
  --verbose

log "Done! Amori is installed and running on your iPhone."
log "The app uses the offline bundle ($BUNDLE_SIZE) - no Metro or Wi-Fi needed!"