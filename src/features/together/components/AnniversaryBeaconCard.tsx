/**
 * AnniversaryBeaconCard — surfaces the couple's next important date.
 *
 * Driven entirely by real ImportantDate data: it shows the soonest upcoming
 * date (by server-computed `daysUntilNext`), whether reminders are enabled,
 * and a human countdown. When there are no important dates, it renders an
 * empty prompt instead of fabricated content.
 */
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import type { ImportantDateResponse } from '../types/together.types';

// ─── Icons ──────────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8.5a6 6 0 10-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M10.5 19a1.7 1.7 0 003 0" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={colors.gold} strokeWidth={1.6} />
      <Path d="M12 7.5V12l3 2" stroke={colors.gold} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={colors.ctaText} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Pick the soonest upcoming important date by daysUntilNext. */
export function pickNextImportantDate(
  dates: ImportantDateResponse[],
): ImportantDateResponse | null {
  const upcoming = dates.filter((d) => d.daysUntilNext != null);
  if (upcoming.length === 0) return dates[0] ?? null;
  return upcoming.reduce((soonest, d) =>
    (d.daysUntilNext ?? Infinity) < (soonest.daysUntilNext ?? Infinity) ? d : soonest,
  );
}

/** Human countdown, e.g. "Today", "Tomorrow", "in 12 days". */
export function countdownLabel(days: number | null | undefined): string | null {
  if (days == null) return null;
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `in ${days} days`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type AnniversaryBeaconCardProps = {
  dates: ImportantDateResponse[];
  onAddDate?: () => void;
};

export function AnniversaryBeaconCard({ dates, onAddDate }: AnniversaryBeaconCardProps) {
  const next = useMemo(() => pickNextImportantDate(dates), [dates]);
  const timing = countdownLabel(next?.daysUntilNext);

  // Empty state — no fabricated content when the couple hasn't added a date.
  if (!next) {
    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.iconCircle}>
              <BellIcon />
            </View>
            <View style={styles.titleTextWrap}>
              <Text style={styles.title}>Anniversary Beacon</Text>
              <Text style={styles.overline}>MILESTONE ALERTS</Text>
            </View>
          </View>
        </View>
        <Text style={styles.description}>
          Add an anniversary or milestone and Amori will keep the countdown for
          you both.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={onAddDate}
          android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
          accessibilityRole="button"
          accessibilityLabel="Add an important date"
        >
          <PlusIcon />
          <Text style={styles.addBtnText}>Add a date</Text>
        </Pressable>
      </View>
    );
  }

  const remindersOn = dates.some((d) => d.reminderEnabled);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.iconCircle}>
            <BellIcon />
          </View>
          <View style={styles.titleTextWrap}>
            <Text style={styles.title}>Anniversary Beacon</Text>
            <Text style={styles.overline}>MILESTONE ALERTS</Text>
          </View>
        </View>

        {remindersOn ? (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        ) : null}
      </View>

      {/* Description — the next date's name + reminder posture */}
      <Text style={styles.description}>
        {next.name}
        {next.isRecurring ? ' recurs each year.' : '.'}
        {next.reminderEnabled && next.reminderDaysBefore != null
          ? ` You'll be reminded ${next.reminderDaysBefore} day${
              next.reminderDaysBefore === 1 ? '' : 's'
            } before.`
          : ''}
      </Text>

      {/* Footer — next milestone + countdown */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <ClockIcon />
          <Text style={styles.footerLabel} numberOfLines={1}>
            Next: {next.name}
          </Text>
        </View>
        {timing ? <Text style={styles.footerTiming}>{timing}</Text> : null}
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.85,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.25)',
    backgroundColor: 'rgba(197,163,101,0.08)',
  },
  titleTextWrap: {
    flexShrink: 1,
    gap: 2,
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  overline: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(76,175,125,0.1)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(76,175,125,0.2)',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF7D',
  },
  activeText: {
    ...typography.bodySm,
    color: '#4CAF7D',
    fontSize: 11,
  },
  description: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  footerLabel: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
    flexShrink: 1,
  },
  footerTiming: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.ctaBackground,
    borderRadius: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 13,
  },
});
