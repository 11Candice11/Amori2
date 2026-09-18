/**
 * Together feature types — mirror the backend C# DTOs exactly.
 * Do not invent fields here; they must match the API responses.
 *
 * Sources:
 *   Calendar        → backend/Amori.Api/Features/Calendar/DTOs
 *   ImportantDates  → backend/Amori.Api/Features/ImportantDates/DTOs
 *   BucketList      → backend/Amori.Api/Features/BucketList/DTOs
 *   Wishlist        → backend/Amori.Api/Features/Wishlist/DTOs
 *
 * C# `DateOnly` serializes as "YYYY-MM-DD", `DateTime` as ISO 8601,
 * integer enums as their numeric value.
 */

// ─── Calendar ─────────────────────────────────────────────────────────────────

export interface CalendarEventResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  title: string;
  description: string | null;
  /** "YYYY-MM-DD" */
  eventDate: string;
  /** "HH:mm:ss" */
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
  isCompleted: boolean;
  completedAt: string | null;
  isShared: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string | null;
  /** "YYYY-MM-DD" */
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  reminderEnabled?: boolean;
  reminderMinutesBefore?: number | null;
  isShared?: boolean;
}

// ─── Important dates ────────────────────────────────────────────────────────

export interface ImportantDateResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  name: string;
  /** "YYYY-MM-DD" */
  date: string;
  isRecurring: boolean;
  reminderEnabled: boolean;
  reminderDaysBefore: number | null;
  notes: string | null;
  imageKey: string | null;
  /** Server-computed countdown to the next occurrence. */
  daysUntilNext: number | null;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Bucket list ──────────────────────────────────────────────────────────────

/** Backend BucketListCategory (integer enum). */
export type BucketListCategory =
  | 'Travel'    // 1
  | 'Adventure' // 2
  | 'Food'      // 3
  | 'Romantic'  // 4
  | 'Personal'  // 5
  | 'Fun';      // 6

export const BUCKET_LIST_CATEGORY_VALUES: Record<BucketListCategory, number> = {
  Travel: 1,
  Adventure: 2,
  Food: 3,
  Romantic: 4,
  Personal: 5,
  Fun: 6,
};

/** Numeric → label, for decoding responses (backend serializes enums as ints). */
export const BUCKET_LIST_CATEGORY_LABELS: Record<number, BucketListCategory> = {
  1: 'Travel',
  2: 'Adventure',
  3: 'Food',
  4: 'Romantic',
  5: 'Personal',
  6: 'Fun',
};

export interface BucketListItemResponse {
  id: string;
  relationshipId: string;
  addedByUserId: string;
  addedByName: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Serialized as the integer enum value. */
  category: number;
  /** "YYYY-MM-DD" */
  targetDate: string | null;
  notes: string | null;
  isFavorite: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateBucketListItemRequest {
  title: string;
  description?: string | null;
  location?: string | null;
  category: number;
  targetDate?: string | null;
  notes?: string | null;
}

// ─── Wishlist ─────────────────────────────────────────────────────────────────

/** Backend WishlistPriority (integer enum). */
export type WishlistPriority = 'Low' | 'Medium' | 'High'; // 1 | 2 | 3

export const WISHLIST_PRIORITY_VALUES: Record<WishlistPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

export interface WishlistItemResponse {
  id: string;
  relationshipId: string;
  addedByUserId: string;
  addedByName: string;
  name: string;
  description: string | null;
  imageKey: string | null;
  price: number | null;
  url: string | null;
  /** Serialized as the integer enum value. */
  priority: number;
  notes: string | null;
  isPurchased: boolean;
  isFavorite: boolean;
  purchasedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateWishlistItemRequest {
  name: string;
  description?: string | null;
  imageKey?: string | null;
  price?: number | null;
  url?: string | null;
  priority?: number;
  notes?: string | null;
}
