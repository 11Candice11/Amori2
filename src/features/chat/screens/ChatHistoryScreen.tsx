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
import { MessageCard } from '../components/MessageCard';
import type { ChatConversation } from '../types/chat.types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatHistory'>;

/** The shared archive of messages exchanged between the two partners. */
export function ChatHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const { conversations, loading, refresh } = useChatConversations();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { thread } = partitionConversations(conversations);

  const open = useCallback(
    (c: ChatConversation) => {
      // A message I authored opens as "sent"; one from my partner opens as
      // "received" (which also marks it read).
      if (c.isMine) {
        navigation.navigate('ChatSent', { conversationId: c.id });
      } else {
        navigation.navigate('ChatReceived', { conversationId: c.id });
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Conversation history" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          A shared archive of tender moments, understanding, and heartfelt words.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : thread.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages exchanged yet.</Text>
          </View>
        ) : (
          thread.map((c) => (
            <MessageCard key={c.id} conversation={c} onPress={() => open(c)} />
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
