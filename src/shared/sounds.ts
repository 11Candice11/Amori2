/**
 * Sound effects that honour the user's "Sound effects" preference.
 *
 * Use these functions instead of expo-av's Audio.Sound directly. Playing sounds
 * straight from a component bypasses the setting, which means the preference
 * wouldn't work.
 *
 * This module provides helper functions for common app sounds (button taps,
 * notifications, success/error feedback).
 */
import { Audio } from 'expo-av';

import { userSettingsStore } from './state/userSettingsStore';

/**
 * Play a sound effect, unless the user has turned sound effects off.
 *
 * @param soundSource The sound asset from require() (e.g., require('../assets/sounds/tap.mp3'))
 * @param volume Optional volume level (0.0 to 1.0). Default is 1.0.
 * @returns Promise that resolves when the sound starts playing, or immediately if disabled
 */
export async function playSound(
  soundSource: any,
  volume = 1.0,
): Promise<void> {
  if (!userSettingsStore.isEnabled('soundEnabled')) return;

  try {
    const { sound } = await Audio.Sound.createAsync(soundSource, {
      shouldPlay: true,
      volume,
    });

    // Unload the sound from memory after it finishes playing
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {
          // Ignore unload errors
        });
      }
    });
  } catch (error) {
    // Silently fail if sound can't be loaded or played
    console.warn('[sounds] Failed to play sound:', error);
  }
}

/**
 * Check if sound effects are enabled in user settings.
 * Useful for conditional sound logic without attempting playback.
 */
export function isSoundEnabled(): boolean {
  return userSettingsStore.isEnabled('soundEnabled');
}
