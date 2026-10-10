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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const user = userSettingsStore.get();
  const stats = badgeService.getUserStats();

  useEffect(() => {
    // Load badges and user settings
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load user settings if not already loaded
        await userSettingsStore.load();

        // Load earned badges from API
        const earned = await badgeService.loadEarned();
        setUnlockedBadges(earned);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load badges'));
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Subscribe to badge updates
    const unsubscribe = badgeService.subscribe((badges) => {
      setUnlockedBadges(new Set(badges));
    });

    return unsubscribe;
  }, []);

  return {
    unlockedBadges,
    earnedBadges: badgeService.getEarnedBadges(),
    nearbyBadges: badgeService.getNearbadges(3),
    userStats: stats,
    totalPoints: user?.totalPoints ?? 0,
    level: user?.level ?? 1,
    loading,
    error,
    refresh: badgeService.refresh,
    archiveBadge: badgeService.archiveBadge,
  };
}
