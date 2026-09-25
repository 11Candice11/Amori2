/**
 * Date/time helpers shared by the picker components and any screen that needs
 * to move between JS `Date` objects and the string shapes the backend uses.
 *
 * Backend conventions (see feature `*.types.ts` files):
 *   - C# `DateOnly`  → "YYYY-MM-DD"
 *   - C# `TimeOnly`  → "HH:mm:ss"
 *   - C# `DateTime`  → ISO 8601
 *
 * Everything here works in *local* time. A "YYYY-MM-DD" string is treated as
 * local midnight so that formatting it back out never shifts a day across a
 * timezone boundary.
 */

export const WEEKDAY_LABELS_SHORT = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** Sunday-first, matching `Date.prototype.getDay()`. */
export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

export const DAY_NAMES_SHORT = [
  'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat',
] as const;

/** Zero-pad to two digits. */
export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ─── Date ⇄ "YYYY-MM-DD" ─────────────────────────────────────────────────────

/** A `Date` as "YYYY-MM-DD" in local time. */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today as "YYYY-MM-DD" in local time. */
export function todayIsoDate(): string {
  return toIsoDate(new Date());
}

/**
 * Parse "YYYY-MM-DD" (or the date part of an ISO date-time) into a local
 * midnight `Date`. Returns null when the string is absent or not a real date
 * (e.g. "2025-02-31").
 */
export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(year, month - 1, day, 0, 0, 0, 0);
  // Reject overflow like 2025-02-31 rolling forward into March.
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/** True when `value` is a real "YYYY-MM-DD" calendar date. */
export function isValidIsoDate(value: string | null | undefined): boolean {
  return parseIsoDate(value) !== null;
}

// ─── Date ⇄ time strings ─────────────────────────────────────────────────────

/** A `Date`'s clock time as "HH:mm:ss" (what the API expects for TimeOnly). */
export function toApiTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:00`;
}

/** A `Date`'s clock time as "HH:mm". */
export function toHm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parse "HH:mm" or "HH:mm:ss" into hours + minutes, or null. */
export function parseTimeString(
  value: string | null | undefined,
): { hours: number; minutes: number } | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * Build a local `Date` from a "YYYY-MM-DD" date and an optional
 * "HH:mm"/"HH:mm:ss" time. Falls back to midnight when the time is missing.
 */
export function combineDateAndTime(
  isoDate: string | null | undefined,
  time?: string | null,
): Date | null {
  const base = parseIsoDate(isoDate);
  if (!base) return null;
  const parsed = parseTimeString(time);
  if (parsed) {
    base.setHours(parsed.hours, parsed.minutes, 0, 0);
  }
  return base;
}

/** Minutes elapsed since local midnight — used to position events on a grid. */
export function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/** "Monday, 21 September 2026" */
export function formatLongDate(d: Date): string {
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "21 Sep 2026" */
export function formatMediumDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Mon, 21 Sep" */
export function formatShortDate(d: Date): string {
  return `${DAY_NAMES_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES_SHORT[d.getMonth()]}`;
}

/** "September 2026" */
export function formatMonthYear(year: number, month0: number): string {
  return `${MONTH_NAMES[month0]} ${year}`;
}

/** 12-hour clock label, e.g. "7:30 PM" / "12:05 AM". */
export function formatTime12(hours: number, minutes: number): string {
  const suffix = hours < 12 ? 'AM' : 'PM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${pad2(minutes)} ${suffix}`;
}

/** 12-hour clock label for a `Date`. */
export function formatTimeOfDay(d: Date): string {
  return formatTime12(d.getHours(), d.getMinutes());
}

/** "Mon 21 Sep 2026 · 7:30 PM" */
export function formatDateTime(d: Date): string {
  return `${formatMediumDate(d)} \u00B7 ${formatTimeOfDay(d)}`;
}

/** Compact hour label for a day-grid gutter, e.g. "7 AM", "12 PM". */
export function formatHourLabel(hours: number): string {
  if (hours === 0) return '12 AM';
  if (hours === 12) return '12 PM';
  return hours < 12 ? `${hours} AM` : `${hours - 12} PM`;
}

/** Duration label like "1h 30m", "45m", "2h". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Comparison / arithmetic ──────────────────────────────────────────────────

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

/** A new `Date` shifted by `n` days (n may be negative). */
export function addDays(d: Date, n: number): Date {
  const next = new Date(d.getTime());
  next.setDate(next.getDate() + n);
  return next;
}

/** A new `Date` shifted by `n` months, clamping the day (Jan 31 → Feb 28). */
export function addMonths(d: Date, n: number): Date {
  const day = d.getDate();
  const next = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes());
  next.setDate(Math.min(day, daysInMonth(next.getFullYear(), next.getMonth())));
  return next;
}

/** A new `Date` shifted by `n` minutes. */
export function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

/** Local midnight of `d`. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** The Monday of the week containing `d`, at local midnight. */
export function startOfWeekMonday(d: Date): Date {
  const offset = (d.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  return startOfDay(addDays(d, -offset));
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** 0 = Monday … 6 = Sunday index of the 1st of the month. */
export function firstWeekdayMonFirst(year: number, month0: number): number {
  return (new Date(year, month0, 1).getDay() + 6) % 7;
}

/**
 * A month grid of day numbers with `null` for the leading/trailing blanks,
 * always a whole number of Monday-first weeks.
 */
export function buildMonthCells(year: number, month0: number): (number | null)[] {
  const lead = firstWeekdayMonFirst(year, month0);
  const total = daysInMonth(year, month0);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Keep `d` inside an optional [min, max] range (day granularity ignored). */
export function clampDate(d: Date, min?: Date | null, max?: Date | null): Date {
  if (min && d.getTime() < min.getTime()) return new Date(min.getTime());
  if (max && d.getTime() > max.getTime()) return new Date(max.getTime());
  return d;
}

/** True when `day` in the given month falls outside an optional range. */
export function isDayDisabled(
  year: number,
  month0: number,
  day: number,
  min?: Date | null,
  max?: Date | null,
): boolean {
  const d = new Date(year, month0, day, 0, 0, 0, 0);
  if (min && d.getTime() < startOfDay(min).getTime()) return true;
  if (max && d.getTime() > startOfDay(max).getTime()) return true;
  return false;
}
