import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentFilter, IncidentSummaryItem } from '../types/incident.types';

export function useIncidentList(initialFilter: IncidentFilter = {}) {
  const [filter, setFilter] = useState<IncidentFilter>({ ...initialFilter, page: 1, pageSize: 20 });
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: IncidentFilter, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    try {
      const result = await incidentService.getIncidents(f);
      setIncidents(prev => append ? [...prev, ...result.items] : result.items);
      setTotalCount(result.totalCount);
      setHasMore(result.hasNextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(filter, false);
  }, [filter, load]);

  const refresh = useCallback(() => {
    const reset = { ...filter, page: 1 };
    setFilter(reset);
  }, [filter]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const next = { ...filter, page: (filter.page ?? 1) + 1 };
    setFilter(next);
    load(next, true);
  }, [filter, hasMore, loadingMore, load]);

  const applyFilter = useCallback((newFilter: IncidentFilter) => {
    setIncidents([]);
    setFilter({ ...newFilter, page: 1, pageSize: 20 });
  }, []);

  return { incidents, totalCount, hasMore, loading, loadingMore, error, refresh, loadMore, applyFilter };
}
