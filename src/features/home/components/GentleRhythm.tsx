/**
 * GentleRhythm — "Today's Gentle Rhythm" task list section.
 * Shows daily habit/task items with completion states.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

// ─── Icons ───────────────────────────────────────────────────────────────────

function CheckCircle({ done }: { done: boolean }) {
  if (done) {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} fill={colors.rhythmComplete} opacity={0.2} />
        <Circle cx={12} cy={12} r={9} stroke={colors.rhythmComplete} strokeWidth={1.5} />
        <Path
          d="M8 12l3 3 5-5"
          stroke={colors.rhythmComplete}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.border} strokeWidth={1.5} />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.gold}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.neutralMuted} strokeWidth={1.4} />
      <Path
        d="M12 7v5l3 3"
        stroke={colors.neutralMuted}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type RhythmItem = {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  done: boolean;
  ctaLabel?: string;
};

type GentleRhythmProps = {
  items: RhythmItem[];
  completedCount: number;
  totalCount: number;
  onItemCta?: (id: string) => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function GentleRhythm({
  items,
  completedCount,
  totalCount,
  onItemCta,
}: GentleRhythmProps) {
  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.anchorIcon}>⚓</Text>
          <Text style={styles.sectionTitle}>Today's Gentle Anchors</Text>
        </View>
        <Text style={styles.progress}>
          {completedCount} of {totalCount} Done
        </Text>
      </View>

      {/* Items */}
      <View style={styles.list}>
        {items.map((item, index) => (
          <View key={item.id}>
            <View style={styles.item}>
              <CheckCircle done={item.done} />
              <View style={styles.itemContent}>
                <Text style={[styles.itemTitle, item.done && styles.itemTitleDone]}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                ) : null}
              </View>
              {item.ctaLabel ? (
                <Pressable
                  style={styles.ctaChip}
                  onPress={() => onItemCta?.(item.id)}
                  android_ripple={{ color: 'rgba(139,111,58,0.16)' }}
                  accessibilityRole="button"
                  accessibilityLabel={item.ctaLabel}
                >
                  <PlusIcon />
                  <Text style={styles.ctaChipText}>{item.ctaLabel}</Text>
                </Pressable>
              ) : item.time ? (
                <View style={styles.timeChip}>
                  <ClockIcon />
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              ) : item.done ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M5 13l4 4L19 7"
                    stroke={colors.rhythmComplete}
                    strokeWidth={1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              ) : null}
            </View>
            {index < items.length - 1 && <View style={styles.separator} />}
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sunIcon: {
    fontSize: 14,
    color: colors.gold,
  },
  anchorIcon: {
    fontSize: 13,
    color: colors.gold,
  },
  sectionTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
  },
  progress: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 11,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 13,
  },
  itemTitleDone: {
    color: colors.neutralMuted,
    textDecorationLine: 'line-through',
  },
  itemSubtitle: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 1,
  },
  ctaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139,111,58,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ctaChipText: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 11,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
