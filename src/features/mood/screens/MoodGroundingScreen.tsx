/**
 * MoodGroundingScreen — reached from the mood check-in confirmation when the
 * user lands in a "Low Unpleasant" state. Offers a menu of simple grounding
 * exercises and distractions to gently re-regulate.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, useThemeMode } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodGrounding'>;
type Rt = RouteProp<MoodStackParamList, 'MoodGrounding'>;

type GroundingItem = {
  id: string;
  title: string;
  meta: string;
  description: string;
  screen?: keyof MoodStackParamList | 'Distraction';
};

const GROUNDING_ITEMS: GroundingItem[] = [
  {
    id: '54321',
    title: '5-4-3-2-1 Senses',
    meta: 'Sensory · 3 min',
    description:
      'Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. Come back to the here and now.',
    screen: 'Exercise54321',
  },
  {
    id: 'body-scan',
    title: 'Gentle body scan',
    meta: 'Solo reset · 4 min',
    description:
      'Move your attention slowly from your feet to your head, softening each part as you go.',
    screen: 'ExerciseBodyScan',
  },
  {
    id: 'warm-drink',
    title: 'Make a warm drink',
    meta: 'Comfort · 5 min',
    description:
      'Step away and make tea or something warm. Feel the heat of the cup and take slow sips.',
    screen: 'ExerciseWarmDrink',
  },
  {
    id: 'walk',
    title: 'Short slow walk',
    meta: 'Movement · 5 min',
    description:
      'Move your body gently. Notice your feet meeting the ground with each step.',
    screen: 'ExerciseWalk',
  },
  {
    id: 'distraction',
    title: 'A light distraction',
    meta: 'Play · 5 min',
    description:
      'Give your mind a soft place to rest — a quick game, a song, or a comforting show.',
    screen: 'Distraction',
  },
];

export function MoodGroundingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { setVariant } = useThemeMode();

  // Apply the deferred mood theme only as we leave for Home. Switching it
  // earlier would remount the navigator and interrupt the exercise navigation.
  const goHome = () => {
    const applyTheme = route.params?.applyTheme;
    if (applyTheme) setVariant(applyTheme);
    navigation.getParent()?.navigate('Home');
  };

  const handleExercisePress = (item: GroundingItem) => {
    if (!item.screen) {
      goHome();
      return;
    }

    if (item.screen === 'Distraction') {
      // Navigate to the Distraction hub
      navigation.getParent()?.navigate('Distraction');
    } else {
      // Navigate to the specific exercise screen
      navigation.navigate(item.screen);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Grounding" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Grounding exercises</Text>
        <Text style={styles.subtitle}>
          Pick something small to settle your nervous system. Even a couple of minutes helps.
        </Text>

        {GROUNDING_ITEMS.map(item => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => handleExercisePress(item)}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
          >
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.meta}</Text>
            <Text style={styles.cardDesc}>{item.description}</Text>
          </Pressable>
        ))}

        <Pressable
          style={styles.secondaryBtn}
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Go home"
          android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
        >
          <Text style={styles.secondaryBtnText}>Go Home</Text>
        </Pressable>
      </ScrollView>
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
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.sm, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },
  cardMeta: { ...typography.label, color: colors.gold, fontSize: 10, marginTop: 3 },
  cardDesc: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 8, lineHeight: 18 },
  secondaryBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  secondaryBtnText: { ...typography.bodySemiBold, color: colors.neutral },
});
