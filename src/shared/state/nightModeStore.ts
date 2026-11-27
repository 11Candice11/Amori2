/**
 * nightModeStore
 *
 * Tracks whether the app is in "night mode" — the window when the EC2 is
 * stopped to save costs (10pm–7am SAST, i.e. 20:00–05:00 UTC).
 *
 * Detection is time-based so it works without a network call. The store also
 * tracks a "server confirmed down" flag which the API client sets on a network
 * failure during night hours, used to show a more specific message.
 *
 * SAST = UTC+2, no DST. Night window: 10pm SAST (20:00 UTC) → 7am SAST (05:00 UTC).
 */

import { useEffect, useState } from 'react';

/** Night window in UTC hours (inclusive start, exclusive end, wraps midnight). */
const NIGHT_START_UTC = 20; // 10pm SAST
const NIGHT_END_UTC   = 4;  // 6am SAST

/**
 * Returns true if the given UTC Date falls within the night window.
 * The window crosses midnight: 20:00–23:59 and 00:00–04:59 UTC.
 */
export function isNightHour(date: Date = new Date()): boolean {
  const utcHour = date.getUTCHours();
  return utcHour >= NIGHT_START_UTC || utcHour < NIGHT_END_UTC;
}

/** How many milliseconds until the night window ends (server comes back). */
export function msUntilMorning(date: Date = new Date()): number {
  const now = date.getTime();
  const nextMorning = new Date(date);
  nextMorning.setUTCHours(NIGHT_END_UTC, 0, 0, 0);
  if (nextMorning.getTime() <= now) {
    // Already past today's 5am UTC — target tomorrow's
    nextMorning.setUTCDate(nextMorning.getUTCDate() + 1);
  }
  return nextMorning.getTime() - now;
}

// ── Observable store ──────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

let _isNight = isNightHour();
/** True when we've had an actual network failure during night hours. */
let _serverConfirmedDown = false;
let _transitionTimer: ReturnType<typeof setTimeout> | null = null;

function notify(): void {
  listeners.forEach(l => l());
}

/** Schedule a re-check at the next boundary (night start or morning). */
function scheduleNextTransition(): void {
  if (_transitionTimer !== null) clearTimeout(_transitionTimer);

  const now = new Date();
  let msUntil: number;

  if (_isNight) {
    // Currently night — wake up at 5am UTC
    msUntil = msUntilMorning(now);
  } else {
    // Currently day — sleep at 8pm UTC
    const nextNight = new Date(now);
    nextNight.setUTCHours(NIGHT_START_UTC, 0, 0, 0);
    if (nextNight.getTime() <= now.getTime()) {
      nextNight.setUTCDate(nextNight.getUTCDate() + 1);
    }
    msUntil = nextNight.getTime() - now.getTime();
  }

  _transitionTimer = setTimeout(() => {
    _isNight = isNightHour();
    if (!_isNight) {
      // Morning: clear the server-down flag so the sync prompt can appear
      _serverConfirmedDown = false;
    }
    notify();
    scheduleNextTransition();
  }, msUntil + 1000); // +1s buffer past the boundary
}

// Kick off the transition scheduler immediately
scheduleNextTransition();

export const nightModeStore = {
  /** True when it's currently 10pm–7am SAST. */
  isNight(): boolean {
    return _isNight;
  },

  /**
   * Call this from the API client when a request fails during night hours.
   * Signals that the server is confirmed down (not just a flaky network).
   */
  confirmServerDown(): void {
    if (_isNight && !_serverConfirmedDown) {
      _serverConfirmedDown = true;
      notify();
    }
  },

  /** True after a network failure during night hours confirmed the server is down. */
  isServerConfirmedDown(): boolean {
    return _serverConfirmedDown;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** React hook — re-renders when night mode transitions. */
export function useNightMode(): { isNight: boolean; serverConfirmedDown: boolean } {
  const [state, setState] = useState(() => ({
    isNight: nightModeStore.isNight(),
    serverConfirmedDown: nightModeStore.isServerConfirmedDown(),
  }));

  useEffect(() => {
    return nightModeStore.subscribe(() => {
      setState({
        isNight: nightModeStore.isNight(),
        serverConfirmedDown: nightModeStore.isServerConfirmedDown(),
      });
    });
  }, []);

  return state;
}
