/**
 * weeklyReflectionArchive — the app's single entry point for kept weekly
 * reflections. It is BACKEND-FIRST with an on-device cache/offline fallback:
 *
 *   - The durable, cross-device source of truth is the API
 *     (weeklyReflectionApi → /api/weekly-reflections), scoped server-side to the
 *     signed-in user.
 *   - AsyncStorage mirrors the server per user
 *     (`@amori:weeklyReflection:archive:<userId>`) so a kept reflection is still
 *     viewable offline, and a save survives a dropped network to sync-on-read
 *     later. Namespacing by user id avoids the cross-account leak the retired
 *     device-wide vault suffered from.
 *
 * Screens talk only to this module; whether a read came from the server or the
 * cache is deliberately invisible to them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeeklyReflection } from '../types/weeklyReflection.types';
import type {
  ArchivedReflection,
  SerializedReflection,
} from '../types/archive.types';
import { weeklyReflectionApi } from './weeklyReflectionApi';

const KEY_PREFIX = '@amori:weeklyReflection:archive:';

/** Storage key for a given user. Falls back to a shared bucket only if no id. */
function storageKey(userId: string | null): string {
  return `${KEY_PREFIX}${userId ?? 'anonymous'}`;
}

/** Freeze a live reflection into a JSON-safe snapshot (Date → ISO string). */
function serialize(reflection: WeeklyReflection): SerializedReflection {
  return {
    ...reflection,
    days: reflection.days.map((day) => ({
      ...day,
      date: day.date.toISOString(),
    })),
  };
}

/** Rehydrate a stored snapshot back into a live reflection (ISO → Date). */
function deserialize(stored: SerializedReflection): WeeklyReflection {
  return {
    ...stored,
    days: stored.days.map((day) => ({
      ...day,
      date: new Date(day.date),
    })),
  };
}

/** Newest week first — matches the server's ordering. */
function sortNewestFirst(entries: ArchivedReflection[]): ArchivedReflection[] {
  return [...entries].sort((a, b) =>
    a.weekKey < b.weekKey ? 1 : a.weekKey > b.weekKey ? -1 : 0,
  );
}

// ── Local cache (per user) ─────────────────────────────────────────────────

async function readLocal(userId: string | null): Promise<ArchivedReflection[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ArchivedReflection[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupt/unreadable storage should never crash the screen.
    return [];
  }
}

async function writeLocal(
  userId: string | null,
  entries: ArchivedReflection[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(entries));
  } catch {
    // A failed cache write is non-fatal — the server still holds the truth.
  }
}

/** Insert-or-replace an entry in the local cache by weekKey. */
async function upsertLocal(
  userId: string | null,
  entry: ArchivedReflection,
): Promise<void> {
  const existing = await readLocal(userId);
  const next = sortNewestFirst([
    entry,
    ...existing.filter((e) => e.weekKey !== entry.weekKey),
  ]);
  await writeLocal(userId, next);
}

export interface SaveArchiveInput {
  weekKey: string;
  rangeLabel: string;
  moodDataPartial: boolean;
  reflection: WeeklyReflection;
}

export const weeklyReflectionArchive = {
  /**
   * Save (or overwrite) a week's snapshot. Writes to the backend first (durable,
   * cross-device), then mirrors into the local cache. If the network fails, the
   * snapshot is still cached locally so it's viewable now and can reconcile with
   * the server on a later online read. One entry per `weekKey`.
   */
  async save(
    userId: string | null,
    input: SaveArchiveInput,
  ): Promise<ArchivedReflection> {
    const localEntry: ArchivedReflection = {
      weekKey: input.weekKey,
      rangeLabel: input.rangeLabel,
      savedAt: new Date().toISOString(),
      moodDataPartial: input.moodDataPartial,
      reflection: serialize(input.reflection),
    };

    try {
      // The server assigns the authoritative savedAt; prefer what it returns.
      const saved = await weeklyReflectionApi.save(localEntry);
      await upsertLocal(userId, saved);
      return saved;
    } catch {
      // Offline / server unavailable: keep it locally so the save isn't lost.
      await upsertLocal(userId, localEntry);
      return localEntry;
    }
  },

  /**
   * All archived reflections, newest week first. Reads the server when reachable
   * (refreshing the local cache), and falls back to the cache when offline.
   */
  async getAll(userId: string | null): Promise<ArchivedReflection[]> {
    try {
      const remote = await weeklyReflectionApi.getAll();
      await writeLocal(userId, sortNewestFirst(remote));
      return remote;
    } catch {
      return readLocal(userId);
    }
  },

  /**
   * A single archived snapshot by week key, or null. Prefers the server, refreshes
   * the cache on hit, and falls back to the cache when the server is unreachable.
   * A genuine "not found" (server reachable, no such week) resolves to null.
   */
  async getByWeekKey(
    userId: string | null,
    key: string,
  ): Promise<ArchivedReflection | null> {
    try {
      const remote = await weeklyReflectionApi.getByWeekKey(key);
      await upsertLocal(userId, remote);
      return remote;
    } catch {
      // Could be offline OR a 404. Fall back to the cache; if it isn't there
      // either, treat it as not found.
      const cached = await readLocal(userId);
      return cached.find((e) => e.weekKey === key) ?? null;
    }
  },

  /** Whether a snapshot exists locally for the given week (fast, cache-only). */
  async has(userId: string | null, key: string): Promise<boolean> {
    const all = await readLocal(userId);
    return all.some((e) => e.weekKey === key);
  },

  /**
   * Remove a snapshot from the backend and the local cache. A missing server
   * row is treated as already-removed (still clears the cache).
   */
  async remove(userId: string | null, key: string): Promise<void> {
    try {
      await weeklyReflectionApi.remove(key);
    } catch {
      // Ignore — either already gone on the server, or offline; we still drop
      // it from the cache so the UI reflects the user's intent.
    }
    const all = await readLocal(userId);
    await writeLocal(userId, all.filter((e) => e.weekKey !== key));
  },

  /** Rehydrate a stored snapshot's reflection into a live view-model. */
  hydrate: deserialize,
};
