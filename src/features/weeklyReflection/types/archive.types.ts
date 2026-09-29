/**
 * Types for an *archived* Weekly Reflection — a point-in-time snapshot the user
 * chose to keep, so it stays viewable exactly as it was rather than being
 * recomputed live (memory URLs, counts, and mood picture are frozen).
 */
import type { WeeklyReflection } from './weeklyReflection.types';

/** A saved snapshot of one week's reflection. */
export interface ArchivedReflection {
  /**
   * Stable week identifier (the Monday, "YYYY-MM-DD"). Doubles as the archive
   * primary key — one snapshot per week; re-saving overwrites in place.
   */
  weekKey: string;
  /** Human label for the week, e.g. "October 12 – 18, 2026". */
  rangeLabel: string;
  /** ISO instant the snapshot was taken. */
  savedAt: string;
  /**
   * Whether the mood picture was partial when saved (the backend history gap).
   * Preserved so an old snapshot doesn't misrepresent itself as complete.
   */
  moodDataPartial: boolean;
  /** The frozen reflection view-model. `days[].date` is stored as an ISO string. */
  reflection: SerializedReflection;
}

/**
 * The reflection with its non-JSON-safe fields serialized. `DayMood.date` is a
 * Date at runtime; on disk it's an ISO string, rehydrated on read.
 */
export type SerializedReflection = Omit<WeeklyReflection, 'days'> & {
  days: SerializedDayMood[];
};

export type SerializedDayMood = Omit<WeeklyReflection['days'][number], 'date'> & {
  /** ISO instant for the day's local start. */
  date: string;
};
