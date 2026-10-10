/**
 * CardCollectionInfo — displays collection progress (e.g., "13/15 cards collected").
 *
 * Shows how many cards have been collected out of the total.
 * Each card rewards points when opened as a daily gift.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { getTotalCardCount } from '../../../utils/cardSelector';

// Total unique cards, read from images/cards so it grows when cards are added.
const TOTAL_CARDS = getTotalCardCount();

function CardStackIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {/* Back card */}
      <Rect x={2} y={8} width={14} height={14} rx={2} stroke={colors.gold} strokeWidth={1.2} fill="none" opacity={0.4} />
      {/* Middle card */}
      <Rect x={5} y={6} width={14} height={14} rx={2} stroke={colors.gold} strokeWidth={1.2} fill="none" opacity={0.7} />
      {/* Front card */}
      <Rect x={8} y={4} width={14} height={14} rx={2} stroke={colors.gold} strokeWidth={1.2} fill="none" />
    </Svg>
  );
}

type CardCollectionInfoProps = {
  collectedCount: number;
};

export function CardCollectionInfo({ collectedCount }: CardCollectionInfoProps) {
  const percentage = Math.round((collectedCount / TOTAL_CARDS) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <CardStackIcon />
        </View>
        
        <View style={styles.textGroup}>
          <Text style={styles.label}>Cards Collected</Text>
          <Text style={styles.count}>
            {collectedCount} of {TOTAL_CARDS}
          </Text>
        </View>

        <View style={styles.percentageCircle}>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>
      </View>

      {/* Progress bar under the main content */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${percentage}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139,111,58,0.15)',
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textGroup: {
    flex: 1,
    gap: 2,
  },

  label: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  count: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },

  percentageCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  percentage: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 14,
  },

  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(139,111,58,0.15)',
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
});
