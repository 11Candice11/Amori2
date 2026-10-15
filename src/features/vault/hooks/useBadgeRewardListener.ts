/**
 * Hook for listening to badge reward events.
 * When a user earns a new badge during this session, shows the reward modal.
 */
import { useEffect, useRef } from 'react';
import { getBadgeById, type Badge } from '../../../constants/badges';
import { badgeService } from '../../profile/services/badgeService';

type OnBadgeRewardedFn = (badge: Badge) => void;

/**
 * Badges already known to be unlocked. `null` until the first successful load,
 * which becomes the baseline: badges unlocked before this session aren't news,
 * so they must not pop the "you earned a badge" modal on every app launch.
 */
let knownBadges: Set<string> | null = null;

/** Clear the baseline on sign-out so the next user's first load re-seeds it. */
export function resetBadgeRewardBaseline(): void {
  knownBadges = null;
}

/**
 * Compare a fresh unlocked set with what we knew, remember it, and return the
 * first badge that's new (or null). The first call only seeds the baseline.
 */
function takeNewlyUnlocked(current: Set<string>): Badge | null {
  if (knownBadges === null) {
    knownBadges = new Set(current);
    return null;
  }

  let firstNew: Badge | null = null;
  current.forEach(badgeId => {
    if (!firstNew && !knownBadges!.has(badgeId)) {
      firstNew = getBadgeById(badgeId) ?? null;
    }
  });

  knownBadges = new Set(current);
  return firstNew;
}

/**
 * Hook to listen for badge rewards and trigger callback when new badges are earned.
 *
 * Reacts immediately when badgeService refreshes (it does after any action
 * that earned points), and also polls as a fallback for unlocks driven by the
 * partner's activity (e.g. hugs both ways).
 */
export function useBadgeRewardListener(onBadgeRewarded?: OnBadgeRewardedFn): void {
  const callbackRef = useRef(onBadgeRewarded);
  callbackRef.current = onBadgeRewarded;

  useEffect(() => {
    let isAlive = true;

    const handle = (current: Set<string>) => {
      if (!isAlive) return;
      const badge = takeNewlyUnlocked(current);
      if (badge) callbackRef.current?.(badge);
    };

    const checkForNewBadges = async () => {
      try {
        handle(await badgeService.loadEarned());
      } catch (err) {
        console.warn('Failed to check for new badges:', err);
      }
    };

    const unsubscribe = badgeService.subscribe(badges => handle(badges));

    void checkForNewBadges();
    const pollTimer = setInterval(() => {
      void checkForNewBadges();
    }, 5000);

    return () => {
      isAlive = false;
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, []);
}
