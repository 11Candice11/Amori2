/**
 * TogetherTabs — the horizontal pill navigation strip at the top of the
 * Together dashboard: Us · Calendar · Date Ideas · Bucket List · Wishlist ·
 * Important Dates.
 *
 * "Us" is the active/anchor tab (the dashboard itself surfaces the Vision Board
 * and the shared collections); the rest are quick jumps. Tabs that have their
 * own screen navigate there; the ones that live inline on the dashboard
 * (Bucket List, Important Dates) scroll the dashboard to their card.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

export type TogetherTabKey =
  | 'us'
  | 'calendar'
  | 'dateIdeas'
  | 'bucketList'
  | 'wishlist'
  | 'importantDates';

type TogetherTab = { key: TogetherTabKey; label: string };

const TABS: TogetherTab[] = [
  { key: 'us', label: 'Us' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'dateIdeas', label: 'Date Ideas' },
  { key: 'bucketList', label: 'Bucket List' },
  { key: 'wishlist', label: 'Wishlist' },
  { key: 'importantDates', label: 'Important Dates' },
];

function StarIcon({ active }: { active: boolean }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"
        fill={active ? colors.ctaText : colors.gold}
      />
    </Svg>
  );
}

type TogetherTabsProps = {
  /** The currently highlighted tab. Defaults to "us" (the dashboard anchor). */
  activeKey?: TogetherTabKey;
  onSelect: (key: TogetherTabKey) => void;
};

export function TogetherTabs({ activeKey = 'us', onSelect }: TogetherTabsProps) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {TABS.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <Pressable
              key={tab.key}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => onSelect(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              {tab.key === 'us' ? (
                <StarIcon active={active} />
              ) : null}
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(20,28,22,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  pillActive: {
    backgroundColor: colors.ctaBackground,
    borderColor: colors.ctaBackground,
  },
  pillText: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.ctaText,
  },
});
