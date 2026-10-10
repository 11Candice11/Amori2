/**
 * Badge System - Single Source of Truth
 *
 * Defines all achievements/badges in Amori with their unlock criteria,
 * descriptions, and associated images.
 *
 * Image files should be placed in src/images/badges/ as PNGs.
 * Badge IDs use snake_case and match the image base name.
 */

// ─── BADGE IMAGES ─────────────────────────────────────────────────────────
// Require statements for all badge images
const BADGE_IMAGES = {
  // Hugs category
  first_embrace: require('../../images/badges/first_embrace.png'),
  first_embrace_2: require('../../images/badges/first_embrace2.png'),
  hug_collector: require('../../images/badges/hug_collector.png'),

  // Checkins category
  morning_ritual: require('../../images/badges/morning_ritual.png'),
  night_whispers: require('../../images/badges/night_whispers.png'),

  // Memory Vault category
  memory_keeper: require('../../images/badges/memory_keeper.png'),

  // Messages category
  words_that_matter: require('../../images/badges/words_that_matter.png'),
  words_that_matter_2: require('../../images/badges/words_that_matter2.png'),
  open_heart: require('../../images/badges/open_heart.png'),

  // Timeline category
  daily_streak: require('../../images/badges/daily_streak.png'),
  daily_streak_2: require('../../images/badges/daily_streak2.png'),

  // Vision Board category
  dream_builders: require('../../images/badges/dream_builders.png'),
  dream_builders_2: require('../../images/badges/dream_builders2.png'),
  shared_horizons: require('../../images/badges/shared_horizons.png'),
  shared_horizons_2: require('../../images/badges/shared_horizons2.png'),

  // Bucket List category
  bucket_list_buddy: require('../../images/badges/bucket_list_buddy.png'),
  bucket_list_buddy_2: require('../../images/badges/bucket_list_buddy2.png'),

  // Games category
  level_up: require('../../images/badges/level_up.png'),

  // Partner Sync category
  growing_together: require('../../images/badges/growing_together.png'),

  // Special category
  first_light: require('../../images/badges/first_light.png'),

  // Mood category
  finding_calm: require('../../images/badges/finding_calm.png'),
  finding_calm_2: require('../../images/badges/finding_calm2.png'),

  // Media category
  emerald_soul: require('../../images/badges/emerald_soul.png'),
  emerald_soul_2: require('../../images/badges/emerald_soul2.png'),
  golden_heart: require('../../images/badges/golden_heart.png'),
  golden_heart_2: require('../../images/badges/golden_heart2.png'),

  // Progression category
  curious_mind: require('../../images/badges/curious_mind.png'),
  curious_mind_2: require('../../images/badges/curious_mind2.png'),
  safe_harbor: require('../../images/badges/safe_harbor.png'),
  evergreen: require('../../images/badges/evergreen.png'),
  evergreen_2: require('../../images/badges/evergreen2.png'),
  evergreen_3: require('../../images/badges/evergreen3.png'),

  // Hidden/Special
  eternal_bond: require('../../images/badges/eternal_bond.png'),
  sacred_vow: require('../../images/badges/sacred_vow.png'),
  together_forever: require('../../images/badges/together_forever.png'),
};

export type BadgeCategory =
  | 'hugs'
  | 'checkins'
  | 'memory_vault'
  | 'messages'
  | 'timeline'
  | 'vision_board'
  | 'bucket_list'
  | 'games'
  | 'partner_sync'
  | 'special'
  | 'mood'
  | 'media'
  | 'progression';

