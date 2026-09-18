import React from 'react';
import Svg, { Path, Rect, Circle } from 'react-native-svg';


type TabIconProps = {
  color: string;
  size?: number;
};

export function HomeIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Roof / gable */}
      <Path
        d="M3 11L12 3l9 8"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Walls */}
      <Path
        d="M5 9.5V20a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1V9.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckInIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12h2.5l2-4 3 8 2.5-5 2 3H21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MemoriesIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={14}
        height={14}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Rect
        x={7}
        y={3}
        width={14}
        height={14}
        rx={2}
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M14 10l2 2.5L18 10"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M11 14h6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function TogetherIcon({ color, size = 24 }: TabIconProps) {
  // Two figures side by side — the shared "Together" space.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={8} cy={8} r={3} stroke={color} strokeWidth={1.5} />
      <Circle cx={16} cy={8} r={3} stroke={color} strokeWidth={1.5} />
      <Path
        d="M3 19c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M13.5 14.7c.75-.45 1.6-.7 2.5-.7 2.8 0 5 2 5 4.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.5} />
      <Circle cx={12} cy={10} r={3} stroke={color} strokeWidth={1.5} />
      <Path
        d="M7 18.5c1.2-2.2 3-3.5 5-3.5s3.8 1.3 5 3.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DeskIcon({ color, size = 24 }: TabIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} strokeWidth={1.5} />
      <Path d="M3 9h18" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M7 14h4M7 17h2" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={17} cy={15} r={2} stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
