# Android Deployment Guide

This guide explains how to build and install the Amori app on Android devices (like your Vivo) via USB, creating a standalone bundle that doesn't require Metro or WiFi.

## 📱 What We Built

The build process creates a **release APK** with:
- ✅ All JavaScript code bundled inside the APK
- ✅ All assets (images, fonts) included
- ✅ Optimized and minified for production
- ✅ No Metro bundler dependency
- ✅ Works completely offline

## 🔧 Prerequisites

### On Your Computer:
- Node.js and npm (already installed)
- Android SDK Platform Tools (for ADB)

### On Your Vivo Device:
1. **Enable Developer Options:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Developer Options will appear in Settings

2. **Enable USB Debugging:**
   - Go to Settings > Developer Options
   - Turn on "USB Debugging"

## 🚀 Installation Methods

### Method 1: Build + Install (Recommended)
```bash
# Build and install in one command
./scripts/build-and-install-android.sh
```

### Method 2: Build Then Install Separately
```bash
# Build the APK
./scripts/build-android-release.sh

# Install on device
./scripts/install-on-device.sh
```

### Method 3: Manual Installation
```bash
# Build the APK
./scripts/build-android-release.sh

# Transfer APK to device and install manually
# APK location: android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Step-by-Step Installation

1. **Connect Your Vivo Device:**
   ```bash
   # Check if device is detected
   adb devices
   ```

2. **Run Build and Install:**
   ```bash
   ./scripts/build-and-install-android.sh
   ```

3. **Launch the App:**
   - Find "Amori" in your app drawer
   - Launch it - works completely offline!

## 🔍 Troubleshooting

### Device Not Detected
- Make sure USB Debugging is enabled
- Try a different USB cable
- Accept any authorization prompts on your device

### Installation Fails
```bash
# Uninstall existing version first
adb uninstall com.candice.amori

# Then try installing again
./scripts/install-on-device.sh
```

### Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
./scripts/build-android-release.sh
```

## 📁 Generated Files

After building, you'll find:
- **APK:** `android/app/build/outputs/apk/release/app-release.apk` (58MB)
- **Bundle:** `android/app/src/main/assets/index.android.bundle`
- **Assets:** `android/app/src/main/res/` (images, etc.)

## 🎯 Key Features

- **Offline Ready:** No Metro bundler needed
- **No WiFi Required:** All code is bundled
- **Production Optimized:** Minified and compressed
- **Easy Deployment:** Simple script-based installation
- **Multiple Devices:** Support for targeting specific devices

## 💡 Tips

- The APK is signed with debug keys (fine for development/testing)
- For production release, you'd need to generate proper signing keys
- The app includes all React Native dependencies bundled
- You can share the APK file with others for installation