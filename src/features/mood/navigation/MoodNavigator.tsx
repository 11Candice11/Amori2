import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MoodStackParamList } from '../../../navigation/MoodStackParamList';

import { CheckInScreen } from '../screens/CheckInScreen';
import { MoodBreatheScreen } from '../screens/MoodBreatheScreen';
import { MoodGroundingScreen } from '../screens/MoodGroundingScreen';
import { MoodGiftScreen } from '../screens/MoodGiftScreen';
import { MoodDetailScreen } from '../screens/MoodDetailScreen';

const Stack = createNativeStackNavigator<MoodStackParamList>();

/**
 * MoodNavigator — hosts the mood check-in ("Check-in" tab) plus the follow-on
 * action screens the user can reach from the check-in confirmation, tailored
 * to the mood quadrant they logged.
 */
export function MoodNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="CheckInHome" component={CheckInScreen} />
      <Stack.Screen name="MoodBreathe" component={MoodBreatheScreen} />
      <Stack.Screen name="MoodGrounding" component={MoodGroundingScreen} />
      <Stack.Screen name="MoodGift" component={MoodGiftScreen} />
      <Stack.Screen name="MoodDetail" component={MoodDetailScreen} />
    </Stack.Navigator>
  );
}
