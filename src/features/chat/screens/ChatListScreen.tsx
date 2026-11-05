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

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatList'>;

/**
 * Your open chats: every message exchanged between the two partners that
 * hasn't been resolved yet. Resolved chats move to the Resolved list.
 */
export function ChatListScreen() {
  const navigation = useNavigation<Nav>();
  const { conversations, loading, refresh } = useChatConversations();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { open } = partitionConversations(conversations);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Chats" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Words you've shared, held gently until you've worked through them
          together. Open one to reply, or resolve it when you're done.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : open.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No open chats.</Text>
          </View>
        ) : (
          open.map((c) => (
            <MessageCard
              key={c.id}
              conversation={c}
              onPress={() => navigation.navigate('ChatDetail', { conversationId: c.id })}
            />
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
