import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import type { ChatTemplateDefinition } from '../types/chat.types';
import { TEMPLATE_TAGS, TEMPLATE_TITLES } from '../utils/labels';

export const STARTER_CARD_WIDTH = 220;

type Props = {
  template: ChatTemplateDefinition;
  onPress: () => void;
};

/** A swipeable conversation-starter card on the Let's Chat home carousel. */
export function StarterCard({ template, onPress }: Props) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Start: ${template.title}`}
      android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
    >
      <Text style={styles.tag}>{TEMPLATE_TAGS[template.type]}</Text>
      <Text style={styles.title} numberOfLines={2}>
        “{TEMPLATE_TITLES[template.type]}…”
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {template.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: STARTER_CARD_WIDTH,
    minHeight: 130,
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tag: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { ...typography.bodySemiBold, color: colors.neutral, marginVertical: spacing.xs },
  description: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12 },
});
