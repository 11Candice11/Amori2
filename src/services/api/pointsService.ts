/**
 * Points and badges API service.
 *
 * Handles all communication with the gamification endpoints:
 * - POST /api/users/me/points - Award points for activities
 * - POST /api/users/me/badges/{badgeId}/archive - Save badges to vault
 */
import { apiClient } from './client';
import type { ActivityType } from '../../services/api/types';

export interface AddPointsPayload {
  activityType: string; // ActivityType enum
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
  points?: {
    totalPoints: number;
    level: number;
    pointsInCurrentLevel: number;
    pointsNeededForLevel: number;
    progressPercentage: number;
  };
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

export const pointsService = {
  /**
   * Award points to the current user for completing an activity.
   * Returns updated points/level and any badges earned.
   */
  async addPoints(payload: AddPointsPayload): Promise<AddPointsResult> {
    const response = await apiClient.post('/users/me/points', payload);
    return response.data;
  },

  /**
   * Archive a badge to the user's vault.
   */
  async archiveBadge(badgeId: string): Promise<BadgeResponse> {
    const response = await apiClient.post(`/users/me/badges/${badgeId}/archive`, {});
    return response.data;
  },

  /**
   * Get all badges earned by the user.
   */
  async getBadges(): Promise<BadgeResponse[]> {
    const response = await apiClient.get('/users/me/badges');
    return response.data;
  },

  /**
   * Get the user's points and level info.
   */
  async getPoints(): Promise<{
    totalPoints: number;
    level: number;
    pointsInCurrentLevel: number;
    pointsNeededForLevel: number;
    progressPercentage: number;
  }> {
    const response = await apiClient.get('/users/me/points');
    return response.data;
  },
};
