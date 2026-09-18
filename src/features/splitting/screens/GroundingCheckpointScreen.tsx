/**
 * Screen 2 — Grounding Checkpoint.
 * "What might be making things harder right now?" A gentle, multi-select
 * trigger inventory grouped by physical / emotional / relational signals.
 */
import React, { useMemo, useState } from 'react';
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
  SelectChip,
  ChoiceCard,
  PrimaryButton,
  TextButton,
  NoteCallout,
  LeafIcon,
} from '../components';
import {
  TRIGGER_OPTIONS,
  TRIGGER_GROUP_TITLES,
  TRIGGER_GROUP_HINTS,
  triggerLabels,
  PARTNER_NAME,
} from '../utils/splittingData';
import type { TriggerGroup } from '../types/splitting.types';
import { EMPTY_FLOW_STATE, inferInitialMood } from '../types/splitting.types';
import { useSplittingSession } from '../hooks/useSplittingSession';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'GroundingCheckpoint'>;
type Rt = RouteProp<SplittingStackParamList, 'GroundingCheckpoint'>;

const GROUP_ORDER: TriggerGroup[] = ['physical', 'emotional', 'relational'];

export function GroundingCheckpointScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [selected, setSelected] = useState<string[]>(flow.triggers);
  const [dontKnow, setDontKnow] = useState<boolean>(flow.dontKnow);
  const { create, update, pending, error } = useSplittingSession();

  const grouped = useMemo(() => {
    return GROUP_ORDER.map(group => ({
      group,
      options: TRIGGER_OPTIONS.filter(o => o.group === group),
    }));
  }, []);

  const toggle = (id: string) => {
    setDontKnow(false);
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const proceed = async () => {
    const feelings = triggerLabels(selected);
    const nextFlow = { ...flow, triggers: selected, dontKnow };

    // Create the backend session the first time through; update it if the
    // person came back and changed their selections.
    const session = flow.sessionId
      ? await update(flow.sessionId, { feelingsSelected: feelings })
      : await create({
          feelingsSelected: feelings,
          initialMood: inferInitialMood(selected),
        });

    if (!session) return; // stay on screen; error is surfaced below

    navigation.navigate('InwardCheck', { flow: { ...nextFlow, sessionId: session.id } });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SplittingHeader eyebrow="Splitting Anchor" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <StatusPill label="Grounding checkpoint" />

        <Text style={styles.title}>What might be making things harder right now?</Text>
        <Text style={styles.subtitle}>
          You can choose more than one. There's no wrong answer here — just what you feel.
        </Text>

        <ChoiceCard
          title="I don't know"
          tag="Safe choice"
          description={`Totally fine, we can skip explaining. You don't have to figure it all out right now.`}
          selected={dontKnow}
          onPress={() => {
            setDontKnow(v => !v);
            setSelected([]);
          }}
        />

        {grouped.map(({ group, options }) => (
          <View key={group}>
            <SectionLabel label={TRIGGER_GROUP_TITLES[group]} hint={TRIGGER_GROUP_HINTS[group]} />
            <View style={styles.chipWrap}>
              {options.map(opt => (
                <SelectChip
                  key={opt.id}
                  label={opt.label}
                  selected={selected.includes(opt.id)}
                  onPress={() => toggle(opt.id)}
                />
              ))}
            </View>
          </View>
        ))}

        <NoteCallout icon={<LeafIcon color={colors.gold} size={18} />} style={styles.note}>
          <Text style={styles.noteBody}>
            Remember: identifying a trigger doesn't excuse hurt, but it helps Amori soften the edge and keep {PARTNER_NAME} informed gently.
          </Text>
        </NoteCallout>
      </ScrollView>

      <View style={styles.bottomBar}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          label={pending ? 'Saving…' : 'Continue to Calm'}
          withArrow
          disabled={pending}
          onPress={proceed}
        />
        <TextButton label="Skip this step" onPress={proceed} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.headline, color: colors.neutral, marginTop: spacing.md, fontSize: 26 },
  subtitle: { ...typography.body, color: colors.neutralMuted, marginTop: spacing.sm, marginBottom: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { marginTop: spacing.lg, backgroundColor: 'rgba(6,78,59,0.3)' },
  noteBody: { ...typography.bodySm, color: colors.neutralMuted, lineHeight: 18 },
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
