/**
 * MoodGiftScreen — reached from the mood check-in confirmation when the user
 * lands in a "High Pleasant" state. Reveals the daily gift / surprise so a
 * bright moment gets to bloom a little more.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodGift'>;

// A small rotating pool of daily surprises. Picked by day-of-year so the same
// gift shows for the whole day.
const GIFTS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: '🌿',
    title: 'A little pause',
    body: 'Take five slow minutes today just for you. You have earned the stillness.',
  },
  {
    emoji: '💛',
    title: 'A note from the forest',
    body: 'The canopy is glad you are shining today. Carry a little of it with you.',
  },
  {
    emoji: '🎶',
    title: "Today's tune",
    body: 'Play a song that makes you want to move, and let yourself enjoy it fully.',
  },
  {
    emoji: '📸',
    title: 'Capture the glow',
    body: 'Snap a photo of something that makes you smile right now and keep it close.',
  },
  {
    emoji: '☕',
    title: 'A warm treat',
    body: 'Treat yourself to your favourite warm drink or a small snack you love.',
  },
];

function giftOfTheDay() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((now.getTime() - start) / 86_400_000);
  return GIFTS[dayOfYear % GIFTS.length];
}

export function MoodGiftScreen() {
  const navigation = useNavigation<Nav>();
  const [opened, setOpened] = useState(false);
  const gift = giftOfTheDay();

  const goHome = () => navigation.getParent()?.navigate('Home');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>Daily gift</Text>
      </View>

      <View style={styles.body}>
        {!opened ? (
          <>
            <Text style={styles.giftEmoji}>🎁</Text>
            <Text style={styles.title}>A little something for today</Text>
            <Text style={styles.subtitle}>
              You are riding a bright, high-energy wave. Here is a small surprise to savour it.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => setOpened(true)}
              accessibilityRole="button"
              accessibilityLabel="Open gift"
              android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
            >
              <Text style={styles.primaryBtnText}>Open gift</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.giftEmoji}>{gift.emoji}</Text>
            <Text style={styles.title}>{gift.title}</Text>
            <Text style={styles.subtitle}>{gift.body}</Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={goHome}
              accessibilityRole="button"
              accessibilityLabel="Go home"
              android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
            >
              <Text style={styles.primaryBtnText}>Go Home</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { ...typography.body, color: colors.neutralMuted },
  eyebrow: { ...typography.label, color: colors.gold },
  body: { flex: 1, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  giftEmoji: { fontSize: 72, marginBottom: spacing.lg },
  title: { ...typography.headline, color: colors.neutral, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
});
