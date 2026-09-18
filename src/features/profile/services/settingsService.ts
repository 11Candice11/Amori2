/**
 * settingsService — the user's privacy / sharing preferences.
 *
 * Backend routes (Amori.Api/Features/Users):
 *   PATCH /api/users/me/settings   -> UserResponse (partial update)
 *   GET   /api/users/partner-status -> PartnerStatusResponse
 */
import { api } from '../../../services/api/client';
import type {
  UpdateUserSettingsRequest,
  UserResponse,
  PartnerStatusResponse,
} from '../../../services/api/types';

export const settingsService = {
  /** Patch one or more sharing preferences. Returns the updated user. */
  update(request: UpdateUserSettingsRequest): Promise<UserResponse> {
    return api.patch<UserResponse>('/api/users/me/settings', request);
  },

  /** The partner's presence, honouring their "Share activity" preference. */
  getPartnerStatus(): Promise<PartnerStatusResponse> {
    return api.get<PartnerStatusResponse>('/api/users/partner-status');
  },
};
