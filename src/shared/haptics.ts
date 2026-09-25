/**
 * Haptics that honour the user's "Vibration" preference.
 *
 * Use these instead of react-native's Vibration directly. Calling Vibration
 * straight from a screen bypasses the setting, which is how the preference ends
 * up doing nothing.
 *
 * Exported as standalone functions rather than a `haptics` object because
 * components in this codebase already take a `haptics` prop, and a same-named
 * import would shadow it.
 */
import { Vibration } from 'react-native';

import { userSettingsStore } from './state/userSettingsStore';

/**
 * Vibrate, unless the user has turned vibration off.
 *
 * @param pattern Duration in ms, or an on/off pattern as per Vibration.vibrate.
 * @param repeat Loop the pattern until cancelVibration() is called. Android
 *   honours this for patterns; iOS repeats regardless of pattern shape.
 */
export function vibrate(pattern?: number | number[], repeat = false): void {
  if (!userSettingsStore.isEnabled('vibrationEnabled')) return;
  Vibration.vibrate(pattern, repeat);
}

/**
 * Stop any vibration in progress. Runs regardless of the preference, so a buzz
 * already in flight can always be stopped.
 */
export function cancelVibration(): void {
  Vibration.cancel();
}
