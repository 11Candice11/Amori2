/**
 * artifactStore — persists whether today's Daily Artifact has been opened.
 *
 * The app has no state library or AsyncStorage installed, so — mirroring the
 * `themeStore` pattern — this uses the already-available `expo-file-system` to
 * write a tiny JSON file to the app's document directory.
 *
 * The opened flag is keyed by calendar day: the artifact is a *daily* gift, so
 * a stored "opened" only counts for the day it was opened. Opening it today
 * survives app relaunches, but a new day starts sealed again. All operations
 * are best-effort — persistence failures never crash the app; they just fall
 * back to "not opened".
 */
import * as FileSystem from 'expo-file-system';

const FILE_NAME = 'daily-artifact.json';

type StoredState = {
  /** The local calendar day (YYYY-MM-DD) the artifact was opened. */
  openedDate?: string;
};

/** Local calendar-day key, e.g. "2026-09-16". */
function todayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fileUri(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${FILE_NAME}` : null;
}

export const artifactStore = {
  /**
   * Whether today's artifact has already been opened. Resolves to `false` when
   * nothing is stored, the stored day isn't today, or on any read error.
   */
  async isOpenedToday(): Promise<boolean> {
    const uri = fileUri();
    if (!uri) return false;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return false;
      const raw = await FileSystem.readAsStringAsync(uri);
      const parsed = JSON.parse(raw) as StoredState;
      return parsed.openedDate === todayKey();
    } catch {
      return false;
    }
  },

  /** Mark today's artifact as opened. Best-effort — failures are swallowed. */
  async markOpenedToday(): Promise<void> {
    const uri = fileUri();
    if (!uri) return;
    try {
      const state: StoredState = { openedDate: todayKey() };
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(state));
    } catch {
      // Ignore — a failed write just means the flag won't persist.
    }
  },
};
