#!/bin/bash
# Check iOS device crash logs

echo "Checking for Amori crash logs..."
echo ""

# Method 1: Check Xcode Organizer crash logs
CRASH_DIR=~/Library/Logs/DiagnosticReports
if [ -d "$CRASH_DIR" ]; then
    echo "Recent Amori crashes:"
    ls -lt "$CRASH_DIR" | grep -i "Amori" | head -5
    echo ""
    
    # Show the most recent crash
    LATEST_CRASH=$(ls -t "$CRASH_DIR"/Amori*.crash 2>/dev/null | head -1)
    if [ -n "$LATEST_CRASH" ]; then
        echo "=== Latest crash log: $LATEST_CRASH ==="
        head -100 "$LATEST_CRASH"
    fi
fi

# Method 2: Check iOS device logs
echo ""
echo "=== Checking device console logs ==="
xcrun devicectl device info logs list --device 00008140-000E1CA40A2B001C 2>/dev/null | grep -i amori | head -10

echo ""
echo "If no crashes shown above, the app may be failing silently."
echo "Try running the app from Xcode with the device connected to see live logs."
