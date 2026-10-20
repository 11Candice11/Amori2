/**
 * useBadges — React hook for accessing user's badge data.
 *
 * Automatically loads badges on mount and subscribes to updates.
 * Provides earned badges, unlock progress, and stats.
 */
import { useEffect, useState } from 'react';
import { badgeService } from '../services/badgeService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { Badge } from '../../../constants/badges';

export interface UseBadgesResult {
  /** Set of earned badge IDs */
  unlockedBadges: Set<string>;
  /** Set of badge IDs saved to the vault */
  savedBadges: Set<string>;
  /** Full badge objects for earned badges */
  earnedBadges: Badge[];
  /** Badges user is close to unlocking */
  nearbyBadges: Badge[];
  /** User's current stats (points, level, etc.) */
  userStats: Record<string, number>;
  /** Total points earned */
  totalPoints: number;
  /** Current level */
  level: number;
  /** Loading state */
  loading: boolean;
  /** Error loading badges */
  error: Error | null;
  /** Refresh badges from API */
  refresh: () => Promise<void>;
  /** Archive badge to vault */
  archiveBadge: (badgeId: string) => Promise<void>;
}

export function useBadges(): UseBadgesResult {
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(new Set());
  const [savedBadges, setSavedBadges] = useState<Set<string>>(() => badgeService.getSaved());
  const [userStats, setUserStats] = useState<Record<string, number>>(() =>
    badgeService.getUserStats(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const user = userSettingsStore.get();

  useEffect(() => {
    // Load badges and user settings
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load user settings if not already loaded
        await userSettingsStore.load();

        // Load badge progress from API
        const earned = await badgeService.loadEarned();
        setUnlockedBadges(earned);
        setSavedBadges(badgeService.getSaved());
        setUserStats(badgeService.getUserStats());
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load badges'));
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to badge updates — progress counters move even when no new
    // badge is earned, so refresh both from the same event.
    const unsubscribe = badgeService.subscribe((badges) => {
      setUnlockedBadges(new Set(badges));
      setSavedBadges(badgeService.getSaved());
      setUserStats(badgeService.getUserStats());
    });

    return unsubscribe;
  }, []);

  return {
    unlockedBadges,
    savedBadges,
    earnedBadges: badgeService.getEarnedBadges(),
    nearbyBadges: badgeService.getNearbadges(3),
    userStats,
    totalPoints: user?.totalPoints ?? 0,
    level: user?.level ?? 1,
    loading,
    error,
    refresh: badgeService.refresh,
    archiveBadge: badgeService.archiveBadge,
  };
}
