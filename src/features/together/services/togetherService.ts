/**
 * togetherService — wraps the shared-relationship API surfaces the Together
 * view reads and writes: calendar events, important dates, the bucket list,
 * and the shared wishlist.
 *
 * Endpoints (all require auth; relationship scoping is server-side):
 *   GET  /api/calendar/events?year&month   → CalendarEventResponse[]
 *   POST /api/calendar/events              → CalendarEventResponse
 *   GET  /api/important-dates              → ImportantDateResponse[]
 *   GET  /api/bucket-list                  → BucketListItemResponse[]
 *   POST /api/bucket-list                  → BucketListItemResponse
 *   POST /api/bucket-list/{id}/complete    → BucketListItemResponse
 *   GET  /api/wishlist                     → WishlistItemResponse[]
 */
import { api } from '../../../services/api/client';
import {
  BUCKET_LIST_CATEGORY_VALUES,
  type BucketListCategory,
  type BucketListItemResponse,
  type CalendarEventResponse,
  type CreateBucketListItemRequest,
  type CreateCalendarEventRequest,
  type ImportantDateResponse,
  type WishlistItemResponse,
} from '../types/together.types';

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

  completeBucketListItem(itemId: string): Promise<BucketListItemResponse> {
    return api.post<BucketListItemResponse>(`/api/bucket-list/${itemId}/complete`);
  },

  // ── Wishlist ────────────────────────────────────────────────────────────────
  getWishlist(): Promise<WishlistItemResponse[]> {
    return api.get<WishlistItemResponse[]>('/api/wishlist');
  },
};
