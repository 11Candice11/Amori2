/**
 * BackIcon — the single shared back chevron used by AppHeader (and anywhere
 * else a "go back" affordance is needed). Consolidates the copies that used to
 * live in DistractionUI, IncidentScreenHeader, SplittingHeader, and various
 * per-screen inline definitions.
 */
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../../theme';

type Props = {
  color?: string;
  size?: number;
};

export function BackIcon({ color = colors.neutral, size = 22 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
