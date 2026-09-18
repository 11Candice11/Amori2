import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TimelineStackParamList } from '../../../navigation/TimelineStackParamList';

import { TimelineScreen } from '../screens/TimelineScreen';
import { AddTimelineEventScreen } from '../screens/AddTimelineEventScreen';

const Stack = createNativeStackNavigator<TimelineStackParamList>();

/**
 * TimelineNavigator — the couple's relationship milestone timeline plus the
 * add-milestone compose screen. Registered as a hidden nested stack (no
 * bottom-bar button); reached from the Together dashboard.
 */
export function TimelineNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TimelineHome" component={TimelineScreen} />
      <Stack.Screen name="AddTimelineEvent" component={AddTimelineEventScreen} />
    </Stack.Navigator>
  );
}
