import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import type { ChatConversation } from '../types/chat.types';
import { TEMPLATE_TITLES, statusLabel } from '../utils/labels';

type Props = {
  conversation: ChatConversation;
  onPress: () => void;
};

/** A message row in the drafts / history / thread lists. */
export function MessageCard({ conversation, onPress }: Props) {
  const preview =
    conversation.composedMessage.trim().length > 0
      ? conversation.composedMessage
      : 'Not written yet…';

  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
    >
      <View style={styles.headerRow}>
        <Text style={styles.template}>{TEMPLATE_TITLES[conversation.templateType]}</Text>
        <Text style={styles.status}>{statusLabel(conversation)}</Text>
      </View>
      <Text style={styles.preview} numberOfLines={3}>
        “{preview}”
      </Text>
      <Text style={styles.byline}>
        {conversation.isMine ? 'Authored by you' : `From ${conversation.senderName}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  template: { ...typography.bodySemiBold, color: colors.gold, fontSize: 13 },
  status: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },
  preview: { ...typography.body, color: colors.neutral, fontStyle: 'italic' },
  byline: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginTop: spacing.xs },
});
