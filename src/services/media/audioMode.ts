/**
 * audioMode — shared expo-av audio-session configuration for voice notes.
 *
 * Recording and playback need slightly different sessions. Centralising the two
 * `Audio.setAudioModeAsync` calls keeps the recorder and player consistent and
 * avoids each component inventing its own (subtly different) mode.
 *
 * The key setting is `playsInSilentModeIOS: true` so a voice note is audible
 * even when the iPhone ring switch is on silent — otherwise a played-back note
 * is silent with no obvious reason why.
 */
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

/** Prepare the session for recording (mic enabled, audible on silent). */
export async function configureRecordingAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}

/** Prepare the session for playback (recording disabled, audible on silent). */
export async function configurePlaybackAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
    shouldDuckAndroid: true,
    staysActiveInBackground: false,
  });
}
