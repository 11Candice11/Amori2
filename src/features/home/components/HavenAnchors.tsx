/**
 * HavenAnchors — 2×2 quick-action grid.
 *
 * Uses onLayout to measure the real container width, then gives each card
 * exactly (containerWidth - gap) / 2. This is the only reliable way to get
 * equal-width columns with a gap on Android — percentage widths don't account
 * for gaps and flexWrap miscalculates item sizes.
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

const COLUMN_GAP = 10;

// ─── Icons ───────────────────────────────────────────────────────────────────

function SplittingIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3a4 4 0 100 8 4 4 0 000-8z" stroke={colors.gold} strokeWidth={1.4} />
      <Path
        d="M4 21c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M9 9l-2 2 2 2M15 9l2 2-2 2"
        stroke="#B06060"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function DistractionIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8h16M4 12h8M4 16h6"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Rect x={2} y={4} width={20} height={16} rx={3} stroke={colors.gold} strokeWidth={1.4} />
    </Svg>
  );
}

function HugIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 018.5-2.12A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LogIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={3} stroke={colors.gold} strokeWidth={1.4} />
      <Path
        d="M7 8h10M7 12h6M7 16h4"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M16 16l2-2-2-2"
        stroke="#B06060"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Anchor item ─────────────────────────────────────────────────────────────

type AnchorItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  cardWidth: number;
};

function AnchorItem({ icon, title, subtitle, onPress, cardWidth }: AnchorItemProps) {
  return (
    <Pressable
      style={[styles.item, { width: cardWidth }]}
      onPress={onPress}
      android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.itemIcon}>{icon}</View>
      <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? (
        <Text style={styles.itemSubtitle} numberOfLines={3}>{subtitle}</Text>
      ) : null}
    </Pressable>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type HavenAnchorsProps = {
  onSplitting?: () => void;
  onDistraction?: () => void;
  onHug?: () => void;
  onLogIncident?: () => void;
};

export function HavenAnchors({
  onSplitting,
  onDistraction,
  onHug,
  onLogIncident,
}: HavenAnchorsProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  // Each card = half the container minus half the gap
  const cardWidth = containerWidth > 0
    ? (containerWidth - COLUMN_GAP) / 2
    : 0;

  return (
    <View style={styles.root}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>GROUNDING & SHARED TOUCH</Text>
        <Text style={styles.sectionAction}>Instant Channels</Text>
      </View>

      {/* Grid — measure width here, render rows below */}
      <View style={styles.grid} onLayout={handleLayout}>
        {containerWidth > 0 && (
          <>
            {/* Row 1 */}
            <View style={styles.row}>
              <AnchorItem
                icon={<SplittingIcon />}
                title="I'm splitting"
                subtitle="Grounding sanctuary · Anti-panic reach"
                onPress={onSplitting}
                cardWidth={cardWidth}
              />
              <AnchorItem
                icon={<DistractionIcon />}
                title="Distraction"
                subtitle="Invia, 2048 & mindful games"
                onPress={onDistraction}
                cardWidth={cardWidth}
              />
            </View>

            {/* Row 2 */}
            <View style={styles.row}>
              <AnchorItem
                icon={<HugIcon />}
                title="Send a hug"
                subtitle="Real-time haptic pulse buzz"
                onPress={onHug}
                cardWidth={cardWidth}
              />
              <AnchorItem
                icon={<LogIcon />}
                title="Log Incident"
                subtitle="Document trigger & resolution ticket"
                onPress={onLogIncident}
                cardWidth={cardWidth}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
  },
  sectionAction: {
    ...typography.bodySm,
    color: colors.gold,
  },
  grid: {
    // Full width — onLayout reads this
  },
  row: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
    marginBottom: COLUMN_GAP,
  },
  item: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 108,
    justifyContent: 'flex-end',
  },
  itemIcon: {
    marginBottom: spacing.sm,
  },
  itemTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 15,
  },
  itemSubtitle: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 2,
  },
});
