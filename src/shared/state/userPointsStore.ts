/**
 * userPointsStore — manages the gamification points and leveling system.
 *
 * Points are earned for various activities:
 * - Sending a hug: 10 points
 * - Adding a vision, todo list, or bucket list: 10 points each
 * - Holding a hug: 5 points
 * - Daily check-in: 10 points (once per day)
 * - Completing SOS flow: 20 points
 * - Opening daily gift: 15 points
 *
 * Leveling: Points required = level * 100
 * (e.g., Level 2 needs 200 points, Level 3 needs 300 points, etc.)
 */
import { useEffect, useState } from 'react';
import { rewardsEvents, type Rewards } from '../../services/api/rewards';

type Listener = () => void;

export interface UserPoints {
  totalPoints: number;
  level: number;
}

/** null until loaded from the server. */
let current: UserPoints | null = null;
let hasLoaded = false;
let inFlight: Promise<void> | null = null;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach(listener => listener());
}

/**
 * Calculate the level from total points.
 * Points needed for next level = level * 100
 * e.g., 0-199 = level 1, 200-399 = level 2, etc.
 */
export function calculateLevel(totalPoints: number): number {
  let level = 1;
  let pointsRequired = 0;
  
  while (pointsRequired + level * 100 <= totalPoints) {
    pointsRequired += level * 100;
    level += 1;
  }
  
  return level;
}

/**
 * Calculate progress to the next level.
 * Returns { current, next, percentage } where percentage is 0-100.
 */
export function getLevelProgress(totalPoints: number): {
  current: number;
  pointsInCurrentLevel: number;
  pointsNeededForLevel: number;
  percentage: number;
} {
  const level = calculateLevel(totalPoints);
  
  // Calculate points earned in previous levels
  let pointsUsed = 0;
  for (let i = 1; i < level; i++) {
    pointsUsed += i * 100;
  }
  
  const pointsInCurrentLevel = totalPoints - pointsUsed;
  const pointsNeededForLevel = level * 100;
  const percentage = Math.round((pointsInCurrentLevel / pointsNeededForLevel) * 100);
  
  return {
    current: level,
    pointsInCurrentLevel,
    pointsNeededForLevel,
    percentage: Math.min(percentage, 100),
  };
}

