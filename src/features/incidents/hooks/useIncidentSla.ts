import { useCallback, useEffect, useRef, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentSla } from '../types/incident.types';

export function useIncidentSla(incidentId: string) {
  const [sla, setSla] = useState<IncidentSla | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentService.getIncidentSla(incidentId);
      setSla(data);
      setRemainingSeconds(Math.max(0, data.remainingSeconds));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLA');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { load(); }, [load]);

  // Live countdown — ticks every second using the server-provided dueAt
  useEffect(() => {
    if (!sla) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const dueMs = new Date(sla.dueAt).getTime();
      const nowMs = Date.now();
      const diff = Math.max(0, (dueMs - nowMs) / 1000);
      setRemainingSeconds(diff);
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sla]);

  return { sla, remainingSeconds, loading, error, refresh: load };
}
