/**
 * notificationRouting — the single place that decides where a notification
 * takes the user.
 *
 * Both entry points use it:
 *   • tapping an OS push banner (pushHandlers → registerNotificationListeners)
 *   • tapping a row in the in-app Notifications inbox
 *
 * They used to have separate routing code that drifted apart (the inbox checked
 * for "VisionBoardItem"/"CalendarEvent" while the server sends
 * "VisionBoardItemAdded"/"CalendarEventAdded", so those rows did nothing).
 * Routing everything through here keeps them identical.
 *
 * Navigation goes through the app-wide `navigationRef` so it works from outside
 * any screen (push taps arrive before a screen is focused).
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { MainTabParamList } from './types';
import {
  routeNotificationTap,
  type NotificationData,
  type PushHandlerCallbacks,
} from '../services/notifications/pushHandlers';

/** App-wide navigation ref; attached to the NavigationContainer in App.tsx. */
export const navigationRef = createNavigationContainerRef<MainTabParamList>();

/** Navigate via the root ref, ignoring calls made before navigation mounts. */
function go(name: keyof MainTabParamList, params?: object): void {
  if (!navigationRef.isReady()) return;
  // Nested-stack params ({ screen, params }) aren't expressible against the
  // tab param list's types, so the call is widened here, in one place.
  (navigationRef.navigate as unknown as (route: string, routeParams?: object) => void)(
    name,
    params,
  );
}

/**
 * Destinations for each notification type. The Hug, Splitting, Vault, Chat
 * flows etc. are hidden tabs (no bottom-bar button), so these navigate into
 * the nested stack explicitly.
 */
export const notificationRoutes: Required<PushHandlerCallbacks> = {
  /** Hug → the hug confirmation screen for that hug. */
  onOpenHug: (hugId) => go('Hugs', { screen: 'HugSent', params: { hugId, deliveryMs: 0 } }),

  /** Incident (SLA breach, reassignment, status change, close) → ticket detail. */
  onOpenIncident: (incidentId) =>
    go('Desk', { screen: 'IncidentDetail', params: { incidentId } }),

  /**
   * Link request → Link Partner modal on Profile. The `openLink` nonce changes
   * each time so ProfileScreen re-opens the modal even when already focused.
   */
  onOpenPartnerLink: () => go('Profile', { openLink: Date.now() }),

  /** Gift received → the Vault, which auto-opens the gift with this id. */
  onOpenGift: (giftId) => go('Vault', { giftId }),

  /** Let's Chat message → the chat (opening it as the recipient marks it read). */
  onOpenChat: (conversationId) =>
    go('Chat', { screen: 'ChatDetail', params: { conversationId } }),

  /** Vision Board item added / achieved → that item's detail screen. */
  onOpenVisionBoardItem: (itemId) =>
    go('Together', { screen: 'VisionBoardItemDetail', params: { itemId } }),

  /** Memory added → the Memories list (the new memory is at the top). */
  onOpenMemory: () => go('Together', { screen: 'Memories' }),

  /** Calendar event added → the shared calendar. */
  onOpenCalendarEventCreated: () => go('Together', { screen: 'Calendar' }),

  /** Bucket-list item added → the bucket list's screen on Together. */
  onOpenBucketListItem: () => go('Together', { screen: 'DateIdeas' }),

  /** Wishlist item added → the shared wishlist. */
  onOpenWishlistItem: () => go('Together', { screen: 'Wishlist' }),

  /** Calendar event with a date ("YYYY-MM-DD") → that day's view. */
  onOpenCalendarEvent: (eventDate) =>
    go('Together', { screen: 'CalendarDay', params: { date: eventDate } }),
};

/**
 * Route a notification the user tapped. Accepts either a push payload
 * (`data.type`, `data.referenceId`) or an inbox row mapped to the same shape.
 * Returns true when the notification led somewhere.
 */
export function openNotification(data: NotificationData | undefined): boolean {
  return routeNotificationTap(data, notificationRoutes);
}
