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

/**
 * Backend CalendarRecurrence. The API serializes enums as their string names,
 * so responses carry the name (e.g. "Weekly"); on write the API accepts either
 * the name or the numeric value.
 */
export type CalendarRecurrence = 'None' | 'Weekly' | 'Monthly' | 'Yearly'; // 0 | 1 | 2 | 3

export const CALENDAR_RECURRENCE_VALUES: Record<CalendarRecurrence, number> = {
  None: 0,
  Weekly: 1,
  Monthly: 2,
  Yearly: 3,
};

/** The options in display order for the repeat picker. */
export const CALENDAR_RECURRENCE_ORDER: CalendarRecurrence[] = [
  'None',
  'Weekly',
  'Monthly',
  'Yearly',
];

/** Human-friendly labels for the repeat picker and event cards. */
export const CALENDAR_RECURRENCE_LABELS: Record<CalendarRecurrence, string> = {
  None: 'Does not repeat',
  Weekly: 'Weekly',
  Monthly: 'Monthly',
  Yearly: 'Yearly',
};

/**
 * Decode a `recurrence` value from an API response. Accepts the enum name (the
 * common case), its integer, or a numeric string; falls back to None.
 */
export function decodeCalendarRecurrence(value: number | string): CalendarRecurrence {
  if (typeof value === 'number') {
    return CALENDAR_RECURRENCE_ORDER.find((r) => CALENDAR_RECURRENCE_VALUES[r] === value) ?? 'None';
  }
  if (value in CALENDAR_RECURRENCE_VALUES) return value as CalendarRecurrence;
  const asNum = Number(value);
  if (!Number.isNaN(asNum)) {
    return CALENDAR_RECURRENCE_ORDER.find((r) => CALENDAR_RECURRENCE_VALUES[r] === asNum) ?? 'None';
  }
  return 'None';
}

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
  /** Serialized as the string enum name (e.g. "Weekly"). Decode with decodeCalendarRecurrence. */
  recurrence: number | string;
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
  /** Integer enum value or name (see CALENDAR_RECURRENCE_VALUES). */
  recurrence?: number;
}

export interface UpdateCalendarEventRequest {
  title?: string | null;
  description?: string | null;
  /** "YYYY-MM-DD" */
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  reminderEnabled?: boolean | null;
  reminderMinutesBefore?: number | null;
  isShared?: boolean | null;
  recurrence?: number | null;
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

export interface CreateImportantDateRequest {
  name: string;
  /** "YYYY-MM-DD" */
  date: string;
  isRecurring?: boolean;
  reminderEnabled?: boolean;
  reminderDaysBefore?: number | null;
  notes?: string | null;
  imageKey?: string | null;
}

export interface UpdateImportantDateRequest {
  name?: string | null;
  /** "YYYY-MM-DD" */
  date?: string | null;
  isRecurring?: boolean | null;
  reminderEnabled?: boolean | null;
  reminderDaysBefore?: number | null;
  notes?: string | null;
  imageKey?: string | null;
}

// ─── Bucket list ──────────────────────────────────────────────────────────────

/**
 * Backend BucketListCategory. The API serializes enums as their string names
 * (JsonStringEnumConverter is registered globally), so responses carry the
 * name, e.g. "ToDoList". On write the API accepts either the name or the
 * numeric value.
 */
export type BucketListCategory =
  | 'Travel'    // 1
  | 'Adventure' // 2
  | 'Food'      // 3
  | 'Romantic'  // 4
  | 'Personal'  // 5
  | 'Fun'       // 6
  | 'ToDoList'; // 7

export const BUCKET_LIST_CATEGORY_VALUES: Record<BucketListCategory, number> = {
  Travel: 1,
  Adventure: 2,
  Food: 3,
  Romantic: 4,
  Personal: 5,
  Fun: 6,
  ToDoList: 7,
};

export interface BucketListItemResponse {
  id: string;
  relationshipId: string;
  addedByUserId: string;
  addedByName: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Serialized as the string enum name, e.g. "ToDoList". */
  category: BucketListCategory;
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

export interface UpdateWishlistItemRequest {
  name?: string | null;
  description?: string | null;
  imageKey?: string | null;
  price?: number | null;
  url?: string | null;
  priority?: number;
  notes?: string | null;
  isPurchased?: boolean;
  isFavorite?: boolean;
}

// ─── Date ideas (Date Planner) ────────────────────────────────────────────────
//
// Backed by the dedicated Date Planner API (/api/dates), which stores a richer
// DateIdea entity than the bucket list (category, estimated cost, duration).
// Source: backend/Amori.Api/Features/DatePlanner/DTOs

/** Backend DateCategory (integer enum). */
export type DateCategory =
  | 'Romantic'    // 1
  | 'AtHome'      // 2
  | 'GoingOut'    // 3
  | 'Adventure'   // 4
  | 'Food'        // 5
  | 'CheapOrFree' // 6
  | 'Weekend'     // 7
  | 'Holiday';    // 8

export const DATE_CATEGORY_VALUES: Record<DateCategory, number> = {
  Romantic: 1,
  AtHome: 2,
  GoingOut: 3,
  Adventure: 4,
  Food: 5,
  CheapOrFree: 6,
  Weekend: 7,
  Holiday: 8,
};

/** Numeric → label, for decoding responses (backend serializes enums as ints). */
export const DATE_CATEGORY_LABELS: Record<number, DateCategory> = {
  1: 'Romantic',
  2: 'AtHome',
  3: 'GoingOut',
  4: 'Adventure',
  5: 'Food',
  6: 'CheapOrFree',
  7: 'Weekend',
  8: 'Holiday',
};

/** Human-friendly category labels for display. */
export const DATE_CATEGORY_DISPLAY: Record<DateCategory, string> = {
  Romantic: 'Romantic',
  AtHome: 'At home',
  GoingOut: 'Going out',
  Adventure: 'Adventure',
  Food: 'Food',
  CheapOrFree: 'Cheap or free',
  Weekend: 'Weekend',
  Holiday: 'Holiday',
};

export interface DateIdeaResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  title: string;
  description: string | null;
  /** Serialized as the integer enum value. */
  category: number;
  location: string | null;
  estimatedCost: number | null;
  durationMinutes: number | null;
  notes: string | null;
  isFavorite: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateDateIdeaRequest {
  title: string;
  description?: string | null;
  category: number;
  location?: string | null;
  estimatedCost?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
}

export interface UpdateDateIdeaRequest {
  title?: string | null;
  description?: string | null;
  category?: number;
  location?: string | null;
  estimatedCost?: number | null;
  durationMinutes?: number | null;
  notes?: string | null;
  isFavorite?: boolean;
  isCompleted?: boolean;
}
