/**
 * GroundingExercisePlayer — A shared component for guided grounding exercises.
 * Displays steps one at a time with gentle animations and navigation controls.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';

export interface ExerciseData {
  title: string;
  eyebrow?: string;
  steps: string[];
}

interface GroundingExercisePlayerProps {
  exercise: ExerciseData;
  onDone: () => void;
  onBack: () => void;
}

export function GroundingExercisePlayer({
  exercise,
  onDone,
  onBack,
}: GroundingExercisePlayerProps) {
  const [step, setStep] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const isLast = step === exercise.steps.length - 1;

  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step, fade]);

  const handleNext = () => {
    if (isLast) {
      onDone();
    } else {
      setStep(s => s + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 0) {
      setStep(s => s - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <AppHeader
        title={exercise.title}
        subtitle={exercise.eyebrow || 'Grounding'}
        onBack={onBack}
      />

      <View style={styles.playerBody}>
        <Text style={styles.stepCount}>
          STEP {step + 1} OF {exercise.steps.length}
        </Text>
        <Animated.Text style={[styles.stepText, { opacity: fade }]}>
          {exercise.steps[step]}
        </Animated.Text>
      </View>

      <View style={styles.playerFooter}>
        <Pressable
          style={styles.primaryBtn}
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Done' : 'Next'}
          android_ripple={{ color: 'rgba(197,163,101,0.15)' }}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? "I feel a little steadier" : "Next"}
          </Text>
        </Pressable>

        {step > 0 && (
          <Pressable
            style={styles.secondaryBtn}
            onPress={handlePrevious}
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            android_ripple={{ color: 'rgba(197,163,101,0.12)' }}
          >
            <Text style={styles.secondaryBtnText}>Back a step</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: { paddingVertical: 6, paddingRight: 12 },
  backText: { ...typography.body, color: colors.neutralMuted },
  eyebrow: { ...typography.label, color: colors.gold },
  title: {
    ...typography.headline,
    color: colors.neutral,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  playerBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.md,
  },
  stepText: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 20,
  },
  playerFooter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
  },
  secondaryBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
  },
});
