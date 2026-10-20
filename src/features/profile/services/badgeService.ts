/**
 * Badge Service — coordinates badge unlocking and tracking with the points system.
 *
 * This service:
 * - Fetches the user's badge progress counters from the API
 * - Works out which badges are unlocked, and how far along the rest are
 * - Notifies when badges are earned
 * - Saves badges to vault
 *
 * Badge definitions live in constants/badges.ts; the server only tells us how
 * much of each thing the user has done ("hugs_sent: 37"). Matching those
 * counters against each badge's threshold happens here, which is also what
 * makes "5 / 10 hugs" progress possible in the UI.
 */
import { ApiError } from '../../../services/api/client';
import { pointsService } from '../../../services/api/pointsService';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import {
  ALL_BADGES,
  ETERNAL_BOND_CATEGORIES,
  isBadgeUnlocked,
  type Badge,
  type BadgeCategory,
} from '../../../constants/badges';

type BadgeListener = (badges: Set<string>, earnedBadge?: Badge) => void;

/**
 * How long a loaded set of counters stays fresh. The reward listener polls
 * every few seconds; without this the (query-heavy) stats endpoint would be
 * hit on every tick. Pull-to-refresh and awarding points both call refresh(),
 * which ignores the window.
 */
const STATS_TTL_MS = 30_000;

let cachedBadges: Set<string> = new Set();
/** Catalogue slugs the user has saved to their vault (server rows with a slug). */
let savedBadges: Set<string> = new Set();
let cachedStats: Record<string, number> = {};
let lastLoadedAt = 0;
let listeners = new Set<BadgeListener>();
let loadInFlight: Promise<void> | null = null;

/**
 * Count the categories the user has at least one badge in — the "a badge in
 * every category" criteria. Derived here because it depends on the badge
 * registry, which the server doesn't know about.
 */
function countUnlockedCategories(stats: Record<string, number>): number {
  const earnedCategories = new Set<BadgeCategory>();

  ALL_BADGES.forEach(badge => {
    // Skip the meta badge itself so it can't count towards its own criteria.
    if (badge.unlockCriteria.type === 'categories_unlocked') return;
    if (isBadgeUnlocked(badge, stats)) earnedCategories.add(badge.category);
  });

  return ETERNAL_BOND_CATEGORIES.filter(category => earnedCategories.has(category)).length;
}

function notifyListeners(): void {
  const unlocked = new Set(cachedBadges);
  listeners.forEach(listener => listener(unlocked));
}

/**
 * Which catalogue badges are saved to the vault. Best-effort: a failure keeps
 * the last known set rather than wiping every "saved" marker.
 */
function fetchSaved(): Promise<void> {
  return pointsService
    .getBadges()
    .then(badges => {
      savedBadges = new Set(
        badges
          .filter(b => b.isArchivedInVault && typeof b.slug === 'string' && b.slug)
          .map(b => b.slug as string),
      );
    })
    .catch(err => {
      console.warn('Failed to load saved badges:', err);
    });
}

/** Fetch counters + saved badges, recompute unlocked badges, and notify subscribers. */
function fetchStats(): Promise<void> {
  return Promise.all([pointsService.getBadgeStats(), fetchSaved()])
    .then(([stats]) => {
      cachedStats = stats ?? {};
      lastLoadedAt = Date.now();

      cachedBadges = badgeService.getUnlockedBadges();
      notifyListeners();
    })
    .catch(err => {
      // A 404 means the API this build is pointed at predates the badge-stats
      // endpoint. Worth calling out, because the symptom (no progress bars
      // anywhere) looks like an app bug rather than a stale backend.
      if (err instanceof ApiError && err.status === 404) {
        console.warn(
          'Badge progress unavailable: this backend has no /api/users/me/badge-stats endpoint yet. ' +
            'Progress bars stay hidden until it is deployed.',
        );
      } else {
        console.warn('Failed to load badge progress:', err);
      }
      // Keep whatever we had; a failed refresh shouldn't wipe the collection.
    })
    .finally(() => {
      loadInFlight = null;
    });
}

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
   * Concurrent calls share the same request, and recent results are reused.
   */
  async loadEarned(): Promise<Set<string>> {
    if (loadInFlight) return loadInFlight.then(() => badgeService.getEarned());

    const isFresh = lastLoadedAt > 0 && Date.now() - lastLoadedAt < STATS_TTL_MS;
    if (isFresh) return badgeService.getEarned();

    loadInFlight = fetchStats();
    return loadInFlight.then(() => badgeService.getEarned());
  },

  /**
   * Get the user's progress counters, keyed by unlock criteria
   * (e.g. `{ hugs_sent: 37 }`). Criteria the backend doesn't track are
   * absent rather than 0, so the UI can tell "none yet" from "not measured".
   */
  getUserStats(): Record<string, number> {
    const stats: Record<string, number> = { ...cachedStats };
    const user = userSettingsStore.get();

    // Level and points also arrive on /users/me, which updates optimistically
    // as points are awarded — take whichever source is further along.
    if (user) {
      stats.level_reached = Math.max(stats.level_reached ?? 0, user.level);
      stats.total_points = Math.max(stats.total_points ?? 0, user.totalPoints);
    }

    stats.categories_unlocked = countUnlockedCategories(stats);

    return stats;
  },

  /**
   * Compute which badges are unlocked based on current user stats.
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
   * Get the badges the user is closest to unlocking, nearest first.
   * Badges with no progress data fall to the back.
   */
  getNearbadges(count = 3): Badge[] {
    const stats = badgeService.getUserStats();
    const unlocked = badgeService.getUnlockedBadges();

    return ALL_BADGES.filter(badge => !unlocked.has(badge.id))
      .map(badge => {
        const { type, threshold } = badge.unlockCriteria;
        const tracked = stats[type] !== undefined;
        const ratio = threshold > 0 ? (stats[type] ?? 0) / threshold : 0;
        return { badge, rank: tracked ? ratio : -1 };
      })
      .sort((a, b) => b.rank - a.rank)
      .slice(0, count)
      .map(entry => entry.badge);
  },

  /** Catalogue badge ids the user has saved to their vault. */
  getSaved(): Set<string> {
    return new Set(savedBadges);
  },

  /** Whether this catalogue badge is saved to the vault. */
  isSaved(badgeId: string): boolean {
    return savedBadges.has(badgeId);
  },

  /**
   * Save a badge to the user's vault — the one path every screen uses.
   *
   * The first save of a badge earns its points; the response's `rewards`
   * envelope updates the level badge automatically (see services/api/rewards).
   * Marks the badge saved locally and notifies subscribers so every grid shows
   * the marker straight away.
   */
  async archiveBadge(badgeId: string): Promise<void> {
    await pointsService.archiveBadge(badgeId);
    savedBadges = new Set(savedBadges).add(badgeId);
    notifyListeners();
  },

  /**
   * Save several badges at once (one request, one transaction on the server).
   * Returns the slugs the server skipped (unknown or not earned).
   */
  async archiveMany(badgeIds: string[]): Promise<string[]> {
    if (badgeIds.length === 0) return [];
    const result = await pointsService.archiveBadges(badgeIds);
    const next = new Set(savedBadges);
    result.saved.forEach(b => {
      if (b.slug) next.add(b.slug);
    });
    savedBadges = next;
    notifyListeners();
    return result.skipped;
  },

  /**
   * Earned catalogue badges not yet saved to the vault — what the catch-up
   * summary offers to save.
   */
  getUnsavedEarned(): Badge[] {
    return ALL_BADGES.filter(b => cachedBadges.has(b.id) && !savedBadges.has(b.id));
  },

  /**
   * Subscribe to badge changes. Notifies when badges are loaded or new badges earned.
   */
  subscribe(listener: BadgeListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Refresh badge progress from the API, ignoring the freshness window.
   */
  async refresh(): Promise<void> {
    if (loadInFlight) return loadInFlight;

    loadInFlight = fetchStats();
    return loadInFlight;
  },

  /**
   * Clear cached badges on logout.
   */
  reset(): void {
    cachedBadges = new Set();
    savedBadges = new Set();
    cachedStats = {};
    lastLoadedAt = 0;
    listeners.clear();
    loadInFlight = null;
  },
};
