/**
 * ChapterMilestone — "Perpetual Milestones" card.
 * Shows the current relationship chapter, total days together,
 * progress toward the next milestone, and a partner quote.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function TreeIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l4 6h-3l3 5h-3l3 5H8l3-5H8l3-5H8l4-6z"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path d="M12 18v4" stroke={colors.gold} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

type ChapterMilestoneProps = {
  chapter: number;
  days: number;
  daysToNext: number;
  nextMilestoneName: string;
  /** 0..1 progress toward the next milestone */
  progress: number;
  quote?: string;
};

export function ChapterMilestone({
  chapter,
  days,
  daysToNext,
  nextMilestoneName,
  progress,
  quote,
}: ChapterMilestoneProps) {
  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconLabel}>
          <TreeIcon />
          <View>
            <Text style={styles.sectionLabel}>PERPETUAL MILESTONES</Text>
            <Text style={styles.title}>Chapter {chapter}</Text>
          </View>
        </View>
        <View style={styles.dayCountWrap}>
          <Text style={styles.dayCount}>{days.toLocaleString()}</Text>
          <Text style={styles.dayCountLabel}>days together</Text>
        </View>
      </View>

      {/* Progress toward next milestone */}
      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={styles.nextLabel}>Next: {nextMilestoneName}</Text>
          <Text style={styles.daysToNext}>{daysToNext} days to go</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      {/* Partner quote */}
      {quote ? (
        <View style={styles.quoteBlock}>
          <Text style={styles.quoteMark}>"</Text>
          <Text style={styles.quoteText}>{quote}</Text>
        </View>
      ) : null}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 17,
  },
  dayCountWrap: {
    alignItems: 'flex-end',
  },
  dayCount: {
    ...typography.headline,
    color: colors.gold,
    fontSize: 24,
  },
  dayCountLabel: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 10,
  },
  progressBlock: {
    marginBottom: spacing.md,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nextLabel: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 12,
  },
  daysToNext: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  track: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.gold,
    paddingLeft: spacing.sm,
  },
  quoteMark: {
    ...typography.headline,
    color: colors.gold,
    height: 18,
  },
  quoteText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
