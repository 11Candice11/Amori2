/**
 * HugSentScreen — the confirmation / "active session" screen shown right after
 * a hug is delivered. Mirrors the second mockup: an orbiting heart, delivery
 * meta, the whispered note, a breathing prompt, an ambient sync row, and
 * navigation back to the sanctuary or to the hug history.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import type { HugStackParamList } from '../../../navigation/HugStackParamList';
import { hugService } from '../services/hugService';
import type { HugResponse } from '../../../services/api/types';
import {
  ChevronRightIcon,
  HeartIcon,
  HistoryIcon,
  HomeIcon,
  LeafIcon,
  WhisperIcon,
} from '../components/HugIcons';

type Nav = NativeStackNavigationProp<HugStackParamList, 'HugSent'>;
type Rt = RouteProp<HugStackParamList, 'HugSent'>;

/** Format the measured send round-trip into a human string. */
function formatDelivery(ms: number): string {
  if (ms <= 0) return 'Delivered';
  if (ms < 1000) return `Delivered in ${ms}ms`;
  return `Delivered in ${(ms / 1000).toFixed(1)}s`;
}

/** Short "time since" label from an ISO timestamp. */
function sentLabel(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'Sent just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Sent ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Sent ${hrs}h ago`;
  return `Sent ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}

export function HugSentScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Rt>();

  const [hug, setHug] = useState<HugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHug = useCallback(async () => {
    try {
      const h = await hugService.getHug(params.hugId);
      setHug(h);
      return h;
    } catch {
      // meta is best-effort; the hug was still sent
      return null;
    }
  }, [params.hugId]);

  useEffect(() => {
    let alive = true;
    fetchHug().finally(() => { if (alive) setLoading(false); });

    // Poll for the partner acknowledging ("holding") the hug so the sync row
    // and reply line reflect real backend state, not a fabricated status.
    pollRef.current = setInterval(async () => {
      const h = await fetchHug();
      if (h?.isAcknowledged && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 5000);

    return () => {
      alive = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchHug]);

  const partnerName = hug?.recipientName?.trim() || 'your partner';
  const acknowledged = hug?.isAcknowledged ?? false;

  // Gentle vibration for press-and-hold on the yellow heart
  const vibrationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handlePressIn = useCallback(() => {
    // Start gentle repeating vibration pattern: short pulse, pause, repeat
    const gentlePattern = [0, 40, 160];
    vibrate(gentlePattern, true);
  }, []);

  const handlePressOut = useCallback(() => {
    // Stop vibration immediately when touch ends
    cancelVibration();
    if (vibrationTimerRef.current) {
      clearInterval(vibrationTimerRef.current);
      vibrationTimerRef.current = null;
    }
  }, []);

  // Clean up vibration on unmount
  useEffect(() => {
    return () => {
      cancelVibration();
      if (vibrationTimerRef.current) clearInterval(vibrationTimerRef.current);
    };
  }, []);

  /**
   * Hand the breathing screen the hug's own timestamp: that's the clock origin
   * both partners derive the shared cadence from.
   */
  const openBreatheTogether = useCallback(() => {
    cancelVibration();
    navigation.navigate('BreatheTogether', {
      hugId: params.hugId,
      anchorIso: hug?.createdAt,
      partnerName: hug?.recipientName ?? undefined,
      isAcknowledged: hug?.isAcknowledged,
    });
  }, [navigation, params.hugId, hug]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <AppHeader title="Need A Hug · Active" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Orbiting heart */}
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onLongPress={() => {}}
          delayLongPress={100}
        >
          <View style={styles.orbitWrap}>
            <View style={styles.orbitOuter}>
              <View style={styles.orbitInner}>
                <View style={styles.planet}>
                  <HeartIcon color={colors.secondary} size={40} />
                </View>
              </View>
              <View style={styles.moon} />
            </View>
          </View>
        </Pressable>

        {/* Delivery meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <View style={styles.metaDot} />
            <Text style={styles.metaText}>
              {loading ? 'Delivering…' : formatDelivery(params.deliveryMs)}
            </Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaCell}>
            <Text style={styles.metaText}>Silent gentle glow on {partnerName}'s lock screen</Text>
          </View>
        </View>

        {/* Whispered note */}
        {loading ? (
          <View style={[styles.card, styles.centerCard]}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : hug?.whisper ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <WhisperIcon color={colors.gold} size={18} />
              <Text style={styles.cardEyebrow}>Whispered with your hug</Text>
              <Text style={styles.cardMeta}>{sentLabel(hug.createdAt)}</Text>
            </View>
            <Text style={styles.whisperQuote}>"{hug.whisper}"</Text>
          </View>
        ) : null}

        {/* Breathe together — opens the synced breathing rhythm */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.breatheCard, pressed && styles.breatheCardPressed]}
          onPress={openBreatheTogether}
          accessibilityRole="button"
          accessibilityLabel="Breathe together"
          accessibilityHint={`Opens a breathing rhythm synced with ${partnerName}`}
          android_ripple={{ color: 'rgba(167,210,182,0.12)' }}
        >
          <View style={styles.breatheRow}>
            <View style={styles.breatheIcon}>
              <LeafIcon color={colors.primaryLight} size={20} />
            </View>
            <Text style={styles.breatheTitle}>Breathe together</Text>
            <ChevronRightIcon color={colors.primaryLight} size={20} />
          </View>
          <Text style={styles.breatheBody}>
            Take a deep breath while the warmth travels. You don't have to explain or carry anything alone.
          </Text>
          <Text style={styles.breatheCue}>Tap to breathe in sync · 4s in · 4s hold · 6s out</Text>
        </Pressable>

        {/* Actions */}
        <Pressable
          style={styles.cta}
          onPress={() => navigation.popToTop()}
          accessibilityRole="button"
          accessibilityLabel="Back to sanctuary"
          android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
        >
          <HomeIcon color={colors.ctaText} />
          <Text style={styles.ctaText}>Back to Sanctuary</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('HugsHistory')}
          accessibilityRole="button"
          accessibilityLabel="View our hugs history"
          android_ripple={{ color: 'rgba(139,111,58,0.1)' }}
        >
          <HistoryIcon color={colors.neutral} />
          <Text style={styles.secondaryText}>View Our Hugs History</Text>
        </Pressable>

        <View style={styles.holdingRow}>
          <View style={styles.holdingDot} />
          <Text style={styles.holdingText}>
            {acknowledged ? `${partnerName} is holding you too` : `Holding space for ${partnerName}`}
          </Text>
          <View style={styles.holdingDot} />
        </View>
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

  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  orbitWrap: { alignItems: 'center', justifyContent: 'center', marginVertical: spacing.lg },
  orbitOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.12)',
  },
  orbitInner: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,78,59,0.4)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(139,111,58,0.16)',
  },
  planet: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
  },
  moon: {
    position: 'absolute',
    top: 22,
    right: 44,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.neutral,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
  },
  metaCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.statusDot },
  metaDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: spacing.md },
  metaText: { ...typography.bodySm, color: colors.neutralMuted, flexShrink: 1 },

  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  centerCard: { alignItems: 'center', justifyContent: 'center', minHeight: 90 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  cardEyebrow: { ...typography.label, color: colors.gold, fontSize: 10, flex: 1 },
  cardMeta: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },
  whisperQuote: { ...typography.headlineSm, color: colors.neutral, fontStyle: 'italic', lineHeight: 30 },

  breatheCard: { backgroundColor: 'rgba(6,78,59,0.35)', borderColor: 'rgba(167,210,182,0.18)' },
  breatheCardPressed: { backgroundColor: 'rgba(6,78,59,0.55)', borderColor: 'rgba(167,210,182,0.34)' },
  breatheRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.sm },
  breatheIcon: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(167,210,182,0.12)',
  },
  breatheTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 17, flex: 1 },
  breatheBody: { ...typography.body, color: colors.neutralMuted, lineHeight: 22 },
  breatheCue: { ...typography.label, color: colors.primaryLight, fontSize: 10, marginTop: spacing.sm },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.ctaBackground,
    height: 56,
    borderRadius: 28,
    marginBottom: spacing.sm,
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
  },
  secondaryText: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },

  holdingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: spacing.lg },
  holdingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  holdingText: { ...typography.bodySm, color: colors.neutralMuted },
});
