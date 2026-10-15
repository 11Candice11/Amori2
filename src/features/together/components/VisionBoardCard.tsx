/**
 * VisionBoardCard — dashboard entry point into the couple's shared "Us" Vision
 * Board: everything they're building, dreaming and becoming together. Distinct
 * from Memories (things that happened) and the Bucket List (actionable items).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';

type VisionBoardCardProps = {
  onOpen?: () => void;
};

export function VisionBoardCard({ onOpen }: VisionBoardCardProps) {
  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Us</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={onOpen}
        android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
        accessibilityRole="button"
        accessibilityLabel="Open our Vision Board"
      >
        <View style={styles.cardHeader}>
          <View style={styles.glyphWrap}>
            <Text style={styles.glyph}>✦</Text>
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Our Vision</Text>
            <Text style={styles.preview} numberOfLines={2}>
              Everything you're building, dreaming and becoming together.
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Pressable
            style={({ pressed }) => [styles.viewBtn, pressed && styles.viewBtnPressed]}
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel="Open our Vision Board"
          >
            <Text style={styles.viewBtnText}>Open our vision</Text>
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
  glyphWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,111,58,0.14)',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  glyph: {
    color: colors.gold,
    fontSize: 20,
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
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  viewBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    // 3D beveled border
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139,111,58,1)',
    borderLeftColor: 'rgba(139,111,58,0.9)',
    borderRightColor: 'rgba(107,86,44,1)',
    borderBottomColor: 'rgba(107,86,44,1.2)',
    shadowColor: 'rgba(139,111,58,0.8)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
