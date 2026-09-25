# iOS Offline Bundle Setup

This document explains how to build and run your React Native iOS app without Metro server or WiFi dependency.

## ✅ What's Been Configured

1. **JavaScript Bundle Created**: `ios/main.jsbundle` (1.8MB)
2. **Assets Bundled**: `ios/assets/` directory with all required images and resources
3. **AppDelegate Configured**: Automatically uses offline bundle in Release mode
4. **iOS Deployment Target**: Updated to 16.4 to support modern Expo features
5. **Xcode Project**: Properly configured to include bundled assets

## 📁 File Structure

```
ios/
├── main.jsbundle           # Bundled JavaScript code (1.8MB)
├── assets/                 # All app assets (images, fonts, etc.)
├── Amori.xcworkspace      # Xcode workspace
├── Podfile.properties.json # Updated with iOS 16.4 target
└── Amori/AppDelegate.mm   # Configured for offline bundle
```

## 🏗️ How It Works

The `AppDelegate.mm` file contains this configuration:

```objc
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@".expo/.virtual-metro-entry"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}
```

- **Debug Mode**: Uses Metro server (requires WiFi)
- **Release Mode**: Uses bundled `main.jsbundle` file (works offline)

## 🚀 Building for Release

1. **Install Dependencies** (if needed):
   ```bash
   cd ios
   pod install
   ```

2. **Open in Xcode**:
   ```bash
   open ios/Amori.xcworkspace
   ```

3. **Select Release Configuration**:
   - In Xcode, select "Edit Scheme"
   - Change "Build Configuration" to "Release"

4. **Build and Run**:
   - Select your target device or simulator
   - Build and run (⌘+R)

## ✨ Benefits

- ✅ **No Metro Server Required**: App runs independently
- ✅ **No WiFi Dependency**: Works completely offline
- ✅ **Production Ready**: Uses optimized, minified JavaScript
- ✅ **Faster Startup**: Pre-bundled code loads faster
- ✅ **Self-Contained**: All assets included in the app

## 🔄 Updating the Bundle

When you make changes to your JavaScript code, regenerate the bundle:

```bash
npx react-native bundle \
  --entry-file index.js \
  --platform ios \
  --dev false \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios/
```

Or use the provided script:
```bash
./build-release.sh
```

## 🧪 Testing

Run the verification script to ensure everything is configured correctly:

```bash
node test-offline-bundle.js
```

## 📱 Distribution

Your app is now ready for:
- App Store distribution
- Ad-hoc distribution
- Enterprise distribution
- Testing on devices without development environment

The app will work completely independently without requiring any development servers or network connectivity for the React Native code execution.