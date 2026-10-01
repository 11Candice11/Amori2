/**
 * EmptyState — centered placeholder for empty lists, errors, and
 * not-yet-populated sections. Optionally renders a call-to-action button.
 *
 * Promoted from features/incidents/components/EmptyState.tsx to shared so
 * every feature can use the same component instead of rolling its own
 * View + Text empty-state pattern.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

type Props = {
  icon?: string;
  title: string;
  message?: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export function EmptyState({ icon, title, message, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.root}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {ctaLabel && onCta ? (
        <Pressable
          style={styles.cta}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.ctaBackground,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
});
