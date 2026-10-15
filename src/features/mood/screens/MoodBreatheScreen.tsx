/**
 * MoodBreatheScreen — a guided breathing exercise reached from the mood
 * check-in confirmation when the user lands in a "High Unpleasant" state.
 *
 * Cadence: Inhale 5s · Hold 4s · Exhale 4s, repeated across several cycles.
 *
 * Haptics: a gentle, frequent buzz runs *only* while breathing in, then the
 * body is left still through the hold and exhale. The vibration is cancelled
 * whenever the exercise pauses, completes, the screen loses focus, or unmounts,
 * so a buzz can never outlive the view. Honours the user's vibration setting
 * via the shared haptics helper.
 *
 * Uses RN's built-in Animated (no animation library installed).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography, useThemeMode } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { cancelVibration, vibrate } from '../../../shared/haptics';
import { useUserSetting } from '../../../shared/state/userSettingsStore';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodBreathe'>;
type Rt = RouteProp<MoodStackParamList, 'MoodBreathe'>;

type Phase = { label: string; seconds: number };
const PHASES: Phase[] = [
  { label: 'INHALE', seconds: 5 },
  { label: 'HOLD', seconds: 4 },
  { label: 'EXHALE', seconds: 4 },
];
const TOTAL_CYCLES = 4;
const CIRCLE = 260;

/**
 * Gentle repeating buzz used through the inhale — a short pulse with a slightly
 * longer gap, looped, so it reads as small and frequent rather than one long
 * vibration. Same shape as the other breathing screens.
 */
const INHALE_PATTERN = [0, 40, 60];

export function MoodBreatheScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { setVariant } = useThemeMode();
  // Read once so the value is captured; the vibrate helper also re-checks the
  // preference on every call, so a mid-exercise toggle is still respected.
  const vibrationEnabled = useUserSetting('vibrationEnabled');

  const [cycle, setCycle] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const [running, setRunning] = useState(true);
  const [done, setDone] = useState(false);

  const scale = useRef(new Animated.Value(0.7)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseIndexRef = useRef(phaseIndex);
  const cycleRef = useRef(cycle);

  const phase = PHASES[phaseIndex];

  useEffect(() => {
    phaseIndexRef.current = phaseIndex;
  }, [phaseIndex]);
  useEffect(() => {
    cycleRef.current = cycle;
  }, [cycle]);

  // ── Haptics ────────────────────────────────────────────────────────────────
  // Buzz through the inhale, fall silent for the hold and exhale. Re-cued on
  // every phase change (and whenever running/done flips) so it always matches
  // what the circle is doing.
  const applyPhaseVibration = useCallback(
    (label: string, isRunning: boolean, isDone: boolean) => {
      if (!isRunning || isDone) {
        cancelVibration();
        return;
      }
      if (label === 'INHALE') {
        // repeat=true loops the short pattern → small, frequent pulses.
        vibrate(INHALE_PATTERN, true);
      } else {
        cancelVibration();
      }
    },
    [],
  );

  useEffect(() => {
    applyPhaseVibration(phase.label, running, done);
    // vibrationEnabled is included so flipping the setting mid-inhale takes
    // effect: turning it off cancels, turning it on re-cues the current phase.
  }, [phase.label, running, done, vibrationEnabled, applyPhaseVibration]);

  // Belt-and-braces: cancel any buzz when the screen unmounts.
  useEffect(() => {
    return () => cancelVibration();
  }, []);

  // Cancel the buzz if the user navigates away while it's still running (e.g.
  // the back button or a tab switch), so it never outlives the view.
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => cancelVibration());
    return unsub;
  }, [navigation]);

  // Animate the circle: grow on inhale, hold, shrink on exhale.
  useEffect(() => {
    if (!running) return;
    const target = phase.label === 'INHALE' ? 1 : phase.label === 'EXHALE' ? 0.7 : undefined;
    if (target !== undefined) {
      Animated.timing(scale, {
        toValue: target,
        duration: phase.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [phaseIndex, running, phase.label, phase.seconds, scale]);

  // Countdown + phase/cycle advancement.
  useEffect(() => {
    if (!running || done) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev > 1) return prev - 1;
        const nextPi = (phaseIndexRef.current + 1) % PHASES.length;
        if (nextPi === 0) {
          if (cycleRef.current >= TOTAL_CYCLES) {
            setDone(true);
            setRunning(false);
            return 0;
          }
          setCycle(c => c + 1);
        }
        setPhaseIndex(nextPi);
        return PHASES[nextPi].seconds;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, done]);

  const goHome = () => {
    // Stop any buzz before we leave, then apply the deferred mood theme. The
    // theme switch remounts the navigator, so it must happen as we exit to
    // Home rather than on entry (which would drop the user on the dashboard).
    cancelVibration();
    const applyTheme = route.params?.applyTheme;
    if (applyTheme) setVariant(applyTheme);
    navigation.getParent()?.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader
        title="Breathe"
        onBack={() => {
          cancelVibration();
          navigation.goBack();
        }}
      />

      <View style={styles.body}>
        <Text style={styles.title}>Breathe with me</Text>
        <Text style={styles.subtitle}>
          {done
            ? 'Beautifully done. Notice how your body feels now.'
            : 'Settle into your body. Let the rhythm do the work.'}
        </Text>

        <Text style={styles.cycleText}>
          {done ? 'COMPLETE' : `CYCLE ${cycle} OF ${TOTAL_CYCLES}`}
        </Text>

        <View style={styles.circleWrap}>
          <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
            {done ? (
              <Text style={styles.doneMark}>★</Text>
            ) : (
              <>
                <Text style={styles.phaseLabel}>{phase.label}</Text>
                <Text style={styles.phaseCount}>{remaining}S</Text>
              </>
            )}
          </Animated.View>
        </View>

        <Text style={styles.cadence}>5s Inhale · 4s Hold · 4s Exhale</Text>
      </View>

      <View style={styles.bottomBar}>
        {!done ? (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => setRunning(r => !r)}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause breathing' : 'Resume breathing'}
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            <Text style={styles.primaryBtnText}>{running ? 'Pause' : 'Resume'}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.primaryBtn}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Go home"
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            <Text style={styles.primaryBtnText}>Go Home</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.secondaryBtn}
          onPress={goHome}
          accessibilityRole="button"
          accessibilityLabel="Done"
          android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
        >
          <Text style={styles.secondaryBtnText}>{done ? 'Back to sanctuary' : "I'm done"}</Text>
        </Pressable>
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
  body: { flex: 1, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headline, color: colors.neutral, fontSize: 28 },
  subtitle: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', marginTop: spacing.sm },
  cycleText: { ...typography.label, color: colors.gold, fontSize: 11, marginTop: spacing.lg },
  circleWrap: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: 'rgba(6,78,59,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(167,210,182,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseLabel: { ...typography.headlineSm, color: colors.tertiary, fontSize: 24, letterSpacing: 2 },
  phaseCount: { ...typography.headline, color: colors.neutral, fontSize: 36, marginTop: 4 },
  doneMark: { fontSize: 56, color: colors.gold },
  cadence: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.lg },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingVertical: 14,
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
});
