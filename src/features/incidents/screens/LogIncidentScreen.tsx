import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
} from '../../../shared/components/inputs';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { incidentService } from '../services/incidentService';
import { authService } from '../../../services/auth/authService';
import { settingsService } from '../../profile/services/settingsService';
import { friendlyError } from '../utils/errorMessages';
import type { IncidentCategory, IncidentImpact, IncidentUrgency } from '../types/incident.types';

type Nav = NativeStackNavigationProp<IncidentStackParamList, 'LogIncident'>;

const CATEGORIES: IncidentCategory[] = [
  'Communication', 'Conflict', 'Affection', 'Trust',
  'Boundaries', 'Plans', 'Household', 'EmotionalSupport', 'Other',
];
const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  Communication: 'Communication',
  Conflict: 'Conflict',
  Affection: 'Affection',
  Trust: 'Trust',
  Boundaries: 'Boundaries',
  Plans: 'Plans',
  Household: 'Household',
  EmotionalSupport: 'Emotional Support',
  Other: 'Other',
};
const LEVELS: Array<IncidentImpact> = ['Low', 'Medium', 'High', 'Critical'];
const LEVEL_COLORS: Record<string, string> = {
  Low: colors.rhythmComplete,
  Medium: colors.gold,
  High: '#DC823C',
  Critical: '#B34040',
};

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<Step, string> = {
  1: 'What Happened?',
  2: 'Category',
  3: 'Impact & Urgency',
  4: 'Assign',
  5: 'Review & Submit',
};

