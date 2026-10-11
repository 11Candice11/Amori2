/**
 * CheckInStep2Screen — "Choose your specific mood"
 *
 * Step 2 of 2: Shows all 80 moods in a large continuous grid where you can
 * pan/scroll up/down/left/right to explore different mood regions. Each
 * mood bubble is colored by its quadrant with smooth transitions.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  MOOD_OPTIONS,
  QUADRANTS,
  type MoodOption,
  type MoodQuadrant,
} from '../types/mood.types';

// ─── Icons ────────────────────────────────────────────────────────────────────

function AnchorIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="5" r="3" stroke={colors.ctaText} strokeWidth={1.8} />
      <Path
        d="M12 8v13M5 12H2l3 5M19 12h3l-3 5M5 17c0 3.87 3.13 7 7 7s7-3.13 7-7"
        stroke={colors.ctaText}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function QuestionDontKnowIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"
        stroke={colors.neutralMuted}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="10" stroke={colors.neutralMuted} strokeWidth={1.5} />
    </Svg>
  );
}

// ─── Color spectrum ────────────────────────────────────────────────────────────

const QUADRANT_COLORS: Record<MoodQuadrant, string> = {
  HIGH_UNPLEASANT: '#FF6B6B',      // Red
  HIGH_PLEASANT: '#FFD93D',        // Yellow
  LOW_PLEASANT: '#6BCF9E',         // Green
  LOW_UNPLEASANT: '#6B9FFF',       // Blue
};

const COLOR_SPECTRUM = [
  '#FF6B6B', '#FF7B6B', '#FF8B6B', '#FF9B6B', '#FFB84D',
  '#FFC93D', '#FFD93D', '#E0D93D', '#C7D93D', '#ADED6E',
  '#87CEEB', '#79C9E8', '#6BCF9E', '#65C9A0', '#5FC3A2',
  '#5CB8B8', '#5BB0B8', '#5AACBE', '#5AA2C0', '#6B9FFF',
  '#7E94FF', '#8B7FB8', '#9073A8', '#956798', '#9A5B88',
];

function getMoodColor(mood: MoodOption): string {
  return QUADRANT_COLORS[mood.quadrant];
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  quadrant: MoodQuadrant;
  onConfirm: (mood: MoodOption) => void;
  onIDontKnow: () => void;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInStep2Screen({
  quadrant,
  onConfirm,
  onIDontKnow,
  onBack,
  submitting = false,
  error = null,
}: Props) {
  const [selectedMoodId, setSelectedMoodId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const selectedMood = selectedMoodId
    ? MOOD_OPTIONS.find((m) => m.id === selectedMoodId) ?? null
    : null;

  const handleBubbleSelect = (moodId: string) => {
    Vibration.vibrate(30);
    setSelectedMoodId(moodId);
  };

  const handleConfirm = useCallback(() => {
    if (selectedMood) {
      onConfirm(selectedMood);
    }
  }, [selectedMood, onConfirm]);

  // Arrange all 80 moods in a 5x5 grid (25 moods per view, can scroll to see all)
  const moodGrid: (MoodOption | null)[][] = [];
  const moodsPerRow = 5;
  
  for (let i = 0; i < MOOD_OPTIONS.length; i += moodsPerRow) {
    const row: (MoodOption | null)[] = [];
    for (let j = 0; j < moodsPerRow; j++) {
      const index = i + j;
      row.push(index < MOOD_OPTIONS.length ? MOOD_OPTIONS[index] : null);
    }
    moodGrid.push(row);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={!submitting ? onBack : undefined}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityState={{ disabled: submitting }}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke={colors.neutral}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>

          <Text style={styles.headerTitle}>
            Tap the emotion that best describes how you feel right now
          </Text>
        </View>

        {/* Mood grid - 5x5 visible, scrollable */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          scrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {moodGrid.map((row, rowIndex) => (
            <View key={`row-${rowIndex}`} style={styles.gridRow}>
              {row.map((mood, colIndex) =>
                mood ? (
                  <BubbleMood
                    key={mood.id}
                    mood={mood}
                    isSelected={selectedMoodId === mood.id}
                    onPress={() => handleBubbleSelect(mood.id)}
                  />
                ) : (
                  <View key={`spacer-${colIndex}`} style={styles.bubbleSpacing} />
                )
              )}
            </View>
          ))}
        </ScrollView>

        {/* Description at bottom */}
        {selectedMood && (
          <View style={styles.descriptionContainer}>
            <Text style={[styles.descriptionLabel, { color: getMoodColor(selectedMood) }]}>
              {selectedMood.label}
            </Text>
            <Text style={styles.descriptionSubtext}>{selectedMood.description}</Text>
          </View>
        )}

        {/* Footer with actions */}
        <View style={styles.footer}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.confirmButton,
              (!selectedMood || submitting) && styles.confirmButtonDisabled,
              pressed && selectedMood && !submitting && styles.confirmButtonPressed,
            ]}
            onPress={handleConfirm}
            disabled={!selectedMood || submitting}
            android_ripple={selectedMood && !submitting ? { color: 'rgba(10,20,15,0.2)' } : undefined}
            accessibilityRole="button"
            accessibilityLabel="Confirm and anchor"
            accessibilityState={{ disabled: !selectedMood || submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.ctaText} />
            ) : (
              <>
                <AnchorIcon />
                <Text style={styles.confirmButtonText}>Confirm & Anchor</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.dontKnowButton,
              pressed && styles.dontKnowPressed,
              submitting && styles.dontKnowPressed,
            ]}
            onPress={!submitting ? onIDontKnow : undefined}
            android_ripple={{ color: 'rgba(253,252,240,0.06)' }}
            accessibilityRole="button"
            accessibilityLabel="I don't know, hard to pinpoint words right now"
            accessibilityState={{ disabled: submitting }}
          >
            <QuestionDontKnowIcon />
            <Text style={styles.dontKnowText}>I don't know</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Bubble component ─────────────────────────────────────────────────────────

