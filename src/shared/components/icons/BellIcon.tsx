/**
 * BellIcon — the notification bell used in the app header. Follows the shared
 * react-native-svg icon convention (see BackIcon / TabIcons).
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

type Props = {
  color?: string;
  size?: number;
};

export function BellIcon({ color = colors.neutral, size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
