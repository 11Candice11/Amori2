/**
 * rewards — what the server says the user just earned.
 *
 * Every action that can earn points (send/hold a hug, check in, finish the SOS
 * flow, add a vision / bucket-list / to-do item, collect a gift card) returns
 * a `rewards` envelope alongside its normal payload — see RewardsResponse in
 * the backend. The API client spots it on any response and publishes it here,
 * so points and level update the moment the action succeeds instead of on the
 * next app launch, without every feature service having to forward it.
 *
 * Deliberately dependency-free: the API client imports this, so it must not
 * import anything that imports the client.
 */

/** A badge earned by the action. Mirrors EarnedBadgeResponse. */
export interface EarnedBadge {
  slug: string;
  title: string;
  tagline: string;
  assetKey: string;
  earnedAt: string;
}

/** Mirrors the backend RewardsResponse. */
export interface Rewards {
  newBadges: EarnedBadge[];
  leveledUp: boolean;
  /** The level after this action, when it changed. */
  newLevel: number | null;
  /** Points granted by this action. Zero when none were. */
  pointsAwarded: number;
  /** Total points after this action. Null when nothing was awarded. */
  totalPoints: number | null;
}

type RewardsListener = (rewards: Rewards) => void;

const listeners = new Set<RewardsListener>();

/** True when the envelope reports anything worth acting on. */
function hasAnything(r: Rewards): boolean {
  return r.pointsAwarded > 0 || r.leveledUp || r.newBadges.length > 0;
}

/**
 * Pull a rewards envelope off a parsed response body, if it has one. Tolerant
 * of shape: anything that doesn't look like an envelope is ignored.
 */
export function extractRewards(body: unknown): Rewards | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const raw = (body as { rewards?: unknown }).rewards;
  if (!raw || typeof raw !== 'object') return null;

  const r = raw as Partial<Rewards>;
  if (typeof r.pointsAwarded !== 'number') return null;

  return {
    newBadges: Array.isArray(r.newBadges) ? r.newBadges : [],
    leveledUp: r.leveledUp === true,
    newLevel: typeof r.newLevel === 'number' ? r.newLevel : null,
    pointsAwarded: r.pointsAwarded,
    totalPoints: typeof r.totalPoints === 'number' ? r.totalPoints : null,
  };
}

export const rewardsEvents = {
  /** Called by the API client with every successful response body. */
  publishFrom(body: unknown): void {
    const rewards = extractRewards(body);
    if (!rewards || !hasAnything(rewards)) return;
    listeners.forEach(listener => {
      try {
        listener(rewards);
      } catch (err) {
        // A broken listener must never fail the request that earned the reward.
        console.warn('Rewards listener failed:', err);
      }
    });
  },

  subscribe(listener: RewardsListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
