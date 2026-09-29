/**
 * pushHandlers — wires expo-notifications runtime behaviour:
 *   • how notifications appear while the app is foregrounded
 *   • what happens when the user taps a notification
 *
 * Everything is guarded so that, if the Expo native modules aren't linked yet,
 * these calls no-op instead of crashing. Callers can pass an `onOpenHug`
 * callback that runs when a "Hug" notification (sent by the backend with
 * data.type === "Hug" and data.referenceId === <hugId>) is tapped.
 */
import { Platform } from 'react-native';

type NotificationData = Record<string, unknown>;

export interface PushHandlerCallbacks {
  /** Called when the user taps a hug notification. Receives the hug id. */
  onOpenHug?: (hugId: string) => void;
  /**
   * Called when the user taps an incident/care-ticket notification (SLA breach,
   * reassignment, status change, close). Receives the incident id. Backend sends
   * these with data.type === "Incident" and data.referenceId === <incidentId>.
   */
  onOpenIncident?: (incidentId: string) => void;
  /**
   * Called when the user taps a partner link-request notification. Opens the
   * Link Partner screen so the request can be accepted or declined. Backend
   * sends these with data.type === "PartnerLinkRequest" and
   * data.referenceId === <invitationId>.
   */
  onOpenPartnerLink?: () => void;
  /**
   * Called when the user taps a "gift received" notification. Opens their
   * Hearth Vault, where the gift now lives. Backend sends these with
   * data.type === "Gift" and data.referenceId === <memoryId>.
   */
  onOpenGift?: () => void;
  /**
   * Called when the user taps a "Let's Chat" notification. Opens the received
   * message so it can be read. Backend sends these with data.type === "LetsChat"
   * and data.referenceId === <conversationId>.
   */
  onOpenChat?: (conversationId: string) => void;
}

/**
 * True when the Expo native runtime is present.
 *
 * Every Expo module goes through expo-modules-core, which reads the native
 * runtime off `globalThis.expo`. That runtime only exists when the platform
 * project is wired up for Expo modules — iOS is (`use_expo_modules!` in the
 * Podfile), but Android is NOT (no `useExpoModules()` in settings.gradle and a
 * plain MainApplication without ApplicationLifecycleDispatcher). On Android the
 * import therefore fails with "Cannot read property 'NativeModule' of
 * undefined", which is a fatal error rather than a catchable require failure.
 *
 * Checking first keeps the notification layer a genuine no-op there, which is
 * what the rest of this module already assumes.
 */
export function isExpoRuntimeAvailable(): boolean {
  return typeof (globalThis as { expo?: unknown }).expo !== 'undefined';
}

/** Lazily load expo-notifications; returns null if not linked/available. */
function loadNotifications(): typeof import('expo-notifications') | null {
  if (!isExpoRuntimeAvailable()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-notifications') as typeof import('expo-notifications');
  } catch {
    return null;
  }
}

function extractHugId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'Hug' && ref ? ref : null;
}

function extractIncidentId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'Incident' && ref ? ref : null;
}

function isPartnerLinkRequest(data: NotificationData | undefined): boolean {
  if (!data) return false;
  return data.type === 'PartnerLinkRequest';
}

function isGift(data: NotificationData | undefined): boolean {
  if (!data) return false;
  return data.type === 'Gift';
}

function extractChatId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'LetsChat' && ref ? ref : null;
}

/** Route a tapped notification's data payload to the right callback. */
function dispatchTap(data: NotificationData | undefined, callbacks: PushHandlerCallbacks): void {
  const hugId = extractHugId(data);
  if (hugId) {
    callbacks.onOpenHug?.(hugId);
    return;
  }
  const incidentId = extractIncidentId(data);
  if (incidentId) {
    callbacks.onOpenIncident?.(incidentId);
    return;
  }
  if (isPartnerLinkRequest(data)) {
    callbacks.onOpenPartnerLink?.();
    return;
  }
  if (isGift(data)) {
    callbacks.onOpenGift?.();
    return;
  }
  const chatId = extractChatId(data);
  if (chatId) {
    callbacks.onOpenChat?.(chatId);
  }
}

/**
 * Configure how notifications behave while the app is in the foreground.
 * Call once at app startup. Safe no-op if native modules aren't present.
 */
export function configureForegroundBehavior(): void {
  const Notifications = loadNotifications();
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      // SDK 52+ granular flags (ignored on older versions).
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Subscribe to notification receipt (foreground) and tap events.
 * Returns an unsubscribe function. Safe no-op if native modules aren't present.
 */
export function registerNotificationListeners(callbacks: PushHandlerCallbacks): () => void {
  const Notifications = loadNotifications();
  if (!Notifications) return () => {};

  // User tapped a notification (app foreground/background/quit → opened).
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as NotificationData | undefined;
    dispatchTap(data, callbacks);
  });

  // If the app was launched by tapping a notification while fully quit, handle
  // that initial response too.
  Notifications.getLastNotificationResponseAsync?.().then(response => {
    if (!response) return;
    const data = response.notification.request.content.data as NotificationData | undefined;
    dispatchTap(data, callbacks);
  }).catch(() => { /* ignore */ });

  return () => {
    responseSub.remove();
  };
}

/** Platform helper retained for parity with the rest of the module. */
export const isIOS = Platform.OS === 'ios';
