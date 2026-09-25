/**
 * useSplittingHistory — the person's past grounding sessions, newest first.
 *
 * Reads the sessions the flow already persists via /api/splitting/sessions.
 * In-progress sessions are excluded: a session only becomes history once it's
 * been completed (Sanctuary Journal) or cancelled (left the flow early).
 */
import { useCallback, useEffect, useState } from 'react';
import { splittingService } from '../services/splittingService';
import type { SplittingSession } from '../types/splitting.types';

/** Most recent meaningful timestamp for ordering — completion, else creation. */
function sessionTime(session: SplittingSession): number {
  const completed = session.completedAt ? Date.parse(session.completedAt) : NaN;
  if (!Number.isNaN(completed)) return completed;
  const created = Date.parse(session.createdAt);
  return Number.isNaN(created) ? 0 : created;
}

export function useSplittingHistory() {
  const [sessions, setSessions] = useState<SplittingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await splittingService.getSessions();
      const finished = (Array.isArray(data) ? data : [])
        .filter(s => s.status !== 'InProgress')
        .sort((a, b) => sessionTime(b) - sessionTime(a));
      setSessions(finished);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your grounding history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, loading, error, refresh: load };
}
