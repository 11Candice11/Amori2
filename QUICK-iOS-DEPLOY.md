# Quick iOS Deploy Guide for Kiro

## 🚀 Fast Deploy to iPhone (No Metro, No WiFi)

### What We Have
- ✅ **Offline Bundle Created**: `ios/main.jsbundle` (1.79MB)
- ✅ **Assets Bundled**: `ios/assets/` directory  
- ✅ **Deploy Script**: `scripts/run-on-device.sh`
- ✅ **AppDelegate Configured**: Auto-uses offline bundle in Release mode

### 📱 Deploy to iPhone

**Single Command:**
```bash
./scripts/run-on-device.sh
```

**What it does:**
1. Builds Release version (uses offline bundle, no Metro)
2. Installs on connected iPhone (UDID: 00008140-000E1CA40A2B001C)
3. Launches app automatically
4. **App runs completely offline** - no Metro, no WiFi needed!

### 🔄 Update Bundle + Deploy

When you change JavaScript code:

```bash
# 1. Update the bundle
npx react-native bundle --entry-file index.js --platform ios --dev false --bundle-output ios/main.jsbundle --assets-dest ios/

# 2. Deploy to phone
./scripts/run-on-device.sh
```

Or use the helper script:
```bash
./build-release.sh && ./scripts/run-on-device.sh
```

### 📋 Requirements

- iPhone connected via USB
- Device unlocked and trusted
- Developer Mode enabled on iPhone
- Xcode command line tools installed

### 🛠️ If CocoaPods Issues

The project sometimes references CocoaPods files. If you get build errors about missing `.xcconfig` files:

1. **Temporary Fix**: Remove CocoaPods references from project settings
2. **Or**: Install pods with `cd ios && pod install` (but not needed for basic React Native)

### ✨ Benefits

- **No Metro Server**: App runs independently  
- **No WiFi Dependency**: Works completely offline
- **Fast Deployment**: Script handles everything
- **Production Ready**: Uses optimized Release build
- **One Command**: `./scripts/run-on-device.sh` does it all

### 📂 File Structure

```
ios/
├── main.jsbundle           # Bundled JavaScript (1.79MB)
├── assets/                 # All app assets
├── Amori.xcworkspace      # Xcode workspace
└── Amori/AppDelegate.mm   # Configured for offline bundle

scripts/
└── run-on-device.sh       # Deploy script
```

### 🧪 Verify Setup

```bash
node test-offline-bundle.js
```

Should show all ✓ checks passed.

---

## For Kiro: Quick Deploy Pattern

This is the standard pattern for React Native iOS deployment without Metro dependency:

1. **Bundle Creation**: `npx react-native bundle --platform ios --dev false`
2. **Deploy Script**: Uses `react-native run-ios --mode Release --udid <device>`
3. **Offline Mode**: AppDelegate switches to bundled JS in Release builds
4. **Result**: Self-contained app that works without development environment

Perfect for testing on real devices without needing WiFi or development server connectivity.