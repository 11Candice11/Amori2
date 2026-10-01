/**
 * A tiny observable store for the app-wide "failure" Lottie overlay.
 *
 * The negative counterpart to successOverlayStore: same module-singleton +
 * listener-set + hook shape. Any create/save flow that fails can surface the
 * shared `unsuccess.json` animation by calling `showErrorOverlay(...)`. A
 * single host (see FeedbackOverlayHost) renders whatever is current.
 *
 * This is the heavier, centered counterpart to the top `Banner` error toast;
 * use it for "couldn't create that" moments so success and failure read with
 * matching weight.
 */
import { useEffect, useState } from 'react';

export interface ErrorOverlayState {
  /** Monotonic id so re-firing re-triggers the animation from the start. */
  id: number;
  /** Optional line, e.g. "Couldn't save that". */
  message?: string;
  /** Fallback auto-dismiss (ms) if the animation-finished event never fires. */
  durationMs: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let current: ErrorOverlayState | null = null;
let nextId = 1;

function notify(): void {
  listeners.forEach(listener => listener());
}

export interface ShowErrorOverlayOptions {
  message?: string;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 2500;

/**
 * Show the failure overlay. Safe to call from anywhere. Calling again replaces
 * whatever is currently shown and restarts the animation.
 */
export function showErrorOverlay(
  messageOrOptions?: string | ShowErrorOverlayOptions,
): void {
  const options: ShowErrorOverlayOptions =
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
export function hideErrorOverlay(): void {
  if (current === null) return;
  current = null;
  notify();
}

export const errorOverlayStore = {
  get(): ErrorOverlayState | null {
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
 * Subscribe a component to the current error-overlay state. Re-renders whenever
 * an overlay is shown or dismissed.
 */
export function useErrorOverlay(): ErrorOverlayState | null {
  const [state, setState] = useState<ErrorOverlayState | null>(() =>
    errorOverlayStore.get(),
  );

  useEffect(() => {
    return errorOverlayStore.subscribe(() => {
      setState(errorOverlayStore.get());
    });
  }, []);

  return state;
}