export const userPointsStore = {
  /** The cached user points, or null before the first successful load. */
  get(): UserPoints | null {
    return current;
  },

  /** Get total points. Defaults to 0 when not loaded. */
  getTotalPoints(): number {
    return current?.totalPoints ?? 0;
  },

  /** Get current level. Defaults to 1 when not loaded. */
  getLevel(): number {
    return current?.level ?? 1;
  },

  /** Get current level with progress info. */
  getLevelWithProgress(): {
    level: number;
    totalPoints: number;
    progress: { current: number; pointsInCurrentLevel: number; pointsNeededForLevel: number; percentage: number };
  } {
    const totalPoints = current?.totalPoints ?? 0;
    const level = calculateLevel(totalPoints);
    const progress = getLevelProgress(totalPoints);
    
    return {
      level,
      totalPoints,
      progress,
    };
  },

  /** Replace the cached points — call this with any fresh UserPoints. */
  set(points: UserPoints | null): void {
    hasLoaded = points != null;
    current = points;
    notify();
  },

  /**
   * Apply a partial change locally for optimistic updates.
   * Ignored when nothing is cached yet.
   */
  merge(changes: Partial<UserPoints>): void {
    if (!current) return;
    current = { ...current, ...changes };
    // Recalculate level if points changed
    if (changes.totalPoints !== undefined) {
      current.level = calculateLevel(current.totalPoints);
    }
    notify();
  },

  /**
   * Apply what the server says an action just earned. The server's
   * `totalPoints` is authoritative, so it replaces the cache outright (even
   * before the first load) rather than being added to a possibly stale value.
   */
  applyRewards(rewards: Rewards): void {
    if (rewards.totalPoints == null) return;

    const totalPoints = rewards.totalPoints;
    const level = rewards.newLevel ?? calculateLevel(totalPoints);
    userPointsStore.set({ totalPoints, level });

    // /users/me also carries points and level, and badge progress reads them
    // from there — keep it in step. Lazy requires avoid import cycles (both
    // modules sit above the API client).
    try {
      const { userSettingsStore } = require('./userSettingsStore');
      userSettingsStore.merge({ totalPoints, level });
    } catch (err) {
      console.warn('Could not sync points into user settings:', err);
    }

    // The action that earned points usually moved a badge counter too (a hug
    // sent, a check-in), so re-read progress now: a newly unlocked badge
    // shows its reward modal straight away instead of on the next poll.
    try {
      const { badgeService } = require('../../features/profile/services/badgeService');
      void badgeService.refresh();
    } catch (err) {
      console.warn('Could not refresh badges after a reward:', err);
    }
  },

  /**
   * Add points for an activity. Updates locally and returns the new level
   * if the user leveled up.
   */
  addPoints(amount: number): { leveledUp: boolean; newLevel?: number; oldLevel?: number } {
    if (!current) return { leveledUp: false };
    
    const oldLevel = current.level;
    current.totalPoints += amount;
    current.level = calculateLevel(current.totalPoints);
    
    const leveledUp = current.level > oldLevel;
    notify();
    
    return {
      leveledUp,
      newLevel: current.level,
      oldLevel,
    };
  },

  /**
   * Fetch the user's points once per app session.
   * Concurrent callers share the request; already-loaded state resolves immediately.
   * Pass force to re-fetch.
   */
  load(force = false): Promise<void> {
    if (!force && hasLoaded) return Promise.resolve();
    if (inFlight) return inFlight;

    inFlight = Promise.resolve()
      .then(() => {
        // Fetch user points from API
        // Using dynamic import to avoid circular dependencies
        const { pointsService } = require('../../services/api/pointsService');
        return pointsService.getPoints();
      })
      .then((data: { totalPoints: number; level: number }) => {
        userPointsStore.set({
          totalPoints: data.totalPoints,
          level: data.level,
        });
        
        // Also refresh badges when points are loaded
        const { badgeService } = require('../../features/profile/services/badgeService');
        return badgeService.refresh();
      })
      .catch(() => {
        // On error, initialize with defaults if not already loaded
        if (!current) {
          userPointsStore.set({
            totalPoints: 0,
            level: 1,
          });
        }
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Drops cached state. Used on sign-out. */
  reset(): void {
    current = null;
    hasLoaded = false;
    inFlight = null;
    notify();
  },
};

/**
 * Subscribe a component to the user's points and level.
 * Triggers the one-time load on first mount and re-renders when values change.
 */
export function useUserPoints(): UserPoints {
  const [points, setPoints] = useState<UserPoints>(() => {
    return current ?? { totalPoints: 0, level: 1 };
  });

  useEffect(() => {
    const unsubscribe = userPointsStore.subscribe(() => {
      setPoints(userPointsStore.get() ?? { totalPoints: 0, level: 1 });
    });
    userPointsStore.load();
    return unsubscribe;
  }, []);

  return points;
}

/**
 * Hook to get level information with progress.
 */
export function useUserLevel(): {
  level: number;
  totalPoints: number;
  progress: { current: number; pointsInCurrentLevel: number; pointsNeededForLevel: number; percentage: number };
} {
  const points = useUserPoints();
  return {
    level: calculateLevel(points.totalPoints),
    totalPoints: points.totalPoints,
    progress: getLevelProgress(points.totalPoints),
  };
}

/**
 * Get the current level from total points (used by other modules).
 */
export function getLevel(totalPoints: number): number {
  return calculateLevel(totalPoints);
}

// Every API response that carries a `rewards` envelope (hug, check-in, SOS,
// vision / bucket-list / to-do added, gift card) updates points immediately.
rewardsEvents.subscribe(rewards => userPointsStore.applyRewards(rewards));
