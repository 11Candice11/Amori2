/**
 * dailyGiftStore — pins which memory or vision + card is "today's gift" for the calendar day.
 *
 * The daily gift is meant to be stable for the whole day: whatever card the user
 * first sees (on the Sanctuary dashboard or via a High-Pleasant check-in) must be
 * the exact same gift everywhere else that day, and the exact card that lands in
 * their vault when they save it.
 *
 * dailyGiftService derives the gift randomly from memories and vision board items,
 * but that derivation runs against the *current* list — if an item is added/removed
 * or the backend returns a different order, the pick could silently change. To make
 * the pick durable we persist the chosen itemId + type + cardNumber keyed by the
 * calendar day, and read it back instead of re-rolling.
 *
 * Uses AsyncStorage with an in-memory cache for performance, mirroring artifactStore.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'daily-gift-selection';
const HISTORY_KEY = 'daily-gift-history';

/**
 * How many recently-gifted memories to remember so we don't repeat the same
 * gift on consecutive mornings. Kept small so that couples with only a handful
 * of memories still eventually see every memory again.
 */
const HISTORY_LIMIT = 5;

export type StoredGiftSelection = {
  /** The local calendar day (YYYY-MM-DD) the selection was pinned. */
  date: string;
  /** The type of gift - memory or vision. */
  type: 'memory' | 'vision';
  /** The chosen memory's id (present when type === 'memory'). */
  memoryId?: string;
  /** The chosen vision board item's id (present when type === 'vision'). */
  visionId?: string;
  /** The chosen card design (any card in the deck). */
  cardNumber: number;
};

// In-memory cache for performance.
const memoryCache: Record<string, string> = {};

/** Local calendar-day key, e.g. "2026-09-16". */
function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const dailyGiftStore = {
  /**
   * Today's pinned gift selection, or `null` when nothing is stored or the
   * stored selection is from a previous day.
   */
  async getTodaysSelection(): Promise<StoredGiftSelection | null> {
    try {
      let raw = memoryCache[CACHE_KEY];

      if (!raw) {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (stored) {
          memoryCache[CACHE_KEY] = stored;
          raw = stored;
        }
      }

      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredGiftSelection;
      return parsed.date === todayKey() ? parsed : null;
    } catch {
      return null;
    }
  },

  /** Pin today's gift selection so every viewing returns the same gift. */
  async setTodaysSelection(
    itemId: string,
    cardNumber: number,
    type: 'memory' | 'vision',
  ): Promise<void> {
    try {
      const state: StoredGiftSelection = {
        date: todayKey(),
        type,
        cardNumber,
        ...(type === 'memory' ? { memoryId: itemId } : { visionId: itemId }),
      };
      const serialized = JSON.stringify(state);
      memoryCache[CACHE_KEY] = serialized;
      await AsyncStorage.setItem(CACHE_KEY, serialized);
    } catch {
      // Ignore — a failed write just means the pick falls back to date-seeded
      // derivation, which is stable as long as the memory list doesn't change.
    }
  },

  /**
   * The memory IDs gifted over the last few days, newest first. Used to avoid
   * handing out the same memory on consecutive mornings.
   */
  async getRecentMemoryIds(): Promise<string[]> {
    try {
      let raw = memoryCache[HISTORY_KEY];
      if (!raw) {
        const stored = await AsyncStorage.getItem(HISTORY_KEY);
        if (stored) {
          memoryCache[HISTORY_KEY] = stored;
          raw = stored;
        }
      }
      if (!raw) return [];
      const parsed = JSON.parse(raw) as string[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Record a memory as gifted, pushing it to the front of the recent history
   * and trimming to HISTORY_LIMIT. No-ops if it's already the most recent entry.
   */
  async recordGiftedMemory(memoryId: string): Promise<void> {
    try {
      const existing = await this.getRecentMemoryIds();
      const next = [memoryId, ...existing.filter((id) => id !== memoryId)].slice(
        0,
        HISTORY_LIMIT,
      );
      const serialized = JSON.stringify(next);
      memoryCache[HISTORY_KEY] = serialized;
      await AsyncStorage.setItem(HISTORY_KEY, serialized);
    } catch {
      // Ignore — a missed history write just risks an occasional repeat.
    }
  },

  /** Reset the pinned selection (for debugging/testing purposes). */
  async reset(): Promise<void> {
    try {
      delete memoryCache[CACHE_KEY];
      delete memoryCache[HISTORY_KEY];
      await AsyncStorage.multiRemove([CACHE_KEY, HISTORY_KEY]);
    } catch {
      // Ignore errors.
    }
  },
};
