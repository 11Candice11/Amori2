import { Dimensions } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const layout = {
  width: Dimensions.get('window').width,
  tabBarHeight: 72,
  tabBarTopRadius: 20,
  tabIconSize: 24,
} as const;
