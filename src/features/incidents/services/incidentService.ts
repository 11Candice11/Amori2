/**
 * Incident (relationship help-desk) API service.
 *
 * Wraps the backend incident endpoints. Enum values are sent as their
 * numeric representations where the backend expects integers.
 */
import { api } from '../../../services/api/client';
import {
  INCIDENT_CATEGORY_VALUES,
  IMPACT_VALUES,
  URGENCY_VALUES,
  type IncidentCategory,
  type IncidentDetail,
  type IncidentFilter,
  type IncidentHistoryEntry,
  type IncidentImpact,
  type IncidentLesson,
  type IncidentNote,
  type IncidentResponse,
  type IncidentReview,
  type IncidentSla,
  type IncidentSummaryItem,
  type IncidentSummaryStats,
  type IncidentUrgency,
  type PagedResult,
} from '../types/incident.types';

const BASE = '/api/incidents';

// ─── Request payload shapes ────────────────────────────────────────────────────

export interface CreateIncidentPayload {
  title: string;
  description?: string;
  category: IncidentCategory;
  subCategory?: string;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
}

export interface CreateReviewPayload {
  whatWentWell?: string;
  whatCouldImprove?: string;
  futureAction?: string;
}

// ─── Query string helper ────────────────────────────────────────────────────

function buildQuery(filter: IncidentFilter = {}): string {
  // Build the query string manually — React Native's Hermes runtime does not
  // fully implement URLSearchParams (e.g. .set / .toString throw).
  const parts: string[] = [];
  const add = (key: string, value: string | number | boolean) => {
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  };

  if (filter.status) add('status', filter.status);
  if (filter.category) add('category', filter.category);
  if (filter.priority) add('priority', filter.priority);
  if (filter.reportedByMe) add('reportedByMe', true);
  if (filter.assignedToMe) add('assignedToMe', true);
  if (filter.openOnly) add('openOnly', true);
  if (filter.overdue) add('overdue', true);
  if (filter.page != null) add('page', filter.page);
  if (filter.pageSize != null) add('pageSize', filter.pageSize);

  return parts.length ? `?${parts.join('&')}` : '';
}

// ─── Service ────────────────────────────────────────────────────────────────

export const incidentService = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  getIncidents(filter: IncidentFilter = {}): Promise<PagedResult<IncidentSummaryItem>> {
    return api.get<PagedResult<IncidentSummaryItem>>(`${BASE}${buildQuery(filter)}`);
  },

  getIncident(incidentId: string): Promise<IncidentDetail> {
    return api.get<IncidentDetail>(`${BASE}/${incidentId}`);
  },

  getIncidentSummary(): Promise<IncidentSummaryStats> {
    return api.get<IncidentSummaryStats>(`${BASE}/summary`);
  },

  getIncidentSla(incidentId: string): Promise<IncidentSla> {
    return api.get<IncidentSla>(`${BASE}/${incidentId}/sla`);
  },

  getIncidentHistory(incidentId: string): Promise<IncidentHistoryEntry[]> {
    return api.get<IncidentHistoryEntry[]>(`${BASE}/${incidentId}/history`);
  },

  getIncidentNotes(incidentId: string): Promise<IncidentNote[]> {
    return api.get<IncidentNote[]>(`${BASE}/${incidentId}/notes`);
  },

  getIncidentResponses(incidentId: string): Promise<IncidentResponse[]> {
    return api.get<IncidentResponse[]>(`${BASE}/${incidentId}/responses`);
  },

  getIncidentReviews(incidentId: string): Promise<IncidentReview[]> {
    return api.get<IncidentReview[]>(`${BASE}/${incidentId}/reviews`);
  },

  getIncidentLessons(incidentId: string): Promise<IncidentLesson[]> {
    return api.get<IncidentLesson[]>(`${BASE}/${incidentId}/lessons`);
  },

  // ── Writes ─────────────────────────────────────────────────────────────────
  createIncident(payload: CreateIncidentPayload): Promise<IncidentDetail> {
    return api.post<IncidentDetail>(BASE, {
      title: payload.title,
      description: payload.description ?? null,
      category: INCIDENT_CATEGORY_VALUES[payload.category],
      subCategory: payload.subCategory ?? null,
      impact: IMPACT_VALUES[payload.impact],
      urgency: URGENCY_VALUES[payload.urgency],
    });
  },

  assignIncident(incidentId: string, assignedToUserId: string): Promise<IncidentDetail> {
    // Backend expects `assignedToUserId` (AssignIncidentRequest.AssignedToUserId).
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/assign`, { assignedToUserId });
  },

  /** Reassign the ticket to the caller's partner (the other relationship member). */
  reassignIncident(incidentId: string): Promise<IncidentDetail> {
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/reassign`);
  },

  investigateIncident(incidentId: string): Promise<IncidentDetail> {
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/investigate`);
  },

  awaitResponse(incidentId: string): Promise<IncidentDetail> {
    // Backend route is `/awaiting-response`.
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/awaiting-response`);
  },

  resolveIncident(
    incidentId: string,
    resolution: string,
    resolutionNotes?: string,
  ): Promise<IncidentDetail> {
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/resolve`, {
      resolution,
      resolutionNotes: resolutionNotes ?? null,
    });
  },

  closeIncident(incidentId: string, notes?: string): Promise<IncidentDetail> {
    // Backend expects `closureNotes` (CloseIncidentRequest.ClosureNotes).
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/close`, {
      closureNotes: notes ?? null,
    });
  },

  reopenIncident(incidentId: string, reason: string): Promise<IncidentDetail> {
    return api.post<IncidentDetail>(`${BASE}/${incidentId}/reopen`, { reason });
  },

  addIncidentNote(incidentId: string, content: string): Promise<IncidentNote> {
    return api.post<IncidentNote>(`${BASE}/${incidentId}/notes`, { content });
  },

  addIncidentResponse(incidentId: string, message: string): Promise<IncidentResponse> {
    return api.post<IncidentResponse>(`${BASE}/${incidentId}/responses`, { message });
  },

  createIncidentReview(incidentId: string, payload: CreateReviewPayload): Promise<IncidentReview> {
    return api.post<IncidentReview>(`${BASE}/${incidentId}/reviews`, {
      whatWentWell: payload.whatWentWell ?? null,
      whatCouldImprove: payload.whatCouldImprove ?? null,
      futureAction: payload.futureAction ?? null,
    });
  },

  addIncidentLesson(incidentId: string, lesson: string): Promise<IncidentLesson> {
    return api.post<IncidentLesson>(`${BASE}/${incidentId}/lessons`, { lesson });
  },
};
