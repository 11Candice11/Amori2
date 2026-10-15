import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Route } from '@react-navigation/native';

import { TabImageIcon, type TabIconName } from '../icons/AppIcons';
import { colors, layout, typography } from '../../theme';
import type { TabRouteName } from './BottomNavBar.types';

/** Route names that have illustrated PNG art. */
const TAB_ICON_NAMES: TabIconName[] = ['Home', 'CheckIn', 'Together', 'Desk', 'Profile'];

function isTabIconName(name: string): name is TabIconName {
  return (TAB_ICON_NAMES as string[]).includes(name);
}

type TabBarItemProps = {
  route: Route<string>;
  label: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  androidRipple?: boolean;
};

function getTabIcon(name: TabRouteName, isFocused: boolean) {
  // Make the icons larger for better touch targets without text labels
  const size = layout.tabIconSize + 36;

  if (isTabIconName(name)) {
    return <TabImageIcon name={name} size={size} active={isFocused} />;
  }
  return null;
}

export function TabBarItem({
  route,
  label,
  isFocused,
  onPress,
  onLongPress,
  androidRipple = false,
}: TabBarItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}
      android_ripple={
        androidRipple
          ? { color: 'rgba(197, 163, 101, 0.16)', borderless: false }
          : undefined
      }
    >
      <View style={styles.icon}>{getTabIcon(route.name as TabRouteName, isFocused)}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 70,
  },
  icon: {
    // Removed bottom margin since there's no label
  },
  label: {
    ...typography.tabLabel,
    marginTop: 2,
  },
});
