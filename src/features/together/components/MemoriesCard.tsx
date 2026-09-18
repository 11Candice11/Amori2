/**
 * MemoriesCard — dashboard entry point into the couple's Memories collection
 * and their Relationship Timeline. Memories used to be a bottom-nav tab; it now
 * lives under Together, surfaced here.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function CameraIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8.5A1.5 1.5 0 015.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0120 8.5v9A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-9z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12.5} r={3} stroke={colors.gold} strokeWidth={1.5} />
    </Svg>
  );
}

type MemoriesCardProps = {
  onOpenMemories?: () => void;
  onOpenTimeline?: () => void;
};

export function MemoriesCard({ onOpenMemories, onOpenTimeline }: MemoriesCardProps) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Memories</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onOpenMemories}
        android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Open our memories"
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <CameraIcon />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Our Memories</Text>
            <Text style={styles.preview} numberOfLines={2}>
              The moments you never want to forget.
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            onPress={onOpenTimeline}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open the relationship timeline"
          >
            <Text style={styles.timelineLink}>View timeline →</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
            onPress={onOpenMemories}
            accessibilityRole="button"
            accessibilityLabel="View memories"
          >
            <Text style={styles.viewBtnText}>View memories</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 18,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
    backgroundColor: 'rgba(197,163,101,0.08)',
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  preview: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  timelineLink: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 13,
  },
  viewBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  viewBtnPressed: {
    opacity: 0.7,
  },
  viewBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 13,
  },
});