export type UnlockCriteriaType =
  | 'hugs_sent'
  | 'checkins_completed'
  | 'checkin_streak'
  | 'morning_checkins'
  | 'evening_checkins'
  | 'memories_created'
  | 'memories_saved_to_vault'
  | 'messages_sent'
  | 'timeline_events_added'
  | 'vision_board_items_added'
  | 'bucket_list_items_added'
  | 'games_played'
  | 'quizzes_completed'
  | 'would_you_rather_answered'
  | 'hidden_objects_solved'
  | 'mood_logged'
  | 'media_attachments'
  | 'partner_response_time'
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
  /** Short, warm description (one sentence) */
  description: string;
  /** Category for grouping/filtering */
  category: BadgeCategory;
  /** Optional tier for variants (1=bronze, 2=silver, 3=gold, 4+=special) */
  tier?: number;
  /** How to unlock this badge */
  unlockCriteria: UnlockCriteria;
  /** Points awarded when badge is unlocked */
  pointsReward: number;
  /** Whether this is a hidden/secret achievement */
  hidden?: boolean;
  /** Order for display within category */
  displayOrder?: number;
  /** Additional metadata for badge (e.g., customEvent, moodType) */
  metadata?: Record<string, any>;
}

// ─── HUGS CATEGORY ────────────────────────────────────────────────────────

export const FIRST_EMBRACE: Badge = {
  id: 'first_embrace',
  name: 'First Embrace',
  description: 'Sent your first hug to your partner.',
  category: 'hugs',
  tier: 1,
  unlockCriteria: { type: 'hugs_sent', threshold: 1 },
  pointsReward: 50,
  displayOrder: 1,
};

export const FIRST_EMBRACE_2: Badge = {
  id: 'first_embrace_2',
  name: 'Embrace Collector',
  description: 'You have sent your first 10 hugs together.',
  category: 'hugs',
  tier: 2,
  unlockCriteria: { type: 'hugs_sent', threshold: 10 },
  pointsReward: 100,
  displayOrder: 2,
};

export const HUG_COLLECTOR: Badge = {
  id: 'hug_collector',
  name: 'Hug Collector',
  description: 'Reached 50 hugs sent - your affection knows no bounds.',
  category: 'hugs',
  tier: 3,
  unlockCriteria: { type: 'hugs_sent', threshold: 50 },
  pointsReward: 150,
  displayOrder: 3,
};

// ─── CHECK-INS CATEGORY ───────────────────────────────────────────────────

export const DAILY_STREAK: Badge = {
  id: 'daily_streak',
  name: 'Daily Ritual',
  description: 'You have built a 7-day check-in streak - consistency is love.',
  category: 'checkins',
  tier: 1,
  unlockCriteria: { type: 'checkin_streak', threshold: 7 },
  pointsReward: 100,
  displayOrder: 1,
};

export const DAILY_STREAK_2: Badge = {
  id: 'daily_streak_2',
  name: 'Devoted Daily',
  description: '30 days of check-ins - a month of connection.',
  category: 'checkins',
  tier: 2,
  unlockCriteria: { type: 'checkin_streak', threshold: 30 },
  pointsReward: 200,
  displayOrder: 2,
};

export const FIRST_LIGHT: Badge = {
  id: 'first_light',
  name: 'First Light',
  description: 'Completed your first morning check-in together.',
  category: 'checkins',
  unlockCriteria: { type: 'morning_checkins', threshold: 1 },
  pointsReward: 50,
  displayOrder: 3,
};

export const MORNING_RITUAL: Badge = {
  id: 'morning_ritual',
  name: 'Morning Ritual',
  description: 'You start 15 mornings together with a check-in.',
  category: 'checkins',
  unlockCriteria: { type: 'morning_checkins', threshold: 15 },
  pointsReward: 150,
  displayOrder: 4,
};

export const NIGHT_WHISPERS: Badge = {
  id: 'night_whispers',
  name: 'Night Whispers',
  description: 'You have shared 15 evening check-ins - end each day connected.',
  category: 'checkins',
  unlockCriteria: { type: 'evening_checkins', threshold: 15 },
  pointsReward: 150,
  displayOrder: 5,
};

// ─── MEMORY & VAULT CATEGORY ──────────────────────────────────────────────

export const MEMORY_KEEPER: Badge = {
  id: 'memory_keeper',
  name: 'Memory Keeper',
  description: 'You have saved 10 memories to your vault - treasured moments preserved.',
  category: 'memory_vault',
  unlockCriteria: { type: 'memories_saved_to_vault', threshold: 10 },
  pointsReward: 100,
  displayOrder: 1,
};

