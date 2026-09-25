/**
 * DistractionScreen — the Distraction Centre hub.
 *
 * A gentle place to shift focus during a hard moment. Surfaces attention games
 * (Spot the Hidden Number, Amari 2048), connection prompts (the "About Us"
 * couple quiz, Would You Rather) and the DBT Somatic Regulation Suite, then
 * offers a soft "reconnect" hand-off back to the sanctuary.
 *
 * Data comes from useDistractionCentre() (games / quiz / would-you-rather).
 */
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../../../shared/theme';
import type { DistractionStackParamList } from '../../../navigation/DistractionStackParamList';
import type { MainTabParamList } from '../../../navigation/types';
import { Card, SectionLabel } from '../components/DistractionUI';
import { AppHeader } from '../../../shared/components/header';
import { useDistractionCentre } from '../hooks/useDistractionCentre';

type Nav = NativeStackNavigationProp<DistractionStackParamList, 'DistractionHome'>;

export function DistractionScreen() {
  const navigation = useNavigation<Nav>();
  const { quizQuestions, wouldYouRather, best2048, loading } =
    useDistractionCentre();

  const firstQuiz = quizQuestions[0] ?? null;
  const firstWyr = wouldYouRather[0] ?? null;

  const goHome = () => {
    // Hop back to the Sanctuary (Home) tab.
    navigation
      .getParent<BottomTabNavigationProp<MainTabParamList>>()
      ?.navigate('Home');
  };

  const sendSignOfPeace = () => {
    // A gentle sign of peace hands off to the Send a hug flow.
    navigation
      .getParent<BottomTabNavigationProp<MainTabParamList>>()
      ?.navigate('Hugs', { screen: 'NeedAHug' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader title="Distraction Centre" onBack={goHome} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.pill}>
          <Text style={styles.pillText}>MINDFUL, SOFT & DE-ESCALATION</Text>
        </View>
        <Text style={styles.subtitle}>
          A gentle place to shift your focus. Pick something light while your
          nervous system settles.
        </Text>

        {loading ? (
          <ActivityIndicator
            color={colors.gold}
            style={{ marginVertical: spacing.lg }}
          />
        ) : null}

        {/* Spot the Hidden Number */}
        <View style={styles.section}>
          <SectionLabel>Gentle focus · Solo play</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>Spot the Hidden Number</Text>
            <Text style={styles.cardBody}>
              Scan a calm scene for a softly hidden number. A quiet way to give
              a racing mind something small to hold.
            </Text>
            <Pressable
              style={styles.cardCta}
              onPress={() => navigation.navigate('HiddenNumber')}
              accessibilityRole="button"
              accessibilityLabel="Play Spot the Hidden Number"
            >
              <Text style={styles.cardCtaText}>Begin a round</Text>
            </Pressable>
          </Card>
        </View>

        {/* Amari 2048 */}
        <View style={styles.section}>
          <SectionLabel>Absorbing focus · Solo play</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>Amari 2048 · Constellations</Text>
            <Text style={styles.cardBody}>
              Slide and merge glowing tiles into ever-larger constellations. Easy
              to start, easy to set down.
            </Text>
            {typeof best2048 === 'number' ? (
              <Text style={styles.metaText}>Best · {best2048}</Text>
            ) : null}
            <Pressable
              style={styles.cardCta}
              onPress={() => navigation.navigate('Game2048')}
              accessibilityRole="button"
              accessibilityLabel="Play Amari 2048"
            >
              <Text style={styles.cardCtaText}>Slide to Amari</Text>
            </Pressable>
          </Card>
        </View>

        {/* The "About Us" Couple Quiz */}
        <View style={styles.section}>
          <SectionLabel>Reconnect · Play together</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>The "About Us" Couple Quiz</Text>
            {firstQuiz ? (
              <Text style={styles.quotedText}>"{firstQuiz.questionText}"</Text>
            ) : (
              <Text style={styles.cardBody}>
                Little questions about the two of you. A soft way to remember
                what you know about each other.
              </Text>
            )}
            <Pressable
              style={styles.cardCta}
              onPress={() => navigation.navigate('CoupleQuiz')}
              accessibilityRole="button"
              accessibilityLabel="Open the couple quiz"
            >
              <Text style={styles.cardCtaText}>Answer today's questions</Text>
            </Pressable>
          </Card>
        </View>

        {/* Would You Rather */}
        <View style={styles.section}>
          <SectionLabel>Playful · Whimsical futures</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>Would You Rather</Text>
            {firstWyr ? (
              <View style={styles.wyrPreview}>
                <View style={styles.wyrOption}>
                  <Text style={styles.wyrOptionText}>{firstWyr.optionA}</Text>
                </View>
                <Text style={styles.wyrOr}>or</Text>
                <View style={styles.wyrOption}>
                  <Text style={styles.wyrOptionText}>{firstWyr.optionB}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.cardBody}>
                Dreamy either/or prompts to daydream through together.
              </Text>
            )}
            <Pressable
              style={styles.cardCta}
              onPress={() => navigation.navigate('WouldYouRather')}
              accessibilityRole="button"
              accessibilityLabel="Open Would You Rather"
            >
              <Text style={styles.cardCtaText}>Wander into futures</Text>
            </Pressable>
          </Card>
        </View>

        {/* DBT Somatic Regulation Suite */}
        <View style={styles.section}>
          <SectionLabel>Come back to the body</SectionLabel>
          <Card>
            <Text style={styles.cardTitle}>DBT Somatic Regulation Suite</Text>
            <Text style={styles.cardBody}>
              When words are too much, the body can lead. Cold reset, paced
              breathing and grounding — one small step at a time.
            </Text>
            <Pressable
              style={styles.cardCta}
              onPress={() => navigation.navigate('SomaticSuite')}
              accessibilityRole="button"
              accessibilityLabel="Enter the Somatic Regulation Suite"
            >
              <Text style={styles.cardCtaText}>Enter the regulation suite</Text>
            </Pressable>
          </Card>
        </View>

        {/* Reconnect CTA */}
        <View style={styles.reconnect}>
          <Text style={styles.reconnectTitle}>
            Feeling steady enough to reconnect?
          </Text>
          <Text style={styles.reconnectBody}>
            Take your time. There's no rush. The moment you're ready, your
            sanctuary is here.
          </Text>
          <Pressable
            style={styles.reconnectBtn}
            onPress={sendSignOfPeace}
            accessibilityRole="button"
            accessibilityLabel="Send a gentle sign of peace"
          >
            <Text style={styles.reconnectBtnText}>Send a gentle sign of peace</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  pillText: { ...typography.label, color: colors.gold, fontSize: 10 },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    marginTop: spacing.xs,
  },
  section: { marginTop: spacing.lg },
  cardTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
    marginBottom: spacing.xs,
  },
  cardBody: { ...typography.bodySm, color: colors.neutralMuted },
  quotedText: {
    ...typography.body,
    color: colors.neutral,
    fontStyle: 'italic',
  },
  metaText: {
    ...typography.label,
    color: colors.neutralSubtle,
    marginTop: spacing.sm,
  },
  cardCta: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  cardCtaText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 14 },
  wyrPreview: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  wyrOption: {
    backgroundColor: 'rgba(253,252,240,0.04)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  wyrOptionText: { ...typography.bodySm, color: colors.neutral },
  wyrOr: {
    ...typography.label,
    color: colors.gold,
    textAlign: 'center',
    fontSize: 10,
  },
  reconnect: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: 'rgba(6,78,59,0.35)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167,210,182,0.25)',
    alignItems: 'center',
  },
  reconnectTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
  },
  reconnectBody: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  reconnectBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  reconnectBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
});
