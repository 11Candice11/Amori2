/**
 * ExerciseWalkScreen — Short slow walk grounding exercise.
 * Move your body gently. Notice your feet meeting the ground with each step.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GroundingExercisePlayer } from '../components/GroundingExercisePlayer';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'ExerciseWalk'>;

export function ExerciseWalkScreen() {
  const navigation = useNavigation<Nav>();

  const exercise = {
    title: 'Short slow walk',
    eyebrow: 'MOVEMENT · 5 MIN',
    steps: [
      'Stand up slowly. Give yourself a moment to find your balance.',
      'Start walking at a gentle pace. No rush, no destination.',
      'Notice the feeling of your feet touching the ground. Heel, then toe, then the next step.',
      'Feel the movement in your body. Your legs, your arms, the gentle sway.',
      "Notice what's around you. Colors, shapes, textures. Let your eyes rest on what they find.",
      'Take a few more steps, noticing your breath as you move.',
      "When you're ready, pause. Stand still for a moment. Notice how you feel now.",
    ],
  };

  return (
    <GroundingExercisePlayer
      exercise={exercise}
      onDone={() => navigation.navigate('CheckInHome')}
      onBack={() => navigation.goBack()}
    />
  );
}
