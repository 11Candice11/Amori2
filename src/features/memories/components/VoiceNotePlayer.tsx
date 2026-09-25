/**
 * VoiceNotePlayer — a compact play/pause control for a recorded voice note.
 *
 * Loads a remote (or local) audio URL with expo-av's `Audio.Sound`, shows a
 * play/pause button, a slim progress bar, and the elapsed / total time. It's
 * intentionally self-contained so it can be dropped into a memory card, the
 * memory detail popup, or a gift reveal.
 *
 * The sound is loaded lazily on first play and unloaded on unmount so we never
 * hold an audio buffer open longer than needed. Playback uses the shared
 * `configurePlaybackAudioMode` so a note is audible even when the phone's ring
 * switch is on silent.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { configurePlaybackAudioMode } from '../../../services/media/audioMode';

interface VoiceNotePlayerProps {
  /** Loadable audio URL (already run through resolveMediaUrl). */
  uri: string;
  /** Known duration in seconds, if the backend recorded one. */
  durationSeconds?: number | null;
  /** Optional caption shown above the controls (e.g. the note's title). */
  label?: string | null;
}

function PlayGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5v14l11-7z" fill={colors.ctaText} />
    </Svg>
  );
}

function PauseGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={5} width={4} height={14} rx={1} fill={colors.ctaText} />
      <Rect x={14} y={5} width={4} height={14} rx={1} fill={colors.ctaText} />
    </Svg>
  );
}

/** Format seconds as m:ss. */
function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function VoiceNotePlayer({ uri, durationSeconds, label }: VoiceNotePlayerProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    durationSeconds != null ? durationSeconds * 1000 : 0,
  );
  const [error, setError] = useState<string | null>(null);

  // Unload the sound when the component goes away.
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError('Could not play this voice note.');
      return;
    }
    setPositionMs(status.positionMillis ?? 0);
    if (status.durationMillis) setDurationMs(status.durationMillis);
    setPlaying(status.isPlaying);
    // When it finishes, reset to the start so it can be replayed.
    if (status.didJustFinish) {
      setPlaying(false);
      soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  }, []);

  const togglePlay = useCallback(async () => {
    setError(null);
    try {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
        } else {
          await soundRef.current.playAsync();
        }
        return;
      }

      // First play: configure the audio session and load the clip.
      setLoading(true);
      await configurePlaybackAudioMode();
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onStatus,
      );
      soundRef.current = sound;
    } catch {
      setError('Could not play this voice note.');
    } finally {
      setLoading(false);
    }
  }, [uri, onStatus]);

  const total = durationMs || (durationSeconds != null ? durationSeconds * 1000 : 0);
  const progress = total > 0 ? Math.min(1, positionMs / total) : 0;
  const remainingLabel =
    total > 0 ? clock((total - positionMs) / 1000) : durationSeconds != null ? clock(durationSeconds) : '';

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          onPress={togglePlay}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause voice note' : 'Play voice note'}
        >
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </Pressable>

        <View style={styles.trackWrap}>
          <View style={styles.track}>
            <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.time}>{error ?? (playing ? clock(positionMs / 1000) : remainingLabel)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
  },
  pressed: { opacity: 0.7 },
  trackWrap: {
    flex: 1,
    gap: 6,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
  time: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
});
