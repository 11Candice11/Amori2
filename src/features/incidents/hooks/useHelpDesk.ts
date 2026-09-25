import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentSummaryItem, IncidentSummaryStats } from '../types/incident.types';

export interface HelpDeskData {
  stats: IncidentSummaryStats | null;
  recentIncidents: IncidentSummaryItem[];
  overdueIncidents: IncidentSummaryItem[];
  closedIncidents: IncidentSummaryItem[];
  loading: boolean;
  error: string | null;
}

export function useHelpDesk(): HelpDeskData & { refresh: () => void } {
  const [data, setData] = useState<HelpDeskData>({
    stats: null,
    recentIncidents: [],
    overdueIncidents: [],
    closedIncidents: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setData(d => ({ ...d, loading: true, error: null }));
    try {
      const [summaryResult, recentResult, overdueResult, closedResult] = await Promise.allSettled([
        incidentService.getIncidentSummary(),
        incidentService.getIncidents({ pageSize: 8 }),
        incidentService.getIncidents({ overdue: true, pageSize: 5 }),
        // Closed incidents aren't part of the "recent" page, so fetch them
        // separately to back the "Closed" tab / past-incidents view.
        incidentService.getIncidents({ status: 'Closed', pageSize: 20 }),
      ]);

      const stats = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
      const recentIncidents = recentResult.status === 'fulfilled' ? recentResult.value.items : [];
      const overdueIncidents = overdueResult.status === 'fulfilled' ? overdueResult.value.items : [];
      const closedIncidents = closedResult.status === 'fulfilled' ? closedResult.value.items : [];

      setData({ stats, recentIncidents, overdueIncidents, closedIncidents, loading: false, error: null });
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
