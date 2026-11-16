import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import type { ChatConversation } from '../types/chat.types';
import { TEMPLATE_TAGS, relativeTimeAgo, statusLabel } from '../utils/labels';

type Props = {
  conversation: ChatConversation;
  onPress: () => void;
};

/** An active conversation row: avatar, who, template tag, time, preview, status. */
export function ThreadCard({ conversation, onPress }: Props) {
  const name = conversation.isMine ? 'You' : conversation.senderName;
  const preview =
    conversation.composedMessage.trim().length > 0
      ? conversation.composedMessage
      : 'Not written yet…';
  const when = relativeTimeAgo(conversation.sentAt ?? conversation.updatedAt ?? conversation.createdAt);
  const unread = !conversation.isMine && conversation.status !== 'Read';
  return (
    <Pressable
      style={[styles.card, unread && styles.cardUnread]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${TEMPLATE_TAGS[conversation.templateType]}. ${statusLabel(conversation)}`}
      android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.tag}>{TEMPLATE_TAGS[conversation.templateType]}</Text>
          <Text style={styles.time}>{when ?? ''}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>“{preview}”</Text>
        <Text style={styles.status}>{unread ? 'New · ' : ''}{statusLabel(conversation)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.gold },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: { ...typography.bodySemiBold, color: colors.gold },
  body: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.bodySemiBold, color: colors.neutral, flexShrink: 1 },
  tag: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 10,
    textTransform: 'uppercase',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  time: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginLeft: 'auto' },
  preview: { ...typography.body, color: colors.neutral, fontStyle: 'italic', marginTop: 4 },
  status: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11, marginTop: spacing.xs },
});
