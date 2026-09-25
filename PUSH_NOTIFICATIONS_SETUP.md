# Push Notifications Setup Guide

## ✅ What's Already Done

1. **Required packages installed & linked**
   - `expo-notifications` and `expo-device` are in package.json.
   - iOS pods are linked (`EXNotifications` is in `ios/Podfile.lock`).

2. **iOS configuration (in code)**
   - `aps-environment` added to `ios/Amori/Amori.entitlements` (required for APNs to issue a device token).
   - `UIBackgroundModes` → `remote-notification` added to `ios/Amori/Info.plist`.
   - `ios/Amori.xcodeproj` already references the entitlements file and has a `DEVELOPMENT_TEAM` set.
   - AppDelegate already implements the remote-notification delegate methods.

3. **Android configuration**
   - `POST_NOTIFICATIONS` permission is in app.json (Android 13+).

4. **App wiring**
   - `expo-notifications` plugin configured in app.json.
   - `EXPO_PROJECT_ID` in `src/services/notifications/pushToken.ts` now reads from `app.json` → `expo.extra.eas.projectId` (already populated: `4a859dca-...`).
   - Device registration + tap handling wired in `App.tsx` / `pushHandlers.ts`.
   - Backend `ExpoPushNotificationService` sends via the Expo push API.

## 🔴 What You Need To Do

These steps require your Apple/Expo credentials and a physical device, so they
can't be done from the codebase.

### Step 1: (If not already) confirm the EAS project

The project id is already in `app.json`. You only need the EAS CLI to manage
credentials:

```bash
npm install -g eas-cli
eas login
```

### Step 2: iOS - Apple Push Notification Service (APNs) Setup

#### 2.1: Push Notifications capability in Xcode (verify)
The `aps-environment` entitlement is already in `Amori.entitlements`. Open
`ios/Amori.xcworkspace` in Xcode → select the Amori target → Signing &
Capabilities, and confirm "Push Notifications" is listed. If it isn't, click
"+ Capability" and add it (this keeps the provisioning profile in sync).

#### 2.2: Create APNs Key in Apple Developer Portal
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click "+" to create a new key
3. Name it "Amori Push Notifications"
4. Check "Apple Push Notifications service (APNs)"
5. Click "Continue" then "Register"
6. **Download the .p8 file** (you can only do this once!)
7. Note your Key ID and Team ID

#### 2.3: Upload APNs Key to EAS
```bash
# Configure credentials for iOS
eas credentials

# Follow prompts to:
# 1. Select iOS platform
# 2. Select "Push Notifications Key"
# 3. Upload the .p8 file you downloaded
# 4. Enter your Key ID and Team ID
```

### Step 4: Android - Firebase Cloud Messaging (FCM) Setup

#### 4.1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it "Amori" and follow the setup wizard

#### 4.2: Add Android App to Firebase
1. In Firebase Console, click "Add app" → Android icon
2. Enter package name: `com.candice.amori`
3. Download `google-services.json`
4. Place it in `android/app/google-services.json`

#### 4.3: Enable FCM v1 API
1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Enable "Firebase Cloud Messaging API (V1)"

#### 4.4: Create Service Account for EAS
1. In Firebase Console, go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file

#### 4.5: Upload FCM Credentials to EAS
```bash
# Configure credentials for Android
eas credentials

# Follow prompts to:
# 1. Select Android platform
# 2. Select "Google Service Account"
# 3. Upload the service account JSON file you downloaded
```

### Step 5: Build and Test

#### Option A: Build with EAS (Recommended)
```bash
# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

#### Option B: Local Development Build
```bash
# iOS
npm run ios

# Android
npm run android
```

**Note:** Push notifications only work on physical devices, not simulators/emulators.

## 🧪 Testing Push Notifications

Once setup is complete, you can test by:

1. **Login to the app** - Device registration happens automatically after login
2. **Check backend logs** - You should see device registration succeed
3. **Trigger a notification** - Send a hug or create an incident
4. **Verify receipt** - Check that the notification appears on the device

### Manual Test via Expo Push Tool

You can test with Expo's push notification tool:
1. Get your device token from the app logs (it starts with `ExponentPushToken[...]`)
2. Go to https://expo.dev/notifications
3. Paste your token and send a test notification

## 📋 Backend Configuration

Update your backend `.env` or `appsettings.json`:

```json
{
  "Notifications": {
    "PushNotificationKey": "not-needed-for-expo"
  }
}
```

The `ExpoPushNotificationService` is already configured to use Expo's push API, which handles both APNs and FCM automatically.

## 🔍 Troubleshooting

### "Push notifications not working on iOS"
- Verify Push Notifications capability is enabled in Xcode
- Check that APNs key is uploaded to EAS
- Ensure you're testing on a physical device (not simulator)
- Check that `EXPO_PROJECT_ID` is set correctly

### "Push notifications not working on Android"
- Verify `google-services.json` exists in `android/app/`
- Check that FCM credentials are uploaded to EAS
- Ensure you're testing on a physical device (not emulator)
- Verify POST_NOTIFICATIONS permission is granted (check in app settings)

### "expo-notifications module not found"
- Run `npm install` again
- For iOS: `cd ios && pod install`
- Rebuild the app

### "Token is null"
- Check device permissions (Settings → Amori → Notifications)
- Verify running on physical device
- Check console logs for error messages

## 📚 Additional Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Firebase Cloud Messaging Setup](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
