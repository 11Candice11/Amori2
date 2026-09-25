#!/usr/bin/env bash
#
# install-no-cocoa.sh
#
# Build and install iOS app WITHOUT any CocoaPods dependencies
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

# --- Create clean project without CocoaPods ---------------------------
log "Creating temporary project without CocoaPods..."

TEMP_PROJECT="/tmp/Amori-clean.xcodeproj"
rm -rf "$TEMP_PROJECT"
cp -r "ios/Amori.xcodeproj" "$TEMP_PROJECT"

# Remove ALL CocoaPods references from the project file
log "Removing CocoaPods build phases..."

# Create a clean version without CocoaPods script phases
python3 -c "
import re
import sys

# Read the project file
with open('$TEMP_PROJECT/project.pbxproj', 'r') as f:
    content = f.read()

# Remove CocoaPods script build phases by UUID
content = re.sub(r'^\s*08A4A3CD28434E44B6B9DE2E.*$', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*800E24972A6A228C8D4807E9.*$', '', content, flags=re.MULTILINE)

# Remove the actual build phase definitions
content = re.sub(r'^\s*08A4A3CD28434E44B6B9DE2E /\* \[CP\].*?^\s*\};', '', content, flags=re.MULTILINE | re.DOTALL)
content = re.sub(r'^\s*800E24972A6A228C8D4807E9 /\* \[CP\].*?^\s*\};', '', content, flags=re.MULTILINE | re.DOTALL)

# Remove library references
content = re.sub(r'^\s*.*libPods-Amori\.a.*$', '', content, flags=re.MULTILINE)
content = re.sub(r'^\s*.*Pods-Amori\..*\.xcconfig.*$', '', content, flags=re.MULTILINE)

# Write the cleaned project file
with open('$TEMP_PROJECT/project.pbxproj', 'w') as f:
    f.write(content)
"

log "Cleaned project file of CocoaPods references"

# --- Build the clean project ------------------------------------------
log "Building clean project..."

cd ios

xcodebuild \
  -project "$TEMP_PROJECT" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "id=$UDID" \
  -derivedDataPath "../ios/build-clean" \
  SKIP_INSTALL=NO \
  build

cd ..

# --- Find the built app ------------------------------------------------
APP_PATH="./ios/build-clean/Build/Products/$CONFIGURATION-iphoneos/Amori.app"

if [[ ! -d "$APP_PATH" ]]; then
  err "Build completed but app not found at: $APP_PATH"
  exit 1
fi

log "Built app at: $APP_PATH"

# --- Ensure bundle is in the app -----------------------------------
log "Copying offline bundle into app..."
cp "ios/main.jsbundle" "$APP_PATH/"
if [[ -d "ios/assets" ]]; then
  cp -r "ios/assets"/* "$APP_PATH/" 2>/dev/null || true
fi

# --- Install ios-deploy if needed --------------------------------------
if ! command -v ios-deploy >/dev/null; then
  log "Installing ios-deploy..."
  npm install -g ios-deploy
fi

# --- Install the app --------------------------------------------------- 
log "Installing app on device..."

ios-deploy \
  --id "$UDID" \
  --bundle "$APP_PATH" \
  --justlaunch

# --- Cleanup -----------------------------------------------------------
log "Cleaning up..."
rm -rf "$TEMP_PROJECT"

log "✅ Done! Amori is installed and running on your iPhone."
log "📱 App uses offline bundle ($BUNDLE_SIZE) - NO CocoaPods, NO Metro!"
log "🔌 You can unplug - it runs completely standalone!"