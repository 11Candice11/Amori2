import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DistractionStackParamList } from '../../../navigation/DistractionStackParamList';

import { DistractionScreen } from '../screens/DistractionScreen';
import { HiddenNumberScreen } from '../screens/HiddenNumberScreen';
import { Game2048Screen } from '../screens/Game2048Screen';
import { CoupleQuizScreen } from '../screens/CoupleQuizScreen';
import { WouldYouRatherScreen } from '../screens/WouldYouRatherScreen';
import { SomaticSuiteScreen } from '../screens/SomaticSuiteScreen';

const Stack = createNativeStackNavigator<DistractionStackParamList>();

/**
 * DistractionNavigator — the Distraction Centre hub plus its games and the DBT
 * Somatic Regulation Suite. Registered as a hidden nested stack (no bottom-bar
 * button); reached from the dashboard "Distraction" quick-action.
 */
export function DistractionNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="DistractionHome" component={DistractionScreen} />
      <Stack.Screen name="HiddenNumber" component={HiddenNumberScreen} />
      <Stack.Screen name="Game2048" component={Game2048Screen} />
      <Stack.Screen name="CoupleQuiz" component={CoupleQuizScreen} />
      <Stack.Screen name="WouldYouRather" component={WouldYouRatherScreen} />
      <Stack.Screen name="SomaticSuite" component={SomaticSuiteScreen} />
    </Stack.Navigator>
  );
}
