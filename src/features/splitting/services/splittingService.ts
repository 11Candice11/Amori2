/**
 * "I'm Splitting" grounding-session API service.
 *
 * Wraps the backend session lifecycle at /api/splitting/sessions. Enum values
 * are sent as their C# NAMES (the API serializes/accepts enum names via
 * JsonStringEnumConverter), and optional fields are coerced to null on write.
 */
import { api } from '../../../services/api/client';
import type {
  SplittingSession,
  CreateSplittingSessionPayload,
  UpdateSplittingSessionPayload,
  CompleteSplittingSessionPayload,
  PartnerSplittingWindow,
} from '../types/splitting.types';

const BASE = '/api/splitting/sessions';

export const splittingService = {
  // ── Reads ──────────────────────────────────────────────────────────────────
  getSessions(): Promise<SplittingSession[]> {
    return api.get<SplittingSession[]>(BASE);
  },

  getSession(sessionId: string): Promise<SplittingSession> {
    return api.get<SplittingSession>(`${BASE}/${sessionId}`);
  },

  /**
   * Privacy-safe view of the partner's active grounding session (for the
   * shared self-regulation window). Resolves to null when the partner has no
   * active session (the API returns 204).
   */
  async getPartnerActive(): Promise<PartnerSplittingWindow | null> {
    try {
      const result = await api.get<PartnerSplittingWindow>(`${BASE}/partner-active`);
      return result ?? null;
    } catch {
      return null;
    }
  },

  /**
   * The current user's own most recent in-progress grounding session, if any —
   * used to show the person who started a self-regulation window the same
   * countdown on their own dashboard. Resolves to null when there's no active
   * session. Derived from the user's session list (no dedicated endpoint).
   */
  async getMyActive(): Promise<SplittingSession | null> {
    try {
      const sessions = await api.get<SplittingSession[]>(BASE);
      if (!Array.isArray(sessions)) return null;
      const active = sessions
        .filter(s => s.status === 'InProgress')
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      return active[0] ?? null;
    } catch {
      return null;
    }
  },

  // ── Writes ─────────────────────────────────────────────────────────────────
  createSession(payload: CreateSplittingSessionPayload): Promise<SplittingSession> {
    return api.post<SplittingSession>(BASE, {
      feelingsSelected: payload.feelingsSelected,
      trigger: payload.trigger ?? null,
      description: payload.description ?? null,
      whatINeed: payload.whatINeed ?? null,
      initialMood: payload.initialMood ?? null,
    });
  },

  updateSession(sessionId: string, payload: UpdateSplittingSessionPayload): Promise<SplittingSession> {
    // PATCH is partial — only send the fields the caller provided so we don't
    // clobber existing values with null.
    const body: Record<string, unknown> = {};
    if (payload.feelingsSelected !== undefined) body.feelingsSelected = payload.feelingsSelected;
    if (payload.trigger !== undefined) body.trigger = payload.trigger;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.whatINeed !== undefined) body.whatINeed = payload.whatINeed;
    if (payload.actionsTaken !== undefined) body.actionsTaken = payload.actionsTaken;
    if (payload.finalMood !== undefined) body.finalMood = payload.finalMood;
    if (payload.spaceEndsAt !== undefined) body.spaceEndsAt = payload.spaceEndsAt;
    return api.patch<SplittingSession>(`${BASE}/${sessionId}`, body);
  },

  completeSession(
    sessionId: string,
    payload: CompleteSplittingSessionPayload = {},
  ): Promise<SplittingSession> {
    return api.post<SplittingSession>(`${BASE}/${sessionId}/complete`, {
      finalMood: payload.finalMood ?? null,
      actionsTaken: payload.actionsTaken ?? undefined,
    });
  },

  cancelSession(sessionId: string): Promise<SplittingSession> {
    return api.post<SplittingSession>(`${BASE}/${sessionId}/cancel`);
  },
};
