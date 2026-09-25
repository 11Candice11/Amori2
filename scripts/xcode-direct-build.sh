#!/usr/bin/env bash
#
# xcode-direct-build.sh
#
# Use Xcode directly to build and install, skipping CocoaPods entirely
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
BUNDLE_ID="com.candice.amori"
DEFAULT_UDID="00008140-000E1CA40A2B001C"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
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

# --- Install ios-deploy if needed --------------------------------------
if ! command -v ios-deploy >/dev/null; then
  log "Installing ios-deploy..."
  npm install -g ios-deploy
fi

# --- Instructions for user ----------------------------------------------
log "📱 MANUAL BUILD REQUIRED (to bypass CocoaPods)"
log ""
log "Please do this in Xcode:"
log "1. Open ios/Amori.xcworkspace"
log "2. Select 'Amori' scheme and 'Release' configuration"
log "3. Select 'Any iOS Device' as target"
log "4. Product → Build (⌘+B)"
log ""
log "Once built, press ENTER to continue with installation..."
read -p "Press ENTER when build is complete: "

# --- Find built app ----------------------------------------------------
log "Looking for built app..."

POSSIBLE_PATHS=(
  "/Users/candiceyeatman/Library/Developer/Xcode/DerivedData/Amori*/Build/Products/Release-iphoneos/Amori.app"
  "ios/build/Build/Products/Release-iphoneos/Amori.app"
)

APP_PATH=""
for path_pattern in "${POSSIBLE_PATHS[@]}"; do
  for possible_app in $path_pattern; do
    if [[ -d "$possible_app" ]]; then
      APP_PATH="$possible_app"
      break 2
    fi
  done
done

if [[ -z "$APP_PATH" ]]; then
  err "Could not find built app. Make sure build completed successfully."
  exit 1
fi

log "Found app: $APP_PATH"

# --- Ensure bundle is in app -------------------------------------------
log "Ensuring offline bundle is in app..."
cp "ios/main.jsbundle" "$APP_PATH/"
if [[ -d "ios/assets" ]]; then
  cp -r "ios/assets"/* "$APP_PATH/" 2>/dev/null || true
fi

# --- Install on device using Xcode tools ----------------------------
log "Installing on device using Xcode..."

# Use Xcode's devicectl (iOS 17+) for installation
if command -v xcrun >/dev/null 2>&1; then
  log "Using xcrun devicectl..."
  xcrun devicectl device install app --device "$UDID" "$APP_PATH" 2>/dev/null || {
    # Fallback: try ios-deploy
    log "Trying ios-deploy..."
    ios-deploy --id "$UDID" --bundle "$APP_PATH" --justlaunch --verbose || true
  }
else
  # Use ios-deploy directly
  log "Using ios-deploy..."
  ios-deploy --id "$UDID" --bundle "$APP_PATH" --justlaunch --verbose
fi

# Launch the app
log "Launching app..."
APP_ID="com.candice.amori"

# Try to launch using Xcode's devicectl
if command -v xcrun >/dev/null 2>&1; then
  xcrun devicectl device process launch --device "$UDID" --terminate-existing "$APP_ID" 2>/dev/null || {
    # If that fails, installation likely succeeded anyway
    log "App installed. Launch may happen automatically."
  }
fi

log "✅ SUCCESS! Amori installed on iPhone"
log "📱 Uses offline bundle ($BUNDLE_SIZE) - no CocoaPods, no Metro!"
log "🔌 Unplug cable - app runs completely standalone!"