/**
 * Presentation helpers for the Timeline feature. The wire types
 * (TimelineEventResponse, TimelineEventType, …) live in
 * src/services/api/types.ts; this module holds display labels and ordering.
 */
import type { TimelineEventType } from '../../../services/api/types';

/** Friendly labels for each milestone type. */
export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  FirstConversation: 'First conversation',
  FirstDate: 'First date',
  FirstKiss: 'First kiss',
  FirstTrip: 'First trip',
  Anniversary: 'Anniversary',
  Custom: 'Moment',
};

/** A short emoji marker per milestone type, used on the timeline rail. */
export const TIMELINE_EVENT_EMOJI: Record<TimelineEventType, string> = {
  FirstConversation: '💬',
  FirstDate: '🍷',
  FirstKiss: '💋',
  FirstTrip: '✈️',
  Anniversary: '💍',
  Custom: '✨',
};

/** Stable display order for the type selector. */
export const TIMELINE_EVENT_ORDER: TimelineEventType[] = [
  'FirstConversation',
  'FirstDate',
  'FirstKiss',
  'FirstTrip',
  'Anniversary',
  'Custom',
];
