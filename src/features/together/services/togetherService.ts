/**
 * togetherService — wraps the shared-relationship API surfaces the Together
 * view reads and writes: calendar events, important dates, the bucket list,
 * and the shared wishlist.
 *
 * Endpoints (all require auth; relationship scoping is server-side):
 *   GET  /api/calendar/events?year&month   → CalendarEventResponse[]
 *   POST /api/calendar/events              → CalendarEventResponse
 *   GET  /api/important-dates              → ImportantDateResponse[]
 *   GET    /api/bucket-list                → BucketListItemResponse[]
 *   POST   /api/bucket-list                → BucketListItemResponse
 *   POST   /api/bucket-list/{id}/complete  → BucketListItemResponse (toggles)
 *   DELETE /api/bucket-list/{id}           → 204
 *   GET    /api/dates                      → DateIdeaResponse[]
 *   POST   /api/dates                      → DateIdeaResponse
 *   PATCH  /api/dates/{id}                 → DateIdeaResponse
 *   POST   /api/dates/{id}/complete        → DateIdeaResponse
 *   DELETE /api/dates/{id}                 → 204
 *   POST   /api/dates/random               → DateIdeaResponse | 204
 *   GET    /api/wishlist                   → WishlistItemResponse[]
 *   POST   /api/wishlist                   → WishlistItemResponse
 *   PATCH  /api/wishlist/{id}              → WishlistItemResponse
 *   DELETE /api/wishlist/{id}              → 204
 */
import { api } from '../../../services/api/client';
import type { RelationshipResponse } from '../../../services/api/types';
import {
  BUCKET_LIST_CATEGORY_VALUES,
  DATE_CATEGORY_VALUES,
  type BucketListCategory,
  type BucketListItemResponse,
  type CalendarEventResponse,
  type CreateBucketListItemRequest,
  type CreateCalendarEventRequest,
  type CreateDateIdeaRequest,
  type DateIdeaResponse,
  type ImportantDateResponse,
  type UpdateCalendarEventRequest,
  type UpdateDateIdeaRequest,
  type WishlistItemResponse,
} from '../types/together.types';
import {
  eventKey,
  generateAnniversaryOccurrences,
  occurrenceKey,
} from '../utils/anniversaryEvents';

/** Outcome of syncAnniversaryEvents — how many events were created/skipped. */
export interface AnniversarySyncResult {
  /** Newly created anniversary events. */
  created: number;
  /** Occurrences that already existed on the calendar and were left alone. */
  skipped: number;
  /** False when the relationship has no start date to anchor anniversaries to. */
  hasStartDate: boolean;
}

