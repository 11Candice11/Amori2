/**
 * useWeeklyReflection — aggregates the current user's own week (Mon–Sun) from
 * the existing endpoints, entirely client-side.
 *
 * Mirrors the Home dashboard pattern (useDashboard): fire every request with
 * Promise.allSettled so one failed call degrades gracefully (HOME-1) instead
 * of blocking the whole screen, keep loading/error in a single state object,
 * and expose a `refresh`.
 *
 * Week navigation: `weekOffset` (0 = this week, -1 = last week …) drives which
 * range we aggregate. The data is fetched once (the list endpoints return the
 * full history), then re-aggregated locally whenever the offset changes — so
 * paging back a week is instant and doesn't refetch.
 *
 * Privacy: this is the user's OWN data, so there are no partner privacy checks
 * here. (A future "partner's week" view would rely on the server to redact per
 * shareMood/shareActivity, exactly as the dashboard does for partner mood.)
 *
 * Mood history: the strip is built from `GET /api/moods/check-ins`, which
 * returns every check-in the user has logged (newest first). Earlier this hook
 * read `GET /api/moods/current` — a single check-in — which made every week
 * render as "1/7 logged" no matter how faithfully the user checked in, and made
 * past weeks always look empty. `moodDataPartial` is therefore false now; the
 * flag survives only so snapshots archived before the fix keep explaining
 * themselves (see archive.types.ts).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { authService } from '../../../services/auth/authService';
import { moodService } from '../../mood/services/moodService';
import { memoriesService } from '../../memories/services/memoriesService';
import { timelineService } from '../../timeline/services/timelineService';
import { hugService } from '../../hugs/services/hugService';
import { togetherService } from '../../together/services/togetherService';

import type { CheckInResponse, HugResponse } from '../../../services/api/types';
import type { MemoryResponse } from '../../memories/types/memory.types';
import type { TimelineEventResponse } from '../../../services/api/types';
import type { BucketListItemResponse } from '../../together/types/together.types';

import { aggregateWeek } from '../selectors/aggregateWeek';
import { getWeekRange } from '../utils/weekRange';
import type { WeeklyReflection } from '../types/weeklyReflection.types';

/** Raw data fetched once and re-sliced per week offset. */
interface RawWeeklyData {
  currentUserId: string | null;
  checkIns: CheckInResponse[];
  memories: MemoryResponse[];
  timeline: TimelineEventResponse[];
  hugs: HugResponse[];
  bucketList: BucketListItemResponse[];
}

const EMPTY_RAW: RawWeeklyData = {
  currentUserId: null,
  checkIns: [],
  memories: [],
  timeline: [],
  hugs: [],
  bucketList: [],
};

export interface UseWeeklyReflectionResult {
  /** The aggregated reflection for the selected week. */
  reflection: WeeklyReflection;
  /** True on the first load (no data yet). */
  loading: boolean;
  /** Set only when the core call (the user) fails — a soft, non-blocking note. */
  error: string | null;
  /** The signed-in user's id (for namespacing the on-device archive), or null. */
  currentUserId: string | null;
  /** 0 = current week, -1 = last week, etc. */
  weekOffset: number;
  /** True when viewing the current week (disables "next"). */
  isCurrentWeek: boolean;
  /**
   * True when the mood strip was built from an incomplete picture of the week.
   * Always false now that full check-in history is fetched — kept so the value
   * can still be stamped onto newly archived snapshots alongside the older ones
   * that were saved while only the latest check-in was available.
   */
  moodDataPartial: boolean;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  refresh: () => void;
}

export function useWeeklyReflection(): UseWeeklyReflectionResult {
  const [raw, setRaw] = useState<RawWeeklyData>(EMPTY_RAW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      meResult,
      moodResult,
      memoriesResult,
      timelineResult,
      hugsResult,
      bucketResult,
    ] = await Promise.allSettled([
      authService.getMe(),
      moodService.getCheckIns(),
      memoriesService.getAll(),
      timelineService.getEvents(),
      hugService.getHugs(),
      togetherService.getBucketList(),
    ]);

    const currentUserId =
      meResult.status === 'fulfilled' ? meResult.value.id : null;

    // The user's full check-in history. Only their OWN check-ins feed the
    // reflection; aggregateWeek slices this down to the selected week.
    const checkIns = moodResult.status === 'fulfilled' ? moodResult.value : [];

    const memories =
      memoriesResult.status === 'fulfilled' ? memoriesResult.value : [];
    const timeline =
      timelineResult.status === 'fulfilled' ? timelineResult.value : [];
    const hugs = hugsResult.status === 'fulfilled' ? hugsResult.value : [];
    const bucketList =
      bucketResult.status === 'fulfilled' ? bucketResult.value : [];

    setRaw({ currentUserId, checkIns, memories, timeline, hugs, bucketList });
    setError(
      meResult.status === 'rejected'
        ? 'Some of your week could not be loaded.'
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const range = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const reflection = useMemo(
    () =>
      aggregateWeek(
        {
          currentUserId: raw.currentUserId,
          checkIns: raw.checkIns,
          memories: raw.memories,
          timeline: raw.timeline,
          hugs: raw.hugs,
          bucketList: raw.bucketList,
        },
        range,
      ),
    [raw, range],
  );

  const goToPreviousWeek = useCallback(() => setWeekOffset((o) => o - 1), []);
  // Never page into the future — the current week is the newest meaningful view.
  const goToNextWeek = useCallback(
    () => setWeekOffset((o) => Math.min(0, o + 1)),
    [],
  );

  return {
    reflection,
    loading,
    error,
    currentUserId: raw.currentUserId,
    weekOffset,
    isCurrentWeek: weekOffset === 0,
    // The strip is now built from the user's full check-in history, so a live
    // reflection is never a partial mood picture.
    moodDataPartial: false,
    goToPreviousWeek,
    goToNextWeek,
    refresh: load,
  };
}
