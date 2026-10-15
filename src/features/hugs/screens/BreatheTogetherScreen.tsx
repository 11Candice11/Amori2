/**
 * BreatheTogetherScreen — the synced breathing view reached by tapping the
 * "Breathe together" card on the hug screens.
 *
 * Why the rhythm is genuinely shared: there is no realtime channel in this app
 * (no sockets, only REST), so instead of pushing a "start now" signal we anchor
 * the cadence to a timestamp both devices already agree on — the hug's
 * `createdAt`. Each phone derives the current phase from `now - anchor`, so two
 * partners opening this screen minutes apart still inhale and exhale on the
 * same beat. That also means there is deliberately no pause control: pausing
 * would silently desync the two of you.
 *
 * Cadence matches the S.O.S. flow's BreatheWithMe screen (4s / 4s / 6s), and
 * the haptics follow the same press-and-hold convention as the S.O.S.
 * PulseCircle: gentle vibration while you breathe in, stillness while you hold
 * and release. Uses RN's built-in Animated (no animation library installed).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { cancelVibration, vibrate } from '../../../shared/haptics';
import { userSettingsStore, useUserSetting } from '../../../shared/state/userSettingsStore';
import type { HugStackParamList } from '../../../navigation/HugStackParamList';
import { hugService } from '../services/hugService';
import { HeartIcon, HomeIcon, LeafIcon, VibrationIcon } from '../components/HugIcons';

type Nav = NativeStackNavigationProp<HugStackParamList, 'BreatheTogether'>;
type Rt = RouteProp<HugStackParamList, 'BreatheTogether'>;

type Phase = { label: 'INHALE' | 'HOLD' | 'EXHALE'; ms: number };

const PHASES: Phase[] = [
  { label: 'INHALE', ms: 4000 },
  { label: 'HOLD', ms: 4000 },
  { label: 'EXHALE', ms: 6000 },
];
const CYCLE_MS = PHASES.reduce((sum, p) => sum + p.ms, 0); // 14s
const TICK_MS = 200;

const CIRCLE = 236;
const SCALE_MIN = 0.72;
const SCALE_MAX = 1;

/** Gentle repeating buzz used through the inhale — same shape as PulseCircle. */
const INHALE_PATTERN = [0, 40, 60];
/** One soft tap to cue the release at the top of the exhale. */
const EXHALE_CUE_MS = 110;

type PhasePosition = {
  /** Index into PHASES. */
  index: number;
  /** 1-based cycle count since the anchor — the same number on both devices. */
  cycle: number;
  /** Milliseconds already elapsed inside the current phase. */
  intoMs: number;
};

/** Where the shared rhythm sits, given how long ago it was anchored. */
function phaseAt(elapsedMs: number): PhasePosition {
  const elapsed = Math.max(0, elapsedMs);
  const cycle = Math.floor(elapsed / CYCLE_MS) + 1;
  let within = elapsed % CYCLE_MS;

  for (let index = 0; index < PHASES.length; index += 1) {
    if (within < PHASES[index].ms) return { index, cycle, intoMs: within };
    within -= PHASES[index].ms;
  }
  // Unreachable, since `within < CYCLE_MS`. Fall back to the exhale.
  return { index: PHASES.length - 1, cycle, intoMs: 0 };
}

export function BreatheTogetherScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();
  const vibrationEnabled = useUserSetting('vibrationEnabled');

  const [partnerName, setPartnerName] = useState(params.partnerName?.trim() || 'your partner');
  const [acknowledged, setAcknowledged] = useState(params.isAcknowledged ?? false);

  /**
   * The shared clock origin. Falls back to mount time when the caller didn't
   * pass the hug timestamp and the fetch hasn't landed — a solo rhythm is
   * better than a blank screen, and it re-anchors once the hug arrives.
   */
  const mountedAt = useRef(Date.now()).current;
  const [anchorMs, setAnchorMs] = useState(() => {
    const parsed = params.anchorIso ? Date.parse(params.anchorIso) : NaN;
    return Number.isNaN(parsed) ? mountedAt : parsed;
  });

  // Fetch (and keep polling) the hug so the partner's name and their "holding
  // you too" acknowledgement are real backend state, not assumptions.
  useEffect(() => {
    let alive = true;
    let poll: ReturnType<typeof setInterval> | null = null;

    const read = async () => {
      try {
        // Either partner can open this screen, so the "other person" is
        // whichever side of the hug isn't the signed-in user.
        await userSettingsStore.load();
        const meId = userSettingsStore.get()?.id ?? null;
        const hug = await hugService.getHug(params.hugId);
        if (!alive) return hug;
        const other = meId && hug.senderId === meId ? hug.recipientName : hug.senderName;
        if (other?.trim()) setPartnerName(other.trim());
        setAcknowledged(hug.isAcknowledged);
        const parsed = Date.parse(hug.createdAt);
        if (!Number.isNaN(parsed)) setAnchorMs(parsed);
        return hug;
      } catch {
        return null; // best-effort; the breathing rhythm still runs
      }
    };

    read();
    poll = setInterval(async () => {
      const hug = await read();
      if (hug?.isAcknowledged && poll) {
        clearInterval(poll);
        poll = null;
      }
    }, 5000);

    return () => {
      alive = false;
      if (poll) clearInterval(poll);
    };
  }, [params.hugId]);

  // ── The shared rhythm ──────────────────────────────────────────────────────
  // `position` only changes when the phase or cycle turns over, so the
  // animation effect fires once per phase instead of once per tick.
  const [position, setPosition] = useState<Omit<PhasePosition, 'intoMs'>>(() => {
    const p = phaseAt(Date.now() - anchorMs);
    return { index: p.index, cycle: p.cycle };
  });
  const [remainingSec, setRemainingSec] = useState(() => {
    const p = phaseAt(Date.now() - anchorMs);
    return Math.max(1, Math.ceil((PHASES[p.index].ms - p.intoMs) / 1000));
  });
  const intoMsRef = useRef(0);

  useEffect(() => {
    const tick = () => {
      const p = phaseAt(Date.now() - anchorMs);
      intoMsRef.current = p.intoMs;
      setPosition(prev =>
        prev.index === p.index && prev.cycle === p.cycle ? prev : { index: p.index, cycle: p.cycle },
      );
      const secs = Math.max(1, Math.ceil((PHASES[p.index].ms - p.intoMs) / 1000));
      setRemainingSec(prev => (prev === secs ? prev : secs));
    };

    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [anchorMs]);

  // ── Animation ──────────────────────────────────────────────────────────────
  const scale = useRef(new Animated.Value(SCALE_MIN)).current;

  useEffect(() => {
    const phase = PHASES[position.index];
    // Joining mid-phase is the normal case here, so start from wherever the
    // shared clock already is and only animate the remainder.
    const progress = Math.min(1, Math.max(0, intoMsRef.current / phase.ms));
    const remainingMs = Math.max(TICK_MS, phase.ms - intoMsRef.current);
    const span = SCALE_MAX - SCALE_MIN;

    scale.stopAnimation();

    if (phase.label === 'HOLD') {
      scale.setValue(SCALE_MAX);
      return;
    }

    const from = phase.label === 'INHALE' ? SCALE_MIN + span * progress : SCALE_MAX - span * progress;
    const to = phase.label === 'INHALE' ? SCALE_MAX : SCALE_MIN;

    scale.setValue(from);
    const animation = Animated.timing(scale, {
      toValue: to,
      duration: remainingMs,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [position, scale]);

  const ringScale = useMemo(
    () => scale.interpolate({ inputRange: [SCALE_MIN, SCALE_MAX], outputRange: [1, 1.16] }),
    [scale],
  );
  const ringOpacity = useMemo(
    () => scale.interpolate({ inputRange: [SCALE_MIN, SCALE_MAX], outputRange: [0.45, 0] }),
    [scale],
  );

  // ── Haptics ────────────────────────────────────────────────────────────────
  // Press-and-hold, matching the S.O.S. PulseCircle and the hug heart: the
  // buzz belongs to the inhale, then the body is left alone to hold and let go.
  const holdingRef = useRef(false);
  const [holding, setHolding] = useState(false);

  const applyPhaseVibration = useCallback((phaseIndex: number) => {
    if (!holdingRef.current) return;
    const label = PHASES[phaseIndex].label;
    if (label === 'INHALE') {
      vibrate(INHALE_PATTERN, true);
    } else if (label === 'EXHALE') {
      cancelVibration();
      vibrate(EXHALE_CUE_MS);
    } else {
      cancelVibration();
    }
  }, []);

  // Re-cue on every phase turn while the finger stays down.
  useEffect(() => {
    applyPhaseVibration(position.index);
  }, [position, applyPhaseVibration]);

  const handlePressIn = useCallback(() => {
    holdingRef.current = true;
    setHolding(true);
    applyPhaseVibration(position.index);
  }, [applyPhaseVibration, position.index]);

  const handlePressOut = useCallback(() => {
    holdingRef.current = false;
    setHolding(false);
    cancelVibration();
  }, []);

  // Never leave a buzz running behind us.
  useEffect(() => {
    const stop = () => {
      holdingRef.current = false;
      setHolding(false);
      cancelVibration();
    };
    const unsubscribe = navigation.addListener('blur', stop);
    return () => {
      unsubscribe();
      stop();
    };
  }, [navigation]);

  const phase = PHASES[position.index];
  const phaseHint =
    phase.label === 'INHALE'
      ? 'Draw it in slowly'
      : phase.label === 'HOLD'
        ? 'Stay here a moment'
        : 'Let it all go';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <AppHeader title="Breathe Together" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.syncPill}>
          <View style={styles.syncDot} />
          <Text style={styles.syncText}>Synchronized · cycle {position.cycle}</Text>
        </View>

        <Text style={styles.subtitle}>
          The same rhythm is running on {partnerName}'s phone. Nothing to say, nothing to fix.
        </Text>

        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={() => {}}
          delayLongPress={100}
          accessibilityRole="button"
          accessibilityLabel={`${phase.label.toLowerCase()}, ${remainingSec} seconds. Hold to feel the rhythm.`}
          accessibilityHint="Press and hold to feel the breath as a gentle vibration"
        >
          <View style={styles.circleWrap}>
            <Animated.View
              style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
            />
            <Animated.View style={[styles.circle, { transform: [{ scale }] }]}>
              <Text style={styles.phaseLabel}>{phase.label}</Text>
              <Text style={styles.phaseCount}>{remainingSec}S</Text>
              <Text style={styles.phaseSub}>{phaseHint}</Text>
            </Animated.View>
          </View>
        </Pressable>

        <Text style={styles.cadence}>4s Inhale · 4s Hold · 6s Exhale</Text>

        <View style={styles.hintRow}>
          <VibrationIcon color={holding ? colors.gold : colors.neutralSubtle} size={16} />
          <Text style={[styles.hintText, holding && styles.hintTextActive]}>
            {!vibrationEnabled
              ? 'Vibration is off in your settings'
              : holding
                ? 'Feel it — the buzz breathes with you'
                : 'Hold the circle to feel the breath'}
          </Text>
        </View>

        <View style={[styles.card, styles.presenceCard]}>
          <View style={styles.presenceIcon}>
            {acknowledged ? (
              <HeartIcon color={colors.gold} size={18} />
            ) : (
              <LeafIcon color={colors.primaryLight} size={18} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.presenceTitle}>
              {acknowledged ? `${partnerName} is holding you too` : `Holding space for ${partnerName}`}
            </Text>
            <Text style={styles.presenceBody}>
              Both phones count from the moment your hug landed, so you're on the same breath even
              if you started at different times.
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.cta}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="I'm done breathing"
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
        >
          <HeartIcon color={colors.ctaText} size={18} />
          <Text style={styles.ctaText}>I'm Steadier Now</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.popToTop()}
          accessibilityRole="button"
          accessibilityLabel="Back to sanctuary"
          android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
        >
          <HomeIcon color={colors.neutral} />
          <Text style={styles.secondaryText}>Back to Sanctuary</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  topTitle: { ...typography.headlineSm, color: colors.neutral, flex: 1, textAlign: 'center', fontSize: 18 },

  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },

  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  syncDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gold },
  syncText: { ...typography.bodySm, color: colors.gold, fontSize: 12 },

  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },

  circleWrap: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  ring: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    borderWidth: 1,
    borderColor: colors.gold,
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
  phaseLabel: { ...typography.headlineSm, color: colors.tertiary, fontSize: 22, letterSpacing: 2 },
  phaseCount: { ...typography.headline, color: colors.neutral, fontSize: 36, marginTop: 4 },
  phaseSub: { ...typography.label, color: colors.neutralMuted, fontSize: 10, marginTop: 6 },

  cadence: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.lg },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  hintText: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 12 },
  hintTextActive: { color: colors.gold },

  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    width: '100%',
  },
  presenceCard: {
    flexDirection: 'row',
    gap: 10,
    marginTop: spacing.lg,
    backgroundColor: 'rgba(6,78,59,0.35)',
    borderColor: 'rgba(167,210,182,0.18)',
  },
  presenceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(167,210,182,0.12)',
  },
  presenceTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 15 },
  presenceBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4, lineHeight: 19 },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.ctaBackground,
    height: 56,
    borderRadius: 28,
    marginBottom: spacing.sm,
    width: '100%',
  },
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    width: '100%',
  },
  secondaryText: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },
});
