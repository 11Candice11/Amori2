/**
 * hugService — wraps the Amori Hugs API.
 *
 * Endpoints used (see Amori.Api/Features/Hugs/Controllers/HugsController):
 *   POST   /api/hugs                       → send a hug (optional whisper body)
 *   GET    /api/hugs                       → all hugs for the relationship, newest first
 *   GET    /api/hugs/{hugId}               → a single hug
 *   POST   /api/hugs/{hugId}/acknowledge   → acknowledge a received hug
 */
import { api } from '../../../services/api/client';
import type { HugResponse, SendHugRequest } from '../../../services/api/types';

export const hugService = {
  /** Send a hug to your partner, optionally with a gentle whisper. */
  sendHug(whisper?: string | null): Promise<HugResponse> {
    const trimmed = whisper?.trim();
    const body: SendHugRequest = { whisper: trimmed ? trimmed : null };
    return api.post<HugResponse>('/api/hugs', body);
  },

  /** All hugs for the current relationship, ordered newest first. */
  getHugs(): Promise<HugResponse[]> {
    return api.get<HugResponse[]>('/api/hugs');
  },

  /** A single hug by id. */
  getHug(hugId: string): Promise<HugResponse> {
    return api.get<HugResponse>(`/api/hugs/${hugId}`);
  },

  /** Acknowledge a received hug. Only the recipient may do this. */
  acknowledge(hugId: string): Promise<HugResponse> {
    return api.post<HugResponse>(`/api/hugs/${hugId}/acknowledge`);
  },
};
