/**
 * A tiny observable store for the app-wide feedback banner.
 *
 * Mirrors the pattern in userSettingsStore: module-level state, a Set of
 * listeners, and a `useBanner` hook. This lets any screen or service fire a
 * banner via the imperative `showBanner(...)` without prop-drilling a context
 * through the whole tree — matching the existing `logout()` / `navigationRef`
 * singletons.
 */
import { useEffect, useState } from 'react';

export type BannerType = 'success' | 'error';

export interface BannerState {
  /** Monotonic id so re-showing the same message re-triggers the animation. */
  id: number;
  type: BannerType;
  message: string;
  /** How long to stay on screen before auto-dismissing, in ms. */
  durationMs: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let current: BannerState | null = null;
let nextId = 1;

function notify(): void {
  listeners.forEach(listener => listener());
}

export interface ShowBannerOptions {
  message: string;
  type?: BannerType;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 2600;

/**
 * Show the banner. Safe to call from anywhere (screens, services, callbacks).
 * Calling again replaces whatever is currently shown.
 */
export function showBanner(options: ShowBannerOptions): void {
  current = {
    id: nextId++,
    type: options.type ?? 'success',
    message: options.message,
    durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
  };
  notify();
}

/** Convenience helper for the common success case. */
export function showSuccess(message: string, durationMs?: number): void {
  showBanner({ message, type: 'success', durationMs });
}

/** Convenience helper for the common error case. */
export function showError(message = 'Sorry that failed :(', durationMs?: number): void {
  showBanner({ message, type: 'error', durationMs });
}

/** Clear the banner (used on tap-to-dismiss and after auto-dismiss). */
export function hideBanner(): void {
  if (current === null) return;
  current = null;
  notify();
}

export const bannerStore = {
  get(): BannerState | null {
    return current;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Subscribe a component to the current banner state. Re-renders whenever a
 * banner is shown or dismissed.
 */
export function useBanner(): BannerState | null {
  const [state, setState] = useState<BannerState | null>(() => bannerStore.get());

  useEffect(() => {
    return bannerStore.subscribe(() => {
      setState(bannerStore.get());
    });
  }, []);

  return state;
}
