/**
 * Screen — De-escalation Pacing ("Take some space").
 * Grounding rituals, an option to let Cat know you need space with a
 * pre-written gentle message, and a self-regulation duration picker.
 */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  SectionLabel,
  PrimaryButton,
  SecondaryButton,
  NoteCallout,
  LeafIcon,
  DropIcon,
  MoonIcon,
  HeartIcon,
  PlayIcon,
} from '../components';
import {
  GROUNDING_RITUALS,
  PREWRITTEN_SPACE_MESSAGE,
  PARTNER_NAME,
} from '../utils/splittingData';
import type { SpaceDuration } from '../types/splitting.types';
import { EMPTY_FLOW_STATE, SPACE_DURATION_MINUTES } from '../types/splitting.types';
import { useSplittingSession } from '../hooks/useSplittingSession';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'DeEscalationPacing'>;
type Rt = RouteProp<SplittingStackParamList, 'DeEscalationPacing'>;

const DURATIONS: { id: SpaceDuration; label: string }[] = [
  { id: '15m', label: '15 minutes' },
  { id: '30m', label: '30 minutes' },
  { id: '1h', label: '1 hour' },
  { id: 'later', label: `I'll decide later` },
];

const RITUAL_ICON: Record<string, React.ReactNode> = {
  breath: <LeafIcon color={colors.primaryLight} size={18} />,
  'cold-water': <DropIcon color={colors.primaryLight} size={18} />,
  headphones: <HeartIcon color={colors.primaryLight} size={18} />,
  'dark-quiet': <MoonIcon color={colors.primaryLight} size={18} />,
  'forest-rain': <LeafIcon color={colors.primaryLight} size={18} />,
};

export function DeEscalationPacingScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [notify, setNotify] = useState<boolean>(flow.notifiedPartner || true);
  const [duration, setDuration] = useState<SpaceDuration>(flow.spaceDuration ?? '30m');
  const { update, pending } = useSplittingSession();

  /**
   * Continue into grounding activities, starting the self-regulation window.
   * For a fixed duration we stamp `spaceEndsAt` (now + minutes) and persist it
   * to the backend so the countdown survives restart AND the partner can see
   * it. "later" stays open-ended (no timer). We store the absolute end instant
   * as the single source of truth.
   */
  const startSpace = async (notified: boolean) => {
    const minutes = SPACE_DURATION_MINUTES[duration];
    const spaceEndsAt = minutes != null ? Date.now() + minutes * 60_000 : undefined;

    // Persist the window end-time (as ISO) to the session so it's shared and
    // durable. Best-effort: if it fails we still continue with the local timer.
    if (flow.sessionId && spaceEndsAt != null) {
      await update(flow.sessionId, { spaceEndsAt: new Date(spaceEndsAt).toISOString() });
    }

    navigation.navigate('GroundingActivities', {
      flow: {
        ...flow,
        notifiedPartner: notified,
        spaceDuration: duration,
        spaceEndsAt,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="De-escalation Pacing" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.protectedCard}>
          <StatusPill label="Your sanctuary is protected" />
          <Text style={styles.protectedTitle}>Take some space.</Text>
          <Text style={styles.protectedBody}>
            It's okay to step away for a little while. You don't have to solve anything right now.
          </Text>
        </View>

        <SectionLabel label="Grounding rituals" hint="Tap to begin" />

        <Pressable
          style={styles.breathRitual}
          accessibilityRole="button"
          accessibilityLabel="Take 5 slow breaths"
          onPress={() => navigation.navigate('BreatheWithMe', { flow })}
          android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
        >
          <View style={styles.ritualIcon}>{RITUAL_ICON.breath}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ritualTitle}>Take 5 slow breaths</Text>
            <Text style={styles.ritualSub}>Visual pacing · 60 sec</Text>
          </View>
          <View style={styles.breathePill}>
            <PlayIcon color={colors.tertiary} size={12} />
            <Text style={styles.breathePillText}>Breathe</Text>
          </View>
        </Pressable>

        <View style={styles.ritualGrid}>
          {GROUNDING_RITUALS.filter(r => r.id !== 'breath').map(r => (
            <View key={r.id} style={styles.ritualTile}>
              <View style={styles.ritualIcon}>{RITUAL_ICON[r.id]}</View>
              <Text style={styles.tileTitle}>{r.title}</Text>
              <Text style={styles.tileSub}>{r.subtitle}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notifyCard}>
          <View style={styles.notifyRow}>
            <View style={styles.notifyAvatar}>
              <HeartIcon color={colors.emergency} size={16} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.notifyTitle}>Let {PARTNER_NAME} know I need space</Text>
              <Text style={styles.notifySub}>Sends gentle reassurance</Text>
            </View>
            <Switch
              value={notify}
              onValueChange={setNotify}
              trackColor={{ false: colors.border, true: colors.gold }}
              thumbColor={colors.neutral}
            />
          </View>

          {notify ? (
            <View style={styles.reassuranceBox}>
              <View style={styles.reassuranceHead}>
                <Text style={styles.reassuranceLabel}>Pre-written gentle reassurance</Text>
                <Text style={styles.reassuranceMeta}>Delivered quietly</Text>
              </View>
              <Text style={styles.reassuranceQuote}>"{PREWRITTEN_SPACE_MESSAGE}"</Text>
              <Text style={styles.reassuranceFoot}>
                Removes ambiguity and anxiety so you can both rest peacefully.
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.durationLabel}>How long do you need?</Text>
        <View style={styles.durationGrid}>
          {DURATIONS.map(d => (
            <Pressable
              key={d.id}
              style={[styles.durationBtn, duration === d.id && styles.durationBtnActive]}
              onPress={() => setDuration(d.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: duration === d.id }}
              android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
            >
              <Text style={[styles.durationText, duration === d.id && styles.durationTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          label={pending ? 'Starting…' : 'Send quiet space notice & start timer'}
          disabled={pending}
          onPress={() => startSpace(true)}
        />
        <SecondaryButton
          label="Take space quietly without notifying"
          onPress={() => startSpace(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  protectedCard: {
    backgroundColor: 'rgba(6,78,59,0.28)',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  protectedTitle: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 26 },
  protectedBody: { ...typography.body, color: colors.neutralMuted, textAlign: 'center', marginTop: spacing.sm },

  breathRitual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  ritualIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 15 },
  ritualSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },
  breathePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(197,163,101,0.16)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  breathePillText: { ...typography.bodySm, color: colors.tertiary, fontSize: 13 },

  ritualGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  ritualTile: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tileTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 15, marginTop: 10 },
  tileSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },

  notifyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(224,122,95,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  notifySub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 1 },
  reassuranceBox: {
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  reassuranceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reassuranceLabel: { ...typography.label, color: colors.gold, fontSize: 10 },
  reassuranceMeta: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },
  reassuranceQuote: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.sm,
  },
  reassuranceFoot: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.sm },

  durationLabel: { ...typography.bodyMedium, color: colors.neutral, marginTop: spacing.lg, marginBottom: spacing.sm },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationBtn: {
    width: '47%',
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  durationBtnActive: { backgroundColor: colors.ctaBackground, borderColor: colors.gold },
  durationText: { ...typography.bodyMedium, color: colors.neutralMuted, fontSize: 14 },
  durationTextActive: { color: colors.ctaText },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
});
