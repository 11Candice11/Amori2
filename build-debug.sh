#!/bin/bash
# Force a clean debug build

echo "🧹 Cleaning build artifacts..."
cd ios
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/Amori-* 2>/dev/null

echo "📦 Installing pods..."
pod install

echo "🔨 Building Debug version..."
cd ..
xcodebuild \
  -workspace ios/Amori.xcworkspace \
  -scheme Amori \
  -configuration Debug \
  -destination 'platform=iOS,id=00008140-000E1CA40A2B001C' \
  clean build \
  | grep -E '(error:|warning:|Building|Succeeded)' || true

echo "✅ Done! Now deploy from Xcode with Cmd+R"
