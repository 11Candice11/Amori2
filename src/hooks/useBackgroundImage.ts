/**
 * useBackgroundImage — picks a screen's own background artwork once per mount.
 *
 * This covers the screens with dedicated art: sign-in, the home dashboard and
 * settings. None of them are mood-driven.
 *
 * The mood-driven screens (Check-in, Together, Desk) must all show the SAME
 * image, so they use `useMoodBackground()` from
 * `shared/state/moodBackgroundStore` instead.
 */

import { useState } from 'react';

import {
  getDashboardBackground,
  getSettingsBackground,
  getSignInBackground,
} from '../utils/backgroundImages';

export type BackgroundContext = 'signin' | 'dashboard' | 'settings';

function pick(context: BackgroundContext): number {
  switch (context) {
    case 'signin':
      return getSignInBackground();
    case 'dashboard':
      return getDashboardBackground();
    case 'settings':
      return getSettingsBackground();
    default:
      return getDashboardBackground();
  }
}

/**
 * Each set has two images; one is chosen at random on mount and then held, so
 * re-renders (refreshes, toggles, data updates) don't swap the image underneath
 * the user.
 */
export function useBackgroundImage(context: BackgroundContext): number {
  const [image] = useState(() => pick(context));
  return image;
}
