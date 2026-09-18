/**
 * usePartnerLinkNotifications — lightweight in-app poller for partner-link
 * notifications.
 *
 * The app has no push provider wired yet, and even with push, foreground
 * delivery + an in-app badge is expected. This hook polls the backend
 * notifications endpoint on an interval and reports how many unread
 * partner-link requests are waiting, so the UI can badge the "Link to partner"
 * entry and prompt the user to open it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { notificationService } from '../../../services/notifications/notificationService';
import type { NotificationResponse } from '../../../services/api/types';

const POLL_INTERVAL_MS = 30_000;

const PARTNER_LINK_TYPES = new Set([
  'PartnerLinkRequest',
  'PartnerLinkAccepted',
  'PartnerLinkDeclined',
]);

export interface PartnerLinkNotificationsState {
  /** Unread partner-link notifications, newest first. */
  unread: NotificationResponse[];
  /** Count of unread incoming link requests specifically. */
  unreadRequestCount: number;
  refresh: () => void;
  /** Mark all partner-link notifications read (call after opening the screen). */
  markSeen: () => Promise<void>;
}

export function usePartnerLinkNotifications(): PartnerLinkNotificationsState {
  const [unread, setUnread] = useState<NotificationResponse[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const all = await notificationService.getNotifications();
      setUnread(
        all.filter(
          (n) =>
            !n.isRead &&
            n.notificationType != null &&
            PARTNER_LINK_TYPES.has(n.notificationType),
        ),
      );
    } catch {
      // Silent — polling shouldn't surface transient network errors.
    }
  }, []);

  const markSeen = useCallback(async () => {
    const targets = unread;
    if (targets.length === 0) return;
    // Optimistically clear, then persist.
    setUnread([]);
    await Promise.allSettled(
      targets.map((n) => notificationService.markRead(n.id)),
    );
  }, [unread]);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, POLL_INTERVAL_MS);

    // Refresh immediately when the app returns to the foreground.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      if (timer.current) clearInterval(timer.current);
      sub.remove();
    };
  }, [refresh]);

  const unreadRequestCount = unread.filter(
    (n) => n.notificationType === 'PartnerLinkRequest',
  ).length;

  return { unread, unreadRequestCount, refresh, markSeen };
}
