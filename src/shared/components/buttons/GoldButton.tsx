/**
 * RubyDiamondButton — gem-like button with ruby/diamond appearance.
 *
 * A reusable button component that provides:
 * - Gem-like faceted appearance with deep brownish gold color
 * - Multi-layered shadow effects for depth
 * - Press animations that simulate gemstone refraction
 * - Consistent styling across the app
 */
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, ActivityIndicator, Image, ImageBackground } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export type GoldButtonProps = {
  /** Button text */
  title: string;
  /** Press handler */
  onPress?: () => void;
  /** Loading state - shows spinner instead of text */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon to show before the text */
  icon?: React.ReactNode;
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Additional styles for the button container */
  style?: any;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Full width button */
  fullWidth?: boolean;
};

export function RubyDiamondButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  accessibilityLabel,
  style,
  size = 'medium',
  fullWidth = false,
}: GoldButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
        speed: 20,
        bounciness: 0,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0.4,
        duration: 100,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const sizeStyles = {
    small: styles.buttonSmall,
    medium: styles.buttonMedium,
    large: styles.buttonLarge,
  };

  const textSizeStyles = {
    small: styles.buttonTextSmall,
    medium: styles.buttonTextMedium,
    large: styles.buttonTextLarge,
  };

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      style={fullWidth ? styles.fullWidth : undefined}
    >
      <Animated.View
        style={[
          fullWidth && styles.fullWidth,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={[
          styles.buttonContainer,
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          disabled && styles.buttonDisabled,
        ]}>
          <View style={styles.button}>
            {loading ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <View style={styles.content}>
                {icon ? <View style={styles.icon}>{icon}</View> : null}
                <Text style={[styles.buttonText, textSizeStyles[size], disabled && styles.buttonTextDisabled]}>
                  {title}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  buttonContainer: {
    position: 'relative',
    shadowColor: '#8B6F3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    // 3D Beveled border effect
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139, 111, 58, 1)',
    borderLeftColor: 'rgba(139, 111, 58, 0.9)',
    borderRightColor: 'rgba(107, 86, 44, 1)',
    borderBottomColor: 'rgba(107, 86, 44, 1.2)',
    // Enhanced 3D shadow
    shadowColor: colors.gold,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 15,
    elevation: 12,
  },
  buttonSmall: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  buttonMedium: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  buttonLarge: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 2,
  },
  icon: {
    marginRight: -spacing.xs,
  },
  buttonText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 2,
  },
  buttonTextSmall: {
    fontSize: 13,
  },
  buttonTextMedium: {
    fontSize: 14,
  },
  buttonTextLarge: {
    fontSize: 16,
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },
});
