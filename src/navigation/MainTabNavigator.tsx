import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BottomNavBar } from '../shared/components/navigation';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { MoodNavigator } from '../features/mood/navigation/MoodNavigator';
import { TogetherNavigator } from '../features/together/navigation/TogetherNavigator';
import { HugsNavigator } from '../features/hugs/navigation/HugsNavigator';
import { ProfileScreen } from '../features/profile/screens/ProfileScreen';
import { IncidentNavigator } from '../features/incidents/navigation/IncidentNavigator';
import { SplittingNavigator } from '../features/splitting/navigation/SplittingNavigator';
import { DistractionNavigator } from '../features/distraction/navigation/DistractionNavigator';
import { VaultScreen } from '../features/vault/screens/VaultScreen';
import { TimelineNavigator } from '../features/timeline/navigation/TimelineNavigator';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { ChatNavigator } from '../features/chat/navigation/ChatNavigator';
import { WeeklyReflectionScreen } from '../features/weeklyReflection/screens/WeeklyReflectionScreen';
import { WeeklyReflectionArchiveScreen } from '../features/weeklyReflection/screens/WeeklyReflectionArchiveScreen';
import { SupportProfileNavigator } from '../features/supportProfile/navigation/SupportProfileNavigator';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type Props = {
  onLogout?: () => void;
};

export function MainTabNavigator({ onLogout }: Props) {
  const ProfileTab = React.useCallback(
    () => <ProfileScreen onLogout={onLogout} />,
    [onLogout],
  );

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomNavBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="CheckIn" component={MoodNavigator} />
      <Tab.Screen name="Together" component={TogetherNavigator} />
      <Tab.Screen name="Desk" component={IncidentNavigator} />
      <Tab.Screen name="Profile" component={ProfileTab} />
      {/* Hidden flows — no bottom-bar button (absent from TAB_CONFIG). */}
      <Tab.Screen name="Hugs" component={HugsNavigator} />
      <Tab.Screen name="Splitting" component={SplittingNavigator} />
      <Tab.Screen name="Distraction" component={DistractionNavigator} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Timeline" component={TimelineNavigator} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Chat" component={ChatNavigator} />
      <Tab.Screen name="WeeklyReflection" component={WeeklyReflectionScreen} />
      <Tab.Screen name="WeeklyReflectionArchive" component={WeeklyReflectionArchiveScreen} />
      <Tab.Screen name="SupportProfile" component={SupportProfileNavigator} />
    </Tab.Navigator>
  );
}
