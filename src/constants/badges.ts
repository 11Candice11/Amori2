/**
 * Badge System - Single Source of Truth
 *
 * Defines all achievements/badges in Amori with their unlock criteria,
 * descriptions, and associated images.
 *
 * Image files live in images/badges/ as PNGs. Badge IDs use snake_case and
 * match the image filename exactly (e.g. first_embrace2 -> first_embrace2.png).
 *
 * Tiers are per badge family, following the filename: first_embrace is tier 1,
 * first_embrace2 is tier 2, and so on. A badge with no number is tier 1.
 *
 * Metro only bundles images referenced by a literal require('...'), so every
 * image is listed explicitly in BADGE_IMAGES below. When you add a new badge:
 *   1. drop the PNG in images/badges/
 *   2. add a require() line to BADGE_IMAGES
 *   3. add the badge to ALL_BADGES
 */

// ─── BADGE IMAGES ─────────────────────────────────────────────────────────
// Static require() for every badge image, keyed by badge id (= filename).
const BADGE_IMAGES = {
  // Hugs
  first_embrace: require('../../images/badges/first_embrace.png'),
  first_embrace2: require('../../images/badges/first_embrace2.png'),
  hug_collector: require('../../images/badges/hug_collector.png'),
  golden_heart: require('../../images/badges/golden_heart.png'),
  golden_heart2: require('../../images/badges/golden_heart2.png'),
  hug_back: require('../../images/badges/hug_back.png'),
  hug_marathon: require('../../images/badges/hug_marathon.png'),
  long_distance_hugger: require('../../images/badges/long_distance_hugger.png'),
  midnight_hug: require('../../images/badges/midnight_hug.png'),
  both_ways: require('../../images/badges/both_ways.png'),

  // Check-ins
  first_light: require('../../images/badges/first_light.png'),
  morning_ritual: require('../../images/badges/morning_ritual.png'),
  night_whispers: require('../../images/badges/night_whispers.png'),
  daily_streak: require('../../images/badges/daily_streak.png'),
  daily_streak2: require('../../images/badges/daily_streak2.png'),
  evergreen: require('../../images/badges/evergreen.png'),
  // PLACEHOLDER ART: evergreen2.png is currently a copy of shared_horizons2.png.
  evergreen2: require('../../images/badges/evergreen2.png'),
  evergreen3: require('../../images/badges/evergreen3.png'),

  // Memory vault
  memory_keeper: require('../../images/badges/memory_keeper.png'),

  // Messages (Let's Chat)
  words_that_matter: require('../../images/badges/words_that_matter.png'),
  words_that_matter2: require('../../images/badges/words_that_matter2.png'),

  // Timeline
  shared_horizons: require('../../images/badges/shared_horizons.png'),
  shared_horizons2: require('../../images/badges/shared_horizons2.png'),
  together_forever: require('../../images/badges/together_forever.png'),

  // Vision board
  dream_builders: require('../../images/badges/dream_builders.png'),
  dream_builders2: require('../../images/badges/dream_builders2.png'),

  // Bucket list / wishlist
  bucket_list_buddy: require('../../images/badges/bucket_list_buddy.png'),
  // PLACEHOLDER ART: bucket_list_buddy2.png is currently a copy of shared_horizons2.png.
  bucket_list_buddy2: require('../../images/badges/bucket_list_buddy2.png'),

  // Games
  curious_mind: require('../../images/badges/curious_mind.png'),
  curious_mind2: require('../../images/badges/curious_mind2.png'),

  // Partner sync
  growing_together: require('../../images/badges/growing_together.png'),
  open_heart: require('../../images/badges/open_heart.png'),
  safe_harbor: require('../../images/badges/safe_harbor.png'),

  // Mood tracking
  finding_calm: require('../../images/badges/finding_calm.png'),
  finding_calm2: require('../../images/badges/finding_calm2.png'),

  // Media
  emerald_soul: require('../../images/badges/emerald_soul.png'),
  emerald_soul2: require('../../images/badges/emerald_soul2.png'),

  // Special
  sacred_vow: require('../../images/badges/sacred_vow.png'),
  eternal_bond: require('../../images/badges/eternal_bond.png'),

  // Progression
  level_up: require('../../images/badges/level_up.png'),
};

// ─── TYPES ────────────────────────────────────────────────────────────────

export const BADGE_CATEGORIES = [
  'hugs',
  'checkins',
  'memory_vault',
  'messages',
  'timeline',
  'vision_board',
  'bucket_list',
  'games',
  'partner_sync',
  'mood',
  'media',
  'special',
  'progression',
] as const;

