/**
 * useDayChange — fires a callback whenever the local calendar day rolls over.
 *
 * The mood check-in is a *daily* thing: once local midnight passes, the app
 * should treat "today's check-in" as gone so the user gets a fresh check-in.
 * Every screen that renders today's check-in already decides that with an
 * `isToday(createdAt)` check, but those checks only re-run on mount / focus /
 * refresh. If the app is simply left open across midnight, nothing re-runs and
 * yesterday's check-in lingers as "today's".
 *
 * This hook closes that gap. It fires the callback when:
 *   - a timer scheduled for the next local midnight elapses, and
 *   - the app returns to the foreground on a later calendar day (covers a
 *     device that was asleep / backgrounded straight through midnight, when
 *     JS timers don't fire reliably).
 *
 * The callback should re-fetch / re-derive today's check-in state. It is only
 * invoked on an actual day change, never on the initial mount.
 */
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/** A stable key for the local calendar day, e.g. "2026-9-22". */
function localDayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Milliseconds from now until the next local midnight (min 1s to avoid a 0 loop). */
function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1000, next.getTime() - now.getTime());
}

export function useDayChange(onDayChange: () => void): void {
  // Keep the latest callback without re-arming the timer every render.
  const callbackRef = useRef(onDayChange);
  callbackRef.current = onDayChange;

  // The day we last observed. A change from this value means midnight passed.
  const lastDayRef = useRef(localDayKey());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Fire if — and only if — the local day differs from the last one we saw.
    const maybeFireDayChange = () => {
      const today = localDayKey();
      if (today !== lastDayRef.current) {
        lastDayRef.current = today;
        callbackRef.current();
      }
    };

    // Re-arm a one-shot timer for the *next* midnight. Chaining one-shots (vs a
    // fixed 24h interval) keeps us aligned to the local day even across DST.
    const scheduleMidnight = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        maybeFireDayChange();
        scheduleMidnight();
      }, msUntilNextMidnight());
    };

    scheduleMidnight();

    // Foreground after being asleep past midnight: timers may not have fired.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        maybeFireDayChange();
        scheduleMidnight();
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);
}
