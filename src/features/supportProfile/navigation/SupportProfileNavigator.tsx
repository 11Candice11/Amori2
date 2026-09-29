import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SupportProfileStackParamList } from '../../../navigation/SupportProfileStackParamList';

import {
  SupportProfileHomeScreen,
  SupportSectionEditorScreen,
  PartnerSupportProfileScreen,
} from '../screens';

const Stack = createNativeStackNavigator<SupportProfileStackParamList>();

/**
 * The Support Preferences / "How to Know Me" flow: the owner's editable
 * handbook, a per-section editor, and the read-only partner view. Registered as
 * a nested stack (hidden from the bottom bar) so it can be opened full-screen
 * from Settings and from contextual entry points.
 */
export function SupportProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="SupportProfileHome" component={SupportProfileHomeScreen} />
      <Stack.Screen name="SupportSectionEditor" component={SupportSectionEditorScreen} />
      <Stack.Screen name="PartnerSupportProfile" component={PartnerSupportProfileScreen} />
    </Stack.Navigator>
  );
}
