/**
 * themeStore — persists the user's theme preference (light/dark mode plus the
 * color variant) on the device.
 *
 * The app has no state library or AsyncStorage installed, so — mirroring the
 * in-memory `tokenStore` pattern in services/api/client.ts — this uses the
 * already-available `expo-file-system` to write a tiny JSON file to the app's
 * document directory. All operations are best-effort: persistence failures
 * never crash the app, they just fall back to the defaults.
 */
import * as FileSystem from 'expo-file-system';
import type { ThemeMode, ThemeVariant } from './colors';

const FILE_NAME = 'theme-preference.json';

/** The default mode when no preference has been saved yet. */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
/** The default color variant when no preference has been saved yet. */
export const DEFAULT_THEME_VARIANT: ThemeVariant = 'botanical';

export type ThemePreference = {
  mode: ThemeMode;
  variant: ThemeVariant;
};

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  mode: DEFAULT_THEME_MODE,
  variant: DEFAULT_THEME_VARIANT,
};

function fileUri(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${FILE_NAME}` : null;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function isThemeVariant(value: unknown): value is ThemeVariant {
  return value === 'botanical' || value === 'gold';
}

export const themeStore = {
  /**
   * Read the persisted theme preference. Resolves to defaults when nothing is
   * stored yet or on any read error. Tolerates the legacy `{ mode }`-only file.
   */
  async load(): Promise<ThemePreference> {
    const uri = fileUri();
    if (!uri) return DEFAULT_THEME_PREFERENCE;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return DEFAULT_THEME_PREFERENCE;
      const raw = await FileSystem.readAsStringAsync(uri);
      const parsed = JSON.parse(raw) as { mode?: unknown; variant?: unknown };
      return {
        mode: isThemeMode(parsed.mode) ? parsed.mode : DEFAULT_THEME_MODE,
        variant: isThemeVariant(parsed.variant)
          ? parsed.variant
          : DEFAULT_THEME_VARIANT,
      };
    } catch {
      return DEFAULT_THEME_PREFERENCE;
    }
  },

  /** Persist the theme preference. Best-effort — failures are swallowed. */
  async save(pref: ThemePreference): Promise<void> {
    const uri = fileUri();
    if (!uri) return;
    try {
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(pref));
    } catch {
      // Ignore — a failed write just means the preference won't persist.
    }
  },
};
