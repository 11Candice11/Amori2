#!/usr/bin/env bash
#
# run-on-android-usb.sh
#
# Builds a debug APK of Amori and installs it on a USB-connected Android device.
# This builds faster than release and avoids Kotlin version conflicts.
#
# Prerequisites:
# 1. Enable Developer Options and USB Debugging on your Android device
# 2. Connect your device via USB and authorize the computer when prompted
#
# Usage:
#   ./scripts/run-on-android-usb.sh
#
set -euo pipefail

# --- Config ---------------------------------------------------------------
PACKAGE_ID="com.candice.amori"
ACTIVITY_NAME="$PACKAGE_ID/.MainActivity"

# --- Resolve repo root so the script works from anywhere ------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# --- Pretty logging -------------------------------------------------------
log()  { printf "\033[1;34m==>\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m[warn]\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m[error]\033[0m %s\n" "$1" >&2; }
success() { printf "\033[1;32m[success]\033[0m %s\n" "$1"; }

# --- Check for connected Android devices ----------------------------------
log "Checking for USB-connected Android devices..."
CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep -E "device$|unauthorized$" | wc -l | tr -d ' ')

if [[ "$CONNECTED_DEVICES" -eq 0 ]]; then
  err "No Android devices connected via USB."
  err "Make sure your device is:"
  err "  1. Connected via USB cable"
  err "  2. Developer Options enabled"
  err "  3. USB Debugging enabled" 
  err "  4. Computer authorized (check device for popup)"
  exit 1
fi

# Show connected devices
log "Connected devices:"
adb devices | grep -v "List of devices" | sed 's/^/  /'

# --- Build the debug APK -------------------------------------------------
log "Building debug APK..."
log "This is faster than release builds and avoids version conflicts."

cd android
if ./gradlew assembleDebug; then
  success "Debug APK built successfully"
else
  err "Failed to build debug APK"
  exit 1
fi
cd ..

# --- Install APK on device ----------------------------------------------
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

if [[ ! -f "$APK_PATH" ]]; then
  err "Debug APK not found at $APK_PATH"
  exit 1
fi

log "Installing APK on device..."
if adb install -r "$APK_PATH"; then
  success "APK installed successfully"
else
  err "Failed to install APK"
  exit 1
fi

# --- Launch the app -----------------------------------------------------
log "Launching Amori app..."
if adb shell am start -n "$ACTIVITY_NAME"; then
  success "Amori app launched successfully"
else
  err "Failed to launch app"
  exit 1
fi

# --- Final message -----------------------------------------------------
echo
success "🎉 Amori is now running on your Android device!"
echo
log "This is a debug build with native photo selection and upload functionality."
log "To test the photo picker, navigate to: Distraction Centre → Hidden Number Game → Create New Puzzle"
log "Package: $PACKAGE_ID"
echo
log "To uninstall: adb uninstall $PACKAGE_ID"
log "To view device logs: adb logcat | grep -i amori"
echo