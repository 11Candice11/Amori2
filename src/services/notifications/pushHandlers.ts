/**
 * pushHandlers - wires expo-notifications runtime behaviour:
 *    how notifications appear while the app is foregrounded
 *    what happens when the user taps a notification
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
 *   "CalendarEventAdded"       data.referenceId = eventId
 *   "BucketListItemAdded"      data.referenceId = itemId
 *   "WishlistItemAdded"        data.referenceId = itemId
 *   "VisionBoardItemAdded"     data.referenceId = itemId
 *   "VisionBoardItemCompleted" data.referenceId = itemId
 *   "CalendarEvent"            data.referenceId = eventId, data.eventDate = "YYYY-MM-DD"
 */
import { Platform } from 'react-native';

export type NotificationData = Record<string, unknown>;

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
   * with data.type === "VisionBoardItemAdded" or "VisionBoardItemCompleted"
   * and data.referenceId === <itemId>.
   */
  onOpenVisionBoardItem?: (itemId: string) => void;
  /**
   * Called when the user taps a memory notification (partner added a new memory).
   * Opens the Memories screen with the specific memory in focus. Backend sends
   * these with data.type === "MemoryAdded" and data.referenceId === <memoryId>.
   */
  onOpenMemory?: (memoryId: string) => void;
  /**
   * Called when the user taps a calendar event creation notification (partner
   * created a new event). Backend sends these with data.type === "CalendarEventAdded"
   * and data.referenceId === <eventId>.
   */
  onOpenCalendarEventCreated?: (eventId: string) => void;
  /**
   * Called when the user taps a bucket list item notification (partner added
   * an item). Backend sends these with data.type === "BucketListItemAdded"
   * and data.referenceId === <itemId>.
   */
  onOpenBucketListItem?: (itemId: string) => void;
  /**
   * Called when the user taps a wishlist item notification (partner added
   * an item). Backend sends these with data.type === "WishlistItemAdded"
   * and data.referenceId === <itemId>.
   */
  onOpenWishlistItem?: (itemId: string) => void;
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
 * in Expo Go and managed-workflow builds - it is NOT set in bare React Native
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

function extractCalendarEventCreatedId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'CalendarEventAdded' && ref ? ref : null;
}

function extractBucketListItemId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'BucketListItemAdded' && ref ? ref : null;
}

function extractWishlistItemId(data: NotificationData | undefined): string | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  const ref = typeof data.referenceId === 'string' ? data.referenceId : null;
  return type === 'WishlistItemAdded' && ref ? ref : null;
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

/**
 * Route a tapped notification's data payload to the right callback.
 *
 * Used for both OS push taps and in-app inbox taps (via
 * navigation/notificationRouting), so the two always agree. Returns true when
 * the payload matched a known type and a callback ran.
 */
export function routeNotificationTap(
  data: NotificationData | undefined,
  callbacks: PushHandlerCallbacks,
): boolean {
  const hugId = extractHugId(data);
  if (hugId && callbacks.onOpenHug) {
    callbacks.onOpenHug(hugId);
    return true;
  }
  const incidentId = extractIncidentId(data);
  if (incidentId && callbacks.onOpenIncident) {
    callbacks.onOpenIncident(incidentId);
    return true;
  }
  if (isPartnerLinkRequest(data) && callbacks.onOpenPartnerLink) {
    callbacks.onOpenPartnerLink();
    return true;
  }
  const giftId = extractGiftId(data);
  if (giftId && callbacks.onOpenGift) {
    callbacks.onOpenGift(giftId);
    return true;
  }
  const chatId = extractChatId(data);
  if (chatId && callbacks.onOpenChat) {
    callbacks.onOpenChat(chatId);
    return true;
  }
  const memoryId = extractMemoryId(data);
  if (memoryId && callbacks.onOpenMemory) {
    callbacks.onOpenMemory(memoryId);
    return true;
  }
  const calendarEventCreatedId = extractCalendarEventCreatedId(data);
  if (calendarEventCreatedId && callbacks.onOpenCalendarEventCreated) {
    callbacks.onOpenCalendarEventCreated(calendarEventCreatedId);
    return true;
  }
  const bucketListItemId = extractBucketListItemId(data);
  if (bucketListItemId && callbacks.onOpenBucketListItem) {
    callbacks.onOpenBucketListItem(bucketListItemId);
    return true;
  }
  const wishlistItemId = extractWishlistItemId(data);
  if (wishlistItemId && callbacks.onOpenWishlistItem) {
    callbacks.onOpenWishlistItem(wishlistItemId);
    return true;
  }
  const visionItemId = extractVisionBoardItemId(data);
  if (visionItemId && callbacks.onOpenVisionBoardItem) {
    callbacks.onOpenVisionBoardItem(visionItemId);
    return true;
  }
  const calendarEventDate = extractCalendarEventDate(data);
  if (calendarEventDate && callbacks.onOpenCalendarEvent) {
    callbacks.onOpenCalendarEvent(calendarEventDate);
    return true;
  }
  return false;
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

  // User tapped a notification (app foreground/background/quit  opened).
  const responseSub = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as NotificationData | undefined;
    routeNotificationTap(data, callbacks);
  });

  // If the app was launched by tapping a notification while fully quit, handle
  // that initial response too.
  Notifications.getLastNotificationResponseAsync?.().then(response => {
    if (!response) return;
    const data = response.notification.request.content.data as NotificationData | undefined;
    routeNotificationTap(data, callbacks);
  }).catch(() => { /* ignore */ });

  return () => {
    responseSub.remove();
  };
}

/** Platform helper retained for parity with the rest of the module. */
export const isIOS = Platform.OS === 'ios';