interface BubbleMoodProps {
  mood: MoodOption;
  isSelected: boolean;
  onPress: () => void;
}

function BubbleMood({ mood, isSelected, onPress }: BubbleMoodProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isSelected ? 1.15 : 1,
      useNativeDriver: true,
      friction: 5,
      tension: 40,
    }).start();
  }, [isSelected, scaleAnim]);

  return (
    <Animated.View
      style={[
        styles.bubbleSpacing,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[
          styles.bubble,
          {
            backgroundColor: getMoodColor(mood),
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${mood.label}: ${mood.description}`}
      >
        <Text
          style={styles.bubbleText}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {mood.label}
        </Text>
        {isSelected && <View style={styles.bubbleRing} />}
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: 4,
    zIndex: 10,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.neutral,
    textAlign: 'center',
    fontSize: 16,
    paddingHorizontal: spacing.lg,
  },

  // Grid
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xs,
    height: '20%',  // 5 rows = 100%, so each row is 20%
  },
  bubbleSpacing: {
    width: '20%',  // 5 columns = 100%, so each column is 20%
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleText: {
    ...typography.bodySemiBold,
    fontSize: 9,
    color: '#0A140F',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  bubbleRing: {
    position: 'absolute',
    width: '115%',
    height: '115%',
    borderRadius: 1000,
    borderWidth: 2,
    borderColor: colors.gold,
  },

  // Description
  descriptionContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(10,20,15,0.4)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197,163,101,0.2)',
  },
  descriptionLabel: {
    ...typography.bodySemiBold,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  descriptionSubtext: {
    ...typography.body,
    color: colors.neutral,
    textAlign: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },

  // Buttons
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: 50,
    backgroundColor: colors.ctaBackground,
    marginBottom: spacing.xs,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmButtonPressed: {
    opacity: 0.88,
  },
  confirmButtonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },

  dontKnowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
  },
  dontKnowPressed: {
    opacity: 0.7,
  },
  dontKnowText: {
    ...typography.bodyMedium,
    color: colors.neutralMuted,
  },
  error: {
    ...typography.bodySm,
    color: '#B34040',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
});