// ─── MESSAGES CATEGORY ────────────────────────────────────────────────────

export const WORDS_THAT_MATTER: Badge = {
  id: 'words_that_matter',
  name: 'Words That Matter',
  description: 'You have exchanged 20 Lets Chat messages - every word counts.',
  category: 'messages',
  tier: 1,
  unlockCriteria: { type: 'messages_sent', threshold: 20 },
  pointsReward: 100,
  displayOrder: 1,
};

export const WORDS_THAT_MATTER_2: Badge = {
  id: 'words_that_matter_2',
  name: 'Conversation Maestro',
  description: 'Over 100 Lets Chat messages - you speak the language of love.',
  category: 'messages',
  tier: 2,
  unlockCriteria: { type: 'messages_sent', threshold: 100 },
  pointsReward: 200,
  displayOrder: 2,
};

export const OPEN_HEART: Badge = {
  id: 'open_heart',
  name: 'Open Heart',
  description: 'You share freely - vulnerability is strength in this relationship.',
  category: 'messages',
  tier: 3,
  unlockCriteria: { type: 'messages_sent', threshold: 200 },
  pointsReward: 300,
  displayOrder: 3,
};

// ─── TIMELINE CATEGORY ────────────────────────────────────────────────────

export const SHARED_HORIZONS: Badge = {
  id: 'shared_horizons',
  name: 'Shared Horizons',
  description: 'You have marked 5 milestones on your timeline together.',
  category: 'timeline',
  tier: 1,
  unlockCriteria: { type: 'timeline_events_added', threshold: 5 },
  pointsReward: 100,
  displayOrder: 1,
};

export const SHARED_HORIZONS_2: Badge = {
  id: 'shared_horizons_2',
  name: 'Timeline Architect',
  description: 'Your timeline tells a story of 15 shared moments.',
  category: 'timeline',
  tier: 2,
  unlockCriteria: { type: 'timeline_events_added', threshold: 15 },
  pointsReward: 200,
  displayOrder: 2,
};

export const TOGETHER_FOREVER: Badge = {
  id: 'together_forever',
  name: 'Together Forever',
  description: 'You have immortalized 25 milestones - your story, forever.',
  category: 'timeline',
  tier: 3,
  unlockCriteria: { type: 'timeline_events_added', threshold: 25 },
  pointsReward: 300,
  displayOrder: 3,
};

// ─── VISION BOARD CATEGORY ────────────────────────────────────────────────

export const DREAM_BUILDERS: Badge = {
  id: 'dream_builders',
  name: 'Dream Builders',
  description: 'You have added 10 dreams to your Vision Board.',
  category: 'vision_board',
  tier: 1,
  unlockCriteria: { type: 'vision_board_items_added', threshold: 10 },
  pointsReward: 100,
  displayOrder: 1,
};

export const DREAM_BUILDERS_2: Badge = {
  id: 'dream_builders_2',
  name: 'Future Architects',
  description: '25 dreams shared - building your future together.',
  category: 'vision_board',
  tier: 2,
  unlockCriteria: { type: 'vision_board_items_added', threshold: 25 },
  pointsReward: 200,
  displayOrder: 2,
};

// ─── BUCKET LIST CATEGORY ─────────────────────────────────────────────────

export const BUCKET_LIST_BUDDY: Badge = {
  id: 'bucket_list_buddy',
  name: 'Bucket List Buddy',
  description: 'You have added 10 adventures to your bucket list.',
  category: 'bucket_list',
  tier: 1,
  unlockCriteria: { type: 'bucket_list_items_added', threshold: 10 },
  pointsReward: 100,
  displayOrder: 1,
};

export const BUCKET_LIST_BUDDY_2: Badge = {
  id: 'bucket_list_buddy_2',
  name: 'Adventure Seeker',
  description: '25 bucket list items - your adventure awaits.',
  category: 'bucket_list',
  tier: 2,
  unlockCriteria: { type: 'bucket_list_items_added', threshold: 25 },
  pointsReward: 200,
  displayOrder: 2,
};

