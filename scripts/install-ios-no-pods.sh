#!/usr/bin/env bash
#
# install-ios-no-pods.sh
#
# Installs iOS app bundle via USB WITHOUT CocoaPods and WITHOUT Metro
# Uses the pre-built bundle (main.jsbundle) for offline operation
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
SCHEME="Amori"
CONFIGURATION="Release"
PROJECT_FILE="ios/Amori.xcodeproj"
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
  err "Make sure the device is plugged in, unlocked, trusted, and has Developer Mode enabled."
  exit 1
fi

log "Target device UDID: $UDID"

# --- Temporarily bypass CocoaPods checks ----------------------------------
log "Creating temporary CocoaPods bypass..."

# Remove CocoaPods build phases temporarily
TEMP_PROJECT="/tmp/Amori-no-pods.xcodeproj"
cp -r "$PROJECT_FILE" "$TEMP_PROJECT"

# Remove CocoaPods script phases from the temporary project
sed -i '' '/08A4A3CD28434E44B6B9DE2E.*Check Pods Manifest.lock/d' "$TEMP_PROJECT/project.pbxproj"
sed -i '' '/800E24972A6A228C8D4807E9.*Copy Pods Resources/d' "$TEMP_PROJECT/project.pbxproj"

# Remove CocoaPods references
sed -i '' '/libPods-Amori\.a/d' "$TEMP_PROJECT/project.pbxproj"
sed -i '' '/Pods-Amori\..*\.xcconfig/d' "$TEMP_PROJECT/project.pbxproj"

log "Bypassed CocoaPods dependencies in temporary project"

# --- Build and install ----------------------------------------------------
log "Building $SCHEME ($CONFIGURATION) and installing on device..."
log "Using project file (no CocoaPods): $TEMP_PROJECT"

# Build using the cleaned project file
xcodebuild \
  -project "$TEMP_PROJECT" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$UDID" \
  -derivedDataPath "./ios/build" \
  build

# Get the built app path
APP_PATH="./ios/build/Build/Products/$CONFIGURATION-iphoneos/Amori.app"

if [[ ! -d "$APP_PATH" ]]; then
  err "Build succeeded but app not found at: $APP_PATH"
  exit 1
fi

log "Built app at: $APP_PATH"

# Install using xcrun devicectl (iOS 17+) or ios-deploy fallback
log "Installing app on device..."

if command -v xcrun >/dev/null && xcrun devicectl --help >/dev/null 2>&1; then
  # Use modern xcrun devicectl for iOS 17+
  log "Using xcrun devicectl for installation..."
  xcrun devicectl device install app --device "$UDID" "$APP_PATH"
  
  # Launch the app
  log "Launching app..."
  xcrun devicectl device process launch --device "$UDID" --terminate-existing "$BUNDLE_ID"
  
else
  # Fallback to ios-deploy for older iOS versions
  if ! command -v ios-deploy >/dev/null; then
    err "ios-deploy not found. Install with: npm install -g ios-deploy"
    exit 1
  fi
  
  log "Using ios-deploy for installation..."
  ios-deploy --id "$UDID" --bundle "$APP_PATH" --justlaunch
fi

# --- Cleanup --------------------------------------------------------------
log "Cleaning up temporary files..."
rm -rf "$TEMP_PROJECT"

log "Done! Amori ($BUNDLE_ID) is installed and running standalone on your iPhone."
log "The app uses the offline bundle (${BUNDLE_SIZE}) - no Metro or Wi-Fi needed!"
log "You can now unplug the cable."