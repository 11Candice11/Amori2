/**
 * MemoryDetailModal — a "flip to reveal" detail popup for a single memory.
 *
 * A thin wrapper over the shared FlipRevealModal: the front face is a compact
 * preview of the tapped card, the back is the full memory (photos, note,
 * location, tags, actions). All the spin/flip lifecycle lives in
 * FlipRevealModal so it stays consistent with the daily-gift reveal — and so
 * reopening the same memory always re-runs the animation and `onClose` fires
 * only after the card has spun away.
 */
import React from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography, layout } from '../../../shared/theme';
import {
  FlipRevealModal,
  type FlipFace,
} from '../../../shared/components/overlays/FlipRevealModal';
import { MemoryMediaView } from './MemoryMediaView';
import { openInMaps } from '../../../services/geocoding/openInMaps';
import { formatMemoryDate } from '../utils/formatMemoryDateTime';
import {
  MEMORY_CATEGORY_DISPLAY,
  decodeMemoryCategory,
  type MemoryResponse,
} from '../types/memory.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 360);
const CARD_HEIGHT = Math.min(Math.round(CARD_WIDTH * 1.5), SCREEN_HEIGHT - 120);

export type MemoryDetailModalProps = {
  visible: boolean;
  /** The memory to show. Kept mounted through the closing spin. */
  memory: MemoryResponse | null;
  /**
   * Whether the current user may edit or delete this memory. Only the person
   * who created it can, so the Edit/Delete controls are hidden otherwise.
   */
  canModify: boolean;
  onClose: () => void;
  /** Open the edit flow for this memory. */
  onEdit: (memory: MemoryResponse) => void;
  /** Delete this memory (parent handles confirmation + API call). */
  onDelete: (memory: MemoryResponse) => void;
};

export function MemoryDetailModal({
  visible,
  memory,
  canModify,
  onClose,
  onEdit,
  onDelete,
}: MemoryDetailModalProps) {
  if (!memory) return null;

  const category = decodeMemoryCategory(memory.category);
  const categoryLabel = MEMORY_CATEGORY_DISPLAY[category];
  const isMilestone = category === 'Milestone';
  const hasCoords = memory.latitude != null && memory.longitude != null;

  return (
    <FlipRevealModal
      visible={visible}
      onClose={onClose}
      cardWidth={CARD_WIDTH}
      cardHeight={CARD_HEIGHT}
      tapOutsideToClose
      front={({ cardStyle, animatedStyle }: FlipFace) => (
        <Animated.View
          style={[cardStyle, styles.cardFront, isMilestone && styles.cardMilestone, animatedStyle]}
          pointerEvents="none"
        >
          <View style={[styles.badge, isMilestone && styles.badgeMilestone]}>
            <Text style={[styles.badgeText, isMilestone && styles.badgeTextMilestone]}>
              {categoryLabel}
            </Text>
          </View>
          <Text style={styles.frontTitle} numberOfLines={3}>
            {memory.title}
          </Text>
          <Text style={styles.frontDate}>{formatMemoryDate(memory.memoryDateTime)}</Text>
        </Animated.View>
      )}
      back={({ cardStyle, animatedStyle }: FlipFace, close) => (
        <Animated.View
          style={[cardStyle, styles.cardBack, isMilestone && styles.cardMilestone, animatedStyle]}
        >
          {/* Top actions: Edit (creator only) + close. */}
          <View style={[styles.topActions, !canModify && styles.topActionsEnd]}>
            {canModify ? (
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={() => onEdit(memory)}
                accessibilityRole="button"
                accessibilityLabel="Edit this memory"
                hitSlop={8}
              >
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <Text style={styles.closeBtnText}>×</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.backContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerRow}>
              <View style={[styles.badge, isMilestone && styles.badgeMilestone]}>
                <Text style={[styles.badgeText, isMilestone && styles.badgeTextMilestone]}>
                  {categoryLabel}
                </Text>
              </View>
              <Text style={styles.date}>{formatMemoryDate(memory.memoryDateTime)}</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.title}>{memory.title}</Text>
              {memory.isFavorite ? <Text style={styles.star}>♥</Text> : null}
            </View>

            {/* Photos, location map, voice note, and links — the full keepsake. */}
            <View style={styles.mediaWrap}>
              <MemoryMediaView
                media={memory.media}
                latitude={memory.latitude}
                longitude={memory.longitude}
                locationLabel={memory.location ?? memory.title}
                photoHeight={220}
              />
            </View>

            {memory.description ? (
              <Text style={styles.description}>{memory.description}</Text>
            ) : null}

            {/* A text location row remains for the address, even when a map shows
                above — it doubles as the tappable "open in Maps" affordance when
                there are no coordinates for the map. */}
            {memory.location ? (
              hasCoords ? (
                <Pressable
                  style={styles.metaRow}
                  onPress={() =>
                    openInMaps(
                      memory.latitude as number,
                      memory.longitude as number,
                      memory.location ?? memory.title,
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${memory.location} in Maps`}
                >
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={[styles.metaValue, styles.metaLink]}>{memory.location}</Text>
                </Pressable>
              ) : (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={styles.metaValue}>{memory.location}</Text>
                </View>
              )
            ) : null}

            {memory.tags.length > 0 ? (
              <View style={styles.tagRow}>
                {memory.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Added by</Text>
              <Text style={styles.metaValue}>{memory.createdByName}</Text>
            </View>

            {/* Delete lives at the bottom — only the creator can remove it. */}
            {canModify ? (
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                onPress={() => onDelete(memory)}
                accessibilityRole="button"
                accessibilityLabel="Delete this memory"
              >
                <Text style={styles.deleteBtnText}>Delete memory</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  cardFront: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardBack: {
    paddingTop: spacing.sm,
  },
  cardMilestone: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.06)',
  },

  // Front face
  frontTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
  },
  frontDate: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },

  // Top actions bar
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  topActionsEnd: {
    justifyContent: 'flex-end',
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.12)',
  },
  editBtnText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeBtnText: {
    color: colors.neutral,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '600',
  },

  // Back content
  backContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.28)',
  },
  badgeMilestone: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  badgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
  },
  badgeTextMilestone: {
    color: colors.background,
  },
  date: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    flexShrink: 1,
  },
  star: {
    color: colors.gold,
    fontSize: 18,
  },
  mediaWrap: {
    marginTop: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  metaLabel: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaValue: {
    ...typography.bodySm,
    color: colors.neutral,
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
  },
  metaLink: {
    color: colors.gold,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  tagText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  deleteBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.emergency,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  deleteBtnText: {
    ...typography.bodySemiBold,
    color: colors.emergency,
    fontSize: 15,
  },
});
