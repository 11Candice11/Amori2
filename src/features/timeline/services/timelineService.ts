/**
 * timelineService — wraps the Amori Timeline API (relationship milestones:
 * first conversation, first date, anniversary, trips, custom moments).
 *
 * Endpoints (see Amori.Api/Features/Timeline/Controllers/TimelineController):
 *   GET    /api/timeline                    → all events, ordered by event date
 *   GET    /api/timeline/{eventId}           → a single event
 *   POST   /api/timeline                     → create a milestone
 *   PATCH  /api/timeline/{eventId}           → edit a milestone
 *   DELETE /api/timeline/{eventId}           → delete a milestone
 *   POST   /api/timeline/{eventId}/media     → append a photo key to an event
 */
import { api } from '../../../services/api/client';
import type {
  AddTimelineMediaRequest,
  CreateTimelineEventRequest,
  TimelineEventResponse,
  UpdateTimelineEventRequest,
} from '../../../services/api/types';

export const timelineService = {
  /** All timeline events for the current relationship, ordered by event date. */
  getEvents(): Promise<TimelineEventResponse[]> {
    return api.get<TimelineEventResponse[]>('/api/timeline');
  },

  /** A single timeline event by id. */
  getEvent(eventId: string): Promise<TimelineEventResponse> {
    return api.get<TimelineEventResponse>(`/api/timeline/${eventId}`);
  },

  /** Create a new milestone. Optional fields are coerced to null/[] . */
  createEvent(body: CreateTimelineEventRequest): Promise<TimelineEventResponse> {
    return api.post<TimelineEventResponse>('/api/timeline', {
      title: body.title.trim(),
      description: body.description?.trim() ? body.description.trim() : null,
      eventDate: body.eventDate,
      location: body.location?.trim() ? body.location.trim() : null,
      eventType: body.eventType ?? 'Custom',
      photoKeys: body.photoKeys ?? [],
    });
  },

  /** Edit a milestone. Only the provided fields are sent (partial PATCH). */
  updateEvent(
    eventId: string,
    body: UpdateTimelineEventRequest,
  ): Promise<TimelineEventResponse> {
    const payload: Record<string, unknown> = {};
    if (body.title !== undefined) payload.title = body.title;
    if (body.description !== undefined) payload.description = body.description;
    if (body.eventDate !== undefined) payload.eventDate = body.eventDate;
    if (body.location !== undefined) payload.location = body.location;
    if (body.eventType !== undefined) payload.eventType = body.eventType;
    return api.patch<TimelineEventResponse>(`/api/timeline/${eventId}`, payload);
  },

  /** Delete a milestone. */
  deleteEvent(eventId: string): Promise<void> {
    return api.delete<void>(`/api/timeline/${eventId}`);
  },

  /** Append a photo key to an existing milestone. */
  addMedia(
    eventId: string,
    body: AddTimelineMediaRequest,
  ): Promise<TimelineEventResponse> {
    return api.post<TimelineEventResponse>(`/api/timeline/${eventId}/media`, body);
  },
};
