import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { IncidentStackParamList } from '../../../navigation/IncidentStackParamList';

import { HelpDeskScreen } from '../screens/HelpDeskScreen';
import { IncidentListScreen } from '../screens/IncidentListScreen';
import { LogIncidentScreen } from '../screens/LogIncidentScreen';
import { IncidentDetailScreen } from '../screens/IncidentDetailScreen';
import { AddResponseScreen } from '../screens/AddResponseScreen';
import { AddNoteScreen } from '../screens/AddNoteScreen';
import { IncidentHistoryScreen } from '../screens/IncidentHistoryScreen';
import { IncidentSlaScreen } from '../screens/IncidentSlaScreen';
import { ResolveIncidentScreen } from '../screens/ResolveIncidentScreen';
import { CloseIncidentScreen } from '../screens/CloseIncidentScreen';
import { ReopenIncidentScreen } from '../screens/ReopenIncidentScreen';
import { IncidentReviewScreen } from '../screens/IncidentReviewScreen';
import { IncidentLessonsScreen } from '../screens/IncidentLessonsScreen';
import { SplittingNavigator } from '../../splitting/navigation/SplittingNavigator';

const Stack = createNativeStackNavigator<IncidentStackParamList>();

export function IncidentNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="HelpDesk" component={HelpDeskScreen} />
      <Stack.Screen name="IncidentList" component={IncidentListScreen} />
      <Stack.Screen name="LogIncident" component={LogIncidentScreen} />
      <Stack.Screen name="IncidentDetail" component={IncidentDetailScreen} />
      <Stack.Screen name="AddResponse" component={AddResponseScreen} />
      <Stack.Screen name="AddNote" component={AddNoteScreen} />
      <Stack.Screen name="IncidentHistory" component={IncidentHistoryScreen} />
      <Stack.Screen name="IncidentSla" component={IncidentSlaScreen} />
      <Stack.Screen name="ResolveIncident" component={ResolveIncidentScreen} />
      <Stack.Screen name="CloseIncident" component={CloseIncidentScreen} />
      <Stack.Screen name="ReopenIncident" component={ReopenIncidentScreen} />
      <Stack.Screen name="IncidentReview" component={IncidentReviewScreen} />
      <Stack.Screen name="IncidentLessons" component={IncidentLessonsScreen} />
      <Stack.Screen name="Splitting" component={SplittingNavigator} />
    </Stack.Navigator>
  );
}
