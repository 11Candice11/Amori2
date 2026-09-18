import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SplittingStackParamList } from '../../../navigation/SplittingStackParamList';

import {
  SplittingIntroScreen,
  GroundingCheckpointScreen,
  InwardCheckScreen,
  DeEscalationPacingScreen,
  CompassionBridgeScreen,
  DistractionCentreScreen,
  GroundingActivitiesScreen,
  BreatheWithMeScreen,
  SafeTransitionScreen,
  PartnerDispatchScreen,
  SanctuaryJournalScreen,
} from '../screens';

const Stack = createNativeStackNavigator<SplittingStackParamList>();

/**
 * Self-contained "I'm Splitting" grounding flow. Registered as a nested stack
 * so it can be launched as a full-screen journey and unwound with popToTop().
 */
export function SplittingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="SplittingIntro" component={SplittingIntroScreen} />
      <Stack.Screen name="GroundingCheckpoint" component={GroundingCheckpointScreen} />
      <Stack.Screen name="InwardCheck" component={InwardCheckScreen} />
      <Stack.Screen name="DeEscalationPacing" component={DeEscalationPacingScreen} />
      <Stack.Screen name="CompassionBridge" component={CompassionBridgeScreen} />
      <Stack.Screen name="DistractionCentre" component={DistractionCentreScreen} />
      <Stack.Screen name="GroundingActivities" component={GroundingActivitiesScreen} />
      <Stack.Screen name="BreatheWithMe" component={BreatheWithMeScreen} />
      <Stack.Screen name="SafeTransition" component={SafeTransitionScreen} />
      <Stack.Screen name="PartnerDispatch" component={PartnerDispatchScreen} />
      <Stack.Screen name="SanctuaryJournal" component={SanctuaryJournalScreen} />
    </Stack.Navigator>
  );
}
