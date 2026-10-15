/**
 * aggregateWeek — pure selectors that turn the raw data fetched for a week
 * into the shape the Weekly Reflection screen renders.
 *
 * The caller passes an arbitrary list of check-ins (useWeeklyReflection fetches
 * the user's full history from GET /api/moods/check-ins) and these selectors
 * slice it to the requested week. Check-ins outside the range are ignored, so
 * the same list serves every week the user pages back to.
 *
 * These functions are deliberately side-effect free (no fetching, no clock
 * reads beyond the passed range) so they're easy to unit test.
 */
import {
  quadrantFromCheckIn,
  type MoodQuadrant,
} from '../../mood/types/mood.types';
import { isVisualMedia } from '../../memories/types/memory.types';
import {
  getWeekDays,
  isWithinWeek,
  parseToLocalTime,
  weekdayIndexOf,
  type WeekRange,
} from '../utils/weekRange';
import type {
  DayMood,
  QuadrantDistribution,
  WeeklyMemoryThumb,
  WeeklyMilestone,
  WeeklyReflection,
  WeeklyReflectionInputs,
} from '../types/weeklyReflection.types';

const EMPTY_DISTRIBUTION: QuadrantDistribution = {
  HIGH_PLEASANT: 0,
  LOW_PLEASANT: 0,
  HIGH_UNPLEASANT: 0,
  LOW_UNPLEASANT: 0,
};

/** Max memory thumbnails shown in the strip. */
const MAX_MEMORY_THUMBS = 6;

/**
 * Build the seven MON…SUN day cells. When multiple check-ins land on the same
 * day, the latest one wins (it best reflects how the day ended).
 */
export function buildDayMoods(
  checkIns: WeeklyReflectionInputs['checkIns'],
  range: WeekRange,
): DayMood[] {
  const days = getWeekDays(range);

  // Sort ascending so a later check-in overwrites an earlier one for its day.
  const sorted = [...checkIns].sort(
    (a, b) =>
      (parseToLocalTime(a.createdAt) ?? 0) - (parseToLocalTime(b.createdAt) ?? 0),
  );

  const cells: DayMood[] = days.map((date, dayIndex) => ({
    dayIndex,
    date,
    dayOfMonth: date.getDate(),
    hasCheckIn: false,
    quadrant: null,
    label: null,
  }));

  for (const checkIn of sorted) {
    const idx = weekdayIndexOf(checkIn.createdAt, range);
    if (idx < 0) continue;
    cells[idx].hasCheckIn = true;
    cells[idx].quadrant = quadrantFromCheckIn(checkIn.feelings, checkIn.mood);
    cells[idx].label = checkIn.feelings ?? checkIn.mood ?? null;
  }

  return cells;
}

/** Tally each mapped quadrant across the week's day cells. */
export function buildDistribution(days: DayMood[]): QuadrantDistribution {
  const distribution: QuadrantDistribution = { ...EMPTY_DISTRIBUTION };
  for (const day of days) {
    if (day.quadrant) distribution[day.quadrant] += 1;
  }
  return distribution;
}

/**
 * The most frequent quadrant and how many days it covered. Ties resolve by a
 * gentle preference order (pleasant states first) so the copy leans warm.
 */
export function findDominant(distribution: QuadrantDistribution): {
  quadrant: MoodQuadrant | null;
  count: number;
} {
  const order: MoodQuadrant[] = [
    'LOW_PLEASANT',
    'HIGH_PLEASANT',
    'LOW_UNPLEASANT',
    'HIGH_UNPLEASANT',
  ];
  let best: MoodQuadrant | null = null;
  let bestCount = 0;
  for (const quadrant of order) {
    if (distribution[quadrant] > bestCount) {
      best = quadrant;
      bestCount = distribution[quadrant];
    }
  }
  return { quadrant: best, count: bestCount };
}

