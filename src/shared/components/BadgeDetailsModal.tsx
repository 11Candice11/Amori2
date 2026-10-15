/**
 * BadgeDetailsModal — shows detailed information about a badge.
 *
 * Displays:
 * - Badge image
 * - Name, description
 * - Progress towards the badge's goal (e.g. 5 / 10 hugs sent)
 * - Category, tier, points
 * - Unlock criteria
 * - Hidden badge indicator
 */
import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../theme';
import {
  getBadgeById,
  getBadgeImage,
  getBadgeProgress,
  getCriteriaUnitLabel,
  getUnlockCriteriaText,
  isBadgeUnlocked,
} from '../../constants/badges';
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

  // "5 / 10 hugs sent" — hidden entirely when the criteria isn't measured yet.
  const progress = getBadgeProgress(badge, userStats);
  const unitLabel = getCriteriaUnitLabel(badge.unlockCriteria.type);
  const progressCountText =
    `${progress.current} / ${progress.target}${unitLabel ? ` ${unitLabel}` : ''}`;

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

            {/* Progress towards the badge, e.g. 5 / 10 hugs sent */}
            {progress.isTracked && (
              <View
                style={styles.progressSection}
                accessibilityRole="progressbar"
                accessibilityLabel={`${badge.name} progress`}
                accessibilityValue={{
                  min: 0,
                  max: progress.target,
                  now: progress.current,
                  text: progressCountText,
                }}
              >
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>
                    {progress.isComplete ? 'Complete' : 'Progress'}
                  </Text>
                  <Text style={styles.progressPercent}>{progress.percentage}%</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progress.percentage}%` }]} />
                </View>

                <Text style={styles.progressCount}>{progressCountText}</Text>
              </View>
            )}

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
                  <Text style={styles.criteriaText}>{getUnlockCriteriaText(badge)}</Text>
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
    // headlineMd doesn't exist in the scale, so this spread was silently
    // dropping the title's serif font altogether.
    ...typography.headlineSm,
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

  progressSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  progressPercent: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 12,
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.goldTint15,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.gold,
  },

  progressCount: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
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
