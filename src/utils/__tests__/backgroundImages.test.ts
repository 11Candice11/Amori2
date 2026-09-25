/**
 * Tests for background image utilities.
 */

import {
  getSignInBackground,
  getNeutralBackground,
  getDashboardBackground,
  getBackgroundForMood,
  BACKGROUND_IMAGES,
} from '../backgroundImages';

describe('backgroundImages', () => {
  describe('BACKGROUND_IMAGES', () => {
    it('should have all required image keys', () => {
      expect(BACKGROUND_IMAGES).toHaveProperty('signin1');
      expect(BACKGROUND_IMAGES).toHaveProperty('signin2');
      expect(BACKGROUND_IMAGES).toHaveProperty('neutral1');
      expect(BACKGROUND_IMAGES).toHaveProperty('neutral2');
      expect(BACKGROUND_IMAGES).toHaveProperty('dashboard1');
      expect(BACKGROUND_IMAGES).toHaveProperty('dashboard2');
      expect(BACKGROUND_IMAGES).toHaveProperty('high_pleasant1');
      expect(BACKGROUND_IMAGES).toHaveProperty('high_pleasant2');
      expect(BACKGROUND_IMAGES).toHaveProperty('high_unpleasant1');
      expect(BACKGROUND_IMAGES).toHaveProperty('high_unpleasant2');
      expect(BACKGROUND_IMAGES).toHaveProperty('low_pleasant1');
      expect(BACKGROUND_IMAGES).toHaveProperty('low_pleasant2');
      expect(BACKGROUND_IMAGES).toHaveProperty('low_unpleasant1');
      expect(BACKGROUND_IMAGES).toHaveProperty('low_unpleasant2');
    });
  });

  describe('getSignInBackground', () => {
    it('should return either signin1 or signin2', () => {
      const result = getSignInBackground();
      expect([BACKGROUND_IMAGES.signin1, BACKGROUND_IMAGES.signin2]).toContain(result);
    });
  });

  describe('getNeutralBackground', () => {
    it('should return either neutral1 or neutral2', () => {
      const result = getNeutralBackground();
      expect([BACKGROUND_IMAGES.neutral1, BACKGROUND_IMAGES.neutral2]).toContain(result);
    });
  });

  describe('getDashboardBackground', () => {
    it('should return either dashboard1 or dashboard2', () => {
      const result = getDashboardBackground();
      expect([BACKGROUND_IMAGES.dashboard1, BACKGROUND_IMAGES.dashboard2]).toContain(result);
    });
  });

  describe('getBackgroundForMood', () => {
    it('should return high_pleasant image for HIGH_PLEASANT quadrant', () => {
      const result = getBackgroundForMood('HIGH_PLEASANT');
      expect([
        BACKGROUND_IMAGES.high_pleasant1,
        BACKGROUND_IMAGES.high_pleasant2,
      ]).toContain(result);
    });

    it('should return low_pleasant image for LOW_PLEASANT quadrant', () => {
      const result = getBackgroundForMood('LOW_PLEASANT');
      expect([
        BACKGROUND_IMAGES.low_pleasant1,
        BACKGROUND_IMAGES.low_pleasant2,
      ]).toContain(result);
    });

    it('should return high_unpleasant image for HIGH_UNPLEASANT quadrant', () => {
      const result = getBackgroundForMood('HIGH_UNPLEASANT');
      expect([
        BACKGROUND_IMAGES.high_unpleasant1,
        BACKGROUND_IMAGES.high_unpleasant2,
      ]).toContain(result);
    });

    it('should return low_unpleasant image for LOW_UNPLEASANT quadrant', () => {
      const result = getBackgroundForMood('LOW_UNPLEASANT');
      expect([
        BACKGROUND_IMAGES.low_unpleasant1,
        BACKGROUND_IMAGES.low_unpleasant2,
      ]).toContain(result);
    });

    it('should return neutral image for null quadrant', () => {
      const result = getBackgroundForMood(null);
      expect([BACKGROUND_IMAGES.neutral1, BACKGROUND_IMAGES.neutral2]).toContain(result);
    });
  });
});