export const togetherService = {
  // ── Calendar ──────────────────────────────────────────────────────────────
  /** Events for a given month. `month` is 1-indexed (Jan = 1) to match the API. */
  getCalendarEvents(year: number, month: number): Promise<CalendarEventResponse[]> {
    return api.get<CalendarEventResponse[]>(
      `/api/calendar/events?year=${year}&month=${month}`,
    );
  },

  createCalendarEvent(
    payload: CreateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return api.post<CalendarEventResponse>('/api/calendar/events', payload);
  },

  updateCalendarEvent(
    eventId: string,
    payload: UpdateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return api.patch<CalendarEventResponse>(
      `/api/calendar/events/${eventId}`,
      payload,
    );
  },

  /** Delete a calendar event. Server allows only the creator to delete. */
  deleteCalendarEvent(eventId: string): Promise<void> {
    return api.delete<void>(`/api/calendar/events/${eventId}`);
  },

  /**
   * Ensure the couple's upcoming anniversary/monthiversary reminders exist on
   * the shared calendar.
   *
   * The calendar has no recurrence, so anniversaries are materialised as a
   * batch of discrete, upcoming events. This reads the relationship start date
   * (`/api/relationships/me`), generates the target occurrences (monthly while
   * under a year together, otherwise yearly), and creates only the ones not
   * already present — deduping by date+title, so it's safe to call repeatedly
   * without producing duplicates (there is no server-side idempotency here).
   *
   * Each created event is a shared, all-day-ish 9am marker with a reminder
   * enabled a day (1440 min) ahead.
   *
   * @returns the number of new events created (0 when everything already
   *   exists, or when there is no start date to anchor to).
   */
  async syncAnniversaryEvents(): Promise<AnniversarySyncResult> {
    const rel = await api.get<RelationshipResponse>('/api/relationships/me');
    const startDate = rel?.startDate ?? null;

    const occurrences = generateAnniversaryOccurrences(startDate);
    if (occurrences.length === 0) {
      return { created: 0, skipped: 0, hasStartDate: !!startDate };
    }

    // Fetch existing events for every month an occurrence lands in, so we can
    // skip anniversaries that are already on the calendar.
    const monthKeys = new Set(
      occurrences.map((o) => o.eventDate.slice(0, 7)), // "YYYY-MM"
    );
    const existingByMonth = await Promise.all(
      Array.from(monthKeys).map((key) => {
        const [y, m] = key.split('-').map(Number);
        return this.getCalendarEvents(y, m).catch(
          () => [] as CalendarEventResponse[],
        );
      }),
    );
    const existingKeys = new Set(
      existingByMonth.flat().map((e) => eventKey(e)),
    );

    const missing = occurrences.filter((o) => !existingKeys.has(occurrenceKey(o)));

    // Create sequentially to keep server load gentle and attribution stable.
    let created = 0;
    for (const occ of missing) {
      await this.createCalendarEvent({
        title: occ.title,
        eventDate: occ.eventDate,
        startTime: '09:00:00',
        description:
          occ.cadence === 'monthly'
            ? 'Auto-added monthly anniversary reminder.'
            : 'Auto-added anniversary reminder.',
        reminderEnabled: true,
        reminderMinutesBefore: 24 * 60,
        isShared: true,
      });
      created += 1;
    }

    return {
      created,
      skipped: occurrences.length - missing.length,
      hasStartDate: true,
    };
  },

  // ── Important dates ─────────────────────────────────────────────────────────
  getImportantDates(): Promise<ImportantDateResponse[]> {
    return api.get<ImportantDateResponse[]>('/api/important-dates');
  },

  // ── Bucket list ───────────────────────────────────────────────────────────
  getBucketList(): Promise<BucketListItemResponse[]> {
    return api.get<BucketListItemResponse[]>('/api/bucket-list');
  },

  createBucketListItem(
    title: string,
    category: BucketListCategory = 'Adventure',
  ): Promise<BucketListItemResponse> {
    const payload: CreateBucketListItemRequest = {
      title,
      category: BUCKET_LIST_CATEGORY_VALUES[category],
    };
    return api.post<BucketListItemResponse>('/api/bucket-list', payload);
  },

  createTodoItem(title: string): Promise<BucketListItemResponse> {
    const payload: CreateBucketListItemRequest = {
      title,
      category: BUCKET_LIST_CATEGORY_VALUES.ToDoList,
    };
    return api.post<BucketListItemResponse>('/api/bucket-list', payload);
  },

  /**
   * Toggle the completion state. The /complete endpoint flips isCompleted in
   * either direction, so it doubles as an un-complete.
   */
  toggleBucketListItemComplete(itemId: string): Promise<BucketListItemResponse> {
    return api.post<BucketListItemResponse>(`/api/bucket-list/${itemId}/complete`);
  },

  deleteBucketListItem(itemId: string): Promise<void> {
    return api.delete<void>(`/api/bucket-list/${itemId}`);
  },

  // ── Date ideas (Date Planner: /api/dates) ───────────────────────────────────
  getDateIdeas(): Promise<DateIdeaResponse[]> {
    return api.get<DateIdeaResponse[]>('/api/dates');
  },

  /** Create a date idea. Defaults to the Romantic category when none is given. */
  createDateIdea(
    title: string,
    category: number = DATE_CATEGORY_VALUES.Romantic,
    extra: Omit<CreateDateIdeaRequest, 'title' | 'category'> = {},
  ): Promise<DateIdeaResponse> {
    const payload: CreateDateIdeaRequest = { title, category, ...extra };
    return api.post<DateIdeaResponse>('/api/dates', payload);
  },

  updateDateIdea(
    dateId: string,
    payload: UpdateDateIdeaRequest,
  ): Promise<DateIdeaResponse> {
    return api.patch<DateIdeaResponse>(`/api/dates/${dateId}`, payload);
  },

  /**
   * The backend /complete endpoint only completes; there's no toggle-favorite
   * route, so favorite state is flipped via PATCH.
   */
  setDateIdeaFavorite(
    dateId: string,
    isFavorite: boolean,
  ): Promise<DateIdeaResponse> {
    return api.patch<DateIdeaResponse>(`/api/dates/${dateId}`, { isFavorite });
  },

  completeDateIdea(dateId: string): Promise<DateIdeaResponse> {
    return api.post<DateIdeaResponse>(`/api/dates/${dateId}/complete`);
  },

  /**
   * Toggle completion in either direction. The /complete endpoint is one-way,
   * so we PATCH isCompleted to support un-ticking an accidental completion.
   */
  setDateIdeaCompleted(
    dateId: string,
    isCompleted: boolean,
  ): Promise<DateIdeaResponse> {
    return api.patch<DateIdeaResponse>(`/api/dates/${dateId}`, { isCompleted });
  },

  deleteDateIdea(dateId: string): Promise<void> {
    return api.delete<void>(`/api/dates/${dateId}`);
  },

  /** A random, not-yet-completed date idea (204 → null on the backend). */
  getRandomDateIdea(): Promise<DateIdeaResponse | null> {
    return api.post<DateIdeaResponse | null>('/api/dates/random');
  },

  // ── Wishlist ────────────────────────────────────────────────────────────────
  getWishlist(): Promise<WishlistItemResponse[]> {
    return api.get<WishlistItemResponse[]>('/api/wishlist');
  },

  createWishlistItem(
    payload: import('../types/together.types').CreateWishlistItemRequest,
  ): Promise<WishlistItemResponse> {
    return api.post<WishlistItemResponse>('/api/wishlist', payload);
  },

  updateWishlistItem(
    itemId: string,
    payload: import('../types/together.types').UpdateWishlistItemRequest,
  ): Promise<WishlistItemResponse> {
    return api.patch<WishlistItemResponse>(`/api/wishlist/${itemId}`, payload);
  },

  /** Toggle the purchased/completed state (PATCH supports both directions). */
  setWishlistItemPurchased(
    itemId: string,
    isPurchased: boolean,
  ): Promise<WishlistItemResponse> {
    return api.patch<WishlistItemResponse>(`/api/wishlist/${itemId}`, { isPurchased });
  },

  setWishlistItemFavorite(
    itemId: string,
    isFavorite: boolean,
  ): Promise<WishlistItemResponse> {
    return api.patch<WishlistItemResponse>(`/api/wishlist/${itemId}`, { isFavorite });
  },

  deleteWishlistItem(itemId: string): Promise<void> {
    return api.delete<void>(`/api/wishlist/${itemId}`);
  },
};
