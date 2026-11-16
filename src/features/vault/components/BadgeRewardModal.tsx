/**
 * BadgeRewardModal — displays when a user levels up and earns a badge.
 *
 * Features:
 * - Badge spins into view with gold sparkles floating up from bottom
 * - Shows badge image, name, description, and rewards
 * - Close button to dismiss
 * - Save to vault button to archive the badge
 * - Appears immediately in full-screen modal
 */
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, typography } from '../../../shared/theme';
import { getBadgeById, getBadgeImage } from '../../../constants/badges';
import { SparklesAnimation } from '../../../shared/components/screens/SparklesAnimation';

type BadgeRewardModalProps = {
  visible: boolean;
  badgeId: string | null;
  onDismiss: () => void;
  onSaveToVault: (badgeId: string) => Promise<void>;
  loading?: boolean;
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

export function BadgeRewardModal({
  visible,
  badgeId,
  onDismiss,
  onSaveToVault,
  loading,
}: BadgeRewardModalProps) {
  const [scaleAnim] = React.useState(new Animated.Value(0));
  const [rotateAnim] = React.useState(new Animated.Value(0));
  const [savingTmp, setSavingTmp] = useState(false);
  const [sparklesVisible, setSparklesVisible] = useState(true);

  // Get badge from the badge system
  const badge = badgeId ? getBadgeById(badgeId) : null;
  const badgeImage = badgeId ? getBadgeImage(badgeId) : null;

  React.useEffect(() => {
    if (visible && badge) {
      // Reset animations
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);

      // Spin and scale the badge into view
      Animated.sequence([
        // First, spin while scaling up
        Animated.parallel([
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 40,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        // Then wobble slightly to settle
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.05,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Hide sparkles after animation completes
        setTimeout(() => setSparklesVisible(false), 500);
      });
    }
  }, [visible, badge, scaleAnim, rotateAnim]);

  if (!badge) return null;

  const handleSaveToVault = async () => {
    setSavingTmp(true);
    try {
      await onSaveToVault(badge.id);
      // Show success feedback then close
      setTimeout(() => {
        onDismiss();
      }, 500);
    } catch {
      // The parent already told the user it failed; stay open so they can
      // retry or choose "Later".
    } finally {
      setSavingTmp(false);
    }
  };

  const isLoading = loading || savingTmp;

  // Calculate rotation interpolation
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible && badge != null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* Gold sparkles animation at bottom */}
        {sparklesVisible && (
          <View style={styles.sparklesContainer}>
            <SparklesAnimation
              size={Dimensions.get('window').width}
              autoPlay={true}
              onFinish={() => setSparklesVisible(false)}
            />
          </View>
        )}

        {/* Badge content - spins and scales in */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              transform: [
                { scale: scaleAnim },
                { rotateZ: rotation },
              ],
            },
          ]}
        >
          {/* Close button - top right */}
          <Pressable
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
            onPress={onDismiss}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Close badge"
          >
            <CloseIcon />
          </Pressable>

          {/* Badge image - large and centered */}
          <View style={styles.badgeImageWrapper}>
            {badgeImage ? (
              <Image
                source={badgeImage}
                style={styles.badgeImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderBadge}>
                <Text style={styles.placeholderText}>🏆</Text>
              </View>
            )}
          </View>

          {/* Badge info */}
          <View style={styles.badgeInfo}>
            <Text style={styles.celebration}>🎉 Badge Earned! 🎉</Text>
            <Text style={styles.badgeName}>{badge.name}</Text>
            <Text style={styles.badgeDescription}>{badge.description}</Text>
            
            {/* Metadata */}
            <View style={styles.badgeMetadata}>
              {badge.tier && (
                <Text style={styles.badgeLevel}>
                  Tier {badge.tier}
                </Text>
              )}
              <Text style={styles.badgePoints}>
                +{badge.pointsReward} points
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.dismissButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDismiss}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Dismiss badge"
            >
              {isLoading && <ActivityIndicator color={colors.neutralMuted} size="small" />}
              {!isLoading && <Text style={styles.dismissButtonText}>Later</Text>}
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                isLoading && styles.disabledButton,
              ]}
              onPress={handleSaveToVault}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Save badge to vault"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save to Vault</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sparklesContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    pointerEvents: 'none',
  },

  badgeContainer: {
    width: 260,
    height: 360,
    backgroundColor: colors.surfaceCard,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.gold,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },

  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139,111,58,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  closeButtonPressed: {
    backgroundColor: 'rgba(139,111,58,0.2)',
  },

  badgeImageWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(139,111,58,0.15)',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },

  badgeImage: {
    width: 140,
    height: 140,
  },

  placeholderBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  placeholderText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 48,
  },

  celebration: {
    fontSize: 28,
    marginTop: spacing.md,
  },

  badgeInfo: {
    alignItems: 'center',
    gap: spacing.sm,
  },

  badgeName: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 20,
    textAlign: 'center',
  },

  badgeDescription: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
    textAlign: 'center',
  },

  badgeMetadata: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },

  badgeLevel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  badgePoints: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    letterSpacing: 0.5,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    width: '100%',
  },

  dismissButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dismissButtonText: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 14,
  },

  saveButton: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    ...typography.bodySemiBold,
    color: colors.background,
    fontSize: 14,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  disabledButton: {
    opacity: 0.5,
  },
});
