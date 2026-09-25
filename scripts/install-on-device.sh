#!/usr/bin/env bash
#
# install-on-device.sh
#
# Install the Amori APK on a connected Android device via USB
#
# Usage:
#   ./scripts/install-on-device.sh              # install on the first connected device
#   ./scripts/install-on-device.sh <device-id>  # install on specific device
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

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
DEVICE_ID="${1:-}"

# --- Preflight checks -----------------------------------------------------
if [[ ! -f "$APK_PATH" ]]; then
  err "❌ APK not found: $APK_PATH"
  err "Run './scripts/build-android-release.sh' first to build the APK"
  exit 1
fi

if ! command -v adb &> /dev/null; then
  err "❌ ADB not found. Please install Android SDK Platform Tools"
  err "You can download it from: https://developer.android.com/studio/releases/platform-tools"
  exit 1
fi

# --- Check connected devices ----------------------------------------------
log "Checking connected devices"
DEVICES=$(adb devices | grep -v "List of devices" | grep -E "device$|unauthorized$|offline$")
if [[ -z "$DEVICES" ]]; then
  err "❌ No Android devices found"
  err "Please:"
  err "  1. Connect your Vivo device via USB"
  err "  2. Enable Developer Options (tap Build Number 7 times in Settings > About)"
  err "  3. Enable USB Debugging in Developer Options"
  err "  4. Accept the debugging authorization on your device"
  exit 1
fi

echo "Connected devices:"
adb devices
echo

# --- Select device --------------------------------------------------------
if [[ -n "$DEVICE_ID" ]]; then
  if ! adb -s "$DEVICE_ID" shell echo "test" &> /dev/null; then
    err "❌ Cannot connect to device: $DEVICE_ID"
    exit 1
  fi
  ADB_CMD="adb -s $DEVICE_ID"
  info "Using device: $DEVICE_ID"
else
  ADB_CMD="adb"
  info "Using first available device"
fi

# --- Install APK -----------------------------------------------------------
log "Installing Amori APK"
info "📱 Installing: $APK_PATH"

if $ADB_CMD install -r "$APK_PATH"; then
  info "✅ Amori installed successfully!"
  info "📱 You can now find the Amori app on your Vivo device"
  info "🚀 The app runs completely offline - no Metro or WiFi needed"
else
  err "❌ Installation failed"
  err "Try:"
  err "  - Uninstall any existing version of Amori first"
  err "  - Check that USB Debugging is still enabled"
  err "  - Make sure the device is unlocked"
  exit 1
fi