/**
 * Exercise54321Screen — 5-4-3-2-1 Senses grounding exercise.
 * Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GroundingExercisePlayer } from '../components/GroundingExercisePlayer';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'Exercise54321'>;

export function Exercise54321Screen() {
  const navigation = useNavigation<Nav>();

  const exercise = {
    title: '5-4-3-2-1 Senses',
    eyebrow: 'SENSORY · 3 MIN',
    steps: [
      'Name 5 things you can see around you right now. Look slowly. What colors do you notice?',
      'Notice 4 things you can feel touching your skin. Your clothes, the air, the ground beneath you.',
      'Listen for 3 sounds around you. Near or far, gentle or loud.',
      "Find 2 things you can smell. If you can't smell anything, name 2 scents you like.",
      "Notice 1 thing you can taste. Even if it's just the inside of your mouth right now.",
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