export type BadgeCategory = (typeof BADGE_CATEGORIES)[number];

/**
 * Categories that count towards Eternal Bond ("a badge in every category").
 * 'special' is excluded because Eternal Bond itself lives there.
 */
export const ETERNAL_BOND_CATEGORIES: BadgeCategory[] = BADGE_CATEGORIES.filter(
  (category) => category !== 'special',
);

export type UnlockCriteriaType =
  // Hugs
  | 'hugs_sent'
  | 'hug_replies_fast'
  | 'hug_streak_days'
  | 'long_distance_hugs'
  | 'night_hugs'
  | 'mutual_hug_days'
  // Check-ins
  | 'checkins_completed'
  | 'checkin_streak'
  | 'morning_checkins'
  | 'evening_checkins'
  // Memories
  | 'memories_created'
  | 'memories_saved_to_vault'
  | 'memory_saved_on_anniversary'
  // Messages
  | 'messages_sent'
  | 'conversations_completed'
  // Timeline
  | 'timeline_events_added'
  | 'anniversary_reached'
  // Vision board
  | 'vision_board_items_added'
  | 'vision_board_items_achieved'
  // Bucket list
  | 'bucket_list_items_added'
  | 'bucket_list_items_completed'
  // Games
  | 'games_played'
  | 'quizzes_completed'
  | 'would_you_rather_answered'
  | 'hidden_objects_solved'
  | 'partner_quiz_perfect_scores'
  // Partner sync
  | 'sync_questions_agreed'
  | 'partner_request_fast_responses'
  | 'partner_low_mood_support'
  | 'partner_response_time'
  // Mood
  | 'mood_logged'
  | 'mood_streak_days'
  | 'distinct_moods_logged'
  // Media
  | 'media_attachments'
  | 'media_shared'
  // Meta / progression
  | 'categories_unlocked'
  | 'perfect_attendance'
  | 'level_reached'
  | 'custom';

export interface UnlockCriteria {
  type: UnlockCriteriaType;
  threshold: number;
  metadata?: Record<string, any>;
}

export interface Badge {
  /** Snake case ID matching image filename */
  id: string;
  /** Display title shown to user */
  name: string;
  /** Short, warm description (one sentence) of what the badge is for */
  description: string;
  /** Category for grouping/filtering */
  category: BadgeCategory;
  /** Tier within the badge family (1 = base badge, 2 = "...2" image, 3 = "...3" image) */
  tier?: number;
  /** How to unlock this badge */
  unlockCriteria: UnlockCriteria;
  /** Points awarded when badge is unlocked */
  pointsReward: number;
  /** Whether this is a hidden/secret achievement */
  hidden?: boolean;
  /** Order for display within category */
  displayOrder?: number;
  /** Additional metadata for badge (e.g., time windows, reveal rules) */
  metadata?: Record<string, any>;
}

// ─── BADGE REGISTRY ───────────────────────────────────────────────────────

/**
 * Complete registry of all badges, grouped by category.
 * Used for validation, filtering, and display across the app.
 */
