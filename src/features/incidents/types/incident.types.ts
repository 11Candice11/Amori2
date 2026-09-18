/**
 * Incident types — mirror the C# DTOs and enums exactly.
 * Do not invent values here; they must match the backend.
 */

// ─── Enums (match C# integer values) ─────────────────────────────────────────

export type IncidentStatus =
  | 'Open'        // 1
  | 'Assigned'    // 2
  | 'Investigating' // 3
  | 'AwaitingResponse' // 4
  | 'Resolved'    // 5
  | 'Closed'      // 6
  | 'Reopened';   // 7

export type IncidentCategory =
  | 'Communication'   // 1
  | 'Conflict'        // 2
  | 'Affection'       // 3
  | 'Trust'           // 4
  | 'Boundaries'      // 5
  | 'Plans'           // 6
  | 'Household'       // 7
  | 'EmotionalSupport' // 8
  | 'Other';          // 9

/** Numeric values sent to the API */
export const INCIDENT_CATEGORY_VALUES: Record<IncidentCategory, number> = {
  Communication: 1,
  Conflict: 2,
  Affection: 3,
  Trust: 4,
  Boundaries: 5,
  Plans: 6,
  Household: 7,
  EmotionalSupport: 8,
  Other: 9,
};

export type IncidentImpact = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentUrgency = 'Low' | 'Medium' | 'High' | 'Critical';
export type IncidentPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export const IMPACT_VALUES: Record<IncidentImpact, number> = {
  Low: 1, Medium: 2, High: 3, Critical: 4,
};
export const URGENCY_VALUES: Record<IncidentUrgency, number> = {
  Low: 1, Medium: 2, High: 3, Critical: 4,
};

export type IncidentHistoryAction =
  | 'Created'
  | 'Assigned'
  | 'CategoryChanged'
  | 'PriorityChanged'
  | 'StatusChanged'
  | 'InvestigationStarted'
  | 'NoteAdded'
  | 'ResponseRequested'
  | 'Resolved'
  | 'Closed'
  | 'Reopened'
  | 'ReviewAdded'
  | 'LessonAdded'
  | 'ResponseAdded'
  | 'Updated';

// ─── Shared sub-types ─────────────────────────────────────────────────────────

export interface IncidentUserRef {
  id: string;
  name: string;
}

// ─── Incident summary (list item) ─────────────────────────────────────────────

export interface IncidentSummaryItem {
  id: string;
  title: string;
  category: IncidentCategory;
  subCategory: string | null;
  priority: IncidentPriority;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
  status: IncidentStatus;
  reportedBy: IncidentUserRef;
  assignedTo: IncidentUserRef | null;
  createdAt: string;
  dueAt: string | null;
  isOverdue: boolean;
}

// ─── Incident detail ──────────────────────────────────────────────────────────

export interface IncidentDetail {
  id: string;
  relationshipId: string;
  title: string;
  description: string | null;
  category: IncidentCategory;
  subCategory: string | null;
  impact: IncidentImpact;
  urgency: IncidentUrgency;
  priority: IncidentPriority;
  status: IncidentStatus;
  resolution: string | null;
  resolutionNotes: string | null;
  reportedBy: IncidentUserRef;
  assignedTo: IncidentUserRef | null;
  createdAt: string;
  updatedAt: string | null;
  assignedAt: string | null;
  investigatedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  reopenedAt: string | null;
  dueAt: string | null;
  isOverdue: boolean;
}

// ─── Paged result ─────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface IncidentNote {
  id: string;
  incidentId: string;
  author: IncidentUserRef;
  content: string;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface IncidentResponse {
  id: string;
  incidentId: string;
  author: IncidentUserRef;
  message: string;
  createdAt: string;
  updatedAt: string | null;
}

// ─── History ─────────────────────────────────────────────────────────────────

export interface IncidentHistoryEntry {
  id: string;
  incidentId: string;
  actor: IncidentUserRef;
  action: IncidentHistoryAction;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

// ─── SLA ─────────────────────────────────────────────────────────────────────

export interface IncidentSla {
  incidentId: string;
  priority: IncidentPriority;
  createdAt: string;
  dueAt: string;
  isOverdue: boolean;
  remainingSeconds: number;
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface IncidentReview {
  id: string;
  incidentId: string;
  createdBy: IncidentUserRef;
  whatWentWell: string | null;
  whatCouldImprove: string | null;
  futureAction: string | null;
  createdAt: string;
}

// ─── Lesson ──────────────────────────────────────────────────────────────────

export interface IncidentLesson {
  id: string;
  incidentId: string;
  createdBy: IncidentUserRef;
  lesson: string;
  createdAt: string;
}

// ─── Summary stats ────────────────────────────────────────────────────────────

export interface IncidentSummaryStats {
  relationshipId: string;
  total: number;
  open: number;
  resolved: number;
  closed: number;
  overdue: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byReporter: Record<string, number>;
  averageResolutionHours: number | null;
}

// ─── Filter params ────────────────────────────────────────────────────────────

export interface IncidentFilter {
  status?: IncidentStatus;
  category?: IncidentCategory;
  priority?: IncidentPriority;
  reportedByMe?: boolean;
  assignedToMe?: boolean;
  openOnly?: boolean;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}
