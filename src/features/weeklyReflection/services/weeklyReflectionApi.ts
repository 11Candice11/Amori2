/**
 * weeklyReflectionApi — thin wrapper over the backend weekly-reflection archive
 * (base route /api/weekly-reflections). This is the durable, cross-device home
 * for kept reflections; the on-device store (weeklyReflectionArchive) layers a
 * cache/offline fallback on top of it.
 *
 * Endpoints (all require auth; the archive is scoped server-side to the caller,
 * so a partner never sees what you've kept):
 *   GET    /api/weekly-reflections            → WeeklyReflectionArchiveResponse[] (newest first)
 *   GET    /api/weekly-reflections/{weekKey}   → WeeklyReflectionArchiveResponse
 *   POST   /api/weekly-reflections             → WeeklyReflectionArchiveResponse (upsert per weekKey)
 *   DELETE /api/weekly-reflections/{weekKey}   → 204
 *
 * The server stores the snapshot verbatim. Its snapshot shape matches the
 * client's SerializedReflection exactly (camelCase, `days[].date` as an ISO
 * string), so mapping to/from ArchivedReflection is a shallow field copy.
 */
import { api } from '../../../services/api/client';
import type { ArchivedReflection, SerializedReflection } from '../types/archive.types';

/** The wire shape returned by the backend (mirrors WeeklyReflectionArchiveResponse). */
export interface WeeklyReflectionArchiveResponse {
  weekKey: string;
  rangeLabel: string;
  /** ISO instant. */
  savedAt: string;
  moodDataPartial: boolean;
  snapshot: SerializedReflection;
}

/** The request body for POST (mirrors SaveWeeklyReflectionRequest). */
interface SaveWeeklyReflectionRequest {
  weekKey: string;
  rangeLabel: string;
  moodDataPartial: boolean;
  snapshot: SerializedReflection;
}

/** Wire response → the client's ArchivedReflection (identical fields today). */
function fromResponse(r: WeeklyReflectionArchiveResponse): ArchivedReflection {
  return {
    weekKey: r.weekKey,
    rangeLabel: r.rangeLabel,
    savedAt: r.savedAt,
    moodDataPartial: r.moodDataPartial,
    reflection: r.snapshot,
  };
}

export const weeklyReflectionApi = {
  async getAll(): Promise<ArchivedReflection[]> {
    const rows = await api.get<WeeklyReflectionArchiveResponse[]>('/api/weekly-reflections');
    return rows.map(fromResponse);
  },

  async getByWeekKey(weekKey: string): Promise<ArchivedReflection> {
    const row = await api.get<WeeklyReflectionArchiveResponse>(
      `/api/weekly-reflections/${encodeURIComponent(weekKey)}`,
    );
    return fromResponse(row);
  },

  async save(entry: ArchivedReflection): Promise<ArchivedReflection> {
    const body: SaveWeeklyReflectionRequest = {
      weekKey: entry.weekKey,
      rangeLabel: entry.rangeLabel,
      moodDataPartial: entry.moodDataPartial,
      snapshot: entry.reflection,
    };
    const row = await api.post<WeeklyReflectionArchiveResponse>(
      '/api/weekly-reflections',
      body,
    );
    return fromResponse(row);
  },

  async remove(weekKey: string): Promise<void> {
    await api.delete<void>(`/api/weekly-reflections/${encodeURIComponent(weekKey)}`);
  },
};