export const ALL_BADGES: Badge[] = [
  // ── HUGS ────────────────────────────────────────────────────────────────
  {
    id: 'first_embrace',
    name: 'First Embrace',
    description: 'Send 10 hugs and let your partner feel your warmth, even from afar.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'hugs_sent', threshold: 10 },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'first_embrace2',
    name: 'First Embrace II',
    description: 'Fifty hugs sent. Your affection is becoming a beautiful habit.',
    category: 'hugs',
    tier: 2,
    unlockCriteria: { type: 'hugs_sent', threshold: 50 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 2,
  },
  {
    id: 'hug_collector',
    name: 'Hug Collector',
    description: 'A hundred hugs shared, so your partner never has to wonder if they are loved.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'hugs_sent', threshold: 100 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 3,
  },
  {
    id: 'golden_heart',
    name: 'Golden Heart',
    description: 'Send 250 hugs. Your heart gives freely and it shows.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'hugs_sent', threshold: 250 },
    pointsReward: 250,
    hidden: false,
    displayOrder: 4,
  },
  {
    id: 'golden_heart2',
    name: 'Golden Heart II',
    description: 'Send 500 hugs. A truly golden heart, glowing for the one you love.',
    category: 'hugs',
    tier: 2,
    unlockCriteria: { type: 'hugs_sent', threshold: 500 },
    pointsReward: 400,
    hidden: false,
    displayOrder: 5,
  },
  {
    id: 'hug_back',
    name: 'Hug Back',
    description: 'Answer a hug within five minutes, ten times. Love, returned in a heartbeat.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'hug_replies_fast', threshold: 10, metadata: { withinMinutes: 5 } },
    pointsReward: 100,
    hidden: false,
    displayOrder: 6,
  },
  {
    id: 'hug_marathon',
    name: 'Hug Marathon',
    description: 'Send a hug seven days in a row. A whole week of showing up with love.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'hug_streak_days', threshold: 7 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 7,
  },
  {
    id: 'long_distance_hugger',
    name: 'Long Distance Hugger',
    description: 'Send a hug while one of you is travelling or in a different time zone. Distance cannot hold love back.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: {
      type: 'long_distance_hugs',
      threshold: 1,
      metadata: { condition: 'traveling_or_different_timezone' },
    },
    pointsReward: 100,
    hidden: false,
    displayOrder: 8,
  },
  {
    id: 'midnight_hug',
    name: 'Midnight Hug',
    description: 'Send a hug between midnight and 4am. Some love keeps watch through the night.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'night_hugs', threshold: 1, metadata: { fromHour: 0, toHour: 4 } },
    pointsReward: 100,
    hidden: true,
    displayOrder: 9,
  },
  {
    id: 'both_ways',
    name: 'Both Ways',
    description: 'Both of you send a hug on the same day, ten times. Love flowing in both directions.',
    category: 'hugs',
    tier: 1,
    unlockCriteria: { type: 'mutual_hug_days', threshold: 10 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 10,
  },

  // ── CHECK-INS ───────────────────────────────────────────────────────────
  {
    id: 'first_light',
    name: 'First Light',
    description: 'Complete your first morning check-in and begin the day with each other in mind.',
    category: 'checkins',
    tier: 1,
    unlockCriteria: { type: 'morning_checkins', threshold: 1 },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'morning_ritual',
    name: 'Morning Ritual',
    description: 'Complete 10 morning check-ins. A sunrise habit worth keeping.',
    category: 'checkins',
    tier: 1,
    unlockCriteria: { type: 'morning_checkins', threshold: 10 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 2,
  },
  {
    id: 'night_whispers',
    name: 'Night Whispers',
    description: 'Complete 10 evening check-ins. End each day close, even when it is quiet.',
    category: 'checkins',
    tier: 1,
    unlockCriteria: { type: 'evening_checkins', threshold: 10 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 3,
  },
  {
    id: 'daily_streak',
    name: 'Daily Streak',
    description: 'Check in seven days in a row. Small moments, steadily kept.',
    category: 'checkins',
    tier: 1,
    unlockCriteria: { type: 'checkin_streak', threshold: 7 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 4,
  },
  {
    id: 'daily_streak2',
    name: 'Daily Streak II',
    description: 'A 30-day check-in streak. A whole month of showing up for each other.',
    category: 'checkins',
    tier: 2,
    unlockCriteria: { type: 'checkin_streak', threshold: 30 },
    pointsReward: 200,
    hidden: false,
    displayOrder: 5,
  },
  {
    id: 'evergreen',
    name: 'Evergreen',
    description: 'A 100-day check-in streak. Steady, loyal and ever green.',
    category: 'checkins',
    tier: 1,
    unlockCriteria: { type: 'checkin_streak', threshold: 100 },
    pointsReward: 300,
    hidden: false,
    displayOrder: 6,
  },
  {
    id: 'evergreen2',
    name: 'Evergreen II',
    description: 'A 250-day check-in streak. Your routine has grown deep roots.',
    category: 'checkins',
    tier: 2,
    unlockCriteria: { type: 'checkin_streak', threshold: 250 },
    pointsReward: 400,
    hidden: false,
    displayOrder: 7,
  },
  {
    id: 'evergreen3',
    name: 'Evergreen III',
    description: 'A 365-day check-in streak. A full year, through every season, together.',
    category: 'checkins',
    tier: 3,
    unlockCriteria: { type: 'checkin_streak', threshold: 365 },
    pointsReward: 500,
    hidden: false,
    displayOrder: 8,
  },

  // ── MEMORY VAULT ────────────────────────────────────────────────────────
  {
    id: 'memory_keeper',
    name: 'Memory Keeper',
    description: 'Save your first memory and keep a treasured moment safe.',
    category: 'memory_vault',
    tier: 1,
    unlockCriteria: { type: 'memories_saved_to_vault', threshold: 1 },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },

  // ── MESSAGES (Let's Chat) ───────────────────────────────────────────────
  {
    id: 'words_that_matter',
    name: 'Words That Matter',
    description: 'Have a conversation of 20 or more messages. Every word counts when it is heartfelt.',
    category: 'messages',
    tier: 1,
    unlockCriteria: { type: 'conversations_completed', threshold: 1, metadata: { minMessages: 20 } },
    pointsReward: 100,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'words_that_matter2',
    name: 'Words That Matter II',
    description: 'Hold ten conversations of 20 or more messages. You always find the words.',
    category: 'messages',
    tier: 2,
    unlockCriteria: { type: 'conversations_completed', threshold: 10, metadata: { minMessages: 20 } },
    pointsReward: 250,
    hidden: false,
    displayOrder: 2,
  },

  // ── TIMELINE ────────────────────────────────────────────────────────────
  {
    id: 'shared_horizons',
    name: 'Shared Horizons',
    description: 'Add your first milestone to the timeline and start charting your story.',
    category: 'timeline',
    tier: 1,
    unlockCriteria: { type: 'timeline_events_added', threshold: 1 },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'shared_horizons2',
    name: 'Shared Horizons II',
    description: 'Add 10 milestones to your timeline. Look how far you have come together.',
    category: 'timeline',
    tier: 2,
    unlockCriteria: { type: 'timeline_events_added', threshold: 10 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },
  {
    id: 'together_forever',
    name: 'Together Forever',
    description: 'Reach your one-year anniversary. This one arrives on its own, just by loving each other for a year.',
    category: 'timeline',
    tier: 1,
    unlockCriteria: {
      type: 'anniversary_reached',
      threshold: 1,
      metadata: { years: 1, automatic: true },
    },
    pointsReward: 300,
    hidden: false,
    displayOrder: 3,
  },

  // ── VISION BOARD ────────────────────────────────────────────────────────
  {
    id: 'dream_builders',
    name: 'Dream Builders',
    description: 'Add 10 items to your vision board and dream out loud together.',
    category: 'vision_board',
    tier: 1,
    unlockCriteria: { type: 'vision_board_items_added', threshold: 10 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'dream_builders2',
    name: 'Dream Builders II',
    description: 'Mark a vision board item as achieved. Proof that shared dreams come true.',
    category: 'vision_board',
    tier: 2,
    unlockCriteria: { type: 'vision_board_items_achieved', threshold: 1 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },

  // ── BUCKET LIST / WISHLIST ──────────────────────────────────────────────
  {
    id: 'bucket_list_buddy',
    name: 'Bucket List Buddy',
    description: 'Complete your first bucket list item together. The first adventure, ticked off.',
    category: 'bucket_list',
    tier: 1,
    unlockCriteria: { type: 'bucket_list_items_completed', threshold: 1 },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'bucket_list_buddy2',
    name: 'Bucket List Buddy II',
    description: 'Complete 10 bucket list items. Adventure after adventure, side by side.',
    category: 'bucket_list',
    tier: 2,
    unlockCriteria: { type: 'bucket_list_items_completed', threshold: 10 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },

  // ── GAMES ───────────────────────────────────────────────────────────────
  {
    id: 'curious_mind',
    name: 'Curious Mind',
    description: 'Finish your first game of Quiz, Would You Rather, or Hidden Objects and learn something new about each other.',
    category: 'games',
    tier: 1,
    unlockCriteria: {
      type: 'games_played',
      threshold: 1,
      metadata: { games: ['quiz', 'would_you_rather', 'hidden_objects'] },
    },
    pointsReward: 50,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'curious_mind2',
    name: 'Curious Mind II',
    description: 'Score 100% on a partner quiz. You really do know each other.',
    category: 'games',
    tier: 2,
    unlockCriteria: { type: 'partner_quiz_perfect_scores', threshold: 1 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },

  // ── PARTNER SYNC ────────────────────────────────────────────────────────
  {
    id: 'growing_together',
    name: 'Growing Together',
    description: 'Agree on 10 sync questions. You are growing in the same direction.',
    category: 'partner_sync',
    tier: 1,
    unlockCriteria: { type: 'sync_questions_agreed', threshold: 10 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'open_heart',
    name: 'Open Heart',
    description: 'Respond to a partner request within 10 minutes, ten times. Showing up when it counts.',
    category: 'partner_sync',
    tier: 1,
    unlockCriteria: {
      type: 'partner_request_fast_responses',
      threshold: 10,
      metadata: { withinMinutes: 10 },
    },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },
  {
    id: 'safe_harbor',
    name: 'Safe Harbor',
    description: 'Support your partner after they log a low mood. Be the calm they can come home to.',
    category: 'partner_sync',
    tier: 1,
    unlockCriteria: { type: 'partner_low_mood_support', threshold: 1 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 3,
  },

  // ── MOOD TRACKING ───────────────────────────────────────────────────────
  {
    id: 'finding_calm',
    name: 'Finding Calm',
    description: 'Log your mood seven days in a row. Noticing how you feel is a gentle kind of care.',
    category: 'mood',
    tier: 1,
    unlockCriteria: { type: 'mood_streak_days', threshold: 7 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'finding_calm2',
    name: 'Finding Calm II',
    description: 'Log five different moods. Every feeling is welcome here.',
    category: 'mood',
    tier: 2,
    unlockCriteria: { type: 'distinct_moods_logged', threshold: 5 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 2,
  },

  // ── MEDIA ───────────────────────────────────────────────────────────────
  {
    id: 'emerald_soul',
    name: 'Emerald Soul',
    description: 'Share 10 photos, voice notes, or links. Little pieces of your world, given freely.',
    category: 'media',
    tier: 1,
    unlockCriteria: { type: 'media_shared', threshold: 10 },
    pointsReward: 100,
    hidden: false,
    displayOrder: 1,
  },
  {
    id: 'emerald_soul2',
    name: 'Emerald Soul II',
    description: 'Share 100 photos, voice notes, or links. Your story, richly told.',
    category: 'media',
    tier: 2,
    unlockCriteria: { type: 'media_shared', threshold: 100 },
    pointsReward: 250,
    hidden: false,
    displayOrder: 2,
  },

  // ── SPECIAL (hidden) ────────────────────────────────────────────────────
  {
    id: 'sacred_vow',
    name: 'Sacred Vow',
    description: 'Save a memory on your relationship anniversary. A quiet promise, renewed.',
    category: 'special',
    tier: 1,
    unlockCriteria: { type: 'memory_saved_on_anniversary', threshold: 1 },
    pointsReward: 300,
    hidden: true,
    displayOrder: 1,
  },
  {
    id: 'eternal_bond',
    name: 'Eternal Bond',
    description: 'Unlock at least one badge in every category. A bond woven through every part of your life together.',
    category: 'special',
    tier: 1,
    unlockCriteria: {
      type: 'categories_unlocked',
      threshold: ETERNAL_BOND_CATEGORIES.length,
      metadata: { categories: ETERNAL_BOND_CATEGORIES },
    },
    pointsReward: 500,
    hidden: true,
    // Stays hidden until the user is one category away, then the UI can reveal it.
    metadata: { revealWhenRemaining: 1 },
    displayOrder: 2,
  },

  // ── PROGRESSION ─────────────────────────────────────────────────────────
  // The Level Up art is reused for later level milestones (10, 15, 20 ...).
  {
    id: 'level_up',
    name: 'Level Up',
    description: 'Reach level 5. Every level is another step deeper into your story.',
    category: 'progression',
    tier: 1,
    unlockCriteria: { type: 'level_reached', threshold: 5 },
    pointsReward: 150,
    hidden: false,
    displayOrder: 1,
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

/**
 * Get badge by ID
 */
export function getBadgeById(id: string): Badge | undefined {
  return ALL_BADGES.find(badge => badge.id === id);
}

/**
 * Get all badges in a category
 */
export function getBadgesByCategory(category: BadgeCategory): Badge[] {
  return ALL_BADGES.filter(badge => badge.category === category).sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );
}

/**
 * Get all non-hidden badges
 */
export function getVisibleBadges(): Badge[] {
  return ALL_BADGES.filter(badge => !badge.hidden);
}

/**
 * Get all hidden badges
 */
export function getHiddenBadges(): Badge[] {
  return ALL_BADGES.filter(badge => badge.hidden);
}

/**
 * Validate if a badge is unlocked based on criteria
 */
export function isBadgeUnlocked(badge: Badge, userStats: Record<string, number>): boolean {
  const { type, threshold } = badge.unlockCriteria;
  const currentValue = userStats[type] ?? 0;
  return currentValue >= threshold;
}

/**
 * Get image for badge
 */
export function getBadgeImage(badgeId: string): any {
  return (BADGE_IMAGES as Record<string, any>)[badgeId];
}
