/**
 * BadgeDisplay — shows a single badge in a grid or list.
 *
 * Used to display earned badges in the Profile, Achievements screen, or anywhere
 * badges need to be shown in a compact format.
 */
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { getBadgeById, getBadgeImage } from '../../constants/badges';

export type BadgeDisplayProps = {
  badgeId: string;
  onPress?: () => void;
  variant?: 'large' | 'medium' | 'small';
  showName?: boolean;
  showLocked?: boolean;
  isLocked?: boolean;
  /** Saved to the vault — shows a small gold marker on the badge. */
  isSaved?: boolean;
};

function PlaceholderBadge() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>?</Text>
    </View>
  );
}

export function BadgeDisplay({
  badgeId,
  onPress,
  variant = 'medium',
  showName = false,
  showLocked = true,
  isLocked = false,
  isSaved = false,
}: BadgeDisplayProps) {
  const badge = getBadgeById(badgeId);
  const badgeImage = getBadgeImage(badgeId);

  if (!badge) {
    return null;
  }

  const sizeMap = {
    large: 120,
    medium: 80,
    small: 60,
  };

  const size = sizeMap[variant];
  // A locked badge can't be in the vault; guard anyway so stale data never
  // shows a "saved" lock.
  const showSaved = isSaved && !isLocked;
  const markerSize = Math.max(18, Math.round(size * 0.3));

  const status = isLocked ? 'locked' : showSaved ? 'earned, saved to vault' : 'earned';
  const a11yLabel = `${badge.name}, ${status}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { width: size + spacing.sm, gap: spacing.xs },
        pressed && styles.pressed,
      ]}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={a11yLabel}
    >
      <View style={{ width: size, height: size }}>
        <View
          style={[
            styles.badgeFrame,
            { width: size, height: size, borderRadius: size / 2 },
            isLocked && styles.lockedFrame,
          ]}
        >
          {badgeImage ? (
            <Image
              source={badgeImage}
              style={[
                styles.badgeImage,
                { width: size - 8, height: size - 8 },
                isLocked && styles.lockedImage,
              ]}
              resizeMode="contain"
            />
          ) : (
            <PlaceholderBadge />
          )}

          {/* Locked overlay */}
          {isLocked && showLocked && (
            <View
              style={[
                styles.lockedOverlay,
                { width: size, height: size, borderRadius: size / 2 },
              ]}
            >
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          )}
        </View>

        {/* Saved-to-vault marker. Sits outside the circular frame (which clips)
            so it can overlap the rim. */}
        {showSaved && (
          <View
            style={[
              styles.savedMarker,
              { width: markerSize, height: markerSize, borderRadius: markerSize / 2 },
            ]}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
          >
            <Text style={[styles.savedMarkerText, { fontSize: markerSize * 0.55 }]}>✓</Text>
          </View>
        )}
      </View>

      {/* Optional name display */}
      {showName && (
        <Text
          style={[
            styles.badgeName,
            variant === 'small' && styles.badgeNameSmall,
            isLocked && styles.lockedText,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
        >
          {badge.name}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  badgeFrame: {
    backgroundColor: 'rgba(139, 111, 58, 0.1)',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  badgeImage: {
    marginHorizontal: 'auto',
    marginVertical: 'auto',
  },

  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  placeholderText: {
    fontSize: 28,
    color: colors.gold,
    fontWeight: 'bold',
  },

  lockedFrame: {
    backgroundColor: 'rgba(139, 111, 58, 0.05)',
    borderColor: colors.neutralMuted,
  },

  lockedImage: {
    opacity: 0.4,
  },

  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  lockIcon: {
    fontSize: 24,
  },

  savedMarker: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },

  savedMarkerText: {
    color: colors.background,
    fontWeight: '700',
  },

  badgeName: {
    ...typography.label,
    color: colors.neutral,
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },

  badgeNameSmall: {
    fontSize: 10,
  },

  lockedText: {
    color: colors.neutralMuted,
  },

  pressed: {
    opacity: 0.7,
  },
});
