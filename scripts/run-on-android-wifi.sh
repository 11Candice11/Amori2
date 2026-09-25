#!/usr/bin/env bash
#
# run-on-android-wifi.sh
#
# Builds a standalone Release APK of Amori (JavaScript bundled into the app),
# connects to an Android device over WiFi, installs the APK, and launches it.
#
# Because this is a Release build, the JS is baked into the APK — the phone does
# NOT need Metro, a cable, or continuous Wi-Fi to run it afterwards.
#
# Prerequisites:
# 1. Enable Developer Options and USB Debugging on your Android device
# 2. Enable "Wireless debugging" in Developer Options
# 3. Connect your device to the same WiFi network as your development machine
#
# Usage:
#   ./scripts/run-on-android-wifi.sh                    # interactive mode
#   ./scripts/run-on-android-wifi.sh <IP:PORT>         # connect to specific IP:PORT
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

# --- WiFi connection setup -----------------------------------------------
connect_wifi() {
  local device_address="$1"
  
  log "Connecting to Android device at $device_address via WiFi..."
  
  if adb connect "$device_address"; then
    success "Connected to $device_address"
    return 0
  else
    err "Failed to connect to $device_address"
    return 1
  fi
}

# --- Device discovery -----------------------------------------------------
if [[ -n "${1:-}" ]]; then
  # IP:PORT provided as argument
  DEVICE_ADDRESS="$1"
  if ! connect_wifi "$DEVICE_ADDRESS"; then
    exit 1
  fi
else
  # Interactive mode
  echo
  log "WiFi Android deployment requires your device's IP address and debugging port."
  echo
  echo "To find these:"
  echo "1. Open Settings > Developer Options > Wireless debugging"
  echo "2. Note the IP address and port (e.g., 192.168.1.123:45678)"
  echo "3. If prompted, pair this computer first"
  echo
  read -p "Enter device IP:PORT (e.g., 192.168.1.123:45678): " DEVICE_ADDRESS
  
  if [[ -z "$DEVICE_ADDRESS" ]]; then
    err "No address provided"
    exit 1
  fi
  
  if ! connect_wifi "$DEVICE_ADDRESS"; then
    exit 1
  fi
fi

# --- Verify connection ---------------------------------------------------
log "Verifying device connection..."
CONNECTED_DEVICES=$(adb devices | grep -v "List of devices" | grep -E "device$|unauthorized$" | wc -l | tr -d ' ')

if [[ "$CONNECTED_DEVICES" -eq 0 ]]; then
  err "No Android devices connected. Make sure wireless debugging is enabled."
  exit 1
fi

success "Android device connected successfully"

# --- Build the Release APK ---------------------------------------------
log "Building Release APK..."
log "This may take a few minutes on first build..."

cd android
if ./gradlew assembleRelease; then
  success "Release APK built successfully"
else
  err "Failed to build Release APK"
  exit 1
fi
cd ..

# --- Install APK on device --------------------------------------------
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [[ ! -f "$APK_PATH" ]]; then
  err "Release APK not found at $APK_PATH"
  exit 1
fi

log "Installing APK on device..."
if adb install -r "$APK_PATH"; then
  success "APK installed successfully"
else
  err "Failed to install APK"
  exit 1
fi

# --- Launch the app ---------------------------------------------------
log "Launching Amori app..."
if adb shell am start -n "$ACTIVITY_NAME"; then
  success "Amori app launched successfully"
else
  err "Failed to launch app"
  exit 1
fi

# --- Final message ----------------------------------------------------
echo
success "🎉 Amori is now running on your Android device!"
echo
log "The app is installed as a standalone Release build."
log "You can now disconnect WiFi debugging - the app runs independently."
log "Package: $PACKAGE_ID"
echo
log "To uninstall: adb uninstall $PACKAGE_ID"
log "To reconnect later: ./scripts/run-on-android-wifi.sh $DEVICE_ADDRESS"
echo