/**
 * Screen — Breathe with me.
 * A guided box-breathing exercise that steps through Inhale / Hold / Exhale
 * phases across several cycles, with a pulsing focal circle. Uses RN's
 * built-in Animated (no animation library installed).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  StepProgress,
  PrimaryButton,
  TextButton,
  PauseIcon,
  PlayIcon,
  HeartIcon,
} from '../components';
import { PARTNER_NAME } from '../utils/splittingData';
import { EMPTY_FLOW_STATE } from '../types/splitting.types';
import { useSaveGroundingOnLeave } from '../hooks/useLeaveSplittingFlow';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'BreatheWithMe'>;
type Rt = RouteProp<SplittingStackParamList, 'BreatheWithMe'>;

type Phase = { label: string; seconds: number };
const PHASES: Phase[] = [
  { label: 'INHALE', seconds: 4 },
  { label: 'HOLD', seconds: 4 },
  { label: 'EXHALE', seconds: 6 },
];
const TOTAL_CYCLES = 5;
const CIRCLE = 260;

export function BreatheWithMeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  // Leaving after the Inward Check saves the grounding as history. The hook
  // only fires when a need was chosen, so reaching here before the Inward Check
  // (via "take a slow breath") won't prematurely save.
  useSaveGroundingOnLeave(flow);

  const [cycle, setCycle] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(PHASES[0].seconds);
  const [running, setRunning] = useState(true);

  const scale = useRef(new Animated.Value(0.7)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = PHASES[phaseIndex];

  // Animate the circle to match the current phase (grow on inhale, hold, shrink on exhale).
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
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev > 1) return prev - 1;
        // advance phase
        setPhaseIndex(pi => {
          const nextPi = (pi + 1) % PHASES.length;
          if (nextPi === 0) {
            setCycle(c => Math.min(TOTAL_CYCLES, c + 1));
          }
          return nextPi;
        });
        return PHASES[(phaseIndexRef.current + 1) % PHASES.length].seconds;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  // Keep a ref of phaseIndex so the interval closure reads the latest value.
  const phaseIndexRef = useRef(phaseIndex);
  useEffect(() => {
    phaseIndexRef.current = phaseIndex;
  }, [phaseIndex]);

  const finish = () => navigation.navigate('SafeTransition', { flow });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Breathe With Me" subtitle="De-escalation Pacing" onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <StatusPill label="Safe sanctuary" />
        <Text style={styles.title}>Breathe with me</Text>
        <Text style={styles.subtitle}>Settle into your body. Let the rhythm do the work.</Text>

        <View style={styles.progressWrap}>
          <StepProgress total={TOTAL_CYCLES} current={cycle - 1} />
          <Text style={styles.cycleText}>CYCLE {cycle} OF {TOTAL_CYCLES}</Text>
        </View>

        <View style={styles.circleWrap}>
          <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
            <Text style={styles.phaseLabel}>{phase.label}</Text>
            <Text style={styles.phaseCount}>{remaining}S</Text>
            <Text style={styles.phaseSub}>{PARTNER_NAME.toUpperCase()} IS WITH YOU</Text>
          </Animated.View>
        </View>

        <View style={styles.syncPill}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Synchronized</Text>
        </View>

        <Text style={styles.cadence}>4s Inhale · 4s Hold · 6s Exhale</Text>

        <View style={styles.presenceCard}>
          <View style={styles.presenceAvatar}>
            <HeartIcon color={colors.emergency} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.presenceHead}>
              <Text style={styles.presenceTitle}>{PARTNER_NAME}'s Quiet Presence</Text>
              <Text style={styles.presenceMeta}>Right now</Text>
            </View>
            <Text style={styles.presenceBody} numberOfLines={1}>
              "Feeling the weight slowly lift. Match my bre…"
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.controlRow}>
          <Pressable
            style={styles.pauseBtn}
            onPress={() => setRunning(r => !r)}
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause breathing' : 'Resume breathing'}
            android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
          >
            {running ? <PauseIcon color={colors.neutral} size={22} /> : <PlayIcon color={colors.neutral} size={22} />}
          </Pressable>
          <View style={{ flex: 1 }}>
            <PrimaryButton
              label="Finish Exercise"
              icon={<HeartIcon color={colors.ctaText} size={16} />}
              onPress={finish}
            />
          </View>
        </View>
        <TextButton label="Skip to Next Step" onPress={finish} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, paddingHorizontal: spacing.md, alignItems: 'center' },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 28 },
  subtitle: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', marginTop: spacing.sm },
  progressWrap: { width: '60%', marginTop: spacing.lg, alignItems: 'center', gap: spacing.sm },
  cycleText: { ...typography.label, color: colors.gold, fontSize: 11 },
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
  phaseSub: { ...typography.label, color: colors.neutralMuted, fontSize: 10, marginTop: 6 },

  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  syncText: { ...typography.bodySm, color: colors.gold, fontSize: 12 },
  cadence: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.sm },

  presenceCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  presenceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(224,122,95,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceHead: { flexDirection: 'row', justifyContent: 'space-between' },
  presenceTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  presenceMeta: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },
  presenceBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  controlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pauseBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