// ─── GAMES CATEGORY ───────────────────────────────────────────────────────

export const CURIOUS_MIND: Badge = {
  id: 'curious_mind',
  name: 'Curious Mind',
  description: 'You have played 10 games in the Distraction Centre together.',
  category: 'games',
  tier: 1,
  unlockCriteria: { type: 'games_played', threshold: 10 },
  pointsReward: 100,
  displayOrder: 1,
};

export const CURIOUS_MIND_2: Badge = {
  id: 'curious_mind_2',
  name: 'Game Master',
  description: 'Over 50 games played - you know how to have fun together.',
  category: 'games',
  tier: 2,
  unlockCriteria: { type: 'games_played', threshold: 50 },
  pointsReward: 200,
  displayOrder: 2,
};

export const LEVEL_UP: Badge = {
  id: 'level_up',
  name: 'Level Up',
  description: 'You have reached a new level - progress in love is progress indeed.',
  category: 'games',
  tier: 3,
  unlockCriteria: { type: 'level_reached', threshold: 5 },
  pointsReward: 150,
  displayOrder: 3,
};

// ─── PARTNER SYNC CATEGORY ────────────────────────────────────────────────

export const GROWING_TOGETHER: Badge = {
  id: 'growing_together',
  name: 'Growing Together',
  description: 'Your partnership deepens - you truly understand each other.',
  category: 'partner_sync',
  unlockCriteria: { type: 'custom', threshold: 1 },
  pointsReward: 100,
  metadata: { customEvent: 'partner_link_established' },
  displayOrder: 1,
};

export const SAFE_HARBOR: Badge = {
  id: 'safe_harbor',
  name: 'Safe Harbor',
  description: 'You have supported your partner through difficult moments.',
  category: 'partner_sync',
  unlockCriteria: { type: 'custom', threshold: 3 },
  pointsReward: 150,
  metadata: { customEvent: 'sos_responded' },
  displayOrder: 2,
};

// ─── SPECIAL CATEGORY ─────────────────────────────────────────────────────

export const EVERGREEN: Badge = {
  id: 'evergreen',
  name: 'Evergreen',
  description: 'Consistent as the seasons - 90 days of check-ins.',
  category: 'special',
  tier: 1,
  hidden: true,
  unlockCriteria: { type: 'checkin_streak', threshold: 90 },
  pointsReward: 300,
  displayOrder: 1,
};

export const EVERGREEN_2: Badge = {
  id: 'evergreen_2',
  name: 'Evergreen Enduring',
  description: 'Six months of daily check-ins - a steadfast commitment.',
  category: 'special',
  tier: 2,
  hidden: true,
  unlockCriteria: { type: 'checkin_streak', threshold: 180 },
  pointsReward: 400,
  displayOrder: 2,
};

export const EVERGREEN_3: Badge = {
  id: 'evergreen_3',
  name: 'Evergreen Eternal',
  description: 'A full year of unbroken check-ins - true dedication.',
  category: 'special',
  tier: 3,
  hidden: true,
  unlockCriteria: { type: 'checkin_streak', threshold: 365 },
  pointsReward: 500,
  displayOrder: 3,
};

export const ETERNAL_BOND: Badge = {
  id: 'eternal_bond',
  name: 'Eternal Bond',
  description: 'You have unlocked the deepest levels of connection.',
  category: 'special',
  hidden: true,
  unlockCriteria: { type: 'level_reached', threshold: 30 },
  pointsReward: 350,
  displayOrder: 4,
};

export const SACRED_VOW: Badge = {
  id: 'sacred_vow',
  name: 'Sacred Vow',
  description: 'You have reached level 50 - a legendary milestone in your love story.',
  category: 'special',
  hidden: true,
  unlockCriteria: { type: 'level_reached', threshold: 50 },
  pointsReward: 500,
  displayOrder: 5,
};

// ─── MOOD CATEGORY ────────────────────────────────────────────────────────

