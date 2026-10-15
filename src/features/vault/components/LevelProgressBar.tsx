/**
 * LevelProgressBar — displays the user's progress toward the next level.
 *
 * Shows:
 * - Current level badge with diamond icon
 * - Progress bar with current/next level info
 * - Points earned in current level vs. total needed for level
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { useUserLevel } from '../../../shared/state/userPointsStore';

function DiamondIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12,2 22,12 12,22 2,12"
        stroke={colors.gold}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LevelProgressBar() {
  const { level, totalPoints, progress } = useUserLevel();
  const { percentage, pointsInCurrentLevel, pointsNeededForLevel } = progress;

  return (
    <View style={styles.container}>
      {/* Level header */}
      <View style={styles.header}>
        <View style={styles.levelBadge}>
          <DiamondIcon />
          <Text style={styles.levelNumber}>{level}</Text>
        </View>
        <View style={styles.levelInfo}>
          <Text style={styles.levelLabel}>Level {level}</Text>
          <Text style={styles.totalPoints}>{totalPoints} total points</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Progress to Level {level + 1}</Text>
        
        {/* Bar background */}
        <View style={styles.barBackground}>
          {/* Filled portion */}
          <View
            style={[
              styles.barFill,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        {/* Points display */}
        <View style={styles.pointsRow}>
          <Text style={styles.pointsText}>
            {pointsInCurrentLevel} / {pointsNeededForLevel} pts
          </Text>
          <Text style={styles.percentageText}>{percentage}%</Text>
        </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  levelBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139,111,58,0.15)',
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },

  levelNumber: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 20,
    fontWeight: '700',
  },

  levelInfo: {
    flex: 1,
    gap: 2,
  },

  levelLabel: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
  },

  totalPoints: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },

  progressSection: {
    gap: spacing.sm,
  },

  progressLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  barBackground: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(139,111,58,0.15)',
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.gold,
  },

  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  pointsText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },

  percentageText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 12,
  },
});
