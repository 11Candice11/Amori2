import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatSent'>;

/** Post-send confirmation. Calm, no timers, no pressure. */
export function ChatSentScreen() {
  const navigation = useNavigation<Nav>();

  const backToChat = useCallback(() => navigation.navigate('ChatHome'), [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Let's Chat" onBack={backToChat} showNotificationBell={false} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Peaceful delivery</Text>
        </View>
        <Text style={styles.title}>Sent with love.</Text>
        <Text style={styles.body}>
          Your thoughts have been gently delivered. There's no timer and no
          expectation of an immediate reply.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={backToChat} accessibilityRole="button">
          <Text style={styles.ctaText}>Back to Let's Chat</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'center', paddingTop: spacing.xl },
  badge: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  badgeText: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: { ...typography.headline, color: colors.neutral, marginBottom: spacing.md, textAlign: 'center' },
  body: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
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
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText },
});
