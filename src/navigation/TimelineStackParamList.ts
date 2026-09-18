/**
 * Timeline feature stack routes.
 *
 * TimelineHome     → the couple's milestone timeline (GET /api/timeline).
 * AddTimelineEvent → compose form that POSTs a real /api/timeline milestone.
 */
export type TimelineStackParamList = {
  TimelineHome: undefined;
  AddTimelineEvent: undefined;
};
