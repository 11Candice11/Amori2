/**
 * artifactStore — persists whether today's Daily Artifact has been opened.
 *
 * Uses AsyncStorage with in-memory cache for performance. The opened flag is tied
 * to the specific calendar day: the artifact is a *daily* gift, so a stored
 * "opened" only counts for the day it was opened. Opening it today survives
 * app relaunches and persists until a new day starts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'daily-artifact';

type StoredState = {
  /** The local calendar day (YYYY-MM-DD) the artifact was opened. */
  openedDate?: string;
};

// In-memory cache for performance
const memoryCache: Record<string, string> = {};

/** Local calendar-day key, e.g. "2026-09-16". */
function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const artifactStore = {
  /**
   * Whether today's artifact has already been opened. Resolves to `false` when
   * nothing is stored or the stored day isn't today.
   */
  async isOpenedToday(): Promise<boolean> {
    try {
      // First check memory cache
      let raw = memoryCache[CACHE_KEY];
      
      // If not in memory, try AsyncStorage
      if (!raw) {
        const stored = await AsyncStorage.getItem(CACHE_KEY);
        if (stored) {
          // Cache it for next time
          memoryCache[CACHE_KEY] = stored;
          raw = stored;
        }
      }
      
      if (!raw) return false;
      
      const parsed = JSON.parse(raw) as StoredState;
      return parsed.openedDate === todayKey();
    } catch {
      return false;
    }
  },

  /** Mark today's artifact as opened. */
  async markOpenedToday(): Promise<void> {
    try {
      const state: StoredState = { openedDate: todayKey() };
      const serialized = JSON.stringify(state);
      
      // Update both memory cache and AsyncStorage
      memoryCache[CACHE_KEY] = serialized;
      await AsyncStorage.setItem(CACHE_KEY, serialized);
    } catch {
      // Ignore — a failed write just means the flag won't persist.
    }
  },

  /** 
   * Reset the artifact state (for debugging/testing purposes).
   * Clears both memory cache and AsyncStorage.
   */
  async reset(): Promise<void> {
    try {
      delete memoryCache[CACHE_KEY];
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore errors
    }
  },
};
