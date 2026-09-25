#!/bin/bash

# Build and install full Amori app for standalone deployment
# This script creates a bundled APK that works without Metro/WiFi

set -e

echo "🚀 Building and installing full Amori app..."

# 1. Create JavaScript bundle with all assets
echo "📦 Creating JavaScript bundle..."
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# 2. Build APK using offline mode to avoid dependency timeouts
echo "🏗️ Building APK..."
cd android
./gradlew assembleDebug --no-daemon --offline --build-cache
cd ..

# 3. Install APK on connected device
echo "📱 Installing APK on device..."
adb install android/app/build/outputs/apk/debug/app-debug.apk

# 4. Launch the app
echo "🎉 Launching Amori app..."
adb shell am start -n com.candice.amori/.MainActivity

echo "✅ Full Amori app installed and launched successfully!"
echo "📋 To check logs: adb logcat | grep -E '(ReactNativeJS|amori|candice)'"
echo "🔍 To check if running: adb shell 'ps -A | grep candice'"