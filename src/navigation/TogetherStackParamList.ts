/**
 * Together feature stack routes.
 *
 * TogetherHome         → the shared "Our Sacred Cadence" dashboard.
 * AddCalendarEvent     → compose form that POSTs a real /api/calendar/events.
 *                        `date` (YYYY-MM-DD) optionally pre-fills the form when
 *                        opened from a tapped calendar day.
 * Wishlist             → the full shared wishlist (GET /api/wishlist).
 * Memories             → the shared memories collection (GET /api/memories).
 * AddMemory            → compose form that POSTs a real /api/memories. Requires
 *                        a memory date + time.
 * RelationshipTimeline → a chronological timeline of the couple's memories.
 */
export type TogetherStackParamList = {
  TogetherHome: undefined;
  AddCalendarEvent: { date?: string } | undefined;
  Wishlist: undefined;
  Memories: undefined;
  AddMemory: undefined;
  RelationshipTimeline: undefined;
};
