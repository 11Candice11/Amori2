/**
 * Points and badges API service.
 *
 * Handles all communication with the gamification endpoints:
 * - POST /api/users/me/points - Award points for activities
 * - GET  /api/users/me/points - Points and level
 * - GET  /api/users/me/badges - Badges earned
 * - GET  /api/users/me/badge-stats - Progress towards each badge
 * - POST /api/users/me/badges/{slug}/archive - Save a badge to the vault (first save earns its points)
 * - POST /api/users/me/badges/archive-all    - Save several badges at once
 * - POST /api/users/me/catch-up              - One-off points backfill for past activity
 */
import { api } from './client';
import type { Rewards } from './rewards';

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
  /** The catalogue badge id (e.g. "first_embrace"); null for level-milestone badges. */
  slug?: string | null;
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

/** One activity's share of the history backfill, e.g. 12 hugs → 120 points. */
export interface BackfillLine {
  activityType: string;
  count: number;
  points: number;
}

/** POST /api/users/me/catch-up */
export interface CatchUpResult {
  /** True only the first time it runs for this user — show the summary then. */
  firstRun: boolean;
  breakdown: BackfillLine[];
  rewards: Rewards;
}

/** POST /api/users/me/badges/archive-all */
export interface ArchiveBadgesResult {
  saved: BadgeResponse[];
  /** Slugs not saved (unknown, or not earned yet). */
  skipped: string[];
  rewards: Rewards;
}

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
   * Save several badges to the vault in one go (the catch-up "Save all").
   * First saves pay each badge's points; `rewards` is applied automatically.
   */
  archiveBadges(slugs: string[]): Promise<ArchiveBadgesResult> {
    return api.post<ArchiveBadgesResult>('/api/users/me/badges/archive-all', { slugs });
  },

  /**
   * One-off credit for activity from before points were awarded server-side.
   * Idempotent — safe to call on every launch; `firstRun` is true once only.
   */
  catchUp(): Promise<CatchUpResult> {
    return api.post<CatchUpResult>('/api/users/me/catch-up');
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
