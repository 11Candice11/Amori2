/**
 * Shared UI primitives for the Distraction Centre screens — a screen header
 * with a back button, section labels, cards and buttons that match the app's
 * botanical dark theme. Kept local to the feature (the app has no generic
 * Button/Card library).
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { usePressAnimation } from '../../../shared/hooks';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  onBack: () => void;
};

/**
 * Thin wrapper over the shared AppHeader so the distraction screens use the
 * standard centered title + left back button. The old `eyebrow` prop maps to
 * the header subtitle.
 */
export function ScreenHeader({ eyebrow, title, onBack }: ScreenHeaderProps) {
  return <AppHeader title={title} subtitle={eyebrow} onBack={onBack} />;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const { scaleValue, onPressIn, onPressOut } = usePressAnimation();

  return (
    <Animated.View style={[{ transform: [{ scale: scaleValue }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{
          color: isPrimary ? 'rgba(10,20,15,0.2)' : 'rgba(139,111,58,0.12)',
        }}
        style={[
          disabled && styles.btnDisabled,
          style,
        ]}
      >
        <View style={isPrimary ? styles.primaryBtn : styles.secondaryBtn}>
          <Text style={isPrimary ? styles.primaryBtnText : styles.secondaryBtnText}>
            {label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // 3D Beveled border effect
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(139, 111, 58, 1)',
    borderLeftColor: 'rgba(139, 111, 58, 0.9)',
    borderRightColor: 'rgba(107, 86, 44, 1)',
    borderBottomColor: 'rgba(107, 86, 44, 1.2)',
    shadowColor: colors.gold,
    shadowOffset: { width: 2, height: 8 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 12,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // 3D Beveled border effect (lighter for secondary)
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderTopColor: 'rgba(139, 111, 58, 0.8)',
    borderLeftColor: 'rgba(139, 111, 58, 0.7)',
    borderRightColor: 'rgba(107, 86, 44, 0.8)',
    borderBottomColor: 'rgba(107, 86, 44, 1)',
    shadowColor: colors.gold,
    shadowOffset: { width: 1, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { 
    ...typography.bodySemiBold, 
    color: colors.ctaText,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  secondaryBtnText: { 
    ...typography.bodySemiBold, 
    color: colors.neutral,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
    zIndex: 10,
  },
  btnDisabled: { 
    opacity: 0.6,
    shadowOpacity: 0.2,
  },
});
