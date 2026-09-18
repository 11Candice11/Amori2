import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';

import { TogetherScreen } from '../screens/TogetherScreen';
import { AddCalendarEventScreen } from '../screens/AddCalendarEventScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { MemoriesScreen } from '../../memories/screens/MemoriesScreen';
import { AddMemoryScreen } from '../../memories/screens/AddMemoryScreen';
import { RelationshipTimelineScreen } from '../../memories/screens/RelationshipTimelineScreen';

const Stack = createNativeStackNavigator<TogetherStackParamList>();

export function TogetherNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TogetherHome" component={TogetherScreen} />
      <Stack.Screen name="AddCalendarEvent" component={AddCalendarEventScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="Memories" component={MemoriesScreen} />
      <Stack.Screen name="AddMemory" component={AddMemoryScreen} />
      <Stack.Screen name="RelationshipTimeline" component={RelationshipTimelineScreen} />
    </Stack.Navigator>
  );
}
