/**
 * A tiny observable store for the app-wide "success" sparkles overlay.
 *
 * Mirrors bannerStore: module-level state, a Set of listeners, and a
 * `useSuccessOverlay` hook. Any create/save flow can celebrate a success with
 * the shared gold sparkles animation by calling `showSuccessOverlay(...)` —
 * no per-screen modal state or prop-drilling required. A single
 * `SuccessOverlayHost` mounted near the app root renders whatever is current.
 *
 * This is a heavier, centered celebration than the top `Banner`; use it for
 * "something was created" moments (a new memory, todo, incident, gift, etc.).
 */
import { useEffect, useState } from 'react';

export interface SuccessOverlayState {
  /** Monotonic id so re-firing re-triggers the animation from the start. */
  id: number;
  /** Optional confirmation line, e.g. "Memory saved". */
  message?: string;
  /** Fallback auto-dismiss (ms) if the animation-finished event never fires. */
  durationMs: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let current: SuccessOverlayState | null = null;
let nextId = 1;

function notify(): void {
  listeners.forEach(listener => listener());
}

export interface ShowSuccessOverlayOptions {
  message?: string;
  durationMs?: number;
}

// Matches the actual length of the sparkles animation (~5 s). The overlay auto-dismisses
// via onAnimationFinish; this is only the fallback if that callback never fires.
const DEFAULT_DURATION_MS = 5000;

/**
 * Show the success overlay. Safe to call from anywhere (screens, services,
 * callbacks). Calling again replaces whatever is currently shown and restarts
 * the animation.
 */
export function showSuccessOverlay(
  messageOrOptions?: string | ShowSuccessOverlayOptions,
): void {
  const options: ShowSuccessOverlayOptions =
    typeof messageOrOptions === 'string'
      ? { message: messageOrOptions }
      : messageOrOptions ?? {};

  current = {
    id: nextId++,
    message: options.message,
    durationMs: options.durationMs ?? DEFAULT_DURATION_MS,
  };
  notify();
}

/** Clear the overlay (used when the animation finishes or on tap-to-dismiss). */
export function hideSuccessOverlay(): void {
  if (current === null) return;
  current = null;
  notify();
}

export const successOverlayStore = {
  get(): SuccessOverlayState | null {
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
 * Subscribe a component to the current success-overlay state. Re-renders
 * whenever an overlay is shown or dismissed.
 */
export function useSuccessOverlay(): SuccessOverlayState | null {
  const [state, setState] = useState<SuccessOverlayState | null>(() =>
    successOverlayStore.get(),
  );

  useEffect(() => {
    return successOverlayStore.subscribe(() => {
      setState(successOverlayStore.get());
    });
  }, []);

  return state;
}
