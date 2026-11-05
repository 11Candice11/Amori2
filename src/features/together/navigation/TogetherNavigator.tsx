import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';

import { TogetherScreen } from '../screens/TogetherScreen';
import { CalendarScreen } from '../screens/CalendarScreen';
import { CalendarDayScreen } from '../screens/CalendarDayScreen';
import { AddCalendarEventScreen } from '../screens/AddCalendarEventScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { AddWishlistItemScreen } from '../screens/AddWishlistItemScreen';
import { DateIdeasScreen } from '../screens/DateIdeasScreen';
import { AddDateIdeaScreen } from '../screens/AddDateIdeaScreen';
import { ImportantDatesScreen } from '../screens/ImportantDatesScreen';
import { MemoriesScreen } from '../../memories/screens/MemoriesScreen';
import { MonthlyMemoriesScreen } from '../../memories/screens/MonthlyMemoriesScreen';
import { MonthlySnapshotScreen } from '../screens/MonthlySnapshotScreen';
import { AddMemoryScreen } from '../../memories/screens/AddMemoryScreen';
import { RelationshipTimelineScreen } from '../../memories/screens/RelationshipTimelineScreen';
import { MemoryMapScreen } from '../../memories/screens/MemoryMapScreen';
import { VisionBoardScreen } from '../screens/VisionBoardScreen';
import { VisionBoardItemDetailScreen } from '../screens/VisionBoardItemDetailScreen';
import { AddVisionBoardItemScreen } from '../screens/AddVisionBoardItemScreen';

const Stack = createNativeStackNavigator<TogetherStackParamList>();

export function TogetherNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="TogetherHome" component={TogetherScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
      <Stack.Screen name="CalendarDay" component={CalendarDayScreen} />
      <Stack.Screen name="AddCalendarEvent" component={AddCalendarEventScreen} />
      <Stack.Screen name="Wishlist" component={WishlistScreen} />
      <Stack.Screen name="AddWishlistItem" component={AddWishlistItemScreen} />
      <Stack.Screen name="DateIdeas" component={DateIdeasScreen} />
      <Stack.Screen name="AddDateIdea" component={AddDateIdeaScreen} />
      <Stack.Screen name="ImportantDates" component={ImportantDatesScreen} />
      <Stack.Screen name="Memories" component={MemoriesScreen} />
      <Stack.Screen name="MonthlyMemories" component={MonthlyMemoriesScreen} />
      <Stack.Screen name="MonthlySnapshot" component={MonthlySnapshotScreen} />
      <Stack.Screen name="AddMemory" component={AddMemoryScreen} />
      <Stack.Screen name="RelationshipTimeline" component={RelationshipTimelineScreen} />
      <Stack.Screen name="MemoryMap" component={MemoryMapScreen} />
      <Stack.Screen name="VisionBoard" component={VisionBoardScreen} />
      <Stack.Screen name="VisionBoardItemDetail" component={VisionBoardItemDetailScreen} />
      <Stack.Screen name="AddVisionBoardItem" component={AddVisionBoardItemScreen} />
    </Stack.Navigator>
  );
}
