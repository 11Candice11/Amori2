/**
 * WouldYouRatherScreen — playful either/or prompts. Choosing an option posts
 * to /api/would-you-rather/questions/{id}/answer and reveals both partners'
 * choices when available.
 */
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { ScreenHeader, Button } from '../components/DistractionUI';
import { distractionService } from '../services/distractionService';
import { useDistractionCentre } from '../hooks/useDistractionCentre';
import type { WouldYouRatherQuestionResponse } from '../../../services/api/types';

export function WouldYouRatherScreen() {
  const navigation = useNavigation();
  const { wouldYouRather, loading, refresh } = useDistractionCentre();

  const [questions, setQuestions] = useState<WouldYouRatherQuestionResponse[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [newA, setNewA] = useState('');
  const [newB, setNewB] = useState('');
  const [saving, setSaving] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);

  useEffect(() => {
    setQuestions(wouldYouRather);
  }, [wouldYouRather]);

  const saveNew = async () => {
    const a = newA.trim();
    const b = newB.trim();
    if (!a || !b) {
      setComposerError('Fill in both options.');
      return;
    }
    setSaving(true);
    setComposerError(null);
    try {
      const created = await distractionService.createWouldYouRather({
        optionA: a,
        optionB: b,
      });
      setQuestions(qs => [...qs, created]);
      setNewA('');
      setNewB('');
      setComposing(false);
      refresh();
    } catch (e) {
      setComposerError(
        e instanceof Error ? e.message : 'Could not save the prompt.',
      );
    } finally {
      setSaving(false);
    }
  };

  const choose = async (
    question: WouldYouRatherQuestionResponse,
    choseOptionA: boolean,
  ) => {
    setPending(question.id);
    try {
      const updated = await distractionService.answerWouldYouRather(
        question.id,
        choseOptionA,
      );
      setQuestions(qs => qs.map(q => (q.id === updated.id ? updated : q)));
    } catch {
      // Optimistically reflect the choice even if the write fails.
      setQuestions(qs =>
        qs.map(q =>
          q.id === question.id ? { ...q, myChoiceIsOptionA: choseOptionA } : q,
        ),
      );
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        eyebrow="Whimsical futures"
        title="Would You Rather"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {composing ? (
          <View style={styles.composer}>
            <Text style={styles.prompt}>Write your own</Text>
            <TextInput
              style={styles.composerInput}
              value={newA}
              onChangeText={setNewA}
              placeholder="Would you rather… (option A)"
              placeholderTextColor={colors.neutralSubtle}
              multiline
            />
            <Text style={styles.or}>or</Text>
            <TextInput
              style={styles.composerInput}
              value={newB}
              onChangeText={setNewB}
              placeholder="…or this (option B)"
              placeholderTextColor={colors.neutralSubtle}
              multiline
            />
            {composerError ? (
              <Text style={styles.error}>{composerError}</Text>
            ) : null}
            <View style={styles.composerActions}>
              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setComposing(false)}
                style={styles.composerBtn}
              />
              <Button
                label={saving ? 'Saving…' : 'Save prompt'}
                onPress={saveNew}
                disabled={saving}
                style={styles.composerBtn}
              />
            </View>
          </View>
        ) : (
          <Pressable
            style={styles.addRow}
            onPress={() => setComposing(true)}
            accessibilityRole="button"
            accessibilityLabel="Add your own prompt"
          >
            <Text style={styles.addRowText}>+ Add your own prompt</Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
        ) : questions.length === 0 ? (
          <Text style={styles.empty}>No prompts yet. Add the first one above.</Text>
        ) : (
          questions.map(q => (
            <View key={q.id} style={styles.card}>
              <Text style={styles.prompt}>Would you rather…</Text>
              {q.createdByName ? (
                <Text style={styles.author}>
                  {q.isMine ? 'Your prompt' : `From ${q.createdByName}`}
                </Text>
              ) : null}

              <OptionRow
                label={q.optionA}
                selected={q.myChoiceIsOptionA === true}
                partnerHere={q.partnerChoiceIsOptionA === true}
                disabled={pending === q.id}
                onPress={() => choose(q, true)}
              />

              <Text style={styles.or}>or</Text>

              <OptionRow
                label={q.optionB}
                selected={q.myChoiceIsOptionA === false}
                partnerHere={q.partnerChoiceIsOptionA === false}
                disabled={pending === q.id}
                onPress={() => choose(q, false)}
              />

              {q.myChoiceIsOptionA != null &&
              q.partnerChoiceIsOptionA != null ? (
                <Text style={styles.matchNote}>
                  {q.myChoiceIsOptionA === q.partnerChoiceIsOptionA
                    ? 'You both picked the same — a little in sync today.'
                    : 'You picked differently — opposites, gently attracting.'}
                </Text>
              ) : q.myChoiceIsOptionA != null ? (
                <Text style={styles.matchNote}>
                  Saved. We'll reveal your partner's pick once they choose.
                </Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function OptionRow({
  label,
  selected,
  partnerHere,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  partnerHere: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
        {label}
      </Text>
      <View style={styles.badges}>
        {selected ? <Text style={styles.youBadge}>You</Text> : null}
        {partnerHere ? <Text style={styles.partnerBadge}>Partner</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  empty: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  prompt: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },
  author: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  addRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  addRowText: { ...typography.bodySemiBold, color: colors.gold },
  composer: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  composerInput: {
    ...typography.body,
    color: colors.neutral,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(253,252,240,0.04)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.sm },
  composerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  composerBtn: { flex: 1 },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(253,252,240,0.04)',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.12)',
  },
  optionText: { ...typography.body, color: colors.neutral },
  optionTextSelected: { color: colors.gold },
  badges: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  youBadge: {
    ...typography.label,
    fontSize: 10,
    color: colors.ctaText,
    backgroundColor: colors.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  partnerBadge: {
    ...typography.label,
    fontSize: 10,
    color: colors.primaryLight,
    borderColor: colors.primaryLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  or: {
    ...typography.label,
    color: colors.neutralSubtle,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  matchNote: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
