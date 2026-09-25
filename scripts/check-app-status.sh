#!/bin/bash

echo "=== Checking Amori App Status ==="
echo ""

# Check if app is installed
echo "1. Checking if app is installed on device..."
xcrun devicectl device info apps --device 00008140-000E1CA40A2B001C 2>&1 | grep -i "com.candice.amori" | head -3

echo ""
echo "2. App bundle contents:"
APP_PATH="/Users/candiceyeatman/Library/Developer/Xcode/DerivedData/Amori-gadnpdedejcymihgbgqmhlqfkgdb/Build/Products/Release-iphoneos/Amori.app"
if [ -d "$APP_PATH" ]; then
    echo "   ✓ App exists at: $APP_PATH"
    echo "   ✓ Bundle: $(ls -lh "$APP_PATH/main.jsbundle" 2>/dev/null | awk '{print $5}')"
    echo "   ✓ Assets: $(ls -d "$APP_PATH/assets" 2>/dev/null || echo 'Not found')"
    echo "   ✓ Binary: $(ls -lh "$APP_PATH/Amori" 2>/dev/null | awk '{print $5}')"
else
    echo "   ✗ App not found"
fi

echo ""
echo "3. Recent device logs (last 10 seconds):"
echo "   If you see errors below, that's what's causing the crash:"
echo ""
# Try to get recent logs
xcrun devicectl device info logs list --device 00008140-000E1CA40A2B001C 2>/dev/null | grep -i amori | tail -10 || echo "   (No logs captured - app may not have launched)"

echo ""
echo "=== Next Steps ==="
echo "If the app crashes:"
echo "1. Open Xcode and check the console output while running the app"
echo "2. Look for red errors in the Xcode console"
echo "3. Common issues:"
echo "   - Missing JavaScript bundle → Should be fixed now ✓"
echo "   - JavaScript errors in your code → Check console"
echo "   - Missing native modules → Run 'pod install' again"
echo "   - Permissions → Check Info.plist"
