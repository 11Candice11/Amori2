/**
 * Shared mood display helpers used across features.
 *
 * Consolidates the identical `moodLabel` implementations previously duplicated
 * in CheckInScreen, MoodDetailScreen, and HomeScreen.
 */

/** Backend MoodType → friendly display label. */
export const MOOD_DISPLAY: Record<string, string> = {
  Happy: 'Joyful & Bright',
  Calm: 'Content & Grounded',
  Anxious: 'Anxious',
  Sad: 'Heavy & Sad',
  Angry: 'Irritable',
  Overwhelmed: 'Overwhelmed',
  Numb: 'Numb & Distant',
  Other: 'Something unnamed',
};

/**
 * Friendly label for a stored mood. Prefers the specific feelings text when
 * available, falls back to the display-mapped mood type.
 *
 * Overload 1: pass mood and feelings separately (CheckIn / MoodDetail pattern).
 * Overload 2: pass a mood object with both fields (Home / Dashboard pattern).
 */
export function moodLabel(mood: string, feelings: string | null): string;
export function moodLabel(mood: { mood: string; feelings: string | null } | null): string | null;
export function moodLabel(
  moodOrObj: string | { mood: string; feelings: string | null } | null,
  feelings?: string | null,
): string | null {
  if (moodOrObj === null) return null;

  if (typeof moodOrObj === 'object') {
    if (moodOrObj.feelings?.trim()) return moodOrObj.feelings;
    return MOOD_DISPLAY[moodOrObj.mood] ?? moodOrObj.mood;
  }

  // Two-arg form
  if (feelings?.trim()) return feelings;
  return MOOD_DISPLAY[moodOrObj] ?? moodOrObj;
}
