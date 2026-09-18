/**
 * Screen — Safe Haven Inward Check.
 * "What do you need right now?" Single-select of Space / Reassurance /
 * Distraction / Support, each routing to its own supportive path.
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
  StepProgress,
  ChoiceCard,
  PrimaryButton,
  TextButton,
  NoteCallout,
  MoonIcon,
  HeartIcon,
  SparkleIcon,
  HandsIcon,
  ShieldIcon,
} from '../components';
import { NEED_OPTIONS, PARTNER_NAME } from '../utils/splittingData';
import type { SupportNeed } from '../types/splitting.types';
import { EMPTY_FLOW_STATE, NEED_TO_ACTION } from '../types/splitting.types';
import { useSplittingSession } from '../hooks/useSplittingSession';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'InwardCheck'>;
type Rt = RouteProp<SplittingStackParamList, 'InwardCheck'>;

const NEED_ICON: Record<SupportNeed, React.ReactNode> = {
  space: <MoonIcon color={colors.gold} size={20} />,
  reassurance: <HeartIcon color={colors.gold} size={20} />,
  distraction: <SparkleIcon color={colors.gold} size={20} />,
  support: <HandsIcon color={colors.gold} size={20} />,
};

// Where each chosen need leads. The outcome is tailored to the need:
//   space       → pace + grounding activities (DeEscalationPacing → GroundingActivities)
//   reassurance → partner's messages, memories & a surprise (CompassionBridge)
//   distraction → cozy low-stakes escapes (DistractionCentre)
//   support     → guided grounding exercises (BreatheWithMe)
const NEED_ROUTE: Record<SupportNeed, keyof SplittingStackParamList> = {
  space: 'DeEscalationPacing',
  reassurance: 'CompassionBridge',
  distraction: 'DistractionCentre',
  support: 'BreatheWithMe',
};

export function InwardCheckScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [need, setNeed] = useState<SupportNeed | undefined>(flow.need);
  const { update, pending, error } = useSplittingSession();

  const proceed = async () => {
    if (!need) return;
    const nextFlow = { ...flow, need };
    const chosen = NEED_OPTIONS.find(n => n.id === need);

    // Persist what the person needs + the support action they're taking.
    if (flow.sessionId) {
      const updated = await update(flow.sessionId, {
        whatINeed: chosen?.title ?? need,
        actionsTaken: [NEED_TO_ACTION[need]],
      });
      if (!updated) return; // error surfaced below
    }

    navigation.navigate(NEED_ROUTE[need] as any, { flow: nextFlow });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Splitting Anchor" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <Text style={styles.stepText}>STEP 2 OF 4</Text>
          <StepProgress total={4} current={1} />
        </View>

        <StatusPill label="Safe haven inward check" />

        <Text style={styles.title}>What do you need right now?</Text>
        <Text style={styles.subtitle}>
          Choose what feels most supportive right in this moment. You can always change your mind.
        </Text>

        {NEED_OPTIONS.map(opt => (
          <ChoiceCard
            key={opt.id}
            title={opt.title}
            tag={opt.tag}
            description={opt.description}
            icon={NEED_ICON[opt.id]}
            selected={need === opt.id}
            onPress={() => setNeed(opt.id)}
          />
        ))}

        <NoteCallout icon={<ShieldIcon color={colors.primaryLight} size={18} />} style={styles.note}>
          <Text style={styles.noteTitle}>Honor your rhythm</Text>
          <Text style={styles.noteBody}>
            {PARTNER_NAME} is softly notified only in ways you approve. There is zero expectation to perform.
          </Text>
        </NoteCallout>
      </ScrollView>

      <View style={styles.bottomBar}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={pending ? 'Saving…' : 'Choose What You Need'}
          withArrow
          disabled={!need || pending}
          onPress={proceed}
        />
        <TextButton label="Not sure yet? Take a slow breath" onPress={() => navigation.navigate('BreatheWithMe', { flow })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  progressWrap: { marginBottom: spacing.md, gap: spacing.sm },
  stepText: { ...typography.label, color: colors.gold, fontSize: 10 },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm, marginBottom: spacing.md },
  note: { marginTop: spacing.sm, backgroundColor: 'rgba(6,78,59,0.3)' },
  noteTitle: { ...typography.label, color: colors.primaryLight, fontSize: 11 },
  noteBody: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4, lineHeight: 18 },
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
