import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type { ChatStackParamList } from '../../../navigation/ChatStackParamList';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showError } from '../../../shared/state/bannerStore';
import { useChatTemplates } from '../hooks/useChatTemplates';
import { useComposeDraft } from '../hooks/useComposeDraft';
import { canContinue, composeMessage, trimmedAnswer } from '../utils/compose';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'ChatCompose'>;
type Route = NativeStackScreenProps<ChatStackParamList, 'ChatCompose'>['route'];

/**
 * The guided step-by-step composition flow. One prompt at a time; Continue is
 * disabled until the current required answer is non-empty; earlier answers are
 * preserved when navigating backward. The draft autosaves locally (surviving
 * restart) and syncs to the server as the user moves between steps.
 */
export function ChatComposeScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { templateType, localDraftId, conversationId } = route.params;

  const { findTemplate, loading: templatesLoading } = useChatTemplates();
  const template = findTemplate(templateType);

  const {
    ready,
    answers,
    stepIndex,
    localId,
    setAnswer,
    goToStep,
    syncToServer,
  } = useComposeDraft({ templateType, localDraftId, conversationId });

  const step = template?.steps[stepIndex];
  const isLastStep = template ? stepIndex === template.steps.length - 1 : false;

  const composedPreview = useMemo(
    () => (template ? composeMessage(template, answers) : ''),
    [template, answers],
  );

  const continueEnabled = step ? canContinue(step, answers) : false;

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1); // preserves answers
    } else {
      navigation.goBack();
    }
  }, [stepIndex, goToStep, navigation]);

  const handleContinue = useCallback(async () => {
    if (!template || !step) return;
    // Sync progress to the server so the draft is durable server-side too. The
    // local mirror is already saved, so we don't block the flow on the network.
    void syncToServer(composeMessage(template, answers));

    if (!isLastStep) {
      goToStep(stepIndex + 1);
      return;
    }
    // Ensure a server draft exists before the preview can send it.
    const serverId = await syncToServer(composeMessage(template, answers));
    if (!serverId) {
      showError('Could not save your draft. Check your connection and try again.');
      return;
    }
    navigation.navigate('ChatPreview', { localDraftId: localId });
  }, [template, step, isLastStep, stepIndex, answers, goToStep, syncToServer, navigation, localId]);

  if (templatesLoading || !ready) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Let's Chat" onBack={() => navigation.goBack()} />
        <ActivityIndicator color={colors.gold} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!template || !step) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Let's Chat" onBack={() => navigation.goBack()} />
        <Text style={styles.error}>This template isn't available right now.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title={template.title}
        subtitle={`Step ${stepIndex + 1} of ${template.steps.length}`}
        onBack={handleBack}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Completed earlier steps — tap to jump back and edit. */}
          {template.steps.slice(0, stepIndex).map((s, i) => {
            const value = trimmedAnswer(answers, s.input);
            if (!value) return null;
            return (
              <Pressable key={s.input} style={styles.completed} onPress={() => goToStep(i)}>
                <Text style={styles.completedLabel}>{s.label}</Text>
                <Text style={styles.completedValue} numberOfLines={1}>
                  “{s.prefix} {value}”
                </Text>
              </Pressable>
            );
          })}

          <Text style={styles.label}>{step.label}</Text>
          <View style={styles.prefixRow}>
            <Text style={styles.prefix}>{step.prefix}…</Text>
            {!step.required ? <Text style={styles.optional}>optional</Text> : null}
          </View>
          <TextInput
            style={[styles.input, step.multiline && styles.inputMultiline]}
            value={answers[step.input] ?? ''}
            onChangeText={(text) => setAnswer(step.input, text)}
            placeholder={step.placeholder ?? ''}
            placeholderTextColor={colors.neutralSubtle}
            multiline={step.multiline}
            autoFocus
            textAlignVertical={step.multiline ? 'top' : 'center'}
          />

          {composedPreview.length > 0 ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>So far</Text>
              <Text style={styles.previewText}>“{composedPreview}”</Text>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, !continueEnabled && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={!continueEnabled}
            accessibilityRole="button"
            accessibilityState={{ disabled: !continueEnabled }}
          >
            <Text style={styles.ctaText}>{isLastStep ? 'Review message' : 'Continue'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  loader: { marginTop: spacing.xl },
  error: { ...typography.body, color: colors.emergency, padding: spacing.md },
  completed: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  completedLabel: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 11 },
  completedValue: { ...typography.bodySm, color: colors.neutral, fontStyle: 'italic', marginTop: 2 },
  label: { ...typography.headlineSm, color: colors.neutral, marginTop: spacing.sm },
  prefixRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  prefix: { ...typography.body, color: colors.gold, fontStyle: 'italic' },
  optional: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11 },
  input: {
    ...typography.body,
    color: colors.neutral,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  inputMultiline: { minHeight: 120 },
  previewBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  previewLabel: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  previewText: { ...typography.body, color: colors.neutral, fontStyle: 'italic' },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  cta: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 28,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { ...typography.bodySemiBold, color: colors.ctaText },
});
