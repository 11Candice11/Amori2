import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import {
  partitionConversations,
  useChatConversations,
} from '../hooks/useChatConversations';
import { chatDraftStore } from '../services/chatDraftStore';
import { MessageCard } from '../components/MessageCard';
import type { ChatConversation } from '../types/chat.types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatDrafts'>;

/** Saved (unsent) drafts — always private, never sent unless the user chooses. */
export function ChatDraftsScreen() {
  const navigation = useNavigation<Nav>();
  const { conversations, loading, refresh } = useChatConversations();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { drafts } = partitionConversations(conversations);

  const openDraft = useCallback(
    async (conversation: ChatConversation) => {
      // Resume the local mirror if one exists; otherwise open by server id and
      // the compose hook will rebuild a local draft from the server copy.
      const local = await chatDraftStore.findByServerId(conversation.id);
      navigation.navigate('ChatCompose', {
        templateType: conversation.templateType,
        localDraftId: local?.localId,
        conversationId: conversation.id,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Saved drafts" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Unfinished reflections kept safe until you're ready. Drafts stay
          completely private.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : drafts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No drafts yet.</Text>
          </View>
        ) : (
          drafts.map((c) => (
            <MessageCard key={c.id} conversation={c} onPress={() => openDraft(c)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  intro: { ...typography.body, color: colors.neutralMuted, marginBottom: spacing.md },
  loader: { marginTop: spacing.xl },
  empty: { alignItems: 'center', marginTop: spacing.xl },
  emptyText: { ...typography.body, color: colors.neutralSubtle },
});
