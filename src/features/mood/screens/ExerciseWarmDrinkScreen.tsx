/**
 * ExerciseWarmDrinkScreen — Make a warm drink grounding exercise.
 * Step away and make tea or something warm. Feel the heat and take slow sips.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GroundingExercisePlayer } from '../components/GroundingExercisePlayer';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'ExerciseWarmDrink'>;

export function ExerciseWarmDrinkScreen() {
  const navigation = useNavigation<Nav>();

  const exercise = {
    title: 'Make a warm drink',
    eyebrow: 'COMFORT · 5 MIN',
    steps: [
      'Step away from where you are. Head to the kitchen or wherever you make tea or coffee.',
      'Choose something warm — tea, coffee, hot chocolate, or even just warm water.',
      'Notice the small rituals as you make it. The sound of water, the smell, the warmth building.',
      'Hold the cup in both hands. Feel the heat seeping into your palms. Let it warm you.',
      'Take a slow sip. Notice the temperature, the taste. Let it settle you from the inside.',
      'Take your time finishing it. Each sip is a small moment of gentleness.',
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
