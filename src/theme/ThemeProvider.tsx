/**
 * ThemeProvider — runtime theming across two axes: light/dark `mode` and a
 * color `variant` ('botanical' default, or 'gold' set by a high-energy-pleasant
 * check-in).
 *
 * The app's ~60 StyleSheet.create blocks capture `colors` at module-load time,
 * so switching palettes at runtime requires two things:
 *   1. `applyTheme(mode, variant)` overwrites the live `colors` object in place, and
 *   2. the subtree is remounted (via a changing `key`) so those StyleSheets
 *      re-evaluate against the now-current palette.
 *
 * The provider owns the current mode + variant, persists changes via
 * `themeStore`, and exposes `useThemeMode()`. It re-applies + remounts on every
 * change so the whole app repaints consistently.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { applyTheme, type ThemeMode, type ThemeVariant } from './colors';
import {
  themeStore,
  DEFAULT_THEME_MODE,
  DEFAULT_THEME_VARIANT,
} from './themeStore';

type ThemeContextValue = {
  /** The active theme mode. */
  mode: ThemeMode;
  /** The active color variant. */
  variant: ThemeVariant;
  /** Convenience flag: true when mode === 'dark'. */
  isDark: boolean;
  /** Set an explicit mode. Persists and repaints the app. */
  setMode: (mode: ThemeMode) => void;
  /** Toggle between light and dark. */
  toggle: () => void;
  /** Set the color variant (e.g. 'gold' after a high-energy-pleasant check-in). */
  setVariant: (variant: ThemeVariant) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  /** The mode to start with — pass the persisted value loaded at bootstrap. */
  initialMode?: ThemeMode;
  /** The variant to start with — pass the persisted value loaded at bootstrap. */
  initialVariant?: ThemeVariant;
  children: React.ReactNode;
};

export function ThemeProvider({
  initialMode = DEFAULT_THEME_MODE,
  initialVariant = DEFAULT_THEME_VARIANT,
  children,
}: ThemeProviderProps) {
  // Ensure the live `colors` object matches the initial theme before first
  // paint. (Safe to call during render — it only mutates a plain object.)
  const [state, setState] = useState<{ mode: ThemeMode; variant: ThemeVariant }>(
    () => {
      applyTheme(initialMode, initialVariant);
      return { mode: initialMode, variant: initialVariant };
    },
  );

  const setMode = useCallback(
    (mode: ThemeMode) => {
      // LOCKED TO DARK MODE - ignore mode changes
      console.log('Theme locked to dark mode');
    },
    [],
  );

  const setVariant = useCallback(
    (variant: ThemeVariant) =>
      setState((current) => {
        if (current.variant === variant) return current;
        const next = { ...current, variant };
        applyTheme(next.mode, next.variant);
        void themeStore.save(next);
        return next;
      }),
    [],
  );

  const toggle = useCallback(() => {
    // LOCKED TO DARK MODE - ignore toggle
    console.log('Theme locked to dark mode');
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: state.mode,
      variant: state.variant,
      isDark: state.mode === 'dark',
      setMode,
      toggle,
      setVariant,
    }),
    [state.mode, state.variant, setMode, toggle, setVariant],
  );

  // Keying the subtree on mode+variant forces a full remount when the theme
  // changes, so every module-level StyleSheet re-runs against the palette that
  // `applyTheme` just wrote.
  const remountKey = `${state.variant}:${state.mode}`;

  return (
    <ThemeContext.Provider value={value}>
      <React.Fragment key={remountKey}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

/** Access the current theme and controls. Must be used within ThemeProvider. */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return ctx;
}
