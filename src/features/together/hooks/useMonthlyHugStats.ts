/**
 * useMonthlyHugStats — client-derived hug counts for a given month.
 *
 * There's no server-side stats endpoint, so we fetch all hugs once
 * (hugService.getHugs) and reduce them for the selected "YYYY-MM":
 *   - sent  = hugs this user sent that month
 *   - held  = hugs this user received that month AND acknowledged ("held")
 *   - received = hugs this user received that month (regardless of ack)
 *
 * Keyed to the same MonthKey the memories snapshot uses so both move together.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { hugService } from '../../hugs/services/hugService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import { parseMonthKey, type MonthKey } from '../../memories/hooks/useMonthlyMemories';
import type { HugResponse } from '../../../services/api/types';

export interface MonthlyHugStats {
  sent: number;
  received: number;
  held: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function inMonth(iso: string | null | undefined, year: number, monthIndex0: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === year && d.getMonth() === monthIndex0;
}

export function useMonthlyHugStats(monthKey: MonthKey): MonthlyHugStats {
  const [hugs, setHugs] = useState<HugResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setHugs(await hugService.getHugs());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load hug stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const myId = userSettingsStore.get()?.id;
    const { year, monthIndex0 } = parseMonthKey(monthKey);

    let sent = 0;
    let received = 0;
    let held = 0;

    for (const h of hugs) {
      if (myId && h.senderId === myId && inMonth(h.createdAt, year, monthIndex0)) {
        sent += 1;
      }
      if (myId && h.recipientId === myId && inMonth(h.createdAt, year, monthIndex0)) {
        received += 1;
        // "Held" = a received hug the user acknowledged (held onto) that month.
        if (h.isAcknowledged) held += 1;
      }
    }

    return { sent, received, held };
  }, [hugs, monthKey]);

  return { ...stats, loading, error, refresh: load };
}
