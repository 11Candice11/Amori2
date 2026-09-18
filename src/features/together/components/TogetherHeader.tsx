/**
 * TogetherHeader — top section of the Together view.
 *
 * A fireplace-lit hero band (fireplace.png clipped to rounded corners) holding:
 *   1. Top bar        — "Amori · <COUPLE>" · lock glyph · avatar
 *   2. Overline       — "SHARED HORIZON & TIME CAPSULE"
 *   3. Title row      — "Our Sacred Cadence" + couple accent
 *   4. Countdown note — next important date + its countdown, when one exists
 *
 * Keeping the image inside the same overflow:hidden parent as the content is
 * the reliable way to prevent the image bleeding onto sibling cards (matches
 * the Home HeroHeader approach).
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

const heroImage = require('../../../../images/fireplace.png');

// ─── Icons ──────────────────────────────────────────────────────────────────

function StarIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z"
        fill={colors.gold}
      />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={10} width={14} height={10} rx={2.5} stroke={colors.neutral} strokeWidth={1.6} />
      <Path
        d="M8 10V7.5a4 4 0 018 0V10"
        stroke={colors.neutral}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.gold} strokeWidth={1.6} />
      <Path d="M12 7.5V12l3 2" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type TogetherHeaderProps = {
  /** Uppercase couple label, e.g. "JULIAN & ELENA". */
  coupleLabel: string;
  /** Countdown notice line (omitted when there's no upcoming date). */
  countdownNote?: string | null;
  /** Human countdown for the notice, e.g. "in 12 days". */
  countdownTiming?: string | null;
};

export function TogetherHeader({
  coupleLabel,
  countdownNote,
  countdownTiming,
}: TogetherHeaderProps) {
  return (
    <View style={styles.outer}>
      <View style={styles.root}>
        <Image source={heroImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={[StyleSheet.absoluteFill, styles.imageDim]} />

        <View style={styles.content}>
          {/* 1 ── Top bar */}
          <View style={styles.topBar}>
            <View style={styles.wordmarkWrap}>
              <View style={styles.wordmarkRow}>
                <StarIcon size={13} />
                <Text style={styles.wordmark}>Amori</Text>
              </View>
              <Text style={styles.coupleLabel}>{coupleLabel}</Text>
            </View>

            <View style={styles.topActions}>
              <View style={styles.iconCircle}>
                <LockIcon />
              </View>
              <View style={styles.avatarRing}>
                <View style={styles.avatarInner} />
              </View>
            </View>
          </View>

          {/* 2 ── Overline */}
          <View style={styles.overlineRow}>
            <View style={styles.overlineDot} />
            <Text style={styles.overline}>SHARED HORIZON &amp; TIME CAPSULE</Text>
          </View>

          {/* 3 ── Title row */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              Our Sacred Cadence
            </Text>
          </View>

          {/* 4 ── Countdown notice (only when a real upcoming date exists) */}
          {countdownNote ? (
            <View style={styles.noticeRow}>
              <ClockIcon />
              <Text style={styles.noticeText} numberOfLines={1}>
                {countdownNote}
              </Text>
              {countdownTiming ? (
                <Text style={styles.noticeTime}>{countdownTiming}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outer: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  root: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageDim: {
    backgroundColor: 'rgba(6, 18, 10, 0.72)',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  wordmarkWrap: {
    gap: 2,
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  wordmark: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
  },
  coupleLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 9,
    letterSpacing: 1,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(10,20,15,0.35)',
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  avatarInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(10,20,15,0.55)',
  },

  // Overline
  overlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  overlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
  },
  overline: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.headline,
    color: colors.neutral,
    flexShrink: 1,
    paddingRight: spacing.sm,
  },

  // Countdown notice
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(10,20,15,0.45)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  noticeText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    flex: 1,
  },
  noticeTime: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
});
