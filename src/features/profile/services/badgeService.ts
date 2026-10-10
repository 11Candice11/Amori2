/**
 * Badge Service — coordinates badge unlocking and tracking with the points system.
 *
 * This service:
 * - Fetches user's earned badges from the API
 * - Tracks which badges have been unlocked
 * - Computes unlock criteria based on user stats
 * - Notifies when badges are earned
 * - Saves badges to vault
 */
import { pointsService } from '../../../services/api/pointsService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import { ALL_BADGES, isBadgeUnlocked, type Badge } from '../../../constants/badges';
import type { BadgeResponse } from '../../../services/api/pointsService';

type BadgeListener = (badges: Set<string>, earnedBadge?: Badge) => void;

let cachedBadges: Set<string> = new Set();
let listeners = new Set<BadgeListener>();
let loadInFlight: Promise<void> | null = null;

export const badgeService = {
  /**
   * Get cached earned badge IDs. Empty set if not yet loaded.
   */
  getEarned(): Set<string> {
    return new Set(cachedBadges);
  },

  /**
   * Get all earned badges with full data from the constants.
   */
  getEarnedBadges(): Badge[] {
    return ALL_BADGES.filter(b => cachedBadges.has(b.id));
  },

  /**
   * Load earned badges from the API and cache them.
   * Concurrent calls share the same request.
   */
  async loadEarned(): Promise<Set<string>> {
    if (loadInFlight) return loadInFlight;

    loadInFlight = pointsService
      .getBadges()
      .then((badges: BadgeResponse[]) => {
        const badgeIds = new Set(badges.map(b => b.id));
        cachedBadges = badgeIds;
        listeners.forEach(listener => listener(badgeIds));
      })
      .catch(err => {
        console.warn('Failed to load badges:', err);
        // Keep cached value on error
      })
      .finally(() => {
        loadInFlight = null;
      });

    return loadInFlight.then(() => cachedBadges);
  },

  /**
   * Get user's current stats for badge unlock evaluation.
   * Fetches from userSettingsStore (totalPoints, level) + returns as Record.
   *
   * Note: Individual activity counts (hugs_sent, checkins_completed, etc.)
   * are NOT exposed via API — they're tracked server-side and used only for
   * badge unlock calculations on the backend. This method returns what's
   * available in UserResponse.
   */
  getUserStats(): Record<string, number> {
    const user = userSettingsStore.get();
    if (!user) return {};

    return {
      level_reached: user.level,
      total_points: user.totalPoints,
      // Backend tracking is private; these values are passed from server
      // when checking badge unlock criteria
    };
  },

  /**
   * Compute which badges are unlocked based on current user stats.
   * This is client-side validation; server is source of truth.
   */
  getUnlockedBadges(): Set<string> {
    const stats = badgeService.getUserStats();
    const unlocked = new Set<string>();

    ALL_BADGES.forEach(badge => {
      if (isBadgeUnlocked(badge, stats)) {
        unlocked.add(badge.id);
      }
    });

    return unlocked;
  },

  /**
   * Check if a specific badge is unlocked based on current stats.
   */
  isBadgeUnlocked(badgeId: string): boolean {
    const badge = ALL_BADGES.find(b => b.id === badgeId);
    if (!badge) return false;

    const stats = badgeService.getUserStats();
    return isBadgeUnlocked(badge, stats);
  },

  /**
   * Get the next badge(s) the user is close to unlocking.
   * Useful for showing progress suggestions.
   */
  getNearbadges(count = 3): Badge[] {
    const stats = badgeService.getUserStats();
    const unlocked = badgeService.getUnlockedBadges();

    // Badges not yet earned
    const lockedBadges = ALL_BADGES.filter(b => !unlocked.has(b.id));

    // For now, just return the first N locked badges
    // In future, could rank by proximity to unlock threshold
    return lockedBadges.slice(0, count);
  },

  /**
   * Save a badge to the user's vault.
   */
  async archiveBadge(badgeId: string): Promise<void> {
    return pointsService.archiveBadge(badgeId);
  },

  /**
   * Subscribe to badge changes. Notifies when badges are loaded or new badges earned.
   */
  subscribe(listener: BadgeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Refresh badge list from the API.
   */
  async refresh(): Promise<void> {
    return badgeService.loadEarned().then(() => {});
  },

  /**
   * Clear cached badges on logout.
   */
  reset(): void {
    cachedBadges = new Set();
    listeners.clear();
    loadInFlight = null;
  },
};
