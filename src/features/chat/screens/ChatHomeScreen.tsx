import React, { useCallback } from 'react';
import {
  ActivityIndicator,
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
import { TemplateCard } from '../components/TemplateCard';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatHome'>;

/**
 * The Let's Chat home: a set of guided conversation starters, plus quick access
 * to saved drafts, the open chats and the resolved chats.
 */
export function ChatHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { templates, loading, error } = useChatTemplates();
  const { conversations, refresh } = useChatConversations();

  // Refresh counts whenever the screen regains focus (e.g. after sending).
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const { drafts, open, resolved } = partitionConversations(conversations);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Let's Chat" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lede}>
          Find the words together. Choose a starting point below — Amori helps you
          shape the message, gently.
        </Text>

        <SupportPreferencesLink
          label="See how they prefer to communicate"
          focusSection="howToHelpMe"
          hint="A quick look at your partner's shared preferences."
        />
        <View style={{ height: spacing.md }} />

        <View style={styles.pills}>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('ChatDrafts')}
            accessibilityRole="button"
          >
            <Text style={styles.pillText}>Drafts</Text>
            {drafts.length > 0 ? <Text style={styles.pillCount}>{drafts.length}</Text> : null}
          </Pressable>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('ChatList')}
            accessibilityRole="button"
            accessibilityLabel="Chats"
          >
            <Text style={styles.pillText}>Chats</Text>
            {open.length > 0 ? <Text style={styles.pillCount}>{open.length}</Text> : null}
          </Pressable>
          <Pressable
            style={styles.pill}
            onPress={() => navigation.navigate('ChatResolved')}
            accessibilityRole="button"
            accessibilityLabel="Resolved chats"
          >
            <Text style={styles.pillText}>Resolved</Text>
            {resolved.length > 0 ? <Text style={styles.pillCount}>{resolved.length}</Text> : null}
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Conversation starters</Text>

        {loading ? (
          <ActivityIndicator color={colors.gold} style={styles.loader} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          templates.map((t) => (
            <TemplateCard
              key={t.type}
              template={t}
              onPress={() => navigation.navigate('ChatCompose', { templateType: t.type })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  lede: { ...typography.body, color: colors.neutralMuted, marginBottom: spacing.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pillText: { ...typography.bodySm, color: colors.neutral },
  pillCount: {
    ...typography.bodySm,
    color: colors.ctaText,
    backgroundColor: colors.gold,
    fontSize: 11,
    minWidth: 18,
    textAlign: 'center',
    borderRadius: 9,
    overflow: 'hidden',
    paddingHorizontal: 5,
  },
  sectionTitle: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  loader: { marginTop: spacing.lg },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },
});
