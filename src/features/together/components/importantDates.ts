/**
 * Important-date helpers shared by the Together header countdown.
 *
 * These were previously colocated with the Anniversary Beacon card; they are
 * kept here so the header's "next up" countdown keeps working after the beacon
 * card was removed.
 */
import type { ImportantDateResponse } from '../types/together.types';

/** Pick the soonest upcoming important date by daysUntilNext. */
export function pickNextImportantDate(
  dates: ImportantDateResponse[],
): ImportantDateResponse | null {
  const upcoming = dates.filter((d) => d.daysUntilNext != null);
  if (upcoming.length === 0) return dates[0] ?? null;
  return upcoming.reduce((soonest, d) =>
    (d.daysUntilNext ?? Infinity) < (soonest.daysUntilNext ?? Infinity) ? d : soonest,
  );
}

/** Human countdown, e.g. "Today", "Tomorrow", "in 12 days". */
export function countdownLabel(days: number | null | undefined): string | null {
  if (days == null) return null;
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}
