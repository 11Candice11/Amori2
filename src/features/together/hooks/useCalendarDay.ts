/**
 * useCalendarDay — the data behind the shared calendar's day view.
 *
 * Loads real calendar events for every month the visible week touches (so the
 * week strip's dots are correct even when a week straddles a month boundary)
 * plus the couple's important dates, then derives what belongs to the selected
 * day.
 *
 * Endpoints used (via togetherService):
 *   GET /api/calendar/events?year&month
 *   GET /api/important-dates
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  addDays,
  parseIsoDate,
  parseTimeString,
  startOfWeekMonday,
  toIsoDate,
} from '../../../shared/components/inputs';
import { togetherService } from '../services/togetherService';
import type {
  CalendarEventResponse,
  ImportantDateResponse,
} from '../types/together.types';

/** A year + 1-indexed month, the shape the calendar endpoint takes. */
type MonthKey = { year: number; month: number };

/** The distinct months spanned by the week containing `date`. */
function monthsForWeekOf(date: Date): MonthKey[] {
  const start = startOfWeekMonday(date);
  const end = addDays(start, 6);
  const keys: MonthKey[] = [
    { year: start.getFullYear(), month: start.getMonth() + 1 },
    { year: end.getFullYear(), month: end.getMonth() + 1 },
    // The selected day always sits inside the week, but include its month
    // explicitly so a same-month week still resolves to one fetch.
    { year: date.getFullYear(), month: date.getMonth() + 1 },
  ];
  return keys.filter(
    (k, i) => keys.findIndex((o) => o.year === k.year && o.month === k.month) === i,
  );
}

/** Does an important date land on `date`? Recurring ones match month + day. */
export function importantDateFallsOn(
  importantDate: ImportantDateResponse,
  date: Date,
): boolean {
  const parsed = parseIsoDate(importantDate.date);
  if (!parsed) return false;
  const sameMonthDay =
    parsed.getMonth() === date.getMonth() && parsed.getDate() === date.getDate();
  if (importantDate.isRecurring) return sameMonthDay;
  return sameMonthDay && parsed.getFullYear() === date.getFullYear();
}

/** Sort key: untimed events first, then by start time. */
function startMinutesOf(event: CalendarEventResponse): number {
  const parsed = parseTimeString(event.startTime);
  return parsed ? parsed.hours * 60 + parsed.minutes : -1;
}

export interface CalendarDayData {
  /** Every event loaded for the fetched months (used for week-strip dots). */
  events: CalendarEventResponse[];
  /** Events on the selected day, untimed first then chronological. */
  dayEvents: CalendarEventResponse[];
  /** Events on the selected day that have no start time. */
  untimedEvents: CalendarEventResponse[];
  /** Events on the selected day that do have a start time. */
  timedEvents: CalendarEventResponse[];
  importantDates: ImportantDateResponse[];
  /** Important dates landing on the selected day. */
  dayImportantDates: ImportantDateResponse[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useCalendarDay(selectedIso: string): CalendarDayData {
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedDate = useMemo(
    () => parseIsoDate(selectedIso) ?? new Date(),
    [selectedIso],
  );

  // Refetch only when the set of needed months actually changes — moving
  // between days inside one month shouldn't hit the network again.
  const monthsKey = useMemo(
    () =>
      monthsForWeekOf(selectedDate)
        .map((m) => `${m.year}-${m.month}`)
        .sort()
        .join(','),
    [selectedDate],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const months: MonthKey[] = monthsKey.split(',').map((k) => {
      const [year, month] = k.split('-').map(Number);
      return { year, month };
    });

    const [datesResult, ...monthResults] = await Promise.allSettled([
      togetherService.getImportantDates(),
      ...months.map((m) => togetherService.getCalendarEvents(m.year, m.month)),
    ]);

    const merged: CalendarEventResponse[] = [];
    const seen = new Set<string>();
    for (const result of monthResults) {
      if (result.status !== 'fulfilled') continue;
      for (const ev of result.value) {
        if (seen.has(ev.id)) continue;
        seen.add(ev.id);
        merged.push(ev);
      }
    }
    setEvents(merged);
    setImportantDates(datesResult.status === 'fulfilled' ? datesResult.value : []);

    const everyMonthFailed = monthResults.every((r) => r.status === 'rejected');
    setError(everyMonthFailed ? 'Could not load this day.' : null);
    setLoading(false);
  }, [monthsKey]);

  useEffect(() => {
    load();
  }, [load]);

  const dayEvents = useMemo(() => {
    const iso = toIsoDate(selectedDate);
    return events
      .filter((ev) => ev.eventDate.slice(0, 10) === iso)
      .sort((a, b) => startMinutesOf(a) - startMinutesOf(b));
  }, [events, selectedDate]);

  const untimedEvents = useMemo(
    () => dayEvents.filter((ev) => parseTimeString(ev.startTime) === null),
    [dayEvents],
  );

  const timedEvents = useMemo(
    () => dayEvents.filter((ev) => parseTimeString(ev.startTime) !== null),
    [dayEvents],
  );

  const dayImportantDates = useMemo(
    () => importantDates.filter((d) => importantDateFallsOn(d, selectedDate)),
    [importantDates, selectedDate],
  );

  return {
    events,
    dayEvents,
    untimedEvents,
    timedEvents,
    importantDates,
    dayImportantDates,
    loading,
    error,
    refresh: load,
  };
}
