/**
 * anniversaryEvents — pure helpers that turn a relationship start date into a
 * set of upcoming anniversary calendar events.
 *
 * The shared calendar (CalendarEventResponse) has no recurrence concept — every
 * event is a single date — so "anniversary reminders" are materialised as a
 * batch of discrete, upcoming occurrences that we create individually.
 *
 * Rule (per the product request):
 *   - Relationship younger than 1 year → generate MONTHLY anniversaries
 *     ("monthiversaries") on the same day-of-month as the start date, up to and
 *     including the first yearly anniversary.
 *   - Relationship 1 year or older → generate the next few YEARLY anniversaries.
 *
 * Everything here is pure and works in local time, so it's easy to unit-test
 * and never hits the network. The service layer decides which of these to
 * actually create (deduping against events already on the calendar).
 */
import { pad2, parseIsoDate, toIsoDate } from '../../../shared/components/inputs/dateUtils';

/** How many yearly anniversaries to generate ahead when 1y+ together. */
export const YEARLY_LOOKAHEAD = 5;

/** A single anniversary occurrence to place on the calendar. */
export interface AnniversaryOccurrence {
  /** "YYYY-MM-DD" for the occurrence. */
  eventDate: string;
  /** Human title, e.g. "6-Month Anniversary 💛" or "2-Year Anniversary 💛". */
  title: string;
  /** Ordinal count (6 → 6 months; 2 → 2 years). */
  count: number;
  /** Whether this occurrence is a monthly or yearly milestone. */
  cadence: 'monthly' | 'yearly';
}

/**
 * The start date parsed from "YYYY-MM-DD" to a local-midnight Date, or null if
 * absent/unparseable. Re-exported thin wrapper over the shared parser so the
 * service and tests share one definition.
 */
export function parseStartDate(startDate: string | null | undefined): Date | null {
  return parseIsoDate(startDate ?? null);
}

/**
 * Whole years between `start` and `now` (defaults to today), decremented if the
 * current year's anniversary hasn't happened yet. Returns 0 for a same-year
 * start. Mirrors the existing `yearsTogether` in MemoriesScreen.
 */
export function yearsTogether(start: Date, now: Date = new Date()): number {
  let years = now.getFullYear() - start.getFullYear();
  const beforeAnniversary =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

/**
 * Whole months between `start` and `now` (defaults to today), decremented if
 * the current month's day-of-month hasn't been reached yet.
 */
export function monthsTogether(start: Date, now: Date = new Date()): number {
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

/**
 * Add `months` calendar months to a start date, anchored on the start's
 * day-of-month. Clamps to the last day of shorter months (e.g. a 31st start
 * lands on the 30th/28th where needed) so we never roll into the next month.
 */
function addMonthsClamped(start: Date, months: number): Date {
  const targetMonthIndex = start.getMonth() + months;
  const year = start.getFullYear() + Math.floor(targetMonthIndex / 12);
  const month0 = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const day = Math.min(start.getDate(), lastDay);
  return new Date(year, month0, day);
}

/** Add `years`, clamping Feb 29 starts to Feb 28 in non-leap years. */
function addYearsClamped(start: Date, years: number): Date {
  const year = start.getFullYear() + years;
  const lastDay = new Date(year, start.getMonth() + 1, 0).getDate();
  const day = Math.min(start.getDate(), lastDay);
  return new Date(year, start.getMonth(), day);
}

/** Title for a monthly milestone, e.g. "6-Month Anniversary 💛". */
function monthlyTitle(count: number): string {
  return `${count}-Month Anniversary 💛`;
}

/** Title for a yearly milestone, e.g. "1-Year Anniversary 💛". */
function yearlyTitle(count: number): string {
  return `${count}-Year Anniversary 💛`;
}

/**
 * A stable dedupe key for an occurrence: its date plus its title. Two runs of
 * the generator for the same relationship produce identical keys, so the
 * service can skip occurrences already on the calendar (there's no server-side
 * idempotency for calendar events).
 */
export function occurrenceKey(occurrence: {
  eventDate: string;
  title: string;
}): string {
  return `${occurrence.eventDate}::${occurrence.title.trim().toLowerCase()}`;
}

/** Same key derived from an arbitrary event-like {title, eventDate}. */
export function eventKey(event: { eventDate: string; title: string }): string {
  // Only compare the date part (calendar events store "YYYY-MM-DD").
  return `${event.eventDate.slice(0, 10)}::${event.title.trim().toLowerCase()}`;
}

/**
 * Generate the upcoming anniversary occurrences for a relationship.
 *
 * @param startDate "YYYY-MM-DD" relationship start (nullable → returns []).
 * @param now       Reference "today" (defaults to now); injectable for tests.
 * @returns occurrences strictly on/after `now`, ascending by date.
 */
export function generateAnniversaryOccurrences(
  startDate: string | null | undefined,
  now: Date = new Date(),
): AnniversaryOccurrence[] {
  const start = parseStartDate(startDate);
  if (!start) return [];

  // Compare on date only (local midnight) so an occurrence that is "today"
  // still counts as upcoming.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const years = yearsTogether(start, now);
  const occurrences: AnniversaryOccurrence[] = [];

  if (years < 1) {
    // Younger than a year → monthly anniversaries through the 1-year mark.
    const monthsSoFar = monthsTogether(start, now);
    // Generate from the current month-mark up to and including month 12. The
    // `date < today` guard below drops any that have already passed, while
    // keeping one that lands exactly today.
    for (let n = Math.max(1, monthsSoFar); n <= 12; n += 1) {
      const date = n === 12 ? addYearsClamped(start, 1) : addMonthsClamped(start, n);
      if (date < today) continue;
      const isYear = n === 12;
      occurrences.push({
        eventDate: toIsoDate(date),
        title: isYear ? yearlyTitle(1) : monthlyTitle(n),
        count: isYear ? 1 : n,
        cadence: isYear ? 'yearly' : 'monthly',
      });
    }
  } else {
    // A year or more → the next few yearly anniversaries.
    for (let i = 0; i < YEARLY_LOOKAHEAD; i += 1) {
      const count = years + 1 + i;
      const date = addYearsClamped(start, count);
      if (date < today) continue;
      occurrences.push({
        eventDate: toIsoDate(date),
        title: yearlyTitle(count),
        count,
        cadence: 'yearly',
      });
    }
  }

  return occurrences.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
}

/** A short human description of what would be generated, for confirm dialogs. */
export function describeAnniversaryPlan(
  startDate: string | null | undefined,
  now: Date = new Date(),
): string | null {
  const start = parseStartDate(startDate);
  if (!start) return null;
  const years = yearsTogether(start, now);
  return years < 1
    ? 'monthly anniversaries through your first year'
    : 'your next yearly anniversaries';
}

/** Exposed for tests: build a "YYYY-MM-DD" from parts. */
export function isoDate(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}
