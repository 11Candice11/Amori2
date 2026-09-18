/**
 * pushToken — obtains a device push token for the current platform.
 *
 * This is a BARE React Native app. Push is provided via `expo-notifications`,
 * which returns an **Expo push token** (`ExponentPushToken[...]`). That token
 * format is exactly what the backend's `ExpoPushNotificationService` sends to
 * the Expo Push API, which in turn fans out to APNs (iOS) and FCM (Android).
 *
 * The whole module degrades gracefully to `null` whenever push can't be
 * obtained (permission denied, simulator/emulator, or the Expo native modules
 * not yet linked into the app). Callers already treat `null` as a safe no-op,
 * so the app keeps building and running even before the native setup below is
 * finished.
 *
 * ── Native setup still required (one-time, needs credentials) ───────────────
 *   1. Link Expo modules into the bare app:  npx install-expo-modules@latest
 *      then (iOS)  cd ios && pod install
 *   2. iOS:   add a Push Notifications capability in Xcode and upload an APNs
 *             key to your Expo/EAS project credentials.
 *      Android: create an FCM v1 service-account credential and upload it to
 *             your Expo/EAS project (place google-services.json in android/app).
 *   3. Set EXPO_PROJECT_ID below (or in app.json → expo.extra.eas.projectId)
 *      so getExpoPushTokenAsync can resolve credentials.
 */
import { Platform } from 'react-native';
import type { NotificationPlatform } from '../api/types';

/**
 * Your Expo/EAS project id. Required by getExpoPushTokenAsync to resolve the
 * push credentials. Fill this in once you create the EAS project
 * (`eas init`), or leave empty to fall back to null (no push) safely.
 */
const EXPO_PROJECT_ID = '';

export function currentPlatform(): NotificationPlatform {
  return Platform.OS === 'ios' ? 1 : 2;
}

/**
 * Attempt to obtain a push token from the native provider.
 * Returns null when push is unavailable so callers can no-op without crashing.
 */
export async function getPushToken(): Promise<string | null> {
  try {
    return await getNativePushToken();
  } catch {
    // Native modules not linked, permission denied, or simulator without push.
    return null;
  }
}

/**
 * Resolve an Expo push token via expo-notifications.
 *
 * `expo-notifications` is imported lazily so that, if the native modules aren't
 * linked yet, the require simply throws and we fall back to null rather than
 * crashing the app at startup.
 */
async function getNativePushToken(): Promise<string | null> {
  try {
    // Lazy require — throws (→ caught above) when native modules aren't present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require('expo-notifications') as typeof import('expo-notifications');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Device = require('expo-device') as typeof import('expo-device');
    
    return await getTokenFromModules(Notifications, Device);
  } catch (error) {
    // Native modules not available - return null gracefully
    console.log('[Push] Native modules not available:', error);
    return null;
  }
}

async function getTokenFromModules(
  Notifications: typeof import('expo-notifications'),
  Device: typeof import('expo-device'),
): Promise<string | null> {

  // Push tokens are only issued on physical devices.
  if (Device.isDevice === false) return null;

  // Ask for (or confirm) notification permission.
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) return null;

  // Android requires a notification channel for delivery to be shown.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Amori',
      importance: Notifications.AndroidImportance.DEFAULT,
      // A soft pulse, matching the "gentle vibration" of a hug.
      vibrationPattern: [0, 40, 60, 40],
    });
  }

  const { data } = await Notifications.getExpoPushTokenAsync(
    EXPO_PROJECT_ID ? { projectId: EXPO_PROJECT_ID } : undefined,
  );
  return data ?? null;
}
