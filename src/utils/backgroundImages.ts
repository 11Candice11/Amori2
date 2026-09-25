/**
 * Background image utilities.
 *
 * Two families of background live here:
 *
 * 1. Mood-driven — shared by the Check-in, Together and Desk screens. These
 *    three always show the SAME image: today's mood quadrant, or neutral when
 *    there's no check-in yet. The shared state lives in
 *    `shared/state/moodBackgroundStore`; this module only maps
 *    (quadrant, variant) → image.
 *      neutral1/2          : no check-in yet today
 *      high_pleasant1/2    : HIGH_PLEASANT
 *      low_pleasant1/2     : LOW_PLEASANT
 *      high_unpleasant1/2  : HIGH_UNPLEASANT
 *      low_unpleasant1/2   : LOW_UNPLEASANT
 *
 * 2. Screen-specific — their own artwork, never mood-driven:
 *      signin1/2    : sign-in
 *      dashboard1/2 : home dashboard
 *      settings1/2  : profile / settings
 *
 * Every set has two images; one is picked at random.
 */

import type { MoodQuadrant } from '../features/mood/types/mood.types';

export type BackgroundImageKey = 
  | 'signin1'
  | 'signin2'
  | 'neutral1'
  | 'neutral2'
  | 'dashboard1'
  | 'dashboard2'
  | 'settings1'
  | 'settings2'
  | 'high_pleasant1'
  | 'high_pleasant2'
  | 'high_unpleasant1'
  | 'high_unpleasant2'
  | 'low_pleasant1'
  | 'low_pleasant2'
  | 'low_unpleasant1'
  | 'low_unpleasant2';

/** Which of a set's two images to use. */
export type BackgroundVariant = 1 | 2;

/**
 * Background image sources — imported statically for bundling.
 */
export const BACKGROUND_IMAGES = {
  signin1: require('../../images/background/signin1.png'),
  signin2: require('../../images/background/signin2.png'),
  neutral1: require('../../images/background/neutral1.png'),
  neutral2: require('../../images/background/neutral2.png'),
  dashboard1: require('../../images/background/dashboard1.png'),
  dashboard2: require('../../images/background/dashboard2.png'),
  settings1: require('../../images/background/settings1.png'),
  settings2: require('../../images/background/settings2.png'),
  high_pleasant1: require('../../images/background/high_pleasant1.png'),
  high_pleasant2: require('../../images/background/high_pleasant2.png'),
  high_unpleasant1: require('../../images/background/high_unpleasant1.png'),
  high_unpleasant2: require('../../images/background/high_unpleasant2.png'),
  low_pleasant1: require('../../images/background/low_pleasant1.png'),
  low_pleasant2: require('../../images/background/low_pleasant2.png'),
  low_unpleasant1: require('../../images/background/low_unpleasant1.png'),
  low_unpleasant2: require('../../images/background/low_unpleasant2.png'),
} as const;

/** The image pair for each mood quadrant, plus the no-check-in neutral pair. */
const MOOD_BACKGROUND_PAIRS: Record<MoodQuadrant | 'NEUTRAL', readonly [number, number]> = {
  NEUTRAL: [BACKGROUND_IMAGES.neutral1, BACKGROUND_IMAGES.neutral2],
  HIGH_PLEASANT: [BACKGROUND_IMAGES.high_pleasant1, BACKGROUND_IMAGES.high_pleasant2],
  LOW_PLEASANT: [BACKGROUND_IMAGES.low_pleasant1, BACKGROUND_IMAGES.low_pleasant2],
  HIGH_UNPLEASANT: [BACKGROUND_IMAGES.high_unpleasant1, BACKGROUND_IMAGES.high_unpleasant2],
  LOW_UNPLEASANT: [BACKGROUND_IMAGES.low_unpleasant1, BACKGROUND_IMAGES.low_unpleasant2],
};

/** Pick one of the two variants at random. */
export function randomBackgroundVariant(): BackgroundVariant {
  return Math.random() < 0.5 ? 1 : 2;
}

/**
 * Map a mood quadrant and variant to a specific image. Deterministic — the
 * shared mood background store owns the variant so that every mood-driven
 * screen resolves to the same image.
 *
 * A null quadrant means "no check-in today" and resolves to a neutral image.
 */
export function resolveMoodBackground(
  quadrant: MoodQuadrant | null,
  variant: BackgroundVariant,
): number {
  const pair = MOOD_BACKGROUND_PAIRS[quadrant ?? 'NEUTRAL'] ?? MOOD_BACKGROUND_PAIRS.NEUTRAL;
  return variant === 1 ? pair[0] : pair[1];
}

/**
 * Get a random background image for a given mood quadrant.
 * Each quadrant has two images; one is chosen randomly.
 *
 * Prefer `useMoodBackground()` on screens — it keeps Check-in, Together and
 * Desk on the same image instead of re-rolling per screen.
 */
export function getBackgroundForMood(quadrant: MoodQuadrant | null): number {
  return resolveMoodBackground(quadrant, randomBackgroundVariant());
}

/**
 * Get background image for sign-in screen.
 * Randomly selects between signin1 and signin2.
 */
export function getSignInBackground(): number {
  return Math.random() < 0.5 ? BACKGROUND_IMAGES.signin1 : BACKGROUND_IMAGES.signin2;
}

/**
 * Get a neutral background (when no check-in has been done).
 * Randomly picks between neutral1 and neutral2.
 */
export function getNeutralBackground(): number {
  return resolveMoodBackground(null, randomBackgroundVariant());
}

/**
 * Get the dashboard background (used for home screen).
 * Randomly selects between dashboard1 and dashboard2.
 */
export function getDashboardBackground(): number {
  return Math.random() < 0.5 ? BACKGROUND_IMAGES.dashboard1 : BACKGROUND_IMAGES.dashboard2;
}

/**
 * Get the settings background (used for the profile / settings screen).
 * Randomly selects between settings1 and settings2.
 */
export function getSettingsBackground(): number {
  return Math.random() < 0.5 ? BACKGROUND_IMAGES.settings1 : BACKGROUND_IMAGES.settings2;
}
