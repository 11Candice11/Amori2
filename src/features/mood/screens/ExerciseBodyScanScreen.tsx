/**
 * ExerciseBodyScanScreen — Gentle body scan grounding exercise.
 * Move your attention slowly from your feet to your head, softening each part as you go.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { GroundingExercisePlayer } from '../components/GroundingExercisePlayer';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

type Nav = NativeStackNavigationProp<MoodStackParamList, 'ExerciseBodyScan'>;

export function ExerciseBodyScanScreen() {
  const navigation = useNavigation<Nav>();

  const exercise = {
    title: 'Gentle body scan',
    eyebrow: 'SOLO RESET · 4 MIN',
    steps: [
      'Find a comfortable position. You can sit or lie down. Close your eyes if that feels okay.',
      'Bring your attention to your feet. Notice any sensations there. Wiggle your toes gently.',
      "Let your awareness move up to your legs. Notice if they feel heavy or light. No need to change anything.",
      'Bring your attention to your belly. Feel it rise and fall with your breath. Soften your stomach.',
      'Notice your chest and shoulders. If they feel tight, imagine them softening with each exhale.',
      "Let them rest where they are. You don't need to hold anything right now.",
      'Scan your arms and hands. Let them rest where they are.',
      'Move your attention to your face. Relax your jaw, soften around your eyes. Let your whole face rest.',
      "Take a moment to notice your whole body. You're here. You're safe right now.",
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
