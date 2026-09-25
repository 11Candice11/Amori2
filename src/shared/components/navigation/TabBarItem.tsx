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
  // The framed illustrated art reads better a touch larger than the line-glyph
  // size, so scale up slightly from the base token.
  const size = layout.tabIconSize + 4;

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
  const iconColor = isFocused ? colors.tabActive : colors.tabInactive;

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
      <Text style={[styles.label, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 56,
  },
  icon: {
    marginBottom: 4,
  },
  label: {
    ...typography.tabLabel,
    marginTop: 2,
  },
});
