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

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatResolved'>;

/** Chats that either partner has resolved, most recently resolved first. */
export function ChatResolvedScreen() {
  const navigation = useNavigation<Nav>();
  const { conversations, loading, refresh } = useChatConversations();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { resolved } = partitionConversations(conversations);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Resolved" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Chats you've worked through, kept here with how they were resolved.
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : resolved.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No resolved chats yet.</Text>
          </View>
        ) : (
          resolved.map((c) => (
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
