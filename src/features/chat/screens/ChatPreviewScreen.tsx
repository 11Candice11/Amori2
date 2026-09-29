import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { chatService } from '../services/chatService';
import { chatDraftStore } from '../services/chatDraftStore';
import { TEMPLATE_TITLES } from '../utils/labels';
import type { ChatTemplateType } from '../types/chat.types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatPreview'>;
type Route = NativeStackScreenProps<ChatStackParamList, 'ChatPreview'>['route'];

/**
 * Full-message preview shown before sending. Offers Edit (back to the flow),
 * Save privately, and Send to partner. A ref guards against a double-tap
 * sending twice (belt-and-braces with the server's idempotent send).
 */
export function ChatPreviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { localDraftId } = route.params;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [serverId, setServerId] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<ChatTemplateType | null>(null);
  const [composed, setComposed] = useState('');
  const sentRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const draft = await chatDraftStore.get(localDraftId);
      if (!draft?.serverId) {
        if (!cancelled) {
          showError('Draft not found.');
          navigation.goBack();
        }
        return;
      }
      try {
        const conversation = await chatService.getConversation(draft.serverId);
        if (cancelled) return;
        setServerId(conversation.id);
        setTemplateType(conversation.templateType);
        setComposed(conversation.composedMessage);
      } catch {
        if (!cancelled) showError('Could not load your message.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [localDraftId, navigation]);

  const handleEdit = useCallback(() => {
    if (!templateType) return;
    navigation.navigate('ChatCompose', { templateType, localDraftId, conversationId: serverId ?? undefined });
  }, [navigation, templateType, localDraftId, serverId]);

  const handleSavePrivately = useCallback(async () => {
    if (!serverId) return;
    try {
      await chatService.update(serverId, { status: 'Private' });
      await chatDraftStore.remove(localDraftId);
      showSuccess('Saved privately.');
      navigation.navigate('ChatHome');
    } catch {
      showError('Could not save privately. Please try again.');
    }
  }, [serverId, localDraftId, navigation]);

  const handleSend = useCallback(async () => {
    if (!serverId || sending || sentRef.current) return; // duplicate-send guard
    sentRef.current = true;
    setSending(true);
    try {
      const sent = await chatService.send(serverId);
      await chatDraftStore.remove(localDraftId);
      navigation.navigate('ChatSent', { conversationId: sent.id });
    } catch (err) {
      sentRef.current = false; // allow a retry on genuine failure
      const message = err instanceof Error ? err.message : 'Could not send your message.';
      showError(message);
    } finally {
      setSending(false);
    }
  }, [serverId, sending, localDraftId, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Your message" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Your message" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>Private until you send it</Text>
          <Text style={styles.privacyBody}>
            Only you can see this. There's no rush — send it when the moment feels right.
          </Text>
        </View>

        <View style={styles.messageCard}>
          {templateType ? (
            <Text style={styles.template}>{TEMPLATE_TITLES[templateType]}</Text>
          ) : null}
          <Text style={styles.message}>“{composed}”</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.cta, sending && styles.ctaDisabled]}
          onPress={handleSend}
          disabled={sending}
          accessibilityRole="button"
        >
          {sending ? (
            <ActivityIndicator color={colors.ctaText} />
          ) : (
            <Text style={styles.ctaText}>Send to partner</Text>
          )}
        </Pressable>
        <View style={styles.secondaryRow}>
          <Pressable style={styles.secondary} onPress={handleEdit} disabled={sending}>
            <Text style={styles.secondaryText}>Edit message</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={handleSavePrivately} disabled={sending}>
            <Text style={styles.secondaryText}>Save privately</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  loader: { marginTop: spacing.xl },
  privacyNote: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privacyTitle: { ...typography.bodySemiBold, color: colors.neutral, marginBottom: 2 },
  privacyBody: { ...typography.bodySm, color: colors.neutralMuted },
  messageCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    padding: spacing.lg,
  },
  template: {
    ...typography.bodySm,
    color: colors.gold,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 11,
  },
  message: { ...typography.headlineSm, color: colors.neutral, fontStyle: 'italic', lineHeight: 30 },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 28,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText },
  secondaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
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
});
