/**
 * useLeaveSplittingFlow — persist the grounding session as the person ends or
 * leaves the "I'm Splitting" flow after the grounding checkpoint.
 *
 * Once someone passes the grounding checkpoint a backend session exists
 * (flow.sessionId is set) with their triggers; once they finish the Inward
 * Check it also has what they need. Whenever they subsequently leave the flow —
 * jumping out to Memories, returning to the sanctuary, backing out mid-flow, or
 * otherwise ending it — we complete that session so it lands in their grounding
 * history (with trigger + what-they-need + the date/time), even if they never
 * did the optional "how are you feeling now" check-in. Without this the session
 * stays InProgress and never surfaces in history.
 *
 * The save is best-effort and never blocks navigation: soothing the person
 * comes first. The backend rejects completing an already-finished session
 * (e.g. the journal already completed it, or they left twice) with a 409 —
 * that's fine, the record is still saved, so we swallow it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { splittingService } from '../services/splittingService';
import { widgetBridge } from '../../../services/native/widgetBridge';
import { CLIMATE_TO_MOOD } from '../types/splitting.types';
import type { SplittingAction, SplittingFlowState } from '../types/splitting.types';

interface LeaveOptions {
  /**
   * Extra actions to merge onto the session before completing — e.g. the
   * reassurance branch records 'Reassurance'. 'Grounding' is always added
   * since reaching this point means they did grounding work.
   */
  actions?: SplittingAction[];
}

/**
 * Complete the session, merging `Grounding` (plus any branch-specific actions)
 * onto whatever the earlier steps already recorded. Shared by the explicit
 * "leave" buttons and the automatic on-leave (beforeRemove) save. Idempotent
 * and best-effort — swallows the 409 that comes back if it's already finished.
 */
async function completeGrounding(
  sessionId: string,
  climate: SplittingFlowState['climate'],
  extraActions: SplittingAction[] = [],
): Promise<void> {
  // The self-regulation window is ending, so retire its Live Activity. Marked
  // finished (complete) rather than cancelled. No-op where unsupported.
  void widgetBridge.endSplittingActivity(true);

  try {
    // Merge onto existing actions so earlier steps aren't clobbered — the
    // backend replaces the array rather than appending.
    const merged = new Set<SplittingAction>(['Grounding', ...extraActions]);
    try {
      const current = await splittingService.getSession(sessionId);
      // A session that's no longer in progress is already saved — nothing to do.
      if (current.status !== 'InProgress') return;
      current.actionsTaken.forEach(a => merged.add(a));
    } catch {
      // Couldn't read current actions — proceed with what we know.
    }

    // The complete endpoint accepts actionsTaken + finalMood in one call, so we
    // don't need a separate update first (which would also require InProgress).
    await splittingService.completeSession(sessionId, {
      actionsTaken: Array.from(merged),
      finalMood: climate ? CLIMATE_TO_MOOD[climate] : null,
    });
  } catch {
    // Best-effort: an already-completed session (or any transient error) must
    // never block the person from leaving. The record is still saved.
  }
}

export function useLeaveSplittingFlow(flow: SplittingFlowState) {
  const [saving, setSaving] = useState(false);
  // Guard against double-saves from rapid taps / re-entrant navigation.
  const inFlight = useRef(false);

  const saveAndLeave = useCallback(
    async (options: LeaveOptions = {}): Promise<void> => {
      if (!flow.sessionId || inFlight.current) return;

      inFlight.current = true;
      setSaving(true);
      try {
        await completeGrounding(flow.sessionId, flow.climate, options.actions ?? []);
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
    [flow.sessionId, flow.climate],
  );

  return { saveAndLeave, saving };
}

/**
 * useSaveGroundingOnLeave — automatically complete the grounding session when
 * the person leaves this screen by removing it from the stack (hardware/gesture
 * back, swipe-back, or popToTop). Use on the screens that sit *after* the Inward
 * Check, so backing out mid-flow still records their trigger + what they need.
 *
 * We only react to the screen being removed (React Navigation's `beforeRemove`),
 * not to forward navigation — pushing another flow screen leaves this one
 * mounted, so it won't fire. The save is fire-and-forget: `beforeRemove` can't
 * be awaited, and we never want to trap the person on the screen.
 *
 * Idempotent by design: if an explicit "leave" button already saved (or the
 * journal completed the session), the backend 409s and we swallow it.
 */
export function useSaveGroundingOnLeave(
  flow: SplittingFlowState,
  options: LeaveOptions = {},
): void {
  const navigation = useNavigation();
  // Keep the latest flow/options in refs so the listener reads current values
  // without re-subscribing on every render.
  const latest = useRef({ flow, options });
  latest.current = { flow, options };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const { flow: f, options: o } = latest.current;
      // Only save once they've completed the Inward Check (a need is chosen) —
      // that's the bar for a session worth keeping: we have their trigger AND
      // what they need. A session with only triggers (they backed out before
      // the Inward Check) isn't saved to history.
      if (!f.sessionId || !f.need) return;
      // Fire-and-forget: beforeRemove doesn't wait for promises, and we don't
      // preventDefault, so navigation proceeds immediately.
      void completeGrounding(f.sessionId, f.climate, o.actions ?? []);
    });
    return unsubscribe;
  }, [navigation]);
}
