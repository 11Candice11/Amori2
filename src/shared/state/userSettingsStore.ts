/**
 * userSettingsStore — the app-wide cache of the signed-in user's settings.
 *
 * Settings are edited on the profile screen, but they have to be *honoured*
 * elsewhere: the vibration preference matters wherever we buzz the device, not
 * where it's toggled. This store is that shared read path, so a feature screen
 * can check a preference without plumbing props through a navigator or
 * re-fetching /api/users/me.
 *
 * Reads are optimistic by design: until the fetch lands, every preference reads
 * as enabled, matching the server defaults. A preference should never appear
 * off just because we haven't loaded yet.
 */
import { useEffect, useState } from 'react';

import { authService } from '../../services/auth/authService';
import type { UserResponse } from '../../services/api/types';

type Listener = () => void;

/** The boolean preference fields of UserResponse. */
type SettingKey = {
  [K in keyof UserResponse]: UserResponse[K] extends boolean ? K : never;
}[keyof UserResponse];

/** String setting keys like checkInReminderTime. */
type StringSettingKey = {
  [K in keyof UserResponse]: UserResponse[K] extends string ? K : never;
}[keyof UserResponse];

/** null until /api/users/me resolves. */
let current: UserResponse | null = null;
let hasLoaded = false;
let inFlight: Promise<void> | null = null;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(listener => listener());
}

export const userSettingsStore = {
  /** The cached user, or null before the first successful load. */
  get(): UserResponse | null {
    return current;
  },

  /**
   * Read a single preference. Defaults to true when the user hasn't loaded,
   * which matches the server-side default for every flag.
   */
  isEnabled(key: SettingKey): boolean {
    return current?.[key] ?? true;
  },

  /**
   * Read a string setting. Returns the provided default when the user hasn't
   * loaded or when the value is not set.
   */
  getString(key: StringSettingKey, defaultValue: string): string {
    const value = current?.[key];
    return typeof value === 'string' ? value : defaultValue;
  },

  /** Replace the cached user — call this with any fresh UserResponse. */
  set(user: UserResponse | null): void {
    hasLoaded = user != null;
    current = user;
    notify();
  },

  /**
   * Apply a partial change locally, for optimistic toggles. Ignored when
   * nothing is cached yet, since there'd be no base to merge onto.
   */
  merge(changes: Partial<UserResponse>): void {
    if (!current) return;
    current = { ...current, ...changes };
    notify();
  },

  /**
   * Fetch the user once per app session. Concurrent callers share the request;
   * already-loaded state resolves immediately. Pass force to re-fetch.
   */
  load(force = false): Promise<void> {
    if (!force && hasLoaded) return Promise.resolve();
    if (inFlight) return inFlight;

    inFlight = authService
      .getMe()
      .then(user => {
        userSettingsStore.set(user);
      })
      .catch(() => {
        // Offline, or not signed in yet. Leave the cache alone so preferences
        // keep reading as enabled rather than silently flipping off.
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Drops cached state. Used on sign-out, and as a test seam. */
  reset(): void {
    current = null;
    hasLoaded = false;
    inFlight = null;
    notify();
  },
};

/**
 * Subscribe a component to a single preference. Triggers the one-time load on
 * first mount and re-renders when the value changes.
 */
export function useUserSetting(key: SettingKey): boolean {
  const [value, setValue] = useState(() => userSettingsStore.isEnabled(key));

  useEffect(() => {
    const unsubscribe = userSettingsStore.subscribe(() => {
      setValue(userSettingsStore.isEnabled(key));
    });
    userSettingsStore.load();
    return unsubscribe;
  }, [key]);

  return value;
}

/**
 * Subscribe a component to a string setting. Triggers the one-time load on
 * first mount and re-renders when the value changes.
 */
export function useUserStringSetting(key: StringSettingKey, defaultValue: string): string {
  const [value, setValue] = useState(() => userSettingsStore.getString(key, defaultValue));

  useEffect(() => {
    const unsubscribe = userSettingsStore.subscribe(() => {
      setValue(userSettingsStore.getString(key, defaultValue));
    });
    userSettingsStore.load();
    return unsubscribe;
  }, [key, defaultValue]);

  return value;
}