export const FINDING_CALM: Badge = {
  id: 'finding_calm',
  name: 'Finding Calm',
  description: 'You have logged calm moments 20 times - peace together.',
  category: 'mood',
  tier: 1,
  unlockCriteria: { type: 'mood_logged', threshold: 20 },
  pointsReward: 100,
  metadata: { moodType: 'Calm' },
  displayOrder: 1,
};

export const FINDING_CALM_2: Badge = {
  id: 'finding_calm_2',
  name: 'Serenity Seeker',
  description: 'You have recorded 50 instances of calm - mastering inner peace together.',
  category: 'mood',
  tier: 2,
  unlockCriteria: { type: 'mood_logged', threshold: 50 },
  pointsReward: 200,
  metadata: { moodType: 'Calm' },
  displayOrder: 2,
};

// ─── MEDIA CATEGORY ───────────────────────────────────────────────────────

export const EMERALD_SOUL: Badge = {
  id: 'emerald_soul',
  name: 'Emerald Soul',
  description: 'You have attached media to 15 memories - capturing moments visually.',
  category: 'media',
  tier: 1,
  unlockCriteria: { type: 'media_attachments', threshold: 15 },
  pointsReward: 100,
  displayOrder: 1,
};

export const EMERALD_SOUL_2: Badge = {
  id: 'emerald_soul_2',
  name: 'Emerald Legacy',
  description: '50 memories with media - your story, richly documented.',
  category: 'media',
  tier: 2,
  unlockCriteria: { type: 'media_attachments', threshold: 50 },
  pointsReward: 200,
  displayOrder: 2,
};

export const GOLDEN_HEART: Badge = {
  id: 'golden_heart',
  name: 'Golden Heart',
  description: 'You have created 5 videos together - moments worth capturing.',
  category: 'media',
  tier: 3,
  unlockCriteria: { type: 'media_attachments', threshold: 75 },
  pointsReward: 250,
  displayOrder: 3,
};

export const GOLDEN_HEART_2: Badge = {
  id: 'golden_heart_2',
  name: 'Golden Director',
  description: 'You have created 15 videos together - a cinematic love story.',
  category: 'media',
  tier: 4,
  unlockCriteria: { type: 'media_attachments', threshold: 150 },
  pointsReward: 350,
  displayOrder: 4,
};

// ─── PROGRESSION CATEGORY ─────────────────────────────────────────────────

// Note: LEVEL_UP is defined above in GAMES CATEGORY

// ─── BADGE REGISTRY ───────────────────────────────────────────────────────

/**
 * Complete registry of all badges.
 * Used for validation, filtering, and display across the app.
 */
export const ALL_BADGES: Badge[] = [
  // Hugs
  FIRST_EMBRACE,
  FIRST_EMBRACE_2,
  HUG_COLLECTOR,

  // Check-ins
  DAILY_STREAK,
  DAILY_STREAK_2,
  FIRST_LIGHT,
  MORNING_RITUAL,
  NIGHT_WHISPERS,

  // Memory & Vault
  MEMORY_KEEPER,

  // Messages
  WORDS_THAT_MATTER,
  WORDS_THAT_MATTER_2,
  OPEN_HEART,

  // Timeline
  SHARED_HORIZONS,
  SHARED_HORIZONS_2,
  TOGETHER_FOREVER,

  // Vision Board
  DREAM_BUILDERS,
  DREAM_BUILDERS_2,

  // Bucket List
  BUCKET_LIST_BUDDY,
  BUCKET_LIST_BUDDY_2,

  // Games
  CURIOUS_MIND,
  CURIOUS_MIND_2,
  LEVEL_UP,

  // Partner Sync
  GROWING_TOGETHER,
  SAFE_HARBOR,

  // Special
  EVERGREEN,
  EVERGREEN_2,
  EVERGREEN_3,
  ETERNAL_BOND,
  SACRED_VOW,

  // Mood
  FINDING_CALM,
  FINDING_CALM_2,

  // Media
  EMERALD_SOUL,
  EMERALD_SOUL_2,
  GOLDEN_HEART,
  GOLDEN_HEART_2,
];

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
