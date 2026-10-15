/**
 * Points and badges API service.
 *
 * Handles all communication with the gamification endpoints:
 * - POST /api/users/me/points - Award points for activities
 * - GET  /api/users/me/points - Points and level
 * - GET  /api/users/me/badges - Badges earned
 * - GET  /api/users/me/badge-stats - Progress towards each badge
 * - POST /api/users/me/badges/{badgeId}/archive - Save badges to vault
 */
import { api } from './client';

export interface AddPointsPayload {
  /** ActivityType enum name, e.g. "HugSent". */
  activityType: string;
  amount: number;
  referenceId?: string;
  metadata?: string;
}

export interface AddPointsResult {
  pointsAwarded: number;
  newTotalPoints: number;
  newLevel: number;
  previousLevel: number;
  leveledUp: boolean;
  newBadge?: {
    id: string;
    badgeName: string;
    description: string;
    awardedAtLevel: number;
    imageUrl?: string | null;
    earnedAt: string;
  } | null;
  points?: UserPointsResult;
}

export interface BadgeResponse {
  id: string;
  badgeName: string;
  description: string;
  awardedAtLevel: number;
  imageUrl?: string | null;
  isArchivedInVault: boolean;
  earnedAt: string;
}

export interface UserPointsResult {
  totalPoints: number;
  level: number;
  pointsInCurrentLevel: number;
  pointsNeededForLevel: number;
  progressPercentage: number;
}

/**
 * Progress counters keyed by badge unlock criteria, e.g. `{ hugs_sent: 5 }`.
 * Criteria the backend doesn't track are absent rather than zero.
 */
export type BadgeStatsResponse = Record<string, number>;

export const pointsService = {
  /**
   * Award points to the current user for completing an activity.
   * Returns updated points/level and any badges earned.
   */
  addPoints(payload: AddPointsPayload): Promise<AddPointsResult> {
    return api.post<AddPointsResult>('/api/users/me/points', payload);
  },

  /**
   * Archive a badge to the user's vault.
   */
  archiveBadge(badgeId: string): Promise<BadgeResponse> {
    return api.post<BadgeResponse>(`/api/users/me/badges/${badgeId}/archive`);
  },

  /**
   * Get all badges earned by the user.
   */
  getBadges(): Promise<BadgeResponse[]> {
    return api.get<BadgeResponse[]>('/api/users/me/badges');
  },

  /**
   * Get how far the user has come on each badge criteria (e.g. hugs sent),
   * used to show "5 / 10" progress against a badge's threshold.
   */
  async getBadgeStats(): Promise<BadgeStatsResponse> {
    const stats = await api.get<BadgeStatsResponse | null>('/api/users/me/badge-stats');
    return stats ?? {};
  },

  /**
   * Get the user's points and level info.
   */
  getPoints(): Promise<UserPointsResult> {
    return api.get<UserPointsResult>('/api/users/me/points');
  },
};
