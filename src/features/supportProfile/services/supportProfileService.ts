/**
 * Support Preferences / "How to Know Me" API service.
 *
 * Wraps /api/support-profile. Section PATCHes are partial — only the fields the
 * caller sets are sent, so an edit never clobbers untouched fields. The partner
 * endpoint returns a shared-only projection (the server strips private/empty
 * fields), so the client never even receives private data.
 */
import { api } from '../../../services/api/client';
import type {
  SupportProfile,
  PartnerSupportProfile,
  UpdateWhoIAm,
  UpdateWhatILike,
  UpdateFavorites,
  UpdateHowToHelpMe,
  UpdateThingsToKnow,
  UpdateBoundaries,
  UpdateLittleThings,
} from '../types/supportProfile.types';

const BASE = '/api/support-profile';

export const supportProfileService = {
  /** The signed-in user's own profile (created empty on first access). */
  getMine(): Promise<SupportProfile> {
    return api.get<SupportProfile>(`${BASE}/me`);
  },

  /**
   * The linked partner's profile — shared, non-empty fields only. Resolves to
   * null when there is no linked partner (the API returns 404).
   */
  async getPartner(): Promise<PartnerSupportProfile | null> {
    try {
      return await api.get<PartnerSupportProfile>(`${BASE}/partner`);
    } catch {
      return null;
    }
  },

  updateWhoIAm(body: UpdateWhoIAm): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/who-i-am`, body);
  },

  updateWhatILike(body: UpdateWhatILike): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/what-i-like`, body);
  },

  updateFavorites(body: UpdateFavorites): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/favorites`, body);
  },

  updateHowToHelpMe(body: UpdateHowToHelpMe): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/how-to-help-me`, body);
  },

  updateThingsToKnow(body: UpdateThingsToKnow): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/things-to-know`, body);
  },

  updateBoundaries(body: UpdateBoundaries): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/boundaries`, body);
  },

  updateLittleThings(body: UpdateLittleThings): Promise<SupportProfile> {
    return api.patch<SupportProfile>(`${BASE}/me/little-things`, body);
  },

  /**
   * Explicitly tell the partner the profile was updated. The only notification
   * the feature sends — nothing is sent automatically on field edits.
   */
  notifyPartner(message?: string): Promise<void> {
    return api.post<void>(`${BASE}/me/notify-partner`, { message: message ?? null });
  },
};
