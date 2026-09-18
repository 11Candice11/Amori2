/**
 * partnerLinkService — links two accounts into one couple relationship.
 *
 * Backend routes (see Amori.Api/Features/Relationships/PartnerLinkController):
 *   GET    /api/partner-link/status                  → PartnerLinkStatusResponse
 *   POST   /api/partner-link/requests                → send a request by email
 *   POST   /api/partner-link/requests/{id}/accept    → accept an incoming request
 *   POST   /api/partner-link/requests/{id}/decline   → decline an incoming request
 *   DELETE /api/partner-link/requests/{id}           → cancel an outgoing request
 *   DELETE /api/partner-link                         → unlink from the current partner
 */
import { api } from '../../../services/api/client';
import type {
  PartnerLinkRequestResponse,
  PartnerLinkStatusResponse,
  RelationshipResponse,
} from '../../../services/api/types';

export const partnerLinkService = {
  getStatus(): Promise<PartnerLinkStatusResponse> {
    return api.get<PartnerLinkStatusResponse>('/api/partner-link/status');
  },

  sendRequest(email: string): Promise<PartnerLinkRequestResponse> {
    return api.post<PartnerLinkRequestResponse>('/api/partner-link/requests', {
      email: email.trim(),
    });
  },

  /**
   * Accept an incoming link request.
   * @param startDate Optional ISO date ("YYYY-MM-DD") the relationship began,
   *   used to seed the "days together" count on the dashboard.
   */
  acceptRequest(
    requestId: string,
    startDate?: string | null,
  ): Promise<RelationshipResponse> {
    return api.post<RelationshipResponse>(
      `/api/partner-link/requests/${requestId}/accept`,
      { startDate: startDate ?? null },
    );
  },

  declineRequest(requestId: string): Promise<void> {
    return api.post<void>(`/api/partner-link/requests/${requestId}/decline`);
  },

  cancelRequest(requestId: string): Promise<void> {
    return api.delete<void>(`/api/partner-link/requests/${requestId}`);
  },

  /**
   * Unlink from the current partner. The account is returned to a solo
   * relationship; the shared data stays with the partner who remains.
   */
  unlink(): Promise<void> {
    return api.delete<void>('/api/partner-link');
  },
};
