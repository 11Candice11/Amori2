/**
 * notificationStore — the app-wide cache of the signed-in user's notifications.
 *
 * The header bell appears on several tab roots, and each would otherwise run
 * its own poller and show a different count mid-refresh. This store is the
 * single source of truth: one shared poller fills it, every bell reads the same
 * unread count from it, and the notifications list writes read-state changes
 * back so the badge updates the instant a notification is opened.
 *
 * Modeled on userSettingsStore (hand-rolled listener store, no external state
 * library — matching the app's convention).
 */
import { useEffect, useState } from 'react';

import { notificationService } from '../../services/notifications/notificationService';
import type { NotificationResponse } from '../../services/api/types';

type Listener = () => void;

const POLL_INTERVAL_MS = 30_000;

/** Newest-first comparator on ISO `createdAt`. */
function byNewestFirst(a: NotificationResponse, b: NotificationResponse): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

let items: NotificationResponse[] = [];
let hasLoaded = false;
let inFlight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let subscriberCount = 0;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function unreadOf(list: NotificationResponse[]): number {
  return list.reduce((n, item) => (item.isRead ? n : n + 1), 0);
}

export const notificationStore = {
  /** All notifications, newest first. */
  getAll(): NotificationResponse[] {
    return items;
  },

  /** Count of unread notifications. */
  getUnreadCount(): number {
    return unreadOf(items);
  },

  hasLoaded(): boolean {
    return hasLoaded;
  },

  /**
   * Fetch the notification list from the server. Concurrent callers share the
   * request. Errors are swallowed so polling never surfaces transient failures.
   */
  refresh(): Promise<void> {
    if (inFlight) return inFlight;

    inFlight = notificationService
      .getNotifications()
      .then((all) => {
        items = [...all].sort(byNewestFirst);
        hasLoaded = true;
        notify();
      })
      .catch(() => {
        // Leave the cache as-is on failure.
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  /** Mark one notification read locally, then persist (revert on failure). */
  async markRead(id: string): Promise<void> {
    const target = items.find((n) => n.id === id);
    if (!target || target.isRead) return;

    items = items.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
    );
    notify();

    try {
      await notificationService.markRead(id);
    } catch {
      items = items.map((n) => (n.id === id ? { ...n, isRead: false, readAt: null } : n));
      notify();
    }
  },

  /** Mark every notification read locally, then persist (re-sync on failure). */
  async markAllRead(): Promise<void> {
    if (!items.some((n) => !n.isRead)) return;
    const now = new Date().toISOString();
    items = items.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt: now }));
    notify();

    try {
      await notificationService.markAllRead();
    } catch {
      notificationStore.refresh();
    }
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    subscriberCount += 1;
    // First subscriber starts the shared poller.
    if (subscriberCount === 1) {
      notificationStore.refresh();
      pollTimer = setInterval(() => notificationStore.refresh(), POLL_INTERVAL_MS);
    }
    return () => {
      listeners.delete(listener);
      subscriberCount -= 1;
      if (subscriberCount <= 0 && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
        subscriberCount = 0;
      }
    };
  },

  /** Drops cached state. Used on sign-out. */
  reset(): void {
    items = [];
    hasLoaded = false;
    inFlight = null;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    subscriberCount = 0;
    notify();
  },
};

/**
 * Subscribe a component to the unread count. Starts the shared poller on first
 * mount and re-renders whenever the count changes.
 */
export function useNotificationCount(): number {
  const [count, setCount] = useState(() => notificationStore.getUnreadCount());

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      setCount(notificationStore.getUnreadCount());
    });
    return unsubscribe;
  }, []);

  return count;
}

/**
 * Subscribe a component to the full notification list (newest first). Used by
 * the notifications screen; keeps it in step with the shared store so the bell
 * badge and the list never disagree.
 */
export function useNotificationList(): {
  notifications: NotificationResponse[];
  loading: boolean;
} {
  const [, force] = useState(0);
  const [loading, setLoading] = useState(() => !notificationStore.hasLoaded());

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      force((n) => n + 1);
      setLoading(false);
    });
    if (!notificationStore.hasLoaded()) {
      notificationStore.refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  return { notifications: notificationStore.getAll(), loading };
}
