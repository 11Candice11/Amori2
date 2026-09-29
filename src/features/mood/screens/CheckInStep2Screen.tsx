/**
 * CheckInStep2Screen — "Choose your specific mood"
 *
 * Step 2 of 2: Shows a list of moods filtered to the quadrant the
 * user selected in Step 1. Each row has a radio-style selector, mood
 * name, and a short description. At the bottom there's a "Confirm &
 * Anchor" CTA and an "I don't know" fallback.
 *
 * Design notes:
 *  - Forest image header with a dark overlay (same pattern as Step 1)
 *  - Quadrant label + tagline shown prominently at top
 *  - Scrollable list of mood options (radio select)
 *  - Gold CTA pill at bottom
 *  - "I don't know" ghost link below CTA
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
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

// ─── Images ───────────────────────────────────────────────────────────────────

// Use the forest image for High Unpleasant (stormy), fireplace for others
const forestImage = require('../../../../images/forest.png');
const fireplaceImage = require('../../../../images/fireplace.png');
const cozyImage = require('../../../../images/cozy.png');

function getBackgroundImage(quadrant: MoodQuadrant) {
  switch (quadrant) {
    case 'HIGH_UNPLEASANT':
      return forestImage;   // dark, stirring forest
    case 'LOW_UNPLEASANT':
      return forestImage;   // quiet forest, subdued
    case 'HIGH_PLEASANT':
      return fireplaceImage; // warm, bright fire
    case 'LOW_PLEASANT':
      return cozyImage;      // calm, cozy interior
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12l4 4L19 7"
        stroke={colors.ctaText}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

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

// ─── Quadrant accent color helper ────────────────────────────────────────────

function getQuadrantLabelColor(quadrant: MoodQuadrant): string {
  switch (quadrant) {
    case 'HIGH_PLEASANT':   return colors.gold;
    case 'LOW_PLEASANT':    return colors.primaryLight;
    case 'HIGH_UNPLEASANT': return '#B34040';
    case 'LOW_UNPLEASANT':  return colors.neutralMuted;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  quadrant: MoodQuadrant;
  onConfirm: (mood: MoodOption) => void;
  onIDontKnow: () => void;
  onBack: () => void;
  /** True while the API call is in-flight */
  submitting?: boolean;
  /** Error message from a failed confirm / "I don't know" submission. */
  error?: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CheckInStep2Screen({ quadrant, onConfirm, onIDontKnow, onBack, submitting = false, error = null }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const meta = QUADRANTS.find((q) => q.key === quadrant)!;
  const moodsForQuadrant = MOOD_OPTIONS.filter((m) => m.quadrant === quadrant);
  const selectedMood = moodsForQuadrant.find((m) => m.id === selectedId) ?? null;
  const accentColor = getQuadrantLabelColor(quadrant);
  const bgImage = getBackgroundImage(quadrant);

  const handleConfirm = useCallback(() => {
    if (selectedMood) {
      onConfirm(selectedMood);
    }
  }, [selectedMood, onConfirm]);

  const renderMoodRow = useCallback(
    (mood: MoodOption) => {
      const isSelected = mood.id === selectedId;
      return (
        <Pressable
          key={mood.id}
          style={({ pressed }) => [
            styles.moodRow,
            isSelected && styles.moodRowSelected,
            pressed && styles.moodRowPressed,
          ]}
          onPress={() => setSelectedId(mood.id)}
          android_ripple={{ color: 'rgba(253,252,240,0.05)' }}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={`${mood.label}: ${mood.description}`}
        >
          {/* Radio / check indicator */}
          <View style={[styles.radio, isSelected && styles.radioSelected]}>
            {isSelected && <CheckIcon />}
          </View>

          {/* Text */}
          <View style={styles.moodText}>
            <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
              {mood.label}
            </Text>
            <Text style={styles.moodDescription}>{mood.description}</Text>
          </View>
        </Pressable>
      );
    },
    [selectedId],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Mood list scrolls freely */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        {/* ── Header with background image ── */}
        <ImageBackground
          source={bgImage}
          style={styles.headerImage}
          imageStyle={styles.headerImageStyle}
          resizeMode="cover"
        >
          <View style={styles.headerOverlay}>
            {/* Back button */}
            <Pressable
              style={styles.backButton}
              onPress={!submitting ? onBack : undefined}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityState={{ disabled: submitting }}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M19 12H5M5 12l7-7M5 12l7 7"
                  stroke={colors.neutral}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>

            {/* Step label */}
            <View style={styles.stepRow}>
              <View style={styles.stepDot} />
              <Text style={styles.stepLabel}>STEP 2 OF 2</Text>
            </View>

            {/* Quadrant label + tagline */}
            <Text style={[styles.quadrantLabel, { color: accentColor }]}>
              {meta.label.toUpperCase()} • {meta.tagline.toUpperCase()}
            </Text>

            <Text style={styles.headerSubtext}>
              Take a deep breath. No judgment in this sanctuary.
            </Text>
          </View>
        </ImageBackground>

        {/* ── Mood list ── */}
        <View style={styles.listContainer}>
          {moodsForQuadrant.map(renderMoodRow)}
        </View>

        {/* Bottom padding so last mood row isn't hidden behind the fixed footer */}
        <View style={styles.listBottomPadding} />
      </ScrollView>

      {/* ── Fixed footer — always visible, never scrolls away ── */}
      <View style={styles.footer}>
        {/* Surface any submit / "I don't know" error so it isn't silent */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Confirm CTA */}
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

        {/* I don't know */}
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
        <Text style={styles.dontKnowHint}>Hard to pinpoint words right now</Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    // no paddingBottom here — footer handles the bottom space
  },

  // Header image
  headerImage: {
    width: '100%',
    height: 200,
    marginBottom: spacing.sm,
  },
  headerImageStyle: {
    opacity: 0.6,
  },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,20,15,0.6)',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-end',
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    padding: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  stepDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  stepLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  quadrantLabel: {
    ...typography.label,
    fontSize: 11,
    marginBottom: spacing.xs,
    letterSpacing: 1.4,
  },
  headerSubtext: {
    ...typography.body,
    color: colors.neutralMuted,
  },

  // Mood list
  listContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  listBottomPadding: {
    // Enough room so the last mood row clears the fixed footer
    height: 180,
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  moodRowSelected: {
    borderColor: 'rgba(197,163,101,0.4)',
    backgroundColor: 'rgba(197,163,101,0.08)',
  },
  moodRowPressed: {
    opacity: 0.82,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutralSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  radioSelected: {
    backgroundColor: colors.ctaBackground,
    borderColor: colors.ctaBackground,
  },
  moodText: {
    flex: 1,
  },
  moodLabel: {
    ...typography.bodyMedium,
    color: colors.neutral,
    marginBottom: 2,
  },
  moodLabelSelected: {
    color: colors.gold,
  },
  moodDescription: {
    ...typography.bodySm,
    color: colors.neutralMuted,
  },

  // Fixed footer
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 2,
  },

  // Confirm CTA
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

  // Don't know
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
  dontKnowHint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    paddingBottom: spacing.xs,
  },
  error: {
    ...typography.bodySm,
    color: '#B34040',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bottomPadding: {
    height: spacing.lg,
  },
});
