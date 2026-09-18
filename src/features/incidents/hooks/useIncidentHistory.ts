import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentHistoryEntry } from '../types/incident.types';

export function useIncidentHistory(incidentId: string) {
  const [entries, setEntries] = useState<IncidentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentService.getIncidentHistory(incidentId);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { load(); }, [load]);

  return { entries, loading, error, refresh: load };
}
