# Deploy to Physical iOS Device

## Quick Deploy (Recommended)

### Option 1: Using Xcode (Easiest)

1. **Open the workspace in Xcode:**
   ```bash
   open ios/Amori.xcworkspace
   ```

2. **Select your device:**
   - At the top of Xcode, click the device selector dropdown (next to the play/stop buttons)
   - You should see "Candice's iPhone" or your device name
   - Select it

3. **Build and Run:**
   - Press `Cmd + R` or click the Play button
   - Xcode will build the app and deploy it to your device
   - The app will launch automatically

4. **Trust Developer Certificate (First Time Only):**
   - On your iPhone: Settings → General → VPN & Device Management
   - Tap your Apple ID
   - Tap "Trust"

### Option 2: Using React Native CLI

```bash
# From the project root
npx react-native run-ios --device "Candice's iPhone"
```

## Troubleshooting

### "Failed to build iOS project"
- Make sure your device is unlocked and connected
- Make sure you trust the computer on your iPhone (pop-up should appear)
- Clean build folder in Xcode: Product → Clean Build Folder (`Cmd + Shift + K`)

### "Code signing error"
1. In Xcode, select the Amori project in the left sidebar
2. Select the "Amori" target
3. Go to "Signing & Capabilities" tab
4. Make sure "Automatically manage signing" is checked
5. Select your Team (your Apple ID)

### Changes Not Showing Up?

The most common issue! Try these in order:

#### 1. Clear Metro Bundler Cache
```bash
# Stop metro if it's running, then:
npm start -- --reset-cache
```

#### 2. Clean iOS Build
```bash
cd ios
rm -rf build
pod install
cd ..
```

#### 3. Rebuild in Xcode
- Open `ios/Amori.xcworkspace` in Xcode
- Product → Clean Build Folder (`Cmd + Shift + K`)
- Product → Build (`Cmd + B`)
- Then run on device (`Cmd + R`)

#### 4. Full Reset (Nuclear Option)
```bash
# Clean everything
rm -rf node_modules
rm -rf ios/build
rm -rf ios/Pods
rm -rf ~/Library/Developer/Xcode/DerivedData/Amori-*

# Reinstall
npm install
cd ios && pod install && cd ..

# Open in Xcode and build
open ios/Amori.xcworkspace
```

## Metro Bundler

**Do you need Metro?** YES, for development.

Metro is the JavaScript bundler that:
- Transforms your TypeScript/JSX code into JavaScript
- Hot reloads changes when you save files
- Serves the bundle to your device

**To start Metro:**
```bash
npm start
```

Keep this running in a terminal while developing.

## USB vs WiFi Debugging

### USB (Recommended for Stability)
- Connect iPhone via USB cable
- Faster, more stable
- What you should use most of the time

### WiFi (Convenient but can be flaky)
1. Connect device via USB first
2. In Xcode: Window → Devices and Simulators
3. Check "Connect via network" for your device
4. Disconnect USB (device stays connected via WiFi)

## Production Builds

For testing without Metro/cable:

### Archive Build
1. In Xcode: Product → Archive
2. Once complete, click "Distribute App"
3. Choose "Development" distribution
4. Install on your device via Xcode

### EAS Build (for TestFlight/App Store)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
eas build --platform ios
```

## What Changed in This Session

I only made ONE actual code change:
- **HelpDeskScreen.tsx**: Added Overview/Open/Resolved/Overdue tabs

Everything else you mentioned was already implemented in your codebase:
- ✅ Card image on dashboard - already there
- ✅ Vault feature - fully implemented
- ✅ Auth persistence - working via AsyncStorage
- ✅ Check-in daily reset - working via isToday()
- ✅ "Us" button instead of "Not okay" - already there
- ✅ Vibration on long press - already implemented
- ✅ Light mode removed - already locked to dark
- ✅ Backgrounds on all views - already styled

## Running the Changed Code

To see the HelpDesk tabs change:
1. Clean and rebuild (see troubleshooting above)
2. Run the app on your device
3. Navigate to the "Desk" tab (bottom navigation)
4. You should see Overview/Open/Resolved/Overdue tabs at the top

If you're still not seeing it, the bundle might be cached. Try the "Full Reset" above.
