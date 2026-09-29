/**
 * useMonthlyMemories — shared fetch/group/filter logic for the "Monthly
 * Memories" feature (both the dashboard widget and the full screen consume it).
 *
 * The Memories API (GET /api/memories, memoriesService.getAll) takes NO query
 * params — there is no date-range filter server-side. So we fetch the full list
 * once and derive everything client-side, memoizing the grouped result so we
 * don't re-filter on every render. Callers can step the selected month without
 * refetching; only a pull-to-refresh (or focus) reloads from the network.
 *
 * All date logic keys off `memoryDateTime` (the ISO date the memory *happened*),
 * never `createdAt` (the server record-creation time) — matching MemoriesScreen.
 *
 * Two buckets are produced for the selected month:
 *   - addedThisMonth: memories whose month AND year match the selected month.
 *   - onThisMonthInPastYears: memories whose month matches but whose year is
 *     earlier, grouped by year, most-recent year first ("On this day in [year]").
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { memoriesService } from '../services/memoriesService';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { MemoryResponse } from '../types/memory.types';
import { isPhotoMedia } from '../types/memory.types';

// ─── Month-key helpers ────────────────────────────────────────────────────────

/** A selected month, addressed as a stable "YYYY-MM" string. */
export type MonthKey = string;

/** Build a "YYYY-MM" key for a given year/month (month is 0-indexed). */
export function monthKeyOf(year: number, monthIndex0: number): MonthKey {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
}

/** The "YYYY-MM" key for the current calendar month. */
export function currentMonthKey(): MonthKey {
  const now = new Date();
  return monthKeyOf(now.getFullYear(), now.getMonth());
}

/** Parse a "YYYY-MM" key into { year, monthIndex0 }. Falls back to now. */
export function parseMonthKey(key: MonthKey): { year: number; monthIndex0: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(key);
  if (!m) {
    const now = new Date();
    return { year: now.getFullYear(), monthIndex0: now.getMonth() };
  }
  return { year: Number(m[1]), monthIndex0: Number(m[2]) - 1 };
}

/** Step a "YYYY-MM" key by ±1 month, rolling the year over as needed. */
export function stepMonthKey(key: MonthKey, delta: number): MonthKey {
  const { year, monthIndex0 } = parseMonthKey(key);
  const d = new Date(year, monthIndex0 + delta, 1);
  return monthKeyOf(d.getFullYear(), d.getMonth());
}

