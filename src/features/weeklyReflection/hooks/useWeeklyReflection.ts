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
 * Backend gap: only `GET /api/moods/current` exists (the single most-recent
 * check-in) — there's no history-by-range endpoint. So `moodDataPartial` is
 * true whenever the mood strip is built from that single check-in, letting the
 * UI note that the mood picture is limited. The aggregation itself already
 * accepts an arbitrary check-in list, so it upgrades for free once a
 * `GET /api/moods/check-ins?from=&to=` endpoint exists.
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
   * True when the mood distribution is built from only the single latest
   * check-in (the backend gap). Lets the UI caveat the mood picture.
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
      moodService.getCurrent(),
      memoriesService.getAll(),
      timelineService.getEvents(),
      hugService.getHugs(),
      togetherService.getBucketList(),
    ]);

    const currentUserId =
      meResult.status === 'fulfilled' ? meResult.value.id : null;

    // moodService.getCurrent already swallows errors → null, but guard the
    // settled wrapper too. Only the user's OWN check-in feeds the reflection.
    const latestCheckIn =
      moodResult.status === 'fulfilled' ? moodResult.value : null;
    const checkIns = latestCheckIn ? [latestCheckIn] : [];

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
    // Any check-in that fed the strip came from /moods/current (a single item),
    // so the mood picture is partial whenever there's at least one check-in.
    moodDataPartial: raw.checkIns.length > 0,
    goToPreviousWeek,
    goToNextWeek,
    refresh: load,
  };
}
