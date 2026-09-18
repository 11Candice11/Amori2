/**
 * SomaticSuiteScreen — DBT Somatic Regulation Suite. A menu of body-first
 * grounding exercises (cold reset, paced breathing, 5-4-3-2-1 grounding,
 * paired muscle release). Each opens a short, self-contained guided step.
 * Entirely client-side — nothing here is recorded to the backend.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

interface Exercise {
  id: string;
  title: string;
  tagline: string;
  steps: string[];
}

const EXERCISES: Exercise[] = [
  {
    id: 'cold',
    title: 'Cold reset (TIPP)',
    tagline: 'Cool the face to slow a racing system.',
    steps: [
      'Find something cold — cool water, an ice cube, a chilled cloth.',
      'Hold it gently to your cheeks and around your eyes.',
      'Breathe slowly for about 30 seconds and notice your heartbeat ease.',
    ],
  },
  {
    id: 'breathe',
    title: 'Paced breathing',
    tagline: 'Longer exhales tell your body it is safe.',
    steps: [
      'Breathe in softly through the nose for a count of 4.',
      'Let it out slowly through the mouth for a count of 6.',
      'Keep the exhale longer than the inhale for a few gentle rounds.',
    ],
  },
  {
    id: 'ground',
    title: '5-4-3-2-1 grounding',
    tagline: 'Come back to the room, one sense at a time.',
    steps: [
      'Name 5 things you can see.',
      'Notice 4 things you can feel touching your skin.',
      'Listen for 3 sounds around you.',
      'Find 2 things you can smell.',
      'Notice 1 thing you can taste.',
    ],
  },
  {
    id: 'release',
    title: 'Paired muscle release',
    tagline: 'Tense, then let go — teaching the body to soften.',
    steps: [
      'Gently tense your shoulders up toward your ears for 5 seconds.',
      'Release all at once and feel them drop.',
      'Repeat with your hands, then your jaw, then your whole body.',
    ],
  },
];

export function SomaticSuiteScreen() {
  const navigation = useNavigation();
  const [active, setActive] = useState<Exercise | null>(null);

  if (active) {
    return (
      <ExercisePlayer
        exercise={active}
        onDone={() => setActive(null)}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader
        eyebrow="Come back to the body"
        title="Somatic Regulation Suite"
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          When words are too much, the body can lead. Pick whatever feels
          gentlest right now.
        </Text>
        {EXERCISES.map(ex => (
          <Pressable
            key={ex.id}
            style={styles.exerciseCard}
            onPress={() => setActive(ex)}
            accessibilityRole="button"
            accessibilityLabel={ex.title}
          >
            <Text style={styles.exerciseTitle}>{ex.title}</Text>
            <Text style={styles.exerciseTagline}>{ex.tagline}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ExercisePlayer({
  exercise,
  onDone,
  onBack,
}: {
  exercise: Exercise;
  onDone: () => void;
  onBack: () => void;
}) {
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

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScreenHeader eyebrow="Guided" title={exercise.title} onBack={onBack} />
      <View style={styles.playerBody}>
        <Text style={styles.stepCount}>
          STEP {step + 1} OF {exercise.steps.length}
        </Text>
        <Animated.Text style={[styles.stepText, { opacity: fade }]}>
          {exercise.steps[step]}
        </Animated.Text>
      </View>
      <View style={styles.playerFooter}>
        {isLast ? (
          <Button label="I feel a little steadier" onPress={onDone} />
        ) : (
          <Button label="Next" onPress={() => setStep(s => s + 1)} />
        )}
        {step > 0 ? (
          <Button
            label="Back a step"
            variant="secondary"
            onPress={() => setStep(s => s - 1)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  intro: {
    ...typography.body,
    color: colors.neutralMuted,
    marginBottom: spacing.md,
  },
  exerciseCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 18 },
  exerciseTagline: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 4,
  },
  playerBody: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCount: { ...typography.label, color: colors.gold, marginBottom: spacing.md },
  stepText: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
    lineHeight: 32,
  },
  playerFooter: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
});
