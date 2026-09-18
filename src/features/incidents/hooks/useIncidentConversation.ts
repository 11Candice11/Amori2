import { useCallback, useEffect, useState } from 'react';
import { incidentService } from '../services/incidentService';
import type { IncidentNote, IncidentResponse } from '../types/incident.types';

export type ConversationItem =
  | { type: 'note'; data: IncidentNote }
  | { type: 'response'; data: IncidentResponse };

/**
 * Loads an incident's notes and responses and merges them into a single
 * chronologically-ordered conversation thread.
 */
export function useIncidentConversation(incidentId: string) {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [notesResult, responsesResult] = await Promise.allSettled([
        incidentService.getIncidentNotes(incidentId),
        incidentService.getIncidentResponses(incidentId),
      ]);

      const notes = notesResult.status === 'fulfilled' ? notesResult.value : [];
      const responses = responsesResult.status === 'fulfilled' ? responsesResult.value : [];

      const merged: ConversationItem[] = [
        ...notes.map((data): ConversationItem => ({ type: 'note', data })),
        ...responses.map((data): ConversationItem => ({ type: 'response', data })),
      ].sort(
        (a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime(),
      );

      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => { load(); }, [load]);

  return { items, loading, error, refresh: load };
}
