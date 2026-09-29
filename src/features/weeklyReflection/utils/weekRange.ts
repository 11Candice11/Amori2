/**
 * weekRange — Monday-anchored week window helpers for the Weekly Reflection.
 *
 * A "week" runs Monday 00:00 (local) → Sunday 23:59:59.999 (local). All bounds
 * are computed in the device's local timezone because the reflection is framed
 * around the user's own days ("this week"), matching how the Home dashboard
 * treats "today" locally (see useDayChange / isToday in useDashboard).
 *
 * `weekOffset` is 0 for the current week, -1 for last week, +1 for next week.
 */

export interface WeekRange {
  /** Local start of Monday 00:00:00.000. */
  start: Date;
  /** Local end of Sunday 23:59:59.999 (inclusive). */
  end: Date;
  /** 0 = current week, negative = past weeks, positive = future weeks. */
  offset: number;
}

/** The seven day labels, Monday-first, matching the design's MON…SUN strip. */
export const WEEKDAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

/** Midnight (local) at the start of the given date's day. */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Compute the Monday–Sunday range for the week containing `now`, shifted by
 * `weekOffset` weeks. Uses local time throughout.
 */
export function getWeekRange(weekOffset = 0, now: Date = new Date()): WeekRange {
  const today = startOfDay(now);

  // JS getDay(): Sun=0, Mon=1 … Sat=6. Convert to a Monday-first index (Mon=0).
  const mondayFirstIndex = (today.getDay() + 6) % 7;

  const start = new Date(today);
  start.setDate(today.getDate() - mondayFirstIndex + weekOffset * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end, offset: weekOffset };
}

/** The seven local day-start Dates (Mon→Sun) inside a week range. */
export function getWeekDays(range: WeekRange): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(range.start);
    d.setDate(range.start.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
}

/**
 * True when a timestamp/date falls inside the range (inclusive of both ends).
 *
 * Accepts full ISO instants (moods `createdAt`, memories `memoryDateTime`,
 * hugs `createdAt`, bucket-list `completedAt`) and date-only "YYYY-MM-DD"
 * strings (timeline `eventDate`). Date-only strings are parsed as local dates
 * so a Monday milestone isn't pushed into the previous week by a UTC offset.
 */
export function isWithinWeek(
  value: string | null | undefined,
  range: WeekRange,
): boolean {
  const time = parseToLocalTime(value);
  if (time == null) return false;
  return time >= range.start.getTime() && time <= range.end.getTime();
}

/**
 * Parse a wire date value to a local epoch-ms.
 * - "YYYY-MM-DD" → local midnight of that day (avoids UTC drift).
 * - Full ISO instant → its absolute time (compared against local bounds).
 */
export function parseToLocalTime(value: string | null | undefined): number | null {
  if (!value) return null;

  // Date-only string (timeline eventDate). Parse as a LOCAL calendar date.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Zero-based Monday-first day index (0–6) for a value within the week, or -1. */
export function weekdayIndexOf(
  value: string | null | undefined,
  range: WeekRange,
): number {
  const time = parseToLocalTime(value);
  if (time == null) return -1;
  const days = getWeekDays(range);
  for (let i = 0; i < days.length; i += 1) {
    const dayStart = days[i].getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
    if (time >= dayStart && time <= dayEnd) return i;
  }
  return -1;
}

/**
 * A human label for the range, e.g. "October 12 – 18, 2026" or, when the range
 * straddles two months, "October 28 – November 3, 2026".
 */
export function formatWeekRangeLabel(range: WeekRange): string {
  const { start, end } = range;
  const monthFmt: Intl.DateTimeFormatOptions = { month: 'long' };
  const startMonth = start.toLocaleDateString('en-US', monthFmt);
  const endMonth = end.toLocaleDateString('en-US', monthFmt);
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} – ${end.getDate()}, ${year}`;
  }
  return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${year}`;
}

/** Short chip label, e.g. "Oct 12 – 18". */
export function formatWeekRangeShort(range: WeekRange): string {
  const { start, end } = range;
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startLabel = start.toLocaleDateString('en-US', opts);
  const endLabel =
    start.getMonth() === end.getMonth()
      ? String(end.getDate())
      : end.toLocaleDateString('en-US', opts);
  return `${startLabel} – ${endLabel}`;
}

/** True when the range is the current (offset 0) week. */
export function isCurrentWeek(range: WeekRange): boolean {
  return range.offset === 0;
}

/** Whether today is Sunday (local) — used to surface the reflection on Home. */
export function isSunday(now: Date = new Date()): boolean {
  return now.getDay() === 0;
}

/**
 * A stable, sortable key identifying a week by its Monday, e.g. "2026-10-12".
 * Used to de-duplicate archived snapshots (one per week) and to sort them.
 */
export function weekKey(range: WeekRange): string {
  const y = range.start.getFullYear();
  const m = String(range.start.getMonth() + 1).padStart(2, '0');
  const d = String(range.start.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
