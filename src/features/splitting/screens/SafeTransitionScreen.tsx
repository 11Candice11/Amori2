/**
 * Screen — Safe Transition ("How are you feeling now?").
 * Captures the person's internal climate and their chosen next step, then
 * routes onward (back into a support path or forward to the journal).
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  SplittingHeader,
  StatusPill,
  SectionLabel,
  ChoiceCard,
  PrimaryButton,
  TextButton,
  LeafIcon,
  DropIcon,
  MoonIcon,
  HeartIcon,
  SparkleIcon,
  HandsIcon,
} from '../components';
import { PARTNER_NAME } from '../utils/splittingData';
import type { ClimateState, NextStep, SplittingAction } from '../types/splitting.types';
import { EMPTY_FLOW_STATE, CLIMATE_TO_MOOD } from '../types/splitting.types';
import { splittingService } from '../services/splittingService';
import { useSplittingSession } from '../hooks/useSplittingSession';
import { useLeaveSplittingFlow } from '../hooks/useLeaveSplittingFlow';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'SafeTransition'>;
type Rt = RouteProp<SplittingStackParamList, 'SafeTransition'>;

const CLIMATES: { id: ClimateState; title: string; description: string; icon: React.ReactNode }[] = [
  { id: 'steadier', title: 'Steadier', description: 'Feeling steadier, ground beneath feet again.', icon: <LeafIcon color={colors.primaryLight} size={20} /> },
  { id: 'same', title: 'Same', description: 'Still somewhat heavy, but holding space quietly.', icon: <MoonIcon color={colors.gold} size={20} /> },
  { id: 'worse', title: 'Worse / Still Raw', description: 'Storm is still loud, need gentler care and soft stillness.', icon: <DropIcon color={colors.primaryLight} size={20} /> },
];

const NEXT_STEPS: { id: NextStep; title: string; description: string; icon: React.ReactNode; suggested?: boolean }[] = [
  { id: 'okay', title: "I'm okay now", description: 'Ready to gently return to the sanctuary', icon: <SparkleIcon color={colors.primaryLight} size={18} /> },
  { id: 'more-space', title: 'I need more space', description: 'Restart Space Sanctuary breathing timer', icon: <MoonIcon color={colors.gold} size={18} /> },
  { id: 'reassurance', title: 'I need reassurance', description: `Read ${PARTNER_NAME}'s stored grounding notes`, icon: <HeartIcon color={colors.emergency} size={18} />, suggested: true },
  { id: 'distraction', title: 'I need distraction', description: 'Calming micro-tasks & sensory games', icon: <SparkleIcon color={colors.primaryLight} size={18} /> },
  { id: 'support', title: 'I need support', description: `Send a tender ping for ${PARTNER_NAME}'s quiet company`, icon: <HandsIcon color={colors.gold} size={18} /> },
];

export function SafeTransitionScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [climate, setClimate] = useState<ClimateState | undefined>(flow.climate ?? 'same');
  const [nextStep, setNextStep] = useState<NextStep | undefined>(flow.nextStep);
  const { update, pending, error } = useSplittingSession();
  // Persist the grounding (including the current climate pick) when leaving via
  // "Back to Home Sanctuary" so the moment they worked through lands in history.
  const { saveAndLeave } = useLeaveSplittingFlow({ ...flow, climate });

  /** Map the chosen next step to the backend action it represents, if any. */
  const NEXT_STEP_ACTION: Partial<Record<NextStep, SplittingAction>> = {
    'more-space': 'Space',
    reassurance: 'Reassurance',
    distraction: 'Distraction',
    support: 'ContactPartner',
  };

  const proceed = async () => {
    const nextFlow = { ...flow, climate, nextStep };

    // Persist how they're feeling now and the grounding path they took. We
    // merge onto the existing actions (PATCH replaces the array) by reading
    // the current session first.
    if (flow.sessionId && climate) {
      try {
        const current = await splittingService.getSession(flow.sessionId);
        const merged = new Set<SplittingAction>([...current.actionsTaken, 'Grounding']);
        const stepAction = nextStep ? NEXT_STEP_ACTION[nextStep] : undefined;
        if (stepAction) merged.add(stepAction);

        const updated = await update(flow.sessionId, {
          finalMood: CLIMATE_TO_MOOD[climate],
          actionsTaken: Array.from(merged),
        });
        if (!updated) return; // error surfaced below
      } catch {
        // If the read fails, still persist mood + a grounding action so the
        // session reflects the check-in rather than dropping it silently.
        const updated = await update(flow.sessionId, {
          finalMood: CLIMATE_TO_MOOD[climate],
          actionsTaken: ['Grounding'],
        });
        if (!updated) return;
      }
    }

    switch (nextStep) {
      case 'more-space':
        navigation.navigate('DeEscalationPacing', { flow: nextFlow });
        return;
      case 'reassurance':
        navigation.navigate('CompassionBridge', { flow: nextFlow });
        return;
      case 'distraction':
        navigation.navigate('DistractionCentre', { flow: nextFlow });
        return;
      case 'support':
        navigation.navigate('PartnerDispatch', { flow: nextFlow });
        return;
      case 'okay':
      default:
        navigation.navigate('SanctuaryJournal', { flow: nextFlow });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Safe Transition" subtitle="Splitting Anchor" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPill label="Safe transition" />

        <Text style={styles.title}>How are you feeling now?</Text>
        <Text style={styles.subtitle}>
          There is no expectation to be cured or completely fine. Just checking on your pulse.
        </Text>

        <SectionLabel label="1. Your internal climate" hint="Pick what honors truth" />
        {CLIMATES.map(c => (
          <ChoiceCard
            key={c.id}
            title={c.title}
            description={c.description}
            icon={c.icon}
            selected={climate === c.id}
            onPress={() => setClimate(c.id)}
          />
        ))}

        <SectionLabel label="2. What would help now?" hint="Select your path" />
        {NEXT_STEPS.map(s => (
          <ChoiceCard
            key={s.id}
            title={s.title}
            description={s.description}
            icon={s.icon}
            suggested={s.suggested}
            selected={nextStep === s.id}
            onPress={() => setNextStep(s.id)}
          />
        ))}

        <View style={styles.uncondCard}>
          <View style={styles.uncondBadge}>
            <LeafIcon color={colors.primaryLight} size={18} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uncondTitle}>Unconditional Sanctuary</Text>
            <Text style={styles.uncondBody}>
              Your bond with {PARTNER_NAME} is preserved. Taking time to regulate honors both of you.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={pending ? 'Saving…' : 'Save Check-in & Continue'}
          withArrow
          disabled={!nextStep || pending}
          onPress={proceed}
        />
        <TextButton
          label="Back to Home Sanctuary"
          onPress={async () => {
            // Leaving the flow after grounding — save it as history (rather than
            // cancelling) so they can come back and see this moment, then unwind.
            await saveAndLeave();
            navigation.popToTop();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm },
  uncondCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(6,78,59,0.3)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  uncondBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(6,78,59,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncondTitle: { ...typography.bodyMedium, color: colors.primaryLight, fontSize: 14 },
  uncondBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 3, lineHeight: 18 },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  errorText: { ...typography.bodySm, color: colors.emergency, textAlign: 'center', marginBottom: 4 },
});