/** First loadable visual (photo/video) media URL on a memory, if any. */
function firstVisualUrl(media: { url: string; mediaType: number | string }[]): string | null {
  const visual = media.find((m) => isVisualMedia(m.mediaType) && m.url);
  return visual?.url ?? null;
}

/** Memories whose `memoryDateTime` falls in the week, newest first. */
export function buildMemoryThumbs(
  memories: WeeklyReflectionInputs['memories'],
  range: WeekRange,
): { count: number; thumbs: WeeklyMemoryThumb[] } {
  const inWeek = memories
    .filter((m) => isWithinWeek(m.memoryDateTime, range))
    .sort(
      (a, b) =>
        (parseToLocalTime(b.memoryDateTime) ?? 0) -
        (parseToLocalTime(a.memoryDateTime) ?? 0),
    );

  const thumbs: WeeklyMemoryThumb[] = inWeek.slice(0, MAX_MEMORY_THUMBS).map((m) => ({
    id: m.id,
    title: m.title,
    thumbnailUrl: firstVisualUrl(m.media),
    createdByName: m.createdByName ?? null,
    memoryDateTime: m.memoryDateTime,
  }));

  return { count: inWeek.length, thumbs };
}

/** Hugs sent vs received by the current user within the week. */
export function buildHugCounts(
  hugs: WeeklyReflectionInputs['hugs'],
  currentUserId: string | null,
  range: WeekRange,
): { sent: number; received: number } {
  let sent = 0;
  let received = 0;
  for (const hug of hugs) {
    if (!isWithinWeek(hug.createdAt, range)) continue;
    if (currentUserId && hug.senderId === currentUserId) sent += 1;
    else if (currentUserId && hug.recipientId === currentUserId) received += 1;
  }
  return { sent, received };
}

/**
 * Completed milestones this week: timeline events whose `eventDate` lands in
 * the range, plus bucket-list items completed (`completedAt`) in the range.
 * Newest first.
 */
export function buildMilestones(
  timeline: WeeklyReflectionInputs['timeline'],
  bucketList: WeeklyReflectionInputs['bucketList'],
  range: WeekRange,
): WeeklyMilestone[] {
  const fromTimeline: WeeklyMilestone[] = timeline
    .filter((t) => isWithinWeek(t.eventDate, range))
    .map((t) => ({
      id: t.id,
      title: t.title,
      kind: t.eventType,
      when: t.eventDate,
      source: 'timeline' as const,
    }));

  const fromBucket: WeeklyMilestone[] = bucketList
    .filter((b) => b.isCompleted && isWithinWeek(b.completedAt, range))
    .map((b) => ({
      id: b.id,
      title: b.title,
      kind: typeof b.category === 'string' ? b.category : 'Milestone',
      when: b.completedAt as string,
      source: 'bucketList' as const,
    }));

  return [...fromTimeline, ...fromBucket].sort(
    (a, b) => (parseToLocalTime(b.when) ?? 0) - (parseToLocalTime(a.when) ?? 0),
  );
}

/** Aggregate all inputs for the week into the reflection view-model. */
export function aggregateWeek(
  inputs: WeeklyReflectionInputs,
  range: WeekRange,
): WeeklyReflection {
  const days = buildDayMoods(inputs.checkIns, range);
  const checkInDays = days.filter((d) => d.hasCheckIn).length;
  const distribution = buildDistribution(days);
  const { quadrant: dominantQuadrant, count: dominantCount } = findDominant(distribution);
  const { count: memoryCount, thumbs: memoryThumbs } = buildMemoryThumbs(
    inputs.memories,
    range,
  );
  const { sent: hugsSent, received: hugsReceived } = buildHugCounts(
    inputs.hugs,
    inputs.currentUserId,
    range,
  );
  const milestones = buildMilestones(inputs.timeline, inputs.bucketList, range);

  return {
    days,
    checkInDays,
    distribution,
    dominantQuadrant,
    dominantCount,
    memoryCount,
    memoryThumbs,
    hugsSent,
    hugsReceived,
    milestones,
    isEmpty: checkInDays === 0,
  };
}
