/**
 * VoiceNoteRecorder — record a short voice note with expo-av.
 *
 * Handles the whole capture lifecycle: request the mic permission, start/stop
 * recording, show a live elapsed timer while recording, and hand the finished
 * clip back to the parent via `onRecorded({ uri, durationSeconds })`. The
 * parent is responsible for uploading it (see mediaService.uploadImage, which
 * accepts audio now) and attaching it as a VoiceNote media item.
 *
 * When a note has already been recorded the recorder collapses into a preview
 * with a `VoiceNotePlayer` and a "Re-record" affordance, so the flow works for
 * both first capture and replacing a take.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Audio } from 'expo-av';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { configureRecordingAudioMode } from '../../../services/media/audioMode';
import { VoiceNotePlayer } from './VoiceNotePlayer';

/** A finished recording ready to upload. */
export interface RecordedVoiceNote {
  /** On-device file URI of the recording. */
  uri: string;
  /** Recording length in whole seconds. */
  durationSeconds: number;
}

interface VoiceNoteRecorderProps {
  /** Fired when a recording finishes. */
  onRecorded: (note: RecordedVoiceNote) => void;
  /** Called when the user clears/removes the current recording. */
  onCleared: () => void;
  /**
   * A recording already captured (or an existing note being edited). When set,
   * the recorder shows a player + re-record instead of the mic button.
   */
  current?: { uri: string; durationSeconds: number } | null;
}

function MicGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={colors.ctaText} />
      <Rect x={11} y={17} width={2} height={4} rx={1} fill={colors.ctaText} />
    </Svg>
  );
}

function StopGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={6} width={12} height={12} rx={2} fill="#fff" />
    </Svg>
  );
}

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function VoiceNoteRecorder({ onRecorded, onCleared, current }: VoiceNoteRecorderProps) {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stopTicker = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Clean up a dangling recording + timer if we unmount mid-capture.
  useEffect(() => {
    return () => {
      stopTicker();
      const rec = recordingRef.current;
      if (rec) {
        rec.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, [stopTicker]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is needed to record a voice note.');
        return;
      }

      setPreparing(true);
      await configureRecordingAudioMode();

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = rec;
      setPreparing(false);
      setRecording(true);
      setElapsed(0);

      tickRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    } catch {
      setPreparing(false);
      setError('Could not start recording.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    stopTicker();
    setRecording(false);
    const rec = recordingRef.current;
    if (!rec) return;
    recordingRef.current = null;

    try {
      await rec.stopAndUnloadAsync();
      const status = await rec.getStatusAsync();
      const uri = rec.getURI();
      const durationSeconds =
        status && 'durationMillis' in status && status.durationMillis
          ? Math.round(status.durationMillis / 1000)
          : elapsed;

      if (uri) {
        onRecorded({ uri, durationSeconds: Math.max(1, durationSeconds) });
      } else {
        setError('The recording was empty.');
      }
    } catch {
      setError('Could not save the recording.');
    }
  }, [elapsed, onRecorded, stopTicker]);

  // Already have a clip → show a player + re-record.
  if (current) {
    return (
      <View style={styles.wrap}>
        <VoiceNotePlayer uri={current.uri} durationSeconds={current.durationSeconds} />
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={onCleared}
          accessibilityRole="button"
          accessibilityLabel="Remove voice note"
        >
          <Text style={styles.secondaryBtnText}>Remove</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {recording ? (
        <Pressable
          style={({ pressed }) => [styles.recordBtn, styles.recordingBtn, pressed && styles.pressed]}
          onPress={stopRecording}
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
        >
          <StopGlyph />
          <Text style={styles.recordingText}>Recording… {clock(elapsed)} — tap to stop</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [styles.recordBtn, pressed && styles.pressed]}
          onPress={startRecording}
          disabled={preparing}
          accessibilityRole="button"
          accessibilityLabel="Record a voice note"
        >
          {preparing ? <ActivityIndicator color={colors.ctaText} /> : <MicGlyph />}
          <Text style={styles.recordBtnText}>
            {preparing ? 'Preparing…' : 'Record voice note'}
          </Text>
        </Pressable>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  recordingBtn: {
    backgroundColor: colors.emergency,
  },
  recordBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
  },
  recordingText: {
    ...typography.bodySemiBold,
    color: '#fff',
    fontSize: 14,
  },
  pressed: { opacity: 0.7 },
  secondaryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    fontSize: 13,
  },
});
