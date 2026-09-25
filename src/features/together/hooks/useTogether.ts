/**
 * useTogether — aggregates the data the Together view needs.
 *
 * Fetches, in parallel and degrading gracefully per-call:
 *   - the current user + relationship (for the couple label)
 *   - the visible month's calendar events
 *   - important dates (for the anniversary beacon + countdown notice)
 *   - the shared bucket list + to-do list
 *   - the shared wishlist (count + repository preview)
 *   - the couple's date ideas (Date Planner /api/dates)
 *
 * Month navigation refetches only the calendar; everything else is loaded once
 * per refresh. Mirrors the Home dashboard's Promise.allSettled convention.
 */
import { useCallback, useEffect, useState } from 'react';

import { api } from '../../../services/api/client';
import { authService } from '../../../services/auth/authService';
import type { RelationshipResponse } from '../../../services/api/types';
import { togetherService } from '../services/togetherService';
import {
  type BucketListCategory,
  type BucketListItemResponse,
  type CalendarEventResponse,
  type DateIdeaResponse,
  type ImportantDateResponse,
  type WishlistItemResponse,
} from '../types/together.types';

export interface TogetherData {
  userName: string;
  partnerName: string;
  /** Uppercase "JULIAN & ELENA" style label for the header. */
  coupleLabel: string;

  /** Calendar month currently in view. */
  year: number;
  /** 0-indexed month for JS Date math (0 = January). */
  month: number;
  calendarEvents: CalendarEventResponse[];
  calendarLoading: boolean;

  importantDates: ImportantDateResponse[];
  bucketList: BucketListItemResponse[];
  wishlist: WishlistItemResponse[];
  todoList: BucketListItemResponse[];
  dateIdeas: DateIdeaResponse[];

  loading: boolean;
  error: string | null;
}

function buildCoupleLabel(you: string, partner: string): string {
  const names = [you, partner].filter((n) => n && n.trim().length > 0);
  if (names.length === 0) return 'YOU & YOUR LOVE';
  return names.map((n) => n.toUpperCase()).join(' & ');
}

export function useTogether(): TogetherData & {
  refresh: () => void;
  goToMonth: (year: number, month: number) => void;
} {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  const [userName, setUserName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventResponse[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDateResponse[]>([]);
  const [bucketList, setBucketList] = useState<BucketListItemResponse[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItemResponse[]>([]);
  const [todoList, setTodoList] = useState<BucketListItemResponse[]>([]);
  const [dateIdeas, setDateIdeas] = useState<DateIdeaResponse[]>([]);

  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar fetch is isolated so month navigation doesn't reload everything.
  const loadCalendar = useCallback(async (y: number, m: number) => {
    setCalendarLoading(true);
    try {
      // Backend month is 1-indexed.
      const events = await togetherService.getCalendarEvents(y, m + 1);
      setCalendarEvents(events);
    } catch {
      setCalendarEvents([]);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [meResult, relResult, datesResult, bucketResult, wishResult, dateIdeasResult] =
      await Promise.allSettled([
        authService.getMe(),
        api.get<RelationshipResponse>('/api/relationships/me'),
        togetherService.getImportantDates(),
        togetherService.getBucketList(),
        togetherService.getWishlist(),
        togetherService.getDateIdeas(),
      ]);

    const me = meResult.status === 'fulfilled' ? meResult.value : null;
    setUserName(me?.name ?? '');

    let partner = '';
    if (relResult.status === 'fulfilled' && relResult.value) {
      const rel = relResult.value;
      const found = rel.members?.find((m) => m.id !== me?.id) ?? rel.members?.[0];
      partner = found?.name ?? '';
    }
    setPartnerName(partner);

    setImportantDates(
      datesResult.status === 'fulfilled' ? datesResult.value : [],
    );
    
    const allBucketItems = bucketResult.status === 'fulfilled' ? bucketResult.value : [];

    // The bucket list and to-do list share the /api/bucket-list surface; split
    // by category. The API serializes the category as its string name, so
    // compare against 'ToDoList'. Date ideas come from their own /api/dates.
    const todoCategory: BucketListCategory = 'ToDoList';

    setBucketList(allBucketItems.filter(item => item.category !== todoCategory));
    setTodoList(allBucketItems.filter(item => item.category === todoCategory));

    setWishlist(wishResult.status === 'fulfilled' ? wishResult.value : []);
    setDateIdeas(dateIdeasResult.status === 'fulfilled' ? dateIdeasResult.value : []);

    // Only surface an error if every content call failed — a partner still
    // linking up shouldn't hide the whole screen.
    const allFailed =
      datesResult.status === 'rejected' &&
      bucketResult.status === 'rejected' &&
      wishResult.status === 'rejected' &&
      dateIdeasResult.status === 'rejected';
    setError(allFailed ? 'Some shared data could not be loaded.' : null);

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCalendar(year, month);
  }, [year, month, loadCalendar]);

  const refresh = useCallback(() => {
    load();
    loadCalendar(year, month);
  }, [load, loadCalendar, year, month]);

  const goToMonth = useCallback((y: number, m: number) => {
    // Normalize month overflow/underflow (e.g. December → January).
    const d = new Date(y, m, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }, []);

  return {
    userName,
    partnerName,
    coupleLabel: buildCoupleLabel(userName, partnerName),
    year,
    month,
    calendarEvents,
    calendarLoading,
    importantDates,
    bucketList,
    wishlist,
    todoList,
    dateIdeas,
    loading,
    error,
    refresh,
    goToMonth,
  };
}
