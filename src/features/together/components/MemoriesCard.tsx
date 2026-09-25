/**
 * MemoriesCard — dashboard entry point into the couple's Memories collection
 * and their Relationship Timeline. Memories used to be a bottom-nav tab; it now
 * lives under Together, surfaced here.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { ActionImageIcon } from '../../../shared/components/icons/AppIcons';

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
          <ActionImageIcon name="memories" size={40} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Our Memories</Text>
            <Text style={styles.preview} numberOfLines={2}>
              The moments you never want to forget.
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [styles.timelineBtn, pressed && styles.viewBtnPressed]}
            onPress={onOpenTimeline}
            accessibilityRole="button"
            accessibilityLabel="Open the relationship timeline"
          >
            <Text style={styles.timelineBtnText}>View timeline</Text>
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
  timelineBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  timelineBtnText: {
    ...typography.bodySemiBold,
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
