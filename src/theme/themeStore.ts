/**
 * themeStore — persists the user's theme preference (light/dark mode plus the
 * color variant) on the device.
 *
 * For now uses simple in-memory storage. In a full implementation, this would
 * use AsyncStorage to persist preferences across app restarts.
 */
import type { ThemeMode, ThemeVariant } from './colors';

/** The default mode when no preference has been saved yet - LOCKED TO DARK MODE. */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark' as const;
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

// Simple in-memory storage for theme preferences
let _themePreference: ThemePreference = DEFAULT_THEME_PREFERENCE;

export const themeStore = {
  /**
   * Read the theme preference. For now returns in-memory value.
   * In a full implementation, this would load from AsyncStorage.
   */
  async load(): Promise<ThemePreference> {
    return _themePreference;
  },

  /** Save the theme preference. For now stores in-memory only. */
  async save(pref: ThemePreference): Promise<void> {
    _themePreference = pref;
    // In a full implementation, you'd save to AsyncStorage here
  },
};
