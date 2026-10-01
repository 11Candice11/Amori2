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
 * VisionBoard          → the couple's shared "Us" Vision Board (GET
 *                        /api/vision-board): everything they're building,
 *                        dreaming and becoming together, on ordered shelves.
 * VisionBoardItemDetail→ a single Vision Board item, with the completion flow
 *                        and the optional "Add to Memories"/"Add to Timeline"
 *                        follow-ups.
 * AddVisionBoardItem   → compose a new Vision Board item, or edit an existing
 *                        one when `itemId` is set. `sectionId` optionally
 *                        pre-selects the shelf when opened from a section.
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
  /** The full shared calendar (month grid) as its own view. */
  Calendar: undefined;
  /** The couple's shared important dates (anniversaries, birthdays, milestones). */
  ImportantDates: undefined;
  Memories: undefined;
  /**
   * Monthly Memories ("Rediscovery Archive") — the current calendar month's
   * memories across this and past years. `month` optionally pre-selects a month
   * as "YYYY-MM"; omitted opens on the current month.
   */
  MonthlyMemories: { month?: string } | undefined;
  /** Month-at-a-glance: this month's memories + warmth stats (hugs sent/held). */
  MonthlySnapshot: undefined;
  /** Compose a new memory, or edit an existing one when `memoryId` is set. */
  AddMemory: { memoryId?: string } | undefined;
  RelationshipTimeline: undefined;
  MemoryMap: {
    latitude: number;
    longitude: number;
    title: string;
    location: string | null;
  };
  VisionBoard: undefined;
  VisionBoardItemDetail: { itemId: string };
  /** Compose a new Vision Board item, or edit an existing one when `itemId` is set. */
  AddVisionBoardItem: { itemId?: string; sectionId?: string } | undefined;
};
