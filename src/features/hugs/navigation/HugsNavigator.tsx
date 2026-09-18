import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HugStackParamList } from '../../../navigation/HugStackParamList';

import { NeedAHugScreen } from '../screens/NeedAHugScreen';
import { HugSentScreen } from '../screens/HugSentScreen';
import { HugsHistoryScreen } from '../screens/HugsHistoryScreen';

const Stack = createNativeStackNavigator<HugStackParamList>();

export function HugsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="NeedAHug" component={NeedAHugScreen} />
      <Stack.Screen name="HugSent" component={HugSentScreen} />
      <Stack.Screen name="HugsHistory" component={HugsHistoryScreen} />
    </Stack.Navigator>
  );
}
