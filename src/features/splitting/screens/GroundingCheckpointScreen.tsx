/**
 * Screen 2 — Grounding Checkpoint.
 * "What might be making things harder right now?" A gentle, multi-select
 * trigger inventory grouped by physical / emotional / relational signals.
 */
import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { useCustomTriggers } from '../hooks/useCustomTriggers';

type Nav = NativeStackNavigationProp<SplittingStackParamList, 'GroundingCheckpoint'>;
type Rt = RouteProp<SplittingStackParamList, 'GroundingCheckpoint'>;

const GROUP_ORDER: TriggerGroup[] = ['physical', 'emotional', 'relational'];

export function GroundingCheckpointScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const flow = route.params?.flow ?? EMPTY_FLOW_STATE;

  const [selected, setSelected] = useState<string[]>(flow.triggers);
  const [dontKnow, setDontKnow] = useState<boolean>(flow.dontKnow);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTriggerLabel, setNewTriggerLabel] = useState('');
  const [newTriggerGroup, setNewTriggerGroup] = useState<TriggerGroup>('emotional');
  const { create, update, pending, error } = useSplittingSession();

  // The person's own triggers, saved on-device so they're waiting next time.
  const { customTriggers, addTrigger, removeTrigger } = useCustomTriggers();
  const customIds = useMemo(() => new Set(customTriggers.map(t => t.id)), [customTriggers]);

  const grouped = useMemo(() => {
    const allTriggers = [...TRIGGER_OPTIONS, ...customTriggers];
    return GROUP_ORDER.map(group => ({
      group,
      options: allTriggers.filter(o => o.group === group),
    }));
  }, [customTriggers]);

  const toggle = (id: string) => {
    setDontKnow(false);
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleAddTrigger = async () => {
    const label = newTriggerLabel.trim();
    if (!label) return;

    // Persist first so the trigger survives this session, then select it.
    const saved = await addTrigger(label, newTriggerGroup);
    if (!saved) return;

    setDontKnow(false);
    setSelected(prev => (prev.includes(saved.id) ? prev : [...prev, saved.id]));
    setNewTriggerLabel('');
    setShowAddModal(false);
  };

  /** Long-press a saved custom trigger to drop it from the list for good. */
  const handleRemoveTrigger = (id: string, label: string) => {
    Alert.alert(
      'Remove this trigger?',
      `"${label}" will no longer appear in your list. Past sessions keep it.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSelected(prev => prev.filter(x => x !== id));
            void removeTrigger(id);
          },
        },
      ],
    );
  };

  const proceed = async () => {
    // Resolve labels across the built-in list plus the person's saved triggers.
    const feelings = triggerLabels(selected, customTriggers);

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
      <SplittingHeader eyebrow="Grounding Checkpoint" subtitle="Splitting Anchor" onBack={() => navigation.goBack()} />

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
              {options.map(opt => {
                const isCustom = customIds.has(opt.id);
                return (
                  <SelectChip
                    key={opt.id}
                    label={opt.label}
                    selected={selected.includes(opt.id)}
                    onPress={() => toggle(opt.id)}
                    onLongPress={isCustom ? () => handleRemoveTrigger(opt.id, opt.label) : undefined}
                    accessibilityHint={isCustom ? 'Your own trigger. Long press to remove it.' : undefined}
                  />
                );
              })}
            </View>
          </View>
        ))}

        {/* Add custom trigger button */}
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={() => setShowAddModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Add custom trigger"
          android_ripple={{ color: 'rgba(139,111,58,0.15)' }}
        >
          <Text style={styles.addButtonText}>+ Add Custom Trigger</Text>
        </Pressable>

        <NoteCallout icon={<LeafIcon color={colors.gold} size={18} />} style={styles.note}>
          <Text style={styles.noteBody}>
            Remember: identifying a trigger doesn't excuse hurt, but it helps Amori soften the edge and keep {PARTNER_NAME} informed gently.
          </Text>
        </NoteCallout>
      </ScrollView>

      {/* Add Trigger Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Trigger</Text>
            <Text style={styles.modalSubtitle}>
              Describe what's making things harder right now. We'll keep it in your list for next time.
            </Text>

            {/* Trigger label input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TRIGGER NAME</Text>
              <TextInput
                style={styles.input}
                value={newTriggerLabel}
                onChangeText={setNewTriggerLabel}
                placeholder="e.g., Work stress, Family tension"
                placeholderTextColor={colors.neutralSubtle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => void handleAddTrigger()}
              />
            </View>

            {/* Category selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CATEGORY</Text>
              <View style={styles.categoryButtons}>
                {GROUP_ORDER.map(group => (
                  <Pressable
                    key={group}
                    style={({ pressed }) => [
                      styles.categoryButton,
                      newTriggerGroup === group && styles.categoryButtonActive,
                      pressed && styles.categoryButtonPressed,
                    ]}
                    onPress={() => setNewTriggerGroup(group)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: newTriggerGroup === group }}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        newTriggerGroup === group && styles.categoryButtonTextActive,
                      ]}
                    >
                      {TRIGGER_GROUP_TITLES[group]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Modal actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSecondary,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={() => {
                  setShowAddModal(false);
                  setNewTriggerLabel('');
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  pressed && styles.modalButtonPressed,
                  !newTriggerLabel.trim() && styles.modalButtonDisabled,
                ]}
                onPress={() => void handleAddTrigger()}
                disabled={!newTriggerLabel.trim()}
              >
                <Text style={styles.modalButtonPrimaryText}>Add Trigger</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  addButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(139,111,58,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    backgroundColor: 'rgba(139,111,58,0.12)',
  },
  addButtonText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 15,
  },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    ...typography.headline,
    color: colors.neutral,
    fontSize: 22,
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 11,
    marginBottom: spacing.xs,
    letterSpacing: 0.5,
  },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryButtonActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.15)',
  },
  categoryButtonPressed: {
    opacity: 0.7,
  },
  categoryButtonText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  categoryButtonTextActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.ctaBackground,
  },
  modalButtonSecondary: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonPressed: {
    opacity: 0.8,
  },
  modalButtonPrimaryText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
  modalButtonSecondaryText: {
    ...typography.bodySemiBold,
    color: colors.neutralMuted,
    fontSize: 15,
  },
});
