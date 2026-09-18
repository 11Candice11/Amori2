/**
 * useCountdown — a live countdown to a target epoch-ms timestamp.
 *
 * Used by the "self-regulation window" surfaces so the remaining space time
 * ticks down for real (rather than showing a fabricated static value). Ticks
 * once per second and clamps at zero. Pass `undefined` for an open-ended
 * window (no countdown), in which case `active` is false.
 */
import { useEffect, useMemo, useState } from 'react';

export interface Countdown {
  /** Whole seconds left until the target (0 once elapsed). */
  secondsLeft: number;
  /** Whether a bounded countdown is running. */
  active: boolean;
  /** True once the window has fully elapsed. */
  finished: boolean;
  /** Formatted "Mm Ss" / "Hh Mm" label for display, or null when inactive. */
  label: string | null;
}

function computeSecondsLeft(endsAt: number | undefined): number {
  if (!endsAt) return 0;
  return Math.max(0, Math.round((endsAt - Date.now()) / 1000));
}

function formatLabel(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    // Under an hour: show mm:ss so the final minutes visibly tick down.
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export function useCountdown(endsAt: number | undefined): Countdown {
  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(endsAt));

  useEffect(() => {
    if (!endsAt) {
      setSecondsLeft(0);
      return;
    }
    // Sync immediately (e.g. after the screen was backgrounded) then tick.
    setSecondsLeft(computeSecondsLeft(endsAt));
    const id = setInterval(() => {
      setSecondsLeft(computeSecondsLeft(endsAt));
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return useMemo<Countdown>(() => {
    const active = Boolean(endsAt);
    return {
      secondsLeft,
      active,
      finished: active && secondsLeft <= 0,
      label: active ? formatLabel(secondsLeft) : null,
    };
  }, [endsAt, secondsLeft]);
}
