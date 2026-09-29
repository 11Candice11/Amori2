/**
 * Types for the Weekly Reflection — a client-side aggregation of the user's
 * own week (Monday–Sunday) drawn from existing endpoints. There is no
 * dedicated backend endpoint for this view yet (see selectors.ts header).
 */
import type { MoodQuadrant } from '../../mood/types/mood.types';
import type { MemoryResponse } from '../../memories/types/memory.types';
import type { TimelineEventResponse } from '../../../services/api/types';
import type { BucketListItemResponse } from '../../together/types/together.types';

/** A single day's mood cell in the MON…SUN strip. */
export interface DayMood {
  /** Monday-first index 0–6. */
  dayIndex: number;
  /** Local Date for the day (start of day). */
  date: Date;
  /** The day-of-month number shown under the label, e.g. 12. */
  dayOfMonth: number;
  /** Whether a check-in happened on this day. */
  hasCheckIn: boolean;
  /**
   * The mood quadrant for that day's check-in, or null when there was no
   * check-in (or the mood couldn't be mapped, e.g. an "I don't know").
   */
  quadrant: MoodQuadrant | null;
  /** Human label the user chose (feelings text) or the mood enum name. */
  label: string | null;
}

/** Per-quadrant tally across the week. */
export type QuadrantDistribution = Record<MoodQuadrant, number>;

/** A memory surfaced as a thumbnail on the reflection. */
export interface WeeklyMemoryThumb {
  id: string;
  title: string;
  /** A loadable image URL for the first visual media item, if any. */
  thumbnailUrl: string | null;
  createdByName: string | null;
  /** ISO memoryDateTime. */
  memoryDateTime: string;
}

/** A completed milestone / bucket-list item within the week. */
export interface WeeklyMilestone {
  id: string;
  title: string;
  /** e.g. "Anniversary" (timeline) or a bucket-list category name. */
  kind: string;
  /** ISO completion/event date used for ordering + display. */
  when: string;
  source: 'timeline' | 'bucketList';
}

/** The fully aggregated weekly reflection. */
export interface WeeklyReflection {
  /** MON…SUN, always length 7. */
  days: DayMood[];
  /** Count of days (0–7) with at least one check-in. */
  checkInDays: number;
  /** Per-quadrant tallies across the week. */
  distribution: QuadrantDistribution;
  /** The most frequent quadrant, or null when there were no mapped check-ins. */
  dominantQuadrant: MoodQuadrant | null;
  /** How many days the dominant quadrant covered. */
  dominantCount: number;
  /** Number of memories captured this week. */
  memoryCount: number;
  /** Up to a handful of memory thumbnails for the strip. */
  memoryThumbs: WeeklyMemoryThumb[];
  /** Hugs sent by the current user this week. */
  hugsSent: number;
  /** Hugs received by the current user this week. */
  hugsReceived: number;
  /** Completed milestones + bucket-list items this week. */
  milestones: WeeklyMilestone[];
  /** True when there were zero check-ins — drives the gentle empty state. */
  isEmpty: boolean;
}

/** Raw inputs to the aggregation selector (post-fetch, pre-filter). */
export interface WeeklyReflectionInputs {
  /** The current user's id, for splitting hugs into sent/received. */
  currentUserId: string | null;
  /**
   * All check-ins available client-side for the week. Today only the single
   * latest check-in is fetchable (backend gap), so this is usually 0–1 items.
   */
  checkIns: WeeklyCheckIn[];
  memories: MemoryResponse[];
  timeline: TimelineEventResponse[];
  hugs: WeeklyHug[];
  bucketList: BucketListItemResponse[];
}

/** Minimal check-in shape the selector needs (subset of CheckInResponse). */
export interface WeeklyCheckIn {
  mood: string;
  feelings: string | null;
  createdAt: string;
}

/** Minimal hug shape the selector needs (subset of HugResponse). */
export interface WeeklyHug {
  senderId: string;
  recipientId: string;
  createdAt: string;
}
