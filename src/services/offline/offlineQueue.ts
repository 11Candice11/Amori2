/**
 * offlineQueue
 *
 * A lightweight AsyncStorage-backed queue for writes that happen during night
 * mode (10pm–7am SAST) when the EC2 is stopped.
 *
 * Only safe, idempotent, non-partner-dependent writes are queued:
 *   - Mood check-ins      POST /api/moods
 *   - Bucket list items   POST /api/bucket-list
 *   - To-do items         POST /api/bucket-list (type=todo) or /api/todos
 *   - Wishlist items      POST /api/wishlist
 *   - Memory drafts       POST /api/memories
 *
 * Writes that require real-time partner state (chat, hugs, SOS, incidents,
 * points) are NOT queued — those features show a "not available at night"
 * message instead.
 *
 * The queue is flushed automatically when the app detects morning (see
 * App.tsx) by calling offlineQueue.flush(). Each item is retried once; failed
 * items stay in the queue for the next flush.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const QUEUE_KEY = '@amori/offline-queue';

export type OfflineMethod = 'POST' | 'PATCH';

export interface QueuedRequest {
  id: string;           // uuid-like — Date.now() + random suffix
  method: OfflineMethod;
  path: string;
  body: unknown;
  /** ISO timestamp of when the request was queued. */
  queuedAt: string;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

async function loadQueue(): Promise<QueuedRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedRequest[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedRequest[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[offlineQueue] Failed to persist queue:', err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const offlineQueue = {
  /**
   * Add a request to the offline queue. Returns the queued item's id.
   * Call this instead of `api.post/patch` during night mode.
   */
  async enqueue(
    method: OfflineMethod,
    path: string,
    body: unknown,
  ): Promise<string> {
    const item: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      method,
      path,
      body,
      queuedAt: new Date().toISOString(),
    };

    const queue = await loadQueue();
    queue.push(item);
    await saveQueue(queue);

    console.log(`[offlineQueue] Queued ${method} ${path} (id: ${item.id})`);
    return item.id;
  },

  /** Returns how many items are currently waiting to be flushed. */
  async count(): Promise<number> {
    const queue = await loadQueue();
    return queue.length;
  },

  /**
   * Flush the queue — replay every queued request against the live API.
   * Successfully replayed items are removed; failed items stay for the next flush.
   *
   * Returns { succeeded, failed } counts.
   */
  async flush(): Promise<{ succeeded: number; failed: number }> {
    const queue = await loadQueue();
    if (queue.length === 0) return { succeeded: 0, failed: 0 };

    console.log(`[offlineQueue] Flushing ${queue.length} queued request(s) ...`);

    const remaining: QueuedRequest[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        if (item.method === 'POST') {
          await api.post(item.path, item.body);
        } else {
          await api.patch(item.path, item.body);
        }
        succeeded++;
        console.log(`[offlineQueue] Replayed ${item.method} ${item.path} (id: ${item.id})`);
      } catch (err) {
        console.warn(`[offlineQueue] Failed to replay ${item.method} ${item.path}:`, err);
        remaining.push(item);
        failed++;
      }
    }

    await saveQueue(remaining);
    console.log(`[offlineQueue] Flush complete — ${succeeded} ok, ${failed} failed`);
    return { succeeded, failed };
  },

  /** Clear the entire queue (e.g. on sign-out). */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
