/**
 * Profile Stack Navigation
 *
 * Nested stack for the Settings/Profile tab.
 * Includes main profile settings screen, achievements, and support preferences.
 */

export type ProfileStackParamList = {
  /**
   * Main profile settings screen with account options,
   * privacy settings, and notification preferences.
   */
  ProfileHome: undefined;

  /**
   * Achievements/badges gallery showing all badges,
   * progress, and unlock criteria.
   */
  Achievements: undefined;
};
