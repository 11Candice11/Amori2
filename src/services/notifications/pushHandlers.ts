/**
 * pushHandlers — wires expo-notifications runtime behaviour:
 *   • how notifications appear while the app is foregrounded
 *   • what happens when the user taps a notification
 *
 * Everything is guarded so that, if the Expo native modules aren't linked yet,
 * these calls no-op instead of crashing. Callers can pass an `onOpenHug`
 * callback that runs when a "Hug" notification (sent by the backend with
 * data.type === "Hug" and data.referenceId === <hugId>) is tapped.
 *
 * Supported data.type values:
 *   "Hug"                      data.referenceId = hugId
 *   "Incident"                 data.referenceId = incidentId
 *   "PartnerLinkRequest"       data.referenceId = invitationId
 *   "Gift"                     data.referenceId = memoryId
 *   "LetsChat"                 data.referenceId = conversationId
 *   "MemoryAdded"              data.referenceId = memoryId
 *   "VisionBoardItemAdded"     data.referenceId = itemId
 *   "VisionBoardItemCompleted" data.referenceId = itemId
 *   "CalendarEvent"            data.referenceId = eventId, data.eventDate = "YYYY-MM-DD"
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
   * Hearth Vault and navigates to the specific gift. Backend sends these with
   * data.type === "Gift" and data.referenceId === <giftId>.
   */
  onOpenGift?: (giftId: string) => void;
  /**
   * Called when the user taps a "Let's Chat" notification. Opens the received
   * message so it can be read. Backend sends these with data.type === "LetsChat"
   * and data.referenceId === <conversationId>.
   */
  onOpenChat?: (conversationId: string) => void;
  /**
   * Called when the user taps a Vision Board item notification (partner shared
   * or completed an item). Opens the item's detail screen. Backend sends these
   * with data.type === "VisionBoardItem" and data.referenceId === <itemId>.
   */
  onOpenVisionBoardItem?: (itemId: string) => void;
  /**
   * Called when the user taps a memory notification (partner added a new memory).
   * Opens the Memories screen with the specific memory in focus. Backend sends
   * these with data.type === "MemoryAdded" and data.referenceId === <memoryId>.
   */
  onOpenMemory?: (memoryId: string) => void;
  /**
   * Called when the user taps a calendar event notification (new event created
   * by partner, reminder, etc.). Opens the CalendarDay view for the event's
   * date. Backend sends these with data.type === "CalendarEvent",
   * data.referenceId === <eventId>, and data.eventDate === "YYYY-MM-DD".
   * If eventDate is absent the handler falls back to today's date.
   */
  onOpenCalendarEvent?: (eventDate: string) => void;
}

/**
 * True when the Expo native modules are available on this platform.
 *
 * We no longer rely on `globalThis.expo` because that symbol is only present
 * in Expo Go and managed-workflow builds — it is NOT set in bare React Native
 * apps (including EAS development builds), which caused this function to
 * always return false on Android and silently skip push registration.
 *
 * Instead we do a cheap try/require of expo-modules-core. If the native layer
 * is linked the require succeeds; if not it throws and we return false.
 * This correctly returns true on both iOS and Android EAS development builds.
 */
export function isExpoRuntimeAvailable(): boolean {
  try {
    // expo-modules-core is the foundation every Expo module depends on.
    // If it resolves without throwing, the native layer is wired up.
    require('expo-modules-core');
    return true;
  } catch {
    return false;
  }
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

function extractGiftId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'Gift' && ref ? ref : null;
}

function extractChatId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'LetsChat' && ref ? ref : null;
}

function extractVisionBoardItemId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return (type === 'VisionBoardItemAdded' || type === 'VisionBoardItemCompleted') && ref ? ref : null;
}

function extractMemoryId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'MemoryAdded' && ref ? ref : null;
}

/**
 * Returns the event date ("YYYY-MM-DD") when the payload is a CalendarEvent
 * notification, or null when it isn't. Falls back to today's date when the
 * backend omits data.eventDate so the CalendarDay screen still opens.
 */
function extractCalendarEventDate(data: NotificationData | undefined): string | null {
  if (!data) return null;
  if (data.type !== 'CalendarEvent') return null;
  if (typeof data.eventDate === 'string' && data.eventDate) return data.eventDate;
  // Fallback: today in local time as "YYYY-MM-DD"
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  const giftId = extractGiftId(data);
  if (giftId) {
    callbacks.onOpenGift?.(giftId);
    return;
  }
  const chatId = extractChatId(data);
  if (chatId) {
    callbacks.onOpenChat?.(chatId);
    return;
  }
  const visionItemId = extractVisionBoardItemId(data);
  if (visionItemId) {
    callbacks.onOpenVisionBoardItem?.(visionItemId);
    return;
  }
  const memoryId = extractMemoryId(data);
  if (memoryId) {
    callbacks.onOpenMemory?.(memoryId);
    return;
  }
  const calendarEventDate = extractCalendarEventDate(data);
  if (calendarEventDate) {
    callbacks.onOpenCalendarEvent?.(calendarEventDate);
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
