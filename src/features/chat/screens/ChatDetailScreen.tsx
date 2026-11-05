import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showError, showSuccess } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { hugService } from '../../hugs/services/hugService';
import { chatService } from '../services/chatService';
import { CHAT_RESPONSE_SHORTCUTS, type ChatConversation } from '../types/chat.types';
import { TEMPLATE_TITLES, relativeTimeAgo, resolvedByLabel } from '../utils/labels';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatDetail'>;
type Route = NativeStackScreenProps<ChatStackParamList, 'ChatDetail'>['route'];

/**
 * One chat, whether you sent it or your partner did. Shows the sender, template
 * type, the composed message and a timestamp; a received message is marked read
 * on open.
 *
 * While the chat is open, both partners get a Resolve button, which asks for a
 * resolution and closes the chat. A message from your partner also offers the
 * optional acknowledgment shortcuts, Reply and Send hug (the partner's message
 * is never auto-interpreted). A resolved chat is read-only and shows how it was
 * resolved.
 */
export function ChatDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId } = route.params;

  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingHug, setSendingHug] = useState(false);
  const [acknowledged, setAcknowledged] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const c = await chatService.getConversation(conversationId);
        if (cancelled) return;
        setConversation(c);
        // Mark read on open (recipient only; no-op/ignored otherwise).
        if (!c.isMine && !c.readAt) {
          chatService.markRead(conversationId).catch(() => {
            /* non-fatal — the message is still readable */
          });
        }
      } catch {
        if (!cancelled) showError('Could not load this message.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  const handleShortcut = useCallback((label: string) => {
    // Convenience acknowledgment — a light, local confirmation. Not a required
    // response, and deliberately not auto-interpreting the partner's message.
    setAcknowledged(label);
    showSuccess(`“${label}” shared.`);
  }, []);

  const handleSendHug = useCallback(async () => {
    if (sendingHug) return;
    setSendingHug(true);
    try {
      await hugService.sendHug(null);
      showSuccessOverlay('Hug sent \u2764');
    } catch {
      showErrorOverlay("Couldn't send a hug");
    } finally {
      setSendingHug(false);
    }
  }, [sendingHug]);

  const handleReply = useCallback(() => {
    // Reply in your own words — start a fresh guided free-form message.
    navigation.navigate('ChatCompose', { templateType: 'SomethingOnMyMind' });
  }, [navigation]);

  const handleResolve = useCallback(() => {
    navigation.navigate('ChatResolve', { conversationId });
  }, [navigation, conversationId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Chat" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Chat" onBack={() => navigation.goBack()} />
        <Text style={styles.error}>This message isn't available.</Text>
      </SafeAreaView>
    );
  }

  const { isMine, isResolved } = conversation;
  const ago = relativeTimeAgo(conversation.sentAt ?? conversation.createdAt);
  const resolvedAgo = relativeTimeAgo(conversation.resolvedAt);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={isMine ? 'Your message' : 'A message for you'}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          {isResolved
            ? "This chat is closed. Here's how it was resolved."
            : isMine
              ? "You put these words together. Resolve the chat once you've talked it through."
              : `${conversation.senderName} took time to put these words together. Read at your own pace.`}
        </Text>

        <View style={styles.messageCard}>
          <View style={styles.metaRow}>
            <Text style={styles.template}>{TEMPLATE_TITLES[conversation.templateType]}</Text>
            {ago ? <Text style={styles.time}>{ago}</Text> : null}
          </View>
          <Text style={styles.sender}>{isMine ? 'You' : conversation.senderName}</Text>
          <Text style={styles.message}>“{conversation.composedMessage}”</Text>
        </View>

        {isResolved ? (
          <View style={styles.resolutionCard} accessibilityLabel="Resolution">
            <View style={styles.metaRow}>
              <Text style={styles.resolutionTitle}>Resolved</Text>
              {resolvedAgo ? <Text style={styles.time}>{resolvedAgo}</Text> : null}
            </View>
            <Text style={styles.resolvedBy}>Resolved by {resolvedByLabel(conversation)}</Text>
            <Text style={styles.resolutionText}>{conversation.resolution}</Text>
          </View>
        ) : null}

        {!isMine && !isResolved ? (
          <>
            <Text style={styles.sectionTitle}>Gentle acknowledgments</Text>
            <Text style={styles.sectionHint}>
              Let {conversation.senderName} know you've received their words. No pressure
              to solve anything.
            </Text>
            <View style={styles.shortcutGrid}>
              {CHAT_RESPONSE_SHORTCUTS.map((s) => (
                <Pressable
                  key={s.key}
                  style={[styles.shortcut, acknowledged === s.label && styles.shortcutActive]}
                  onPress={() => handleShortcut(s.label)}
                  accessibilityRole="button"
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      acknowledged === s.label && styles.shortcutTextActive,
                    ]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {isResolved ? null : isMine ? (
        <View style={styles.footer}>
          <Pressable
            style={styles.cta}
            onPress={handleResolve}
            accessibilityRole="button"
            accessibilityLabel="Resolve chat"
          >
            <Text style={styles.ctaText}>Resolve</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable style={styles.cta} onPress={handleReply} accessibilityRole="button">
            <Text style={styles.ctaText}>Reply with your own words</Text>
          </Pressable>
          <View style={styles.footerRow}>
            <Pressable
              style={[styles.secondary, sendingHug && styles.disabled]}
              onPress={handleSendHug}
              disabled={sendingHug}
              accessibilityRole="button"
            >
              {sendingHug ? (
                <ActivityIndicator color={colors.neutral} />
              ) : (
                <Text style={styles.secondaryText}>Send a gentle hug</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={handleResolve}
              accessibilityRole="button"
              accessibilityLabel="Resolve chat"
            >
              <Text style={styles.secondaryText}>Resolve</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  loader: { marginTop: spacing.xl },
  error: { ...typography.body, color: colors.emergency, padding: spacing.md },
  intro: { ...typography.body, color: colors.neutralMuted, marginBottom: spacing.md },
  messageCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  template: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  time: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },
  sender: { ...typography.bodySemiBold, color: colors.neutral, marginBottom: spacing.sm },
  message: { ...typography.headlineSm, color: colors.neutral, fontStyle: 'italic', lineHeight: 30 },
  resolutionCard: {
    backgroundColor: 'rgba(76,175,125,0.08)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,125,0.25)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  resolutionTitle: {
    ...typography.bodySm,
    color: colors.rhythmComplete,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resolvedBy: { ...typography.bodySemiBold, color: colors.neutral, marginBottom: spacing.sm },
  resolutionText: { ...typography.body, color: colors.neutral },
  sectionTitle: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sectionHint: { ...typography.bodySm, color: colors.neutralSubtle, marginBottom: spacing.md },
  shortcutGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  shortcut: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  shortcutActive: { backgroundColor: 'rgba(139,111,58,0.15)', borderColor: colors.gold },
  shortcutText: { ...typography.bodySm, color: colors.neutral },
  shortcutTextActive: { color: colors.gold },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cta: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 28,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText },
  secondary: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  secondaryText: { ...typography.bodySm, color: colors.neutral },
  disabled: { opacity: 0.6 },
});
