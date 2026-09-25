/**
 * TimelineEventDetailModal — a "flip to reveal" detail popup for a single
 * milestone, mirroring the memories MemoryDetailModal.
 *
 * A thin wrapper over the shared FlipRevealModal: the front face is a compact
 * preview of the tapped timeline card, the back is the full milestone (photos,
 * note, location, actions). All the spin/flip lifecycle lives in
 * FlipRevealModal so it stays consistent with the memories reveal — and so
 * reopening the same milestone always re-runs the animation and `onClose` fires
 * only after the card has spun away.
 */
import React from 'react';
import { Animated, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography, layout } from '../../../shared/theme';
import {
  FlipRevealModal,
  type FlipFace,
} from '../../../shared/components/overlays/FlipRevealModal';
import { PhotoCarousel } from '../../memories/components/PhotoCarousel';
import { openInMaps } from '../../../services/geocoding/openInMaps';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TimelineEventResponse } from '../../../services/api/types';
import { TIMELINE_EVENT_EMOJI, TIMELINE_EVENT_LABELS } from '../types/timeline.types';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 360);
const CARD_HEIGHT = Math.min(Math.round(CARD_WIDTH * 1.5), SCREEN_HEIGHT - 120);

/** "12 August 2026" from a "YYYY-MM-DD" event date. */
function formatEventDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Loadable photo URLs for a milestone (skips entries without a resolved URL). */
function photoUrls(e: TimelineEventResponse): string[] {
  return e.photos.filter((p) => !!p.url).map((p) => resolveMediaUrl(p.url));
}

export type TimelineEventDetailModalProps = {
  visible: boolean;
  /** The milestone to show. Kept mounted through the closing spin. */
  event: TimelineEventResponse | null;
  /**
   * Whether the current user may edit or delete this milestone. Only the person
   * who created it can, so the Edit/Delete controls are hidden otherwise.
   */
  canModify: boolean;
  onClose: () => void;
  /** Open the edit flow for this milestone. */
  onEdit: (event: TimelineEventResponse) => void;
  /** Delete this milestone (parent handles confirmation + API call). */
  onDelete: (event: TimelineEventResponse) => void;
};

export function TimelineEventDetailModal({
  visible,
  event,
  canModify,
  onClose,
  onEdit,
  onDelete,
}: TimelineEventDetailModalProps) {
  if (!event) return null;

  const typeLabel = TIMELINE_EVENT_LABELS[event.eventType];
  const emoji = TIMELINE_EVENT_EMOJI[event.eventType];
  const photos = photoUrls(event);
  const hasCoords = event.latitude != null && event.longitude != null;

  return (
    <FlipRevealModal
      visible={visible}
      onClose={onClose}
      cardWidth={CARD_WIDTH}
      cardHeight={CARD_HEIGHT}
      tapOutsideToClose
      front={({ cardStyle, animatedStyle }: FlipFace) => (
        <Animated.View
          style={[cardStyle, styles.cardFront, animatedStyle]}
          pointerEvents="none"
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {emoji} {typeLabel}
            </Text>
          </View>
          <Text style={styles.frontTitle} numberOfLines={3}>
            {event.title}
          </Text>
          <Text style={styles.frontDate}>{formatEventDate(event.eventDate)}</Text>
        </Animated.View>
      )}
      back={({ cardStyle, animatedStyle }: FlipFace, close) => (
        <Animated.View style={[cardStyle, styles.cardBack, animatedStyle]}>
          {/* Top actions: Edit (creator only) + close. */}
          <View style={[styles.topActions, !canModify && styles.topActionsEnd]}>
            {canModify ? (
              <Pressable
                style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}
                onPress={() => onEdit(event)}
                accessibilityRole="button"
                accessibilityLabel="Edit this milestone"
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
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {emoji} {typeLabel}
                </Text>
              </View>
              <Text style={styles.date}>{formatEventDate(event.eventDate)}</Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.title}>{event.title}</Text>
            </View>

            {photos.length > 0 ? (
              <View style={styles.carouselWrap}>
                <PhotoCarousel uris={photos} height={220} />
              </View>
            ) : null}

            {event.description ? (
              <Text style={styles.description}>{event.description}</Text>
            ) : null}

            {event.location ? (
              hasCoords ? (
                <Pressable
                  style={styles.metaRow}
                  onPress={() =>
                    openInMaps(
                      event.latitude as number,
                      event.longitude as number,
                      event.location ?? event.title,
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${event.location} in Maps`}
                >
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={[styles.metaValue, styles.metaLink]}>{event.location}</Text>
                </Pressable>
              ) : (
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Location</Text>
                  <Text style={styles.metaValue}>{event.location}</Text>
                </View>
              )
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Added by</Text>
              <Text style={styles.metaValue}>{event.createdByName}</Text>
            </View>

            {/* Delete lives at the bottom — only the creator can remove it. */}
            {canModify ? (
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
                onPress={() => onDelete(event)}
                accessibilityRole="button"
                accessibilityLabel="Delete this milestone"
              >
                <Text style={styles.deleteBtnText}>Delete milestone</Text>
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
  badgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
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
  carouselWrap: {
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
