#!/bin/bash

# Build script for iOS release without Metro
set -e

echo "🚀 Building iOS Release bundle without Metro dependency..."

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Check if bundle exists
if [ ! -f "ios/main.jsbundle" ]; then
    echo "❌ Bundle not found. Creating bundle first..."
    npx react-native bundle --entry-file index.js --platform ios --dev false --bundle-output ios/main.jsbundle --assets-dest ios/
    echo "✅ Bundle created successfully"
else
    echo "✅ Bundle already exists ($(ls -lh ios/main.jsbundle | awk '{print $5}'))"
fi

# Check if assets exist
if [ ! -d "ios/assets" ]; then
    echo "❌ Assets directory not found. Creating assets..."
    npx react-native bundle --entry-file index.js --platform ios --dev false --bundle-output ios/main.jsbundle --assets-dest ios/
else
    echo "✅ Assets directory exists"
fi

echo "📱 Ready for offline iOS build!"
echo ""
echo "Next steps:"
echo "1. Fix CocoaPods dependencies: cd ios && pod install"
echo "2. Open Xcode: open ios/Amori.xcworkspace"
echo "3. Select 'Release' configuration"
echo "4. Build and run - the app will use the bundled JS instead of Metro"
echo ""
echo "The app will now work without WiFi/Metro server! 🎉"