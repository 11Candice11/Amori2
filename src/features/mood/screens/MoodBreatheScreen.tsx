/**
 * MoodBreatheScreen — a guided breathing exercise reached from the mood
 * check-in confirmation when the user lands in a "High Unpleasant" state.
 *
 * Cadence: Inhale 5s · Hold 6s · Exhale 7s, repeated across several cycles.
 * Uses RN's built-in Animated (no animation library installed).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'MoodBreathe'>;

type Phase = { label: string; seconds: number };
const PHASES: Phase[] = [
  { label: 'INHALE', seconds: 5 },
  { label: 'HOLD', seconds: 6 },
  { label: 'EXHALE', seconds: 7 },
];
const TOTAL_CYCLES = 4;
const CIRCLE = 260;

export function MoodBreatheScreen() {
  const navigation = useNavigation<Nav>();

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
        <Text style={styles.eyebrow}>Breathe</Text>
      </View>

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

        <Text style={styles.cadence}>5s Inhale · 6s Hold · 7s Exhale</Text>
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
          android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
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
