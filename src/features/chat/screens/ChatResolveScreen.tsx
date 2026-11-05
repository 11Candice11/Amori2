import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';
import { ApiError } from '../../../services/api/client';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
} from '../../../shared/components/inputs';
import { AppHeader } from '../../../shared/components/header';
import { showError } from '../../../shared/state/bannerStore';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { partitionConversations } from '../hooks/useChatConversations';
import { chatService } from '../services/chatService';
import { CHAT_RESOLUTION_MAX_LENGTH } from '../types/chat.types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatResolve'>;
type Route = NativeStackScreenProps<ChatStackParamList, 'ChatResolve'>['route'];

/**
 * Asks for a resolution and closes the chat. Either partner can do this. Once
 * resolved, the chat moves to the Resolved list and you land back on your list
 * of open chats, or on Let's Chat if none are left.
 */
export function ChatResolveScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { conversationId } = route.params;

  const [resolution, setResolution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = resolution.trim().length > 0 && !submitting;

  /**
   * Reset the stack to ChatHome → ChatList (or just ChatHome when nothing is
   * left open) so Back from the list goes to Let's Chat, not to the chat that
   * was just closed.
   */
  const leaveToChats = useCallback(async () => {
    let hasOpenChats = true;
    try {
      const all = await chatService.getConversations();
      hasOpenChats = partitionConversations(all).open.length > 0;
    } catch {
      // Can't tell; the list refreshes itself and shows its own empty state.
    }
    navigation.dispatch(
      CommonActions.reset({
        index: hasOpenChats ? 1 : 0,
        routes: hasOpenChats ? [{ name: 'ChatHome' }, { name: 'ChatList' }] : [{ name: 'ChatHome' }],
      }),
    );
  }, [navigation]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await chatService.resolve(conversationId, resolution.trim());
      showSuccessOverlay('Chat resolved');
      await leaveToChats();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // The other partner got there first. Nothing left to do here.
        showError(err.message);
        await leaveToChats();
      } else {
        setError(
          err instanceof ApiError ? err.message : 'Could not resolve this chat. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, conversationId, resolution, leaveToChats]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Resolve chat"
        subtitle="Close it out together"
        onBack={() => navigation.goBack()}
        showNotificationBell={false}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Say what you worked out or agreed. Either of you can resolve a chat, and the
              resolution is kept with it under Resolved.
            </Text>
          </View>

          <Text style={styles.label}>Resolution *</Text>
          <TextInput
            style={styles.input}
            value={resolution}
            onChangeText={setResolution}
            placeholder="How was this resolved?"
            placeholderTextColor={colors.neutralMuted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={CHAT_RESOLUTION_MAX_LENGTH}
            autoFocus
            accessibilityLabel="Resolution"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={submit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="Mark resolved"
            accessibilityState={{ disabled: !canSubmit }}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.ctaText} />
            ) : (
              <Text style={styles.btnText}>Mark resolved</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  infoBox: {
    backgroundColor: 'rgba(76,175,125,0.08)',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(76,175,125,0.25)',
  },
  infoText: { ...typography.bodySm, color: colors.rhythmComplete, lineHeight: 18 },
  label: { ...typography.label, color: colors.neutralMuted, marginBottom: 6, marginTop: spacing.sm },
  input: {
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.neutral,
    minHeight: 140,
    ...typography.body,
  },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.sm },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  btn: {
    backgroundColor: colors.ctaBackground,
    height: 52,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },
});
