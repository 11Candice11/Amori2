/**
 * BadgeDetailsModal — shows detailed information about a badge.
 *
 * Displays:
 * - Badge image
 * - Name, description
 * - Category, tier, points
 * - Unlock criteria
 * - Hidden badge indicator
 */
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../theme';
import { getBadgeById, getBadgeImage, isBadgeUnlocked } from '../../constants/badges';
import type { Badge } from '../../constants/badges';

type BadgeDetailsModalProps = {
  visible: boolean;
  badgeId: string | null;
  onDismiss: () => void;
  isUnlocked?: boolean;
  userStats?: Record<string, number>;
};

function CloseIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={colors.neutral}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BadgeDetailsModal({
  visible,
  badgeId,
  onDismiss,
  isUnlocked: isUnlockedProp,
  userStats = {},
}: BadgeDetailsModalProps) {
  const badge = badgeId ? getBadgeById(badgeId) : null;
  const badgeImage = badgeId ? getBadgeImage(badgeId) : null;

  // Determine if unlocked from prop or by computing from userStats
  const isUnlocked = isUnlockedProp ?? (badge ? isBadgeUnlocked(badge, userStats) : false);

  if (!badge) return null;

  const getCriteriaText = () => {
    const { type, threshold } = badge.unlockCriteria;

    const criteriaMap: Record<string, string> = {
      hugs_sent: `Send ${threshold} hug${threshold !== 1 ? 's' : ''}`,
      checkins_completed: `Complete ${threshold} check-in${threshold !== 1 ? 's' : ''}`,
      checkin_streak: `${threshold}-day check-in streak`,
      morning_checkins: `${threshold} morning check-in${threshold !== 1 ? 's' : ''}`,
      evening_checkins: `${threshold} evening check-in${threshold !== 1 ? 's' : ''}`,
      memories_created: `Create ${threshold} memor${threshold !== 1 ? 'ies' : 'y'}`,
      memories_saved_to_vault: `Save ${threshold} memor${threshold !== 1 ? 'ies' : 'y'} to vault`,
      messages_sent: `Send ${threshold} message${threshold !== 1 ? 's' : ''}`,
      timeline_events_added: `Add ${threshold} timeline event${threshold !== 1 ? 's' : ''}`,
      vision_board_items_added: `Add ${threshold} vision board item${threshold !== 1 ? 's' : ''}`,
      bucket_list_items_added: `Add ${threshold} bucket list item${threshold !== 1 ? 's' : ''}`,
      games_played: `Play ${threshold} game${threshold !== 1 ? 's' : ''}`,
      quizzes_completed: `Complete ${threshold} quiz${threshold !== 1 ? 'zes' : 'z'}`,
      mood_logged: `Log mood ${threshold} time${threshold !== 1 ? 's' : ''}`,
      media_attachments: `Attach ${threshold} media item${threshold !== 1 ? 's' : ''}`,
      level_reached: `Reach level ${threshold}`,
      custom: 'Special achievement',
    };

    return criteriaMap[type] || `Unlock criteria: ${type}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Close button */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <CloseIcon />
          </Pressable>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Badge image */}
            <View style={styles.badgeImageContainer}>
              {badgeImage ? (
                <Image
                  source={badgeImage}
                  style={styles.badgeImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}

              {/* Locked overlay if not unlocked */}
              {!isUnlocked && (
                <View style={styles.lockedBadgeOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                </View>
              )}
            </View>

            {/* Badge info */}
            <Text style={styles.badgeName}>{badge.name}</Text>

            {badge.hidden && (
              <View style={styles.hiddenBadgeTag}>
                <Text style={styles.hiddenBadgeText}>✨ Hidden Achievement</Text>
              </View>
            )}

            <Text style={styles.badgeDescription}>{badge.description}</Text>

            {/* Badge metadata */}
            <View style={styles.metadata}>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Category</Text>
                <Text style={styles.metadataValue}>
                  {badge.category.charAt(0).toUpperCase() + badge.category.slice(1).replace(/_/g, ' ')}
                </Text>
              </View>

              {badge.tier && (
                <View style={styles.metadataRow}>
                  <Text style={styles.metadataLabel}>Tier</Text>
                  <Text style={styles.metadataValue}>
                    {badge.tier === 1 ? 'Bronze' : badge.tier === 2 ? 'Silver' : badge.tier === 3 ? 'Gold' : `Tier ${badge.tier}`}
                  </Text>
                </View>
              )}

              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Points</Text>
                <Text style={styles.metadataValue}>{badge.pointsReward}</Text>
              </View>

              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Status</Text>
                <Text style={[styles.metadataValue, !isUnlocked && styles.lockedText]}>
                  {isUnlocked ? '✓ Unlocked' : '🔒 Locked'}
                </Text>
              </View>
            </View>

            {/* Unlock criteria */}
            {!isUnlocked && (
              <View style={styles.criteriaSection}>
                <Text style={styles.criteriaTitle}>How to Unlock</Text>
                <View style={styles.criteriaBox}>
                  <Text style={styles.criteriaText}>{getCriteriaText()}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Close button at bottom */}
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={onDismiss}
          >
            <Text style={styles.actionButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  modal: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    paddingBottom: spacing.lg,
  },

  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 111, 58, 0.1)',
  },

  closeButtonPressed: {
    opacity: 0.7,
  },

  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },

  badgeImageContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139, 111, 58, 0.1)',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },

  badgeImage: {
    width: 140,
    height: 140,
  },

  placeholderImage: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  placeholderText: {
    fontSize: 40,
    color: colors.gold,
    fontWeight: 'bold',
  },

  lockedBadgeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockIcon: {
    fontSize: 40,
  },

  badgeName: {
    ...typography.headlineMd,
    color: colors.neutral,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  hiddenBadgeTag: {
    backgroundColor: 'rgba(139, 111, 58, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  hiddenBadgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
  },

  badgeDescription: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  metadata: {
    backgroundColor: 'rgba(139, 111, 58, 0.08)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },

  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  metadataLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
  },

  metadataValue: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
  },

  lockedText: {
    color: colors.emergency,
  },

  criteriaSection: {
    marginBottom: spacing.lg,
  },

  criteriaTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    marginBottom: spacing.sm,
  },

  criteriaBox: {
    backgroundColor: 'rgba(139, 111, 58, 0.12)',
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },

  criteriaText: {
    ...typography.body,
    color: colors.neutral,
  },

  actionButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.gold,
    borderRadius: 12,
    alignItems: 'center',
  },

  actionButtonPressed: {
    opacity: 0.8,
  },

  actionButtonText: {
    ...typography.bodySemiBold,
    color: colors.background,
    fontSize: 16,
  },
});
