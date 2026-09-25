/**
 * CheckInScreen — the mood check-in entry point (Check-In tab).
 *
 * Step 1: choose an energy/valence quadrant.
 * Step 2: choose a specific mood within that quadrant (CheckInStep2Screen).
 *
 * On confirm, the selected mood is sent to the backend via moodService.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useDayChange } from '../../../hooks/useDayChange';
import { colors, spacing, typography, useThemeMode } from '../../../shared/theme';
import {
  QUADRANTS,
  QUADRANT_DESCRIPTIONS,
  quadrantFromCheckIn,
  type MoodOption,
  type MoodQuadrant,
} from '../types/mood.types';
import { moodService } from '../services/moodService';
import { CheckInStep2Screen } from './CheckInStep2Screen';
import type { CheckInResponse } from '../../../services/api/types';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';
import { moodBackgroundStore, useMoodBackground } from '../../../shared/state/moodBackgroundStore';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'CheckInHome'>;

// 'loading'  — deciding which entry view to show (fetching today's check-in)
// 'already'  — user already checked in today: show their mood + follow-on actions
// 'quadrant' — step 1 of the check-in (energy/valence picker)
// 'mood'     — step 2 of the check-in (specific mood)
// 'done'     — the "Anchored" confirmation
type Stage = 'loading' | 'already' | 'quadrant' | 'mood' | 'done';

const QUADRANT_ACCENT: Record<MoodQuadrant, string> = {
  HIGH_PLEASANT: colors.gold,
  LOW_PLEASANT: colors.primaryLight,
  HIGH_UNPLEASANT: '#B34040',
  LOW_UNPLEASANT: colors.neutralMuted,
};

/** True when the ISO timestamp falls on the current calendar day. */
function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/** Prefer the human-readable feelings label, falling back to the mood enum name. */
function moodLabel(mood: string, feelings: string | null): string {
  return feelings?.trim() ? feelings : mood;
}

export function CheckInScreen() {
  const navigation = useNavigation<Nav>();
  const { setVariant } = useThemeMode();
  const [stage, setStage] = useState<Stage>('loading');
  const [quadrant, setQuadrant] = useState<MoodQuadrant | null>(null);
  const [confirmedQuadrant, setConfirmedQuadrant] = useState<MoodQuadrant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResponse | null>(null);
  // Shared with Together and Desk — this screen is what keeps it up to date.
  const backgroundImage = useMoodBackground();

  // Whether the user is mid-flow (picking a mood, or on the confirmation). While
  // interacting we must NOT bounce them back to the "already checked in" summary
  // when the tab regains focus — only the initial landing decides that.
  const inFlowRef = useRef(false);

  // Decide the landing view: if the user already checked in today (and isn't
  // mid-flow), show the summary; otherwise start the check-in. Returns a
  // cleanup that cancels the in-flight decision.
  const decideLanding = useCallback(() => {
    let active = true;
    moodService
      .getCurrent()
      .then((current) => {
        if (!active) return;
        setLastCheckIn(current);
        // Refresh the background shared with Together and Desk.
        moodBackgroundStore.setFromCheckIn(current);
        if (inFlowRef.current) return;
        setStage(isToday(current?.createdAt) ? 'already' : 'quadrant');
      })
      .catch(() => {
        if (!active) return;
        setLastCheckIn(null);
        moodBackgroundStore.setQuadrant(null);
        if (!inFlowRef.current) setStage('quadrant');
      });
    return () => {
      active = false;
    };
  }, []);

  // Re-decide the landing view every time the tab regains focus.
  useFocusEffect(decideLanding);

  // If the local day rolls over while sitting on this screen, yesterday's
  // check-in no longer counts — re-decide so the user lands on a fresh
  // check-in. Skipped while mid-flow so we don't yank them out of picking a mood.
  useDayChange(() => {
    if (!inFlowRef.current) decideLanding();
  });

  const reset = useCallback(() => {
    inFlowRef.current = false;
    setStage('quadrant');
    setQuadrant(null);
    setConfirmedQuadrant(null);
    setError(null);
  }, []);

  // "Check in again" from the summary: force the check-in flow regardless of
  // today's existing check-in.
  const startNewCheckIn = useCallback(() => {
    inFlowRef.current = true;
    setStage('quadrant');
    setQuadrant(null);
    setConfirmedQuadrant(null);
    setError(null);
  }, []);

  const handleSelectQuadrant = useCallback((q: MoodQuadrant) => {
    inFlowRef.current = true;
    setQuadrant(q);
    setStage('mood');
  }, []);

  // Apply the mood-driven theme: a "high energy pleasant" check-in switches the
  // app to the warm gold scheme; any other confirmed mood returns to botanical.
  const applyMoodTheme = useCallback(
    (q: MoodQuadrant | null) => {
      if (q === 'HIGH_PLEASANT') {
        setVariant('gold');
      } else if (q) {
        setVariant('botanical');
      }
    },
    [setVariant],
  );

  const handleConfirmMood = useCallback(async (mood: MoodOption) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await moodService.createCheckIn(mood.backendMood, mood.label);
      setLastCheckIn(result);
      setConfirmedQuadrant(mood.quadrant);
      // Moves Check-in, Together and Desk onto the new mood's background.
      moodBackgroundStore.setQuadrant(mood.quadrant);

      // A high-pleasant check-in earns the daily gift — take them straight to
      // it rather than pausing on the "Anchored" confirmation. Other quadrants
      // still land on the confirmation with their own follow-on action.
      //
      // The gold theme is applied when they leave the gift for Home, not now:
      // switching the theme remounts the navigator, which would throw away this
      // navigation and drop them on the dashboard instead of the gift.
      if (mood.quadrant === 'HIGH_PLEASANT') {
        inFlowRef.current = false;
        navigation.navigate('MoodGift', { applyTheme: 'gold' });
        return;
      }

      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your check-in.');
    } finally {
      setSubmitting(false);
    }
  }, [navigation]);

  const handleIDontKnow = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await moodService.createIDontKnow();
      setLastCheckIn(result);
      setConfirmedQuadrant(null);
      // An "I don't know" check-in has no quadrant — back to neutral.
      moodBackgroundStore.setQuadrant(null);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your check-in.');
    } finally {
      setSubmitting(false);
    }
  }, []);

  // ── Step 2 ──
  if (stage === 'mood' && quadrant) {
    return (
      <CheckInStep2Screen
        quadrant={quadrant}
        onConfirm={handleConfirmMood}
        onIDontKnow={handleIDontKnow}
        onBack={reset}
        submitting={submitting}
      />
    );
  }

  // ── Done ──
  if (stage === 'done') {
    // Theming is applied on exit from the confirmation screen so switching the
    // theme (which remounts the tree) doesn't interrupt the "Anchored" moment.
    // HIGH_PLEASANT never reaches this screen (it goes straight to the gift),
    // so this covers the remaining quadrants.
    const goHome = () => {
      applyMoodTheme(confirmedQuadrant);
      // Leaving the flow: next time the tab is focused, land on the summary.
      inFlowRef.current = false;
      navigation.getParent()?.navigate('Home');
    };

    // The primary action adapts to the mood quadrant the user just logged.
    //
    // Note: the follow-on screens (breathe / grounding / gift) live in this
    // same stack, so we must NOT switch the theme here — doing so remounts the
    // navigator and discards the navigation, landing the user on the dashboard.
    // Instead we hand each screen the variant to apply when it exits to Home.
    const runAction = () => {
      // Any of these actions leaves the check-in flow, so allow the tab to land
      // on the "already checked in" summary the next time it's focused.
      inFlowRef.current = false;
      const applyTheme = confirmedQuadrant === 'HIGH_PLEASANT' ? 'gold' : 'botanical';
      switch (confirmedQuadrant) {
        case 'HIGH_PLEASANT':
          // "Open gift" — reveal today's daily gift with the option to save it.
          navigation.navigate('MoodGift', { applyTheme });
          break;
        case 'HIGH_UNPLEASANT':
          navigation.navigate('MoodBreathe', { applyTheme });
          break;
        case 'LOW_UNPLEASANT':
          navigation.navigate('MoodGrounding', { applyTheme });
          break;
        case 'LOW_PLEASANT':
          // Send a hug — leaving this stack for the Hug flow, so applying the
          // theme here is safe (the remount lands on the Hug screen).
          applyMoodTheme(confirmedQuadrant);
          navigation.getParent()?.navigate('Hugs', { screen: 'NeedAHug' });
          break;
        default:
          // "I don't know" or unknown — just let them check in again.
          reset();
      }
    };

    const actionLabel = confirmedQuadrant
      ? QUADRANT_DESCRIPTIONS[confirmedQuadrant].actionLabel
      : 'Check in again';

    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ImageBackground
          source={backgroundImage}
          style={styles.doneBg}
          imageStyle={styles.doneBgImg}
          resizeMode="cover"
        >
        <View style={styles.doneContainer}>
          <Text style={styles.doneMark}>★</Text>
          <Text style={styles.doneTitle}>Anchored</Text>
          <Text style={styles.doneSubtitle}>
            Thank you for checking in. Your partner can see how you're feeling.
          </Text>
          <Pressable
            style={styles.doneBtn}
            onPress={runAction}
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
          >
            <Text style={styles.doneBtnText}>{actionLabel}</Text>
          </Pressable>
          <Pressable
            style={styles.doneSecondaryBtn}
            onPress={goHome}
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
            accessibilityRole="button"
            accessibilityLabel="Go Home"
          >
            <Text style={styles.doneSecondaryBtnText}>Go Home</Text>
          </Pressable>
        </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }

  // ── Loading: deciding which entry view to show ──
  if (stage === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Already checked in today ──
  if (stage === 'already' && lastCheckIn) {
    const quadrant = quadrantFromCheckIn(lastCheckIn.feelings, lastCheckIn.mood);
    const desc = quadrant ? QUADRANT_DESCRIPTIONS[quadrant] : null;
    const label = moodLabel(lastCheckIn.mood, lastCheckIn.feelings);

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ImageBackground source={backgroundImage} style={styles.header} imageStyle={styles.headerImg} resizeMode="cover">
            <View style={styles.headerOverlay}>
              <View style={styles.stepRow}>
                <View style={styles.stepDot} />
                <Text style={styles.stepLabel}>TODAY'S CHECK-IN</Text>
              </View>
              <Text style={styles.title}>You've checked in</Text>
              <Text style={styles.subtitle}>
                Here's how you're feeling today. Your partner can softly tune in.
              </Text>
            </View>
          </ImageBackground>

          <View style={styles.alreadyBody}>
            <View style={styles.card}>
              <View style={styles.moodPill}>
                <View style={styles.moodDot} />
                <Text style={styles.moodPillText}>{label}</Text>
              </View>
              {desc ? (
                <>
                  <Text style={styles.quadrantTitle}>{desc.title}</Text>
                  <Text style={styles.description}>{desc.description}</Text>
                </>
              ) : (
                <Text style={styles.description}>
                  Thank you for checking in today. Whenever you're ready, you can check in again.
                </Text>
              )}
            </View>

            <Pressable
              style={styles.primaryBtn}
              onPress={startNewCheckIn}
              android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
              accessibilityRole="button"
              accessibilityLabel="Check in again"
            >
              <Text style={styles.primaryBtnText}>Check in again</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('MoodGrounding')}
              android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
              accessibilityRole="button"
              accessibilityLabel="Grounding exercises"
            >
              <Text style={styles.secondaryBtnText}>Grounding exercises</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 1: Quadrant picker ──
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground source={backgroundImage} style={styles.header} imageStyle={styles.headerImg} resizeMode="cover">
          <View style={styles.headerOverlay}>
            <View style={styles.stepRow}>
              <View style={styles.stepDot} />
              <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
            </View>
            <Text style={styles.title}>How are you, really?</Text>
            <Text style={styles.subtitle}>
              Start with your energy and how pleasant it feels. We'll narrow it down together.
            </Text>
          </View>
        </ImageBackground>

        {lastCheckIn?.feelings ? (
          <Text style={styles.lastCheckIn}>Last check-in: {lastCheckIn.feelings}</Text>
        ) : null}

        <View style={styles.grid}>
          {QUADRANTS.map(q => (
            <Pressable
              key={q.key}
              style={styles.quadrantCard}
              onPress={() => handleSelectQuadrant(q.key)}
              android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
              accessibilityRole="button"
              accessibilityLabel={`${q.label}, ${q.tagline}`}
            >
              <View style={[styles.accentBar, { backgroundColor: QUADRANT_ACCENT[q.key] }]} />
              <Text style={styles.quadrantLabel}>{q.label}</Text>
              <Text style={styles.quadrantTagline}>{q.tagline}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {submitting ? <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── "Already checked in today" summary ──
  alreadyBody: { paddingHorizontal: spacing.md, gap: spacing.md },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  moodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
  },
  moodDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  moodPillText: { ...typography.bodyMedium, color: colors.gold, fontSize: 13 },
  quadrantTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 15, marginTop: spacing.md },
  description: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm, lineHeight: 22 },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
  },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
  secondaryBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { ...typography.bodySemiBold, color: colors.neutral },

  header: { width: '100%', height: 200, marginBottom: spacing.md },
  headerImg: { opacity: 0.6 },
  headerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,20,15,0.6)',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    justifyContent: 'flex-end',
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs },
  stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  stepLabel: { ...typography.label, color: colors.gold, fontSize: 9 },
  title: { ...typography.headline, color: colors.neutral, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.neutralMuted },

  lastCheckIn: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  quadrantCard: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 110,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  quadrantLabel: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16, marginBottom: 2 },
  quadrantTagline: { ...typography.bodySm, color: colors.neutralMuted },

  error: {
    ...typography.bodySm,
    color: '#B34040',
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },

  doneBg: {
    flex: 1,
  },
  doneBgImg: {
    opacity: 0.45,
  },
  doneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(10,20,15,0.6)',
  },
  doneMark: { fontSize: 48, color: colors.gold, marginBottom: spacing.md },
  doneTitle: { ...typography.headline, color: colors.neutral, marginBottom: spacing.sm },
  doneSubtitle: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  doneBtn: {
    backgroundColor: colors.ctaBackground,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 50,
    minWidth: 200,
    alignItems: 'center',
  },
  doneBtnText: { ...typography.bodySemiBold, color: colors.ctaText },
  doneSecondaryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 200,
    alignItems: 'center',
  },
  doneSecondaryBtnText: { ...typography.bodySemiBold, color: colors.neutral },
});
