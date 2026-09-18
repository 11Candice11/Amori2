import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentSummaryItem, IncidentSummaryStats } from '../types/incident.types';

export interface HelpDeskData {
  stats: IncidentSummaryStats | null;
  recentIncidents: IncidentSummaryItem[];
  overdueIncidents: IncidentSummaryItem[];
  loading: boolean;
  error: string | null;
}

export function useHelpDesk(): HelpDeskData & { refresh: () => void } {
  const [data, setData] = useState<HelpDeskData>({
    stats: null,
    recentIncidents: [],
    overdueIncidents: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }));
    try {
      const [summaryResult, recentResult, overdueResult] = await Promise.allSettled([
        incidentService.getIncidentSummary(),
        incidentService.getIncidents({ pageSize: 8 }),
        incidentService.getIncidents({ overdue: true, pageSize: 5 }),
      ]);

      const stats = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
      const recentIncidents = recentResult.status === 'fulfilled' ? recentResult.value.items : [];
      const overdueIncidents = overdueResult.status === 'fulfilled' ? overdueResult.value.items : [];

      setData({ stats, recentIncidents, overdueIncidents, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load';
      setData(d => ({
        ...d,
        loading: false,
        error: message,
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...data, refresh: load };
}
