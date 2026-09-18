/**
 * useSpaceWindow — resolves the self-regulation window end-time (epoch ms) for
 * the current grounding flow, hydrating from the backend when needed.
 *
 * The flow threads `spaceEndsAt` (epoch ms) through navigation params, which is
 * instant but lost on an app restart. Since the window end-time is also
 * persisted on the session, we fall back to fetching the session by id and
 * reading its stored `spaceEndsAt` (ISO) so the countdown survives restart.
 */
import { useEffect, useState } from 'react';
import { splittingService } from '../services/splittingService';
import type { SplittingFlowState } from '../types/splitting.types';

export function useSpaceWindow(flow: SplittingFlowState): number | undefined {
  const [endsAt, setEndsAt] = useState<number | undefined>(flow.spaceEndsAt);

  useEffect(() => {
    // The in-flow value (fresh navigation) always wins.
    if (flow.spaceEndsAt != null) {
      setEndsAt(flow.spaceEndsAt);
      return;
    }
    // No in-flow value (e.g. after a restart) — hydrate from the session.
    if (!flow.sessionId) {
      setEndsAt(undefined);
      return;
    }
    let cancelled = false;
    splittingService
      .getSession(flow.sessionId)
      .then(session => {
        if (cancelled) return;
        const parsed = session.spaceEndsAt ? Date.parse(session.spaceEndsAt) : NaN;
        setEndsAt(Number.isNaN(parsed) ? undefined : parsed);
      })
      .catch(() => {
        if (!cancelled) setEndsAt(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [flow.spaceEndsAt, flow.sessionId]);

  return endsAt;
}
