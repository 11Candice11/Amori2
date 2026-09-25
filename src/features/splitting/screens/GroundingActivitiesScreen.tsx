/**
 * Screen — Gentle Grounding Activities.
 * A filterable list of simple nervous-system-settling activities.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  PrimaryButton,
  LeafIcon,
  DropIcon,
  ShieldIcon,
} from '../components';
import { GROUNDING_ACTIVITIES, PARTNER_NAME, type GroundingActivity } from '../utils/splittingData';
import { EMPTY_FLOW_STATE } from '../types/splitting.types';
import { useCountdown } from '../hooks/useCountdown';
import { useSpaceWindow } from '../hooks/useSpaceWindow';
import { useSaveGroundingOnLeave } from '../hooks/useLeaveSplittingFlow';
import { MoonIcon } from '../components';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'GroundingActivities'>;
type Rt = RouteProp<SplittingStackParamList, 'GroundingActivities'>;

type Filter = 'all' | 'solo' | 'sensory' | 'quick';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'solo', label: 'Solo Reset' },
  { id: 'sensory', label: 'Sensory & Body' },
  { id: 'quick', label: 'Quick' },
];

export function GroundingActivitiesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [filter, setFilter] = useState<Filter>('all');

  // Leaving this screen after the Inward Check saves the grounding as history.
  useSaveGroundingOnLeave(flow, { actions: ['Space'] });

  // Live self-regulation window countdown (only when a fixed space duration
  // was requested). Hydrates from the backend so it survives restart, then
  // ticks down for real while grounding.
  const spaceEndsAt = useSpaceWindow(flow);
  const window = useCountdown(spaceEndsAt);

  const list = useMemo<GroundingActivity[]>(
    () => (filter === 'all' ? GROUNDING_ACTIVITIES : GROUNDING_ACTIVITIES.filter(a => a.category === filter)),
    [filter],
  );

  const begin = (activity: GroundingActivity) => {
    if (activity.id === 'five-min-reset') {
      navigation.navigate('BreatheWithMe', { flow });
    } else {
      navigation.navigate('SafeTransition', { flow });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Grounding Activities" subtitle="De-escalation Pacing" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPill label="Sanctuary harbor" />

        <Text style={styles.title}>Gentle Grounding Activities</Text>
        <Text style={styles.subtitle}>
          Pick something simple to settle your nervous system. Even 2 minutes makes a difference.
        </Text>

        {window.active ? (
          <View style={styles.windowCard}>
            <MoonIcon color={colors.gold} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.windowTitle}>Self-Regulation Window</Text>
              <Text style={styles.windowSub}>
                {window.finished
                  ? 'Your window is complete. Return whenever you feel ready.'
                  : 'Quiet time you set aside for yourself. No rush.'}
              </Text>
            </View>
            <Text style={styles.windowTime}>{window.finished ? 'Done' : window.label}</Text>
          </View>
        ) : (
          <View style={styles.paceCard}>
            <LeafIcon color={colors.primaryLight} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.paceTitle}>Nervous System Pace</Text>
              <Text style={styles.paceSub}>You are safe here. Take slow sips of air.</Text>
            </View>
          </View>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map(f => (
            <Pressable
              key={f.id}
              style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
              onPress={() => setFilter(f.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.id }}
            >
              <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {list.map(activity => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityHead}>
              <View style={styles.activityIcon}>
                <DropIcon color={colors.primaryLight} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.activityTitleRow}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  {activity.recommended ? (
                    <View style={styles.recPill}>
                      <Text style={styles.recText}>Recommended</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.activityMeta}>{activity.meta}</Text>
              </View>
            </View>
            <Text style={styles.activityDesc}>{activity.description}</Text>
            <Pressable
              style={styles.beginBtn}
              onPress={() => begin(activity)}
              accessibilityRole="button"
              accessibilityLabel={`Begin ${activity.title}`}
              android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
            >
              <Text style={styles.beginText}>Begin →</Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.pauseNote}>
          <ShieldIcon color={colors.primaryLight} size={18} />
          <Text style={styles.pauseText}>
            Safe Space Pause: {PARTNER_NAME} is notified that you are taking a mindful moment to center yourself. No rush.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <PrimaryButton
          label="Start 5-Minute Breathing Reset"
          onPress={() => navigation.navigate('BreatheWithMe', { flow })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 24 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm },

  paceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  paceTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  paceSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },

  windowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(197,163,101,0.1)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.3)',
    padding: spacing.md,
    marginTop: spacing.md,
  },
  windowTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 14 },
  windowSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2, lineHeight: 17 },
  windowTime: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },

  filterRow: { gap: 8, paddingVertical: spacing.md },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.ctaBackground, borderColor: colors.gold },
  filterText: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 13 },
  filterTextActive: { color: colors.ctaText },

  activityCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
  },
  activityHead: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  activityIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6,78,59,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  activityTitle: { ...typography.bodyMedium, color: colors.neutral, fontSize: 15 },
  recPill: { backgroundColor: 'rgba(197,163,101,0.18)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  recText: { ...typography.label, color: colors.gold, fontSize: 9 },
  activityMeta: { ...typography.label, color: colors.neutralMuted, fontSize: 10, marginTop: 3 },
  activityDesc: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 10, lineHeight: 18 },
  beginBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6,78,59,0.5)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: spacing.md,
  },
  beginText: { ...typography.bodySm, color: colors.primaryLight, fontSize: 13 },

  pauseNote: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  pauseText: { ...typography.bodySm, color: colors.neutralMuted, flex: 1, lineHeight: 18 },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
