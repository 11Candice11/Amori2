import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import type { ChatTemplateDefinition } from '../types/chat.types';

type Props = {
  template: ChatTemplateDefinition;
  onPress: () => void;
};

/** A conversation-starter card on the Let's Chat home screen. */
export function TemplateCard({ template, onPress }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Start: ${template.title}`}
      android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
    >
      <View style={styles.body}>
        <Text style={styles.title}>{template.title}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {template.description}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  body: { flex: 1, paddingRight: spacing.sm },
  title: { ...typography.bodySemiBold, color: colors.neutral, marginBottom: 4 },
  description: { ...typography.bodySm, color: colors.neutralMuted },
  chevron: { ...typography.headlineSm, color: colors.gold },
});
