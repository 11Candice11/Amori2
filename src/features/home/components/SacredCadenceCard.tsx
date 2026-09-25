/**
 * SacredCadenceCard — "Canopy Resonance" emotional pulse card.
 * Matches the design: label row, title, description, dual CTA buttons.
 *
 * When hasMoodToday is true, shows the current mood label as a small
 * badge instead of the generic description.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function ResonanceIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12h3l2-5 3 10 2-7 2 4h3l2-2"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={colors.ctaText}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckCircleIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" fill="rgba(76,175,125,0.15)" stroke="#4CAF7D" strokeWidth={1.5} />
      <Path
        d="M7 12l3.5 3.5L17 8"
        stroke="#4CAF7D"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type SacredCadenceCardProps = {
  title?: string;
  duration?: string;
  description?: string;
  ctaLabel?: string;
  onPress?: () => void;
  onOpenView?: () => void;
  /** Current mood label to display when check-in is done for today */
  currentMoodLabel?: string | null;
  hasMoodToday?: boolean;
};

export function SacredCadenceCard({
  title = 'Emotional Pulse & Resonance',
  duration = '2 min',
  description = 'Calibrate your inner atmosphere and\nlet your love softly tune in.',
  ctaLabel = 'Start Daily Check-in',
  onPress,
  onOpenView,
  currentMoodLabel,
  hasMoodToday = false,
}: SacredCadenceCardProps) {
  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.iconLabel}>
          <ResonanceIcon />
        </View>

        {/* Done badge — shown when today's check-in is complete */}
        {hasMoodToday && (
          <View style={styles.doneBadge}>
            <CheckCircleIcon />
            <Text style={styles.doneBadgeText}>TODAY</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Current mood pill — replaces description when mood is logged */}
      {hasMoodToday && currentMoodLabel ? (
        <View style={styles.moodRow}>
          <View style={styles.moodPill}>
            <View style={styles.moodPillDot} />
            <Text style={styles.moodPillText}>
              Feeling {currentMoodLabel} right now
            </Text>
          </View>
          <Text style={styles.moodSubtext}>
            Your inner atmosphere is calibrated for today.{'\n'}Your partner can softly tune in.
          </Text>
        </View>
      ) : (
        <Text style={styles.description}>{description}</Text>
      )}

      {/* CTA buttons row */}
      <View style={styles.ctaRow}>
        <Pressable
          style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
          onPress={onPress}
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaPrimaryText}>{ctaLabel}</Text>
          <ArrowIcon />
        </Pressable>

        {onOpenView ? (
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaSecondaryPressed]}
            onPress={onOpenView}
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
            accessibilityRole="button"
            accessibilityLabel="Open View"
          >
            <Text style={styles.ctaSecondaryText}>Open View</Text>
          </Pressable>
        ) : null}
      </View>

      {!hasMoodToday && (
        <Text style={styles.hint}>Opens full gauge & needs selection</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  doneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76,175,125,0.1)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(76,175,125,0.2)',
  },
  doneBadgeText: {
    ...typography.label,
    color: '#4CAF7D',
    fontSize: 8,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.neutralMuted,
    marginBottom: spacing.md,
  },
  moodRow: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
    marginBottom: 6,
  },
  moodPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  moodPillText: {
    ...typography.bodyMedium,
    color: colors.gold,
    fontSize: 13,
  },
  moodSubtext: {
    ...typography.body,
    color: colors.neutralMuted,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  ctaPressed: {
    opacity: 0.88,
  },
  ctaPrimaryText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 13,
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  ctaSecondaryPressed: {
    opacity: 0.7,
  },
  ctaSecondaryText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
  },
  hint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
  },
});
