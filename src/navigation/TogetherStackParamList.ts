/**
 * Together feature stack routes.
 *
 * TogetherHome         → the shared "Our Sacred Cadence" dashboard.
 * CalendarDay          → the day view for a tapped calendar day. `date`
 *                        ("YYYY-MM-DD") is the day to open on; the screen can
 *                        then move between days itself.
 * AddCalendarEvent     → compose form that POSTs a real /api/calendar/events,
 *                        or edits an existing event when `event` is passed.
 *                        `date` (YYYY-MM-DD) optionally pre-fills the form when
 *                        opened from a tapped calendar day, and `startTime`
 *                        ("HH:mm") pre-fills the time when opened from a tapped
 *                        hour in the day view. `event` (a full
 *                        CalendarEventResponse) switches the screen into edit
 *                        mode, pre-filling every field and enabling delete.
 * Wishlist             → the full shared wishlist (GET /api/wishlist).
 * DateIdeas            → the couple's date ideas (bucket-list items filed under
 *                        the DateIdeas category; GET/POST /api/bucket-list).
 * Memories             → the shared memories collection (GET /api/memories).
 * AddMemory            → compose form that POSTs a real /api/memories. Requires
 *                        a memory date + time.
 * RelationshipTimeline → a chronological timeline of the couple's memories.
 * MemoryMap            → a fullscreen interactive map for a single memory's
 *                        location, with an "open in Maps app" action.
 */
import type { CalendarEventResponse } from '../features/together/types/together.types';

export type TogetherStackParamList = {
  TogetherHome: undefined;
  CalendarDay: { date: string };
  AddCalendarEvent:
    | { date?: string; startTime?: string; event?: CalendarEventResponse }
    | undefined;
  Wishlist: undefined;
  DateIdeas: undefined;
  Memories: undefined;
  /** Compose a new memory, or edit an existing one when `memoryId` is set. */
  AddMemory: { memoryId?: string } | undefined;
  RelationshipTimeline: undefined;
  MemoryMap: {
    latitude: number;
    longitude: number;
    title: string;
    location: string | null;
  };
};
