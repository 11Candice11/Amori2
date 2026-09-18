import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentDetail } from '../types/incident.types';

export function useIncidentDetail(incidentId: string) {
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await incidentService.getIncident(incidentId);
      setIncident(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incident');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { load(); }, [load]);

  return { incident, loading, error, refresh: load };
}