export function LogIncidentScreen() {
  const navigation = useNavigation<Nav>();

  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IncidentCategory | null>(null);
  const [subCategory, setSubCategory] = useState('');
  const [impact, setImpact] = useState<IncidentImpact | null>(null);
  const [urgency, setUrgency] = useState<IncidentUrgency | null>(null);
  const [assigneeChoice, setAssigneeChoice] = useState<'self' | 'partner' | 'none'>('none');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Whether the user has a linked partner. Null while we're still checking.
  // "Assign to Partner" is only offered once we know a partner exists.
  const [partnerLinked, setPartnerLinked] = useState<boolean | null>(null);
  // Holds the id of an incident already created in this session so a retry
  // (after a post-create step failed) never creates a duplicate.
  const createdIncidentIdRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    settingsService
      .getPartnerStatus()
      .then(status => { if (active) setPartnerLinked(status.isLinked); })
      // If the check fails, treat it as "no partner" so we don't offer an
      // option that can't succeed. The user can still assign from the detail
      // screen once a partner is linked.
      .catch(() => { if (active) setPartnerLinked(false); });
    return () => { active = false; };
  }, []);

  const canNext = useCallback(() => {
    if (step === 1) return title.trim().length > 0;
    if (step === 2) return category !== null;
    if (step === 3) return impact !== null && urgency !== null;
    return true;
  }, [step, title, category, impact, urgency]);

  const next = () => setStep(s => Math.min(5, s + 1) as Step);
  const back = () => {
    if (step === 1) navigation.goBack();
    else setStep(s => Math.max(1, s - 1) as Step);
  };

  const submit = useCallback(async () => {
    if (!category || !impact || !urgency) return;
    setSubmitting(true);
    setError(null);

    // Step 1: create the incident. If a previous attempt already created it but
    // a later step failed, reuse that id instead of creating a duplicate.
    let incidentId = createdIncidentIdRef.current;
    if (!incidentId) {
      try {
        const incident = await incidentService.createIncident({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          subCategory: subCategory.trim() || undefined,
          impact,
          urgency,
        });
        incidentId = incident.id;
        createdIncidentIdRef.current = incident.id;
      } catch (err) {
        // The incident was never created — this is the only truly fatal path.
        setError(friendlyError(err));
        showError('Sorry that failed :(');
        setSubmitting(false);
        return;
      }
    }

    // Step 2: apply the assignee choice from step 4, if any. The incident is
    // already saved (Open/unassigned) at this point, so a failure here must NOT
    // be surfaced as a "create failed" error — that would push the user to
    // resubmit and create duplicates. Assignment can also be done from the
    // detail screen, so we navigate there regardless and let it handle any
    // recoverable issue (e.g. no partner linked yet).
    try {
      if (assigneeChoice === 'self') {
        const me = await authService.getMe();
        await incidentService.assignIncident(incidentId, me.id);
      } else if (assigneeChoice === 'partner') {
        await incidentService.reassignIncident(incidentId);
      }
    } catch (err) {
      // Non-fatal: the incident exists. Log for diagnostics and continue.
      console.warn('Incident created but assignment failed:', err);
    }

    showSuccess('Created!');
    navigation.replace('IncidentDetail', { incidentId });
  }, [category, impact, urgency, title, description, subCategory, assigneeChoice, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="New Incident"
        subtitle={`Step ${step} of 5 · ${STEP_TITLES[step]}`}
        showNotificationBell={false}
        onBack={back}
      />

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {([1, 2, 3, 4, 5] as Step[]).map(s => (
          <View key={s} style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]} />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >

          {/* ── Step 1: Title + Description ── */}
          {step === 1 && (
            <View>
              <Text style={styles.stepHeading}>What happened?</Text>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief summary of the incident"
                placeholderTextColor={colors.neutralMuted}
                maxLength={300}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="What happened in more detail?"
                placeholderTextColor={colors.neutralMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={4000}
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />
            </View>
          )}

          {/* ── Step 2: Category ── */}
          {step === 2 && (
            <View>
              <Text style={styles.stepHeading}>Category & Context</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat}
                    style={[styles.categoryBtn, category === cat && styles.categoryBtnActive]}
                    onPress={() => setCategory(cat)}
                    android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
                  >
                    <Text style={[styles.categoryBtnText, category === cat && styles.categoryBtnTextActive]}>
                      {CATEGORY_LABELS[cat]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Sub-category (optional)</Text>
              <TextInput
                style={styles.input}
                value={subCategory}
                onChangeText={setSubCategory}
                placeholder="e.g. Unshared Assumptions"
                placeholderTextColor={colors.neutralMuted}
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
              />
            </View>
          )}

          {/* ── Step 3: Impact + Urgency ── */}
          {step === 3 && (
            <View>
              <Text style={styles.stepHeading}>How serious is it?</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>Priority is calculated automatically from your impact and urgency selections.</Text>
              </View>
              <Text style={styles.fieldLabel}>Emotional Impact</Text>
              <View style={styles.levelRow}>
                {LEVELS.map(l => (
                  <Pressable
                    key={l}
                    style={[styles.levelBtn, impact === l && { backgroundColor: LEVEL_COLORS[l] + '33', borderColor: LEVEL_COLORS[l] }]}
                    onPress={() => setImpact(l)}
                    android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
                  >
                    <Text style={[styles.levelBtnText, impact === l && { color: LEVEL_COLORS[l] }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.fieldLabel}>Resolution Urgency</Text>
              <View style={styles.levelRow}>
                {LEVELS.map(l => (
                  <Pressable
                    key={l}
                    style={[styles.levelBtn, urgency === l && { backgroundColor: LEVEL_COLORS[l] + '33', borderColor: LEVEL_COLORS[l] }]}
                    onPress={() => setUrgency(l as IncidentUrgency)}
                    android_ripple={{ color: 'rgba(197,163,101,0.1)' }}
                  >
                    <Text style={[styles.levelBtnText, urgency === l && { color: LEVEL_COLORS[l] }]}>{l}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 4: Assignee ── */}
          {step === 4 && (
            <View>
              <Text style={styles.stepHeading}>Who will steward this?</Text>
              <Text style={styles.fieldDesc}>You can reassign later from the incident detail.</Text>
              {(['self', 'partner', 'none'] as const).map(choice => {
                const labels = { self: 'Assign to Myself', partner: 'Assign to Partner', none: 'Leave Unassigned' };
                // "Assign to Partner" needs a linked partner. Disable it until we
                // know one exists so the user can't pick an option that fails.
                const disabled = choice === 'partner' && partnerLinked !== true;
                return (
                  <Pressable
                    key={choice}
                    style={[
                      styles.assignOption,
                      assigneeChoice === choice && styles.assignOptionActive,
                      disabled && styles.assignOptionDisabled,
                    ]}
                    onPress={disabled ? undefined : () => setAssigneeChoice(choice)}
                    disabled={disabled}
                    android_ripple={disabled ? undefined : { color: 'rgba(197,163,101,0.08)' }}
                  >
                    <View style={[styles.assignRadio, assigneeChoice === choice && styles.assignRadioActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.assignLabel, assigneeChoice === choice && styles.assignLabelActive]}>
                        {labels[choice]}
                      </Text>
                      {choice === 'partner' && partnerLinked === false && (
                        <Text style={styles.assignHint}>Link a partner first to use this</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Step 5: Review + Submit ── */}
          {step === 5 && (
            <View>
              <Text style={styles.stepHeading}>Review & Submit</Text>
              {[
                { label: 'Title', value: title },
                { label: 'Description', value: description || '—' },
                { label: 'Category', value: category ? CATEGORY_LABELS[category] : '—' },
                { label: 'Sub-category', value: subCategory || '—' },
                { label: 'Impact', value: impact ?? '—' },
                { label: 'Urgency', value: urgency ?? '—' },
                { label: 'Assignee', value: assigneeChoice === 'self' ? 'Myself' : assigneeChoice === 'partner' ? 'Partner' : 'Unassigned' },
              ].map(row => (
                <View key={row.label} style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>{row.label}</Text>
                  <Text style={styles.reviewValue}>{row.value}</Text>
                </View>
              ))}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      <View style={styles.bottomBar}>
        {step < 5 ? (
          <Pressable
            style={[styles.primaryBtn, !canNext() && styles.primaryBtnDisabled]}
            onPress={canNext() ? next : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
            onPress={!submitting ? submit : undefined}
            android_ripple={{ color: 'rgba(10,20,15,0.25)' }}
          >
            {submitting ? <ActivityIndicator color={colors.ctaText} /> : <Text style={styles.primaryBtnText}>Submit Incident</Text>}
          </Pressable>
        )}
      </View>

      <KeyboardDoneAccessory />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },

  stepRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  stepDot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.gold },
  stepDotDone: { backgroundColor: colors.rhythmComplete },

  stepHeading: { ...typography.headlineSm, color: colors.neutral, marginBottom: spacing.sm },
  fieldLabel: { ...typography.label, color: colors.neutralMuted, marginBottom: 6, marginTop: spacing.md },
  fieldDesc: { ...typography.body, color: colors.neutralMuted, marginBottom: spacing.md },

  input: {
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    color: colors.neutral,
    ...typography.body,
  },
  multiline: { minHeight: 120 },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  categoryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  categoryBtnActive: { backgroundColor: 'rgba(197,163,101,0.15)', borderColor: colors.gold },
  categoryBtnText: { ...typography.bodySm, color: colors.neutralMuted },
  categoryBtnTextActive: { color: colors.gold },

  infoBox: {
    backgroundColor: 'rgba(197,163,101,0.08)',
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(197,163,101,0.2)',
  },
  infoText: { ...typography.bodySm, color: colors.gold },

  levelRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  levelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
  },
  levelBtnText: { ...typography.bodySm, color: colors.neutralMuted },

  assignOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
  },
  assignOptionActive: { borderColor: colors.gold },
  assignOptionDisabled: { opacity: 0.4 },
  assignRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.border },
  assignRadioActive: { borderColor: colors.gold, backgroundColor: colors.gold },
  assignLabel: { ...typography.bodyMedium, color: colors.neutralMuted },
  assignLabelActive: { color: colors.neutral },
  assignHint: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 2 },

  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 12,
  },
  reviewLabel: { ...typography.bodySm, color: colors.neutralMuted, flex: 0.4 },
  reviewValue: { ...typography.bodyMedium, color: colors.neutral, flex: 0.6, textAlign: 'right' },

  errorText: { ...typography.bodySm, color: '#B34040', marginTop: spacing.md, textAlign: 'center' },

  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  primaryBtn: {
    backgroundColor: colors.ctaBackground,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 16 },
});
