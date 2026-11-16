import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { SupportPreferencesLink } from '../../supportProfile/components/SupportPreferencesLink';
import { useChatTemplates } from '../hooks/useChatTemplates';
import {
  partitionConversations,
  useChatConversations,
} from '../hooks/useChatConversations';
import { StarterCard, STARTER_CARD_WIDTH } from '../components/StarterCard';
import { ThreadCard } from '../components/ThreadCard';
import { TemplatePickerModal } from '../components/TemplatePickerModal';
import type { ChatTemplateType } from '../types/chat.types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatHome'>;

/**
 * The Let's Chat home: a "Let's Chat" button (template picker), a swipeable
 * carousel of conversation starters, and the active conversations below.
 */
export function ChatHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { templates, loading, error } = useChatTemplates();
  const { conversations, refresh } = useChatConversations();
  const [pickerOpen, setPickerOpen] = useState(false);

  // Refresh whenever the screen regains focus (e.g. after sending).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { drafts, open, resolved } = partitionConversations(conversations);
  const active = [...drafts, ...open].sort((a, b) =>
    (b.sentAt ?? b.updatedAt ?? b.createdAt).localeCompare(a.sentAt ?? a.updatedAt ?? a.createdAt),
  );

  const startChat = (type: ChatTemplateType) => {
    setPickerOpen(false);
    navigation.navigate('ChatCompose', { templateType: type });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Let's Chat" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={styles.startButton}
          onPress={() => setPickerOpen(true)}
          disabled={loading || templates.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Let's Chat. Choose a template to start a chat"
        >
          <Text style={styles.startButtonText}>Let's Chat</Text>
        </Pressable>
        <SupportPreferencesLink
          label="See how they prefer to communicate"
          focusSection="howToHelpMe"
          hint="A quick look at your partner's shared preferences."
        />

        <Text style={styles.sectionTitle}>Conversation starters</Text>
        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <FlatList
            horizontal
            data={templates}
            keyExtractor={(t) => t.type}
            showsHorizontalScrollIndicator={false}
            snapToInterval={STARTER_CARD_WIDTH + spacing.sm}
            decelerationRate="fast"
            contentContainerStyle={styles.carousel}
            ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            style={styles.carouselList}
            renderItem={({ item }) => (
              <StarterCard template={item} onPress={() => startChat(item.type)} />
            )}
          />
        )}

        <View style={styles.threadsHeader}>
          <Text style={[styles.sectionTitle, styles.threadsTitle]}>Active conversations</Text>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('ChatDrafts')}
            accessibilityRole="button"
            accessibilityLabel="Drafts"
          >
            <Text style={styles.pillText}>Drafts{drafts.length > 0 ? ` ${drafts.length}` : ''}</Text>
          </Pressable>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('ChatResolved')}
            accessibilityRole="button"
            accessibilityLabel="Resolved chats"
          >
            <Text style={styles.pillText}>Resolved{resolved.length > 0 ? ` ${resolved.length}` : ''}</Text>
          </Pressable>
        </View>
        {active.length === 0 ? (
          <Text style={styles.empty}>No active conversations. Pick a starter above to begin.</Text>
        ) : (
          active.map((c) => (
            <ThreadCard
              key={c.id}
              conversation={c}
              onPress={() =>
                c.status === 'Draft' || c.status === 'Private'
                  ? navigation.navigate('ChatDrafts')
                  : navigation.navigate('ChatDetail', { conversationId: c.id })
              }
            />
          ))
        )}
      </ScrollView>
      <TemplatePickerModal
        visible={pickerOpen}
        templates={templates}
        onSelect={startChat}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  startButton: {
    alignItems: 'center',
    backgroundColor: colors.gold,
    borderRadius: 14,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  startButtonText: { ...typography.bodySemiBold, color: colors.ctaText },
  sectionTitle: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  carouselList: { marginHorizontal: -spacing.md },
  carousel: { paddingHorizontal: spacing.md },
  threadsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  threadsTitle: { flex: 1, marginTop: 0, marginBottom: 0 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillText: { ...typography.bodySm, color: colors.neutral, fontSize: 12 },
  empty: { ...typography.body, color: colors.neutralSubtle, textAlign: 'center', marginTop: spacing.lg },
  loader: { marginTop: spacing.lg },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },
});
