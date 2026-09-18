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
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

export function BackIcon({ color = colors.neutral }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  onBack: () => void;
};

export function ScreenHeader({ eyebrow, title, onBack }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backBtn}
        onPress={onBack}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
      >
        <BackIcon />
      </Pressable>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
    </View>
  );
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
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      android_ripple={{
        color: isPrimary ? 'rgba(10,20,15,0.2)' : 'rgba(197,163,101,0.12)',
      }}
      style={[
        isPrimary ? styles.primaryBtn : styles.secondaryBtn,
        disabled && styles.btnDisabled,
        style,
      ]}
    >
      <Text style={isPrimary ? styles.primaryBtnText : styles.secondaryBtnText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  eyebrow: { ...typography.label, color: colors.gold, fontSize: 10 },
  headerTitle: { ...typography.headlineSm, color: colors.neutral },
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
  },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
  secondaryBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { ...typography.bodySemiBold, color: colors.neutral },
  btnDisabled: { opacity: 0.5 },
});
