/**
 * NotificationTypeIcon — picks a glyph for a notification based on its
 * `notificationType`. Unknown/absent types fall back to a generic bell so the
 * row still reads cleanly.
 *
 * Uses the app's hand-rolled react-native-svg icon convention.
 */
import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

import { colors } from '../../../shared/theme';

type Props = {
  type: string | null;
  size?: number;
};

const ICON_COLOR = colors.gold;

function HeartGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 20s-7-4.35-7-9.5A3.5 3.5 0 0112 6.5 3.5 3.5 0 0119 10.5c0 5.15-7 9.5-7 9.5z"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ClockGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} stroke={ICON_COLOR} strokeWidth={1.6} />
      <Path
        d="M12 8v4l3 2"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function LinkGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BrokenLinkGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Two link halves pulled apart, with a small break mark between them. */}
      <Path
        d="M9 15l-1.5 1.5a3.5 3.5 0 0 1-4.95-4.95L5 9.6"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 9l1.5-1.5a3.5 3.5 0 0 1 4.95 4.95L19 14.4"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 4v3M20 12h-3M12 20v-3M4 12h3"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AlertGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l9 16H3l9-16z"
        stroke={colors.emergency}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 10v4" stroke={colors.emergency} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={12} cy={16.5} r={0.9} fill={colors.emergency} />
    </Svg>
  );
}

function BellGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function StarGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarGlyph({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2v3M16 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
        stroke={ICON_COLOR}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function NotificationTypeIcon({ type, size = 22 }: Props) {
  const t = (type ?? '').toLowerCase();

  if (t.includes('hug')) return <HeartGlyph size={size} />;
  if (t.includes('reminder')) return <ClockGlyph size={size} />;
  if (t.includes('unlink')) return <BrokenLinkGlyph size={size} />;
  if (t.includes('partnerlink') || t.includes('link')) return <LinkGlyph size={size} />;
  if (t.includes('emergency')) return <AlertGlyph size={size} />;
  if (t.includes('vision')) return <StarGlyph size={size} />;
  if (t.includes('calendar') || t.includes('event')) return <CalendarGlyph size={size} />;

  return <BellGlyph size={size} />;
}
