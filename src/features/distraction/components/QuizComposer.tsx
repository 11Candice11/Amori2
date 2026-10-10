/**
 * QuizComposer — lets a partner author a new "About Us" question: the prompt,
 * a set of options, and which option is the correct answer. On save it posts
 * to /api/quiz/questions and calls onCreated so the list can refresh.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import {
  KeyboardDoneAccessory,
  KEYBOARD_DONE_ACCESSORY_ID,
} from '../../../shared/components/inputs';
import { Button } from './DistractionUI';
import { distractionService } from '../services/distractionService';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';

const MAX_OPTIONS = 4;

export function QuizComposer({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOption = (index: number, value: string) =>
    setOptions(prev => prev.map((o, i) => (i === index ? value : o)));

  const addOption = () =>
    setOptions(prev => (prev.length < MAX_OPTIONS ? [...prev, ''] : prev));

  const removeOption = (index: number) =>
    setOptions(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (correctIndex >= next.length) setCorrectIndex(0);
      return next;
    });

  const save = async () => {
    const trimmedQuestion = question.trim();
    const cleaned = options.map(o => o.trim()).filter(o => o.length > 0);
    const correct = options[correctIndex]?.trim() ?? '';

    if (!trimmedQuestion) return setError('Add a question.');
    if (cleaned.length < 2) return setError('Add at least two options.');
    if (!correct || !cleaned.includes(correct))
      return setError('Mark which option is the correct answer.');

    setSaving(true);
    setError(null);
    try {
      await distractionService.createQuizQuestion({
        questionText: trimmedQuestion,
        correctAnswer: correct,
        options: cleaned,
      });
      showSuccessOverlay('Question added');
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the question.');
      showErrorOverlay("Couldn't add question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Your question</Text>
      <TextInput
        style={styles.input}
        value={question}
        onChangeText={setQuestion}
        placeholder="e.g. What's my go-to comfort meal?"
        placeholderTextColor={colors.neutralSubtle}
        multiline
        inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
      />

      <Text style={[styles.label, { marginTop: spacing.md }]}>
        Options — tap the circle to mark the correct one
      </Text>
      {options.map((opt, i) => (
        <View key={i} style={styles.optionRow}>
          <Pressable
            style={[styles.radio, correctIndex === i && styles.radioOn]}
            onPress={() => setCorrectIndex(i)}
            accessibilityRole="radio"
            accessibilityState={{ selected: correctIndex === i }}
            accessibilityLabel={`Mark option ${i + 1} correct`}
          />
          <TextInput
            style={styles.optionInput}
            value={opt}
            onChangeText={v => setOption(i, v)}
            placeholder={`Option ${i + 1}`}
            placeholderTextColor={colors.neutralSubtle}
            returnKeyType="done"
            inputAccessoryViewID={KEYBOARD_DONE_ACCESSORY_ID}
          />
          {options.length > 2 ? (
            <Pressable
              onPress={() => removeOption(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Remove option ${i + 1}`}
            >
              <Text style={styles.remove}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {options.length < MAX_OPTIONS ? (
        <Pressable
          onPress={addOption}
          accessibilityRole="button"
          accessibilityLabel="Add another option"
        >
          <Text style={styles.addOption}>+ Add option</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Button
          label="Cancel"
          variant="secondary"
          onPress={onCancel}
          style={styles.actionBtn}
        />
        <Button
          label={saving ? 'Saving…' : 'Save question'}
          onPress={save}
          disabled={saving}
          style={styles.actionBtn}
        />
      </View>

      <KeyboardDoneAccessory />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  label: { ...typography.label, color: colors.gold },
  input: {
    ...typography.body,
    color: colors.neutral,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(139,111,58,0.04)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    minHeight: 44,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioOn: { borderColor: colors.gold, backgroundColor: colors.gold },
  optionInput: {
    ...typography.body,
    color: colors.neutral,
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(139,111,58,0.04)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
  },
  remove: { ...typography.body, color: colors.neutralMuted, paddingHorizontal: 4 },
  addOption: {
    ...typography.bodySemiBold,
    color: colors.gold,
    marginTop: spacing.sm,
  },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1 },
});
