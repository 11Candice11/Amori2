/**
 * CoupleQuizScreen — the "About Us" couple quiz. Steps through questions, then
 * submits all answers to /api/quiz/sessions and shows the scored result.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '../../../shared/theme';
import { ScreenHeader, Button } from '../components/DistractionUI';
import { distractionService } from '../services/distractionService';
import { useDistractionCentre } from '../hooks/useDistractionCentre';
import type {
  QuizSessionResponse,
  SubmitQuizAnswer,
} from '../../../services/api/types';
import { QuizComposer } from '../components/QuizComposer';

export function CoupleQuizScreen() {
  const navigation = useNavigation();
  const { quizQuestions, loading, refresh } = useDistractionCentre();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const questions = quizQuestions;
  const current = questions[step] ?? null;
  const isLast = step === questions.length - 1;
  const selected = current ? answers[current.id] : undefined;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const payload: SubmitQuizAnswer[] = questions.map(q => ({
      questionId: q.id,
      answerGiven: answers[q.id] ?? '',
    }));
    try {
      const session = await distractionService.submitQuiz({ answers: payload });
      setResult(session);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit the quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        eyebrow="Reconnect · Together"
        title={'The "About Us" Quiz'}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* Author-your-own composer, available any time. */}
        {composing ? (
          <QuizComposer
            onCancel={() => setComposing(false)}
            onCreated={() => {
              setComposing(false);
              refresh();
            }}
          />
        ) : (
          <Pressable
            style={styles.addRow}
            onPress={() => setComposing(true)}
            accessibilityRole="button"
            accessibilityLabel="Add your own question"
          >
            <Text style={styles.addRowText}>+ Add your own question</Text>
          </Pressable>
        )}

        {loading ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
        ) : questions.length === 0 ? (
          <Text style={styles.empty}>
            No quiz questions yet. Add the first one above.
          </Text>
        ) : result ? (
          <ResultView result={result} onRestart={restart} />
        ) : current ? (
          <>
            <Text style={styles.progress}>
              QUESTION {step + 1} OF {questions.length}
            </Text>
            <Text style={styles.question}>{current.questionText}</Text>
            {current.createdByName ? (
              <Text style={styles.author}>
                {current.isMine ? 'Your question' : `Asked by ${current.createdByName}`}
              </Text>
            ) : null}

            <View style={styles.options}>
              {current.options.map(option => {
                const isSel = selected === option;
                return (
                  <Pressable
                    key={option}
                    style={[styles.option, isSel && styles.optionSelected]}
                    onPress={() =>
                      setAnswers(a => ({ ...a, [current.id]: option }))
                    }
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSel }}
                    accessibilityLabel={option}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSel && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.nav}>
              {step > 0 ? (
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={() => setStep(s => s - 1)}
                  style={styles.navBtn}
                />
              ) : (
                <View style={styles.navBtn} />
              )}
              {isLast ? (
                <Button
                  label={submitting ? 'Scoring…' : 'See our score'}
                  onPress={submit}
                  disabled={!selected || submitting}
                  style={styles.navBtn}
                />
              ) : (
                <Button
                  label="Next"
                  onPress={() => setStep(s => s + 1)}
                  disabled={!selected}
                  style={styles.navBtn}
                />
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultView({
  result,
  onRestart,
}: {
  result: QuizSessionResponse;
  onRestart: () => void;
}) {
  return (
    <View style={styles.result}>
      <Text style={styles.resultLabel}>YOU SCORED</Text>
      <Text style={styles.resultScore}>
        {result.score} / {result.totalQuestions}
      </Text>
      <Text style={styles.resultBody}>
        However it landed, showing up for each other is the real win.
      </Text>

      <View style={styles.breakdown}>
        {result.answers.map(a => (
          <View key={a.questionId} style={styles.breakdownRow}>
            <Text style={styles.breakdownQ}>{a.questionText}</Text>
            <Text
              style={[
                styles.breakdownA,
                { color: a.isCorrect ? colors.primaryLight : colors.emergency },
              ]}
            >
              {a.isCorrect ? '✓ ' : '✕ '}
              {a.answerGiven || '—'}
            </Text>
            {!a.isCorrect && a.correctAnswer ? (
              <Text style={styles.breakdownCorrect}>
                Actually: {a.correctAnswer}
              </Text>
            ) : null}
          </View>
        ))}
      </View>

      <Button label="Play again" variant="secondary" onPress={onRestart} />
    </View>
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
  progress: { ...typography.label, color: colors.gold, marginTop: spacing.md },
  question: {
    ...typography.headlineSm,
    color: colors.neutral,
    marginTop: spacing.sm,
  },
  author: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    marginTop: spacing.xs,
    fontStyle: 'italic',
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
  options: { marginTop: spacing.lg, gap: spacing.sm },
  option: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  optionSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(139,111,58,0.12)',
  },
  optionText: { ...typography.body, color: colors.neutral },
  optionTextSelected: { color: colors.gold },
  error: { ...typography.bodySm, color: colors.emergency, marginTop: spacing.md },
  nav: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  navBtn: { flex: 1 },
  result: { alignItems: 'center', marginTop: spacing.lg },
  resultLabel: { ...typography.label, color: colors.gold },
  resultScore: { ...typography.headlineLg, color: colors.neutral },
  resultBody: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  breakdown: { width: '100%', marginVertical: spacing.lg, gap: spacing.md },
  breakdownRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
  },
  breakdownQ: { ...typography.bodySm, color: colors.neutralMuted },
  breakdownA: { ...typography.bodySemiBold, marginTop: 4 },
  breakdownCorrect: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    marginTop: 2,
  },
});
