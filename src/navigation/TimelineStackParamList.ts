/**
 * Timeline feature stack routes.
 *
 * TimelineHome     → the couple's milestone timeline (GET /api/timeline).
 * AddTimelineEvent → compose form that POSTs a real /api/timeline milestone,
 *                    or edits an existing one when `eventId` is set.
 */
export type TimelineStackParamList = {
  TimelineHome: undefined;
  AddTimelineEvent: { eventId?: string } | undefined;
};