/** e.g. "September 2025" — the human label for a month key. */
export function monthKeyLabel(key: MonthKey): string {
  const { year, monthIndex0 } = parseMonthKey(key);
  return new Date(year, monthIndex0, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

/** e.g. "September" — month name only, for section copy. */
export function monthNameOf(key: MonthKey): string {
  const { monthIndex0 } = parseMonthKey(key);
  return new Date(2000, monthIndex0, 1).toLocaleDateString(undefined, { month: 'long' });
}

// ─── Memory helpers (shared with widget + screen) ───────────────────────────────

/** Milliseconds for a memory's event date; 0 when unparseable (sorts last). */
export function memoryTime(m: MemoryResponse): number {
  const t = new Date(m.memoryDateTime).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Loadable photo URLs for a memory (skips media without a resolved URL). */
export function memoryPhotoUrls(m: MemoryResponse): string[] {
  return m.media
    .filter((mm) => isPhotoMedia(mm.mediaType) && !!mm.url)
    .map((mm) => resolveMediaUrl(mm.url));
}

/**
 * Up to `limit` preview photo URLs across a set of memories, preferring photos
 * from favorited memories first, then most-recent memories. Used for the
 * widget's fanned thumbnail stack.
 */
export function previewPhotoUrls(memories: MemoryResponse[], limit = 3): string[] {
  const ordered = [...memories].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return memoryTime(b) - memoryTime(a);
  });
  const uris: string[] = [];
  for (const m of ordered) {
    for (const uri of memoryPhotoUrls(m)) {
      uris.push(uri);
      if (uris.length >= limit) return uris;
    }
  }
  return uris;
}

// ─── Grouping types ─────────────────────────────────────────────────────────────

/** A past year's memories for the selected month ("On this day in 2023"). */
export interface PastYearGroup {
  year: number;
  memories: MemoryResponse[];
}

export interface MonthlyGrouping {
  /** Memories whose month AND year match the selected month, newest first. */
  addedThisMonth: MemoryResponse[];
  /** Past-year memories for the same month, grouped by year, newest year first. */
  onThisMonthInPastYears: PastYearGroup[];
  /** addedThisMonth.length. */
  addedThisMonthCount: number;
  /** Total memories across all past years for this month. */
  pastYearsCount: number;
  /** Every memory relevant to this month (added + past years). */
  all: MemoryResponse[];
  /** True when nothing exists for this month in any year. */
  isEmpty: boolean;
}

/**
 * Pre-index memories by month-of-year (0–11) once, so stepping between months
 * is a cheap lookup rather than a full re-scan. The map is keyed by month index
 * and each bucket holds every memory whose event month matches, any year.
 */
function indexByMonth(memories: MemoryResponse[]): Map<number, MemoryResponse[]> {
  const byMonth = new Map<number, MemoryResponse[]>();
  for (const m of memories) {
    const d = new Date(m.memoryDateTime);
    if (Number.isNaN(d.getTime())) continue;
    const idx = d.getMonth();
    const bucket = byMonth.get(idx);
    if (bucket) bucket.push(m);
    else byMonth.set(idx, [m]);
  }
  return byMonth;
}

/** Group the memories for one selected month into the two dashboard buckets. */
function groupForMonth(
  byMonth: Map<number, MemoryResponse[]>,
  monthKey: MonthKey,
): MonthlyGrouping {
  const { year, monthIndex0 } = parseMonthKey(monthKey);
  const candidates = byMonth.get(monthIndex0) ?? [];

  const addedThisMonth: MemoryResponse[] = [];
  const pastByYear = new Map<number, MemoryResponse[]>();

  for (const m of candidates) {
    const y = new Date(m.memoryDateTime).getFullYear();
    if (y === year) {
      addedThisMonth.push(m);
    } else if (y < year) {
      const bucket = pastByYear.get(y);
      if (bucket) bucket.push(m);
      else pastByYear.set(y, [m]);
    }
    // Future years (relative to the selected month) are intentionally ignored;
    // "On this day in [year]" only looks backward.
  }

  addedThisMonth.sort((a, b) => memoryTime(b) - memoryTime(a));

  const onThisMonthInPastYears: PastYearGroup[] = Array.from(pastByYear.entries())
    .map(([y, list]) => ({
      year: y,
      memories: list.sort((a, b) => memoryTime(b) - memoryTime(a)),
    }))
    .sort((a, b) => b.year - a.year);

  const pastYearsCount = onThisMonthInPastYears.reduce(
    (sum, g) => sum + g.memories.length,
    0,
  );

  return {
    addedThisMonth,
    onThisMonthInPastYears,
    addedThisMonthCount: addedThisMonth.length,
    pastYearsCount,
    all: [...addedThisMonth, ...onThisMonthInPastYears.flatMap((g) => g.memories)],
    isEmpty: addedThisMonth.length === 0 && pastYearsCount === 0,
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export interface UseMonthlyMemoriesResult {
  /** The currently selected month, as "YYYY-MM". */
  monthKey: MonthKey;
  /** Human label for the selected month, e.g. "September 2025". */
  monthLabel: string;
  /** Month name only, e.g. "September". */
  monthName: string;
  /** Grouped memories for the selected month (memoized). */
  grouping: MonthlyGrouping;
  /** All memories fetched (unfiltered), newest first. */
  allMemories: MemoryResponse[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Select an explicit month ("YYYY-MM"). */
  setMonth: (key: MonthKey) => void;
  /** Step to the previous month. */
  goToPreviousMonth: () => void;
  /** Step to the next month. */
  goToNextMonth: () => void;
  /** Reset to the current calendar month. */
  goToCurrentMonth: () => void;
  /** Refetch from the network (does not change the selected month). */
  refresh: () => void;
  /** Reload from the network (used on focus). */
  reload: () => void;
}

/**
 * @param initialMonth Optional "YYYY-MM" to open on. Defaults to this month.
 */
export function useMonthlyMemories(initialMonth?: MonthKey): UseMonthlyMemoriesResult {
  const [monthKey, setMonthKey] = useState<MonthKey>(initialMonth ?? currentMonthKey());
  const [allMemories, setAllMemories] = useState<MemoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const memories = await memoriesService.getAll();
      setAllMemories(memories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load memories.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const reload = useCallback(() => {
    load();
  }, [load]);

  // Pre-index once per fetch; stepping months only re-runs the cheap grouping.
  const byMonth = useMemo(() => indexByMonth(allMemories), [allMemories]);
  const grouping = useMemo(() => groupForMonth(byMonth, monthKey), [byMonth, monthKey]);

  const setMonth = useCallback((key: MonthKey) => setMonthKey(key), []);
  const goToPreviousMonth = useCallback(
    () => setMonthKey((k) => stepMonthKey(k, -1)),
    [],
  );
  const goToNextMonth = useCallback(() => setMonthKey((k) => stepMonthKey(k, 1)), []);
  const goToCurrentMonth = useCallback(() => setMonthKey(currentMonthKey()), []);

  return {
    monthKey,
    monthLabel: useMemo(() => monthKeyLabel(monthKey), [monthKey]),
    monthName: useMemo(() => monthNameOf(monthKey), [monthKey]),
    grouping,
    allMemories,
    loading,
    refreshing,
    error,
    setMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    refresh,
    reload,
  };
}
