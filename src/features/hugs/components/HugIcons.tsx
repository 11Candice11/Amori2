/**
 * Inline SVG icons for the "Need a Hug" flow, matching the app's
 * hand-rolled react-native-svg icon convention (see shared/icons/TabIcons).
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

type IconProps = {
  color: string;
  size?: number;
};

/** Two embracing figures — the "tap to hold" glyph. */
export function HugFiguresIcon({ color, size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      {/* left head */}
      <Circle cx={17} cy={16} r={5} stroke={color} strokeWidth={2} />
      {/* right head */}
      <Circle cx={31} cy={16} r={5} stroke={color} strokeWidth={2} />
      {/* embracing bodies forming a soft heart-like base */}
      <Path
        d="M8 38c0-6 4-11 9-11 3 0 5 1.5 7 4 2-2.5 4-4 7-4 5 0 9 5 9 11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HeartIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0112 6.5 3.5 3.5 0 0119 10.5c0 5.15-7 9.5-7 9.5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** A cupped hand offering a heart — the "Send Me a Hug" CTA glyph. */
export function HandHeartIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11.5s-2.6-1.6-2.6-3.4A1.6 1.6 0 0112 6.6a1.6 1.6 0 012.6 1.5c0 1.8-2.6 3.4-2.6 3.4z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M3 14l4 4h7c2 0 4-1 5-3l1.5-2c.4-.6.1-1.4-.6-1.6-.5-.1-1 .1-1.3.5L16 15"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M3 13v6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDownIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronUpIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 15l6-6 6 6" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function WhisperIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h16v10H9l-4 4v-4H4V5z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function VibrationIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6h6v12H9z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M4 9v6M20 9v6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function LeafIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 19c3-4 6-7 10-9" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function SafeHarborIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0112 6.5 3.5 3.5 0 0119 10.5c0 5.15-7 9.5-7 9.5z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Concentric arcs suggesting an ambient pulse / signal. */
export function SyncIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={17} r={1.5} fill={color} />
      <Path d="M8 13a5.5 5.5 0 018 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M5 10a9.5 9.5 0 0114 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export function HistoryIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12a8 8 0 108-8 8 8 0 00-7 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 4v4h4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8v4l3 2" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HomeIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 11l8-6 8 6v8a1 1 0 01-1 1h-4v-5h-6v5H5a1 1 0 01-1-1v-8z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
