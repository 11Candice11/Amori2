/**
 * Hook for listening to badge reward events.
 * When a user levels up and earns a badge, shows the reward modal.
 */
import { useEffect, useCallback } from 'react';
import { useUserLevel } from '../../../shared/state/userPointsStore';
import type { Badge } from '../types/vault.types';

type OnBadgeRewardedFn = (badge: Badge) => void;

// Track the last level shown to avoid duplicate modals
let lastLevelShown = 0;

// Badge thresholds - badges awarded every 5 levels
const BADGE_THRESHOLDS = [5, 10, 15, 20, 25, 30, 40, 50];

/**
 * Hook to listen for badge rewards and trigger callback when user levels up at a threshold.
 */
export function useBadgeRewardListener(
  onBadgeRewarded?: OnBadgeRewardedFn
): void {
  const { level } = useUserLevel();

  useEffect(() => {
    // Check if current level is a badge threshold and hasn't been shown yet
    if (BADGE_THRESHOLDS.includes(level) && level !== lastLevelShown) {
      lastLevelShown = level;
      
      if (onBadgeRewarded) {
        // Create a badge object for this level
        const badge: Badge = {
          id: `level-${level}`,
          badgeName: `Level ${level}`,
          description: `Reached Level ${level}`,
          awardedAtLevel: level,
          imageUrl: null,
          isArchivedInVault: false,
          earnedAt: new Date().toISOString(),
        };
        
        onBadgeRewarded(badge);
      }
    }
  }, [level, onBadgeRewarded]);
}
