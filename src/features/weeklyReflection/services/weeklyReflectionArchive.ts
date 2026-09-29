/**
 * weeklyReflectionArchive — persists snapshots of weekly reflections the user
 * chose to keep, so they can be re-opened later exactly as they were (rather
 * than recomputed live from the current data).
 *
 * Storage: AsyncStorage, keyed PER USER — `@amori:weeklyReflection:archive:<userId>`.
 * Namespacing by the signed-in user's id avoids the cross-account leak the
 * retired device-wide vault suffered from (two people on one install must not
 * share archives). The caller passes the current user id (from authService.getMe).
 *
 * There's no backend endpoint for this yet, so archives live on-device. When a
 * `POST /api/weekly-reflections` (or similar) endpoint lands, this module is the
 * single seam to swap AsyncStorage for the API — the screen only talks to it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeeklyReflection } from '../types/weeklyReflection.types';
import type {
  ArchivedReflection,
  SerializedReflection,
} from '../types/archive.types';

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

async function readAll(userId: string | null): Promise<ArchivedReflection[]> {
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

async function writeAll(
  userId: string | null,
  entries: ArchivedReflection[],
): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(entries));
}

export interface SaveArchiveInput {
  weekKey: string;
  rangeLabel: string;
  moodDataPartial: boolean;
  reflection: WeeklyReflection;
}

export const weeklyReflectionArchive = {
  /**
   * Save (or overwrite) a week's snapshot. One entry per `weekKey`, so
   * re-saving the same week refreshes it rather than duplicating. Returns the
   * stored entry. Newest-first ordering is maintained on write.
   */
  async save(
    userId: string | null,
    input: SaveArchiveInput,
  ): Promise<ArchivedReflection> {
    const entry: ArchivedReflection = {
      weekKey: input.weekKey,
      rangeLabel: input.rangeLabel,
      savedAt: new Date().toISOString(),
      moodDataPartial: input.moodDataPartial,
      reflection: serialize(input.reflection),
    };

    const existing = await readAll(userId);
    const withoutThisWeek = existing.filter((e) => e.weekKey !== entry.weekKey);
    const next = [entry, ...withoutThisWeek].sort((a, b) =>
      a.weekKey < b.weekKey ? 1 : a.weekKey > b.weekKey ? -1 : 0,
    );

    try {
      await writeAll(userId, next);
    } catch {
      // A failed write just means the snapshot won't persist; surface via the
      // returned entry so the UI can still confirm the in-session save.
    }
    return entry;
  },

  /** All archived reflections for the user, newest week first. */
  async getAll(userId: string | null): Promise<ArchivedReflection[]> {
    return readAll(userId);
  },

  /** A single archived snapshot by its week key, or null. */
  async getByWeekKey(
    userId: string | null,
    key: string,
  ): Promise<ArchivedReflection | null> {
    const all = await readAll(userId);
    return all.find((e) => e.weekKey === key) ?? null;
  },

  /** Whether a snapshot exists for the given week. */
  async has(userId: string | null, key: string): Promise<boolean> {
    const all = await readAll(userId);
    return all.some((e) => e.weekKey === key);
  },

  /** Remove a snapshot. No-op if it doesn't exist. */
  async remove(userId: string | null, key: string): Promise<void> {
    const all = await readAll(userId);
    const next = all.filter((e) => e.weekKey !== key);
    try {
      await writeAll(userId, next);
    } catch {
      // Ignore — deletion is best-effort.
    }
  },

  /** Rehydrate a stored snapshot's reflection into a live view-model. */
  hydrate: deserialize,
};
