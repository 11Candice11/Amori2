/**
 * SharedCalendarCard — the shared month calendar.
 *
 * Renders a Mon-first month grid for the visible `year`/`month`, marking days
 * that have real events with a dot:
 *   - "milestone" (gold)  → an important date falls on that day
 *   - "escape"   (green)  → a shared calendar event falls on that day
 *
 * Data is derived from the backend responses passed in; there is no sample
 * data. Month chevrons call `onPrevMonth`/`onNextMonth`; "Add Event" and day
 * taps bubble up to the screen.
 */
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import type {
  CalendarEventResponse,
  ImportantDateResponse,
} from '../types/together.types';

export type CalendarEventKind = 'milestone' | 'escape';

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

// ─── Icons ──────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={colors.neutralMuted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={colors.neutralMuted} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={colors.neutral} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** 0=Mon … 6=Sun index of the 1st of the month. */
function firstWeekdayMonFirst(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
  return (jsDay + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Build a grid of day numbers (null for leading/trailing blanks). */
function buildCells(year: number, month: number): (number | null)[] {
  const lead = firstWeekdayMonFirst(year, month);
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let d = 1; d <= total; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Parse a "YYYY-MM-DD" string into {year, month0, day}, or null. */
function parseDateOnly(s: string): { year: number; month0: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return { year: Number(m[1]), month0: Number(m[2]) - 1, day: Number(m[3]) };
}

/**
 * Build a day-of-month → event kind map for the visible month. Important dates
 * take precedence (milestone) over ordinary calendar events (escape).
 */
function buildEventMap(
  year: number,
  month: number,
  events: CalendarEventResponse[],
  importantDates: ImportantDateResponse[],
): Record<number, CalendarEventKind> {
  const map: Record<number, CalendarEventKind> = {};

  for (const ev of events) {
    const d = parseDateOnly(ev.eventDate);
    if (d && d.year === year && d.month0 === month) {
      map[d.day] = 'escape';
    }
  }

  // Important dates — recurring ones match on month+day for the visible year.
  for (const id of importantDates) {
    const d = parseDateOnly(id.date);
    if (!d) continue;
    const matchesMonth = d.month0 === month && (id.isRecurring || d.year === year);
    if (matchesMonth) {
      map[d.day] = 'milestone';
    }
  }

  return map;
}

// ─── Component ────────────────────────────────────────────────────────────────

type SharedCalendarCardProps = {
  year: number;
  /** 0-indexed month (0 = January). */
  month: number;
  events: CalendarEventResponse[];
  importantDates: ImportantDateResponse[];
  loading?: boolean;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onAddEvent?: () => void;
  onSelectDay?: (day: number) => void;
  /**
   * Populate the calendar with the couple's anniversary reminders (monthly
   * while under a year together, otherwise yearly). When omitted, the link is
   * hidden.
   */
  onAddAnniversaries?: () => void;
  /** Whether an anniversary sync is currently in flight. */
  addingAnniversaries?: boolean;
};

export function SharedCalendarCard({
  year,
  month,
  events,
  importantDates,
  loading = false,
  onPrevMonth,
  onNextMonth,
  onAddEvent,
  onSelectDay,
  onAddAnniversaries,
  addingAnniversaries = false,
}: SharedCalendarCardProps) {
  const cells = useMemo(() => buildCells(year, month), [year, month]);
  const eventMap = useMemo(
    () => buildEventMap(year, month, events, importantDates),
    [year, month, events, importantDates],
  );
  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  // Highlight "today" only when the visible month is the current month.
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month ? now.getDate() : null;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <View style={styles.navBtns}>
          <Pressable
            hitSlop={8}
            onPress={onPrevMonth}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
          >
            <ChevronLeft />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={onNextMonth}
            style={styles.navBtn}
            accessibilityRole="button"
            accessibilityLabel="Next month"
          >
            <ChevronRight />
          </Pressable>
        </View>
      </View>

      {/* Weekday header */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.cell}>
            <Text style={styles.weekday}>{w}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={[styles.grid, loading && styles.gridLoading]}>
        {cells.map((day, idx) => {
          if (day === null) {
            // eslint-disable-next-line react/no-array-index-key
            return <View key={`blank-${idx}`} style={styles.cell} />;
          }
          const isToday = day === todayDay;
          const kind = eventMap[day];
          return (
            <Pressable
              key={day}
              style={styles.cell}
              onPress={() => onSelectDay?.(day)}
              accessibilityRole="button"
              accessibilityLabel={`${day} ${MONTH_NAMES[month]}`}
            >
              <View style={[styles.dayInner, isToday && styles.dayToday]}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{day}</Text>
              </View>
              {kind ? (
                <View
                  style={[
                    styles.eventDot,
                    kind === 'milestone' ? styles.eventDotMilestone : styles.eventDotEscape,
                  ]}
                />
              ) : (
                <View style={styles.eventDotPlaceholder} />
              )}
            </Pressable>
          );
        })}

        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : null}
      </View>

      {/* Footer legend + add */}
      <View style={styles.footer}>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.eventDotMilestone]} />
            <Text style={styles.legendText}>Milestone</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.eventDotEscape]} />
            <Text style={styles.legendText}>Event</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={onAddEvent}
          android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
          accessibilityRole="button"
          accessibilityLabel="Add event"
        >
          <PlusIcon />
          <Text style={styles.addBtnText}>Add Event</Text>
        </Pressable>
      </View>

      {onAddAnniversaries ? (
        <Pressable
          style={({ pressed }) => [
            styles.anniversaryBtn,
            (pressed || addingAnniversaries) && styles.pressed,
          ]}
          onPress={onAddAnniversaries}
          disabled={addingAnniversaries}
          android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
          accessibilityRole="button"
          accessibilityLabel="Add anniversary reminders to the calendar"
        >
          {addingAnniversaries ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Text style={styles.anniversaryHeart}>♥</Text>
          )}
          <Text style={styles.anniversaryBtnText}>
            {addingAnniversaries ? 'Adding…' : 'Add anniversary reminders'}
          </Text>
        </Pressable>
      ) : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
  },
  navBtns: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    position: 'relative',
  },
  gridLoading: {
    opacity: 0.4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekday: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
  },
  dayInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    backgroundColor: colors.gold,
  },
  dayText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  dayTextToday: {
    color: colors.ctaText,
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },
  eventDotPlaceholder: {
    width: 5,
    height: 5,
    marginTop: 3,
  },
  eventDotMilestone: {
    backgroundColor: colors.gold,
  },
  eventDotEscape: {
    backgroundColor: colors.primaryLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 12,
  },
  anniversaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(139,111,58,0.10)',
  },
  anniversaryHeart: {
    color: colors.gold,
    fontSize: 13,
  },
  anniversaryBtnText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 13,
  },
});
