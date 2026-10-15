/**
 * DateTimePickerModal — a bottom-sheet date / time picker.
 *
 * Pure JS (no native picker module), so it renders identically on iOS and
 * Android and needs no pod install or rebuild:
 *   - `date`     → a Monday-first month grid with month chevrons + "Today"
 *   - `time`     → hour / minute / AM-PM snapping wheels
 *   - `datetime` → both, behind a Date | Time segmented switch
 *
 * The sheet edits a *draft* copy of the value and only calls `onConfirm` when
 * the user taps Done, so cancelling always leaves the field untouched.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../theme';
import {
  WHEEL_HEIGHT,
  WheelHighlight,
  WheelPicker,
  type WheelItem,
} from './WheelPicker';
import {
  WEEKDAY_LABELS_SHORT,
  buildMonthCells,
  clampDate,
  formatLongDate,
  formatMonthYear,
  formatTimeOfDay,
  isDayDisabled,
  isSameDay,
  pad2,
  startOfDay,
} from './dateUtils';

export type DateTimePickerMode = 'date' | 'time' | 'datetime';

type DateTimePickerModalProps = {
  visible: boolean;
  /** Which panels to show. Defaults to `date`. */
  mode?: DateTimePickerMode;
  /** Current value; `null` starts the draft at now. */
  value: Date | null;
  onConfirm: (value: Date) => void;
  onCancel: () => void;
  /** Sheet heading. Defaults to something sensible for the mode. */
  title?: string;
  /** Earliest selectable date (inclusive, day granularity for the grid). */
  minimumDate?: Date | null;
  /** Latest selectable date (inclusive, day granularity for the grid). */
  maximumDate?: Date | null;
  /** Minute granularity for the time wheel. Defaults to 5. */
  minuteStep?: number;
  confirmLabel?: string;
};

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={colors.neutral}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={colors.neutral}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Keep a value inside [min, max].
 *
 * In `date` mode the bounds are day-granular and the clock time is preserved —
 * otherwise a `maximumDate` of "now" would quietly rewind the time component of
 * a value the user isn't even editing here (e.g. the memory form, where the
 * date and time are two separate fields over one `Date`).
 */
function clampForMode(
  d: Date,
  mode: DateTimePickerMode,
  min?: Date | null,
  max?: Date | null,
): Date {
  if (mode !== 'date') return clampDate(d, min, max);

  const withDateOf = (bound: Date): Date =>
    new Date(
      bound.getFullYear(),
      bound.getMonth(),
      bound.getDate(),
      d.getHours(),
      d.getMinutes(),
      0,
      0,
    );

  const day = startOfDay(d).getTime();
  if (min && day < startOfDay(min).getTime()) return withDateOf(min);
  if (max && day > startOfDay(max).getTime()) return withDateOf(max);
  return d;
}

/** Round a date's minutes onto the nearest `step`, staying within the hour. */
function snapMinutes(d: Date, step: number): Date {
  if (step <= 1) return d;
  const snapped = Math.round(d.getMinutes() / step) * step;
  const next = new Date(d.getTime());
  next.setMinutes(Math.min(snapped, 60 - step), 0, 0);
  return next;
}

function buildMinuteItems(step: number, currentMinute: number): WheelItem[] {
  const items: WheelItem[] = [];
  for (let m = 0; m < 60; m += step) items.push({ label: pad2(m), value: m });
  // Keep an off-step value (e.g. a saved 07:43) reachable rather than silently
  // snapping the user's existing data.
  if (!items.some((i) => i.value === currentMinute)) {
    items.push({ label: pad2(currentMinute), value: currentMinute });
    items.sort((a, b) => a.value - b.value);
  }
  return items;
}

const HOUR_ITEMS: WheelItem[] = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1),
  value: i + 1,
}));

const MERIDIEM_ITEMS: WheelItem[] = [
  { label: 'AM', value: 0 },
  { label: 'PM', value: 1 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function DateTimePickerModal({
  visible,
  mode = 'date',
  value,
  onConfirm,
  onCancel,
  title,
  minimumDate,
  maximumDate,
  minuteStep = 5,
  confirmLabel = 'Done',
}: DateTimePickerModalProps) {
  const insets = useSafeAreaInsets();
  const showsTime = mode === 'time' || mode === 'datetime';

  const [draft, setDraft] = useState<Date>(() => new Date());
  /** Month currently shown in the grid, as a 1st-of-month date. */
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => new Date());
  const [panel, setPanel] = useState<'date' | 'time'>(
    mode === 'time' ? 'time' : 'date',
  );

  /**
   * Seed the draft on the closed → open transition only. Keying off `visible`
   * alone would be enough if every caller memoized `value`/`minimumDate`, but a
   * caller passing `new Date()` inline would otherwise reset the draft on every
   * render and make the sheet impossible to use. `latest` keeps the effect
   * reading current props without depending on their identity.
   */
  const latest = useRef({ value, mode, showsTime, minuteStep, minimumDate, maximumDate });
  latest.current = { value, mode, showsTime, minuteStep, minimumDate, maximumDate };

  useEffect(() => {
    if (!visible) return;
    const p = latest.current;
    const base = p.value ? new Date(p.value.getTime()) : new Date();
    const seeded = clampForMode(
      p.showsTime ? snapMinutes(base, p.minuteStep) : base,
      p.mode,
      p.minimumDate,
      p.maximumDate,
    );
    setDraft(seeded);
    setVisibleMonth(new Date(seeded.getFullYear(), seeded.getMonth(), 1));
    setPanel(p.mode === 'time' ? 'time' : 'date');
  }, [visible]);

  const year = visibleMonth.getFullYear();
  const month0 = visibleMonth.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month0), [year, month0]);
  const minuteItems = useMemo(
    () => buildMinuteItems(minuteStep, draft.getMinutes()),
    [minuteStep, draft],
  );

  const resolvedTitle =
    title ?? (mode === 'time' ? 'Select a time' : 'Select a date');

  // ── Date panel handlers ────────────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }, []);

  const selectDay = useCallback(
    (day: number) => {
      setDraft((prev) => {
        const next = new Date(
          year,
          month0,
          day,
          prev.getHours(),
          prev.getMinutes(),
          0,
          0,
        );
        return next;
      });
    },
    [year, month0],
  );

  const goToToday = useCallback(() => {
    const now = new Date();
    if (isDayDisabled(now.getFullYear(), now.getMonth(), now.getDate(), minimumDate, maximumDate)) {
      return;
    }
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setDraft((prev) => {
      const next = new Date(now.getTime());
      next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      return next;
    });
  }, [minimumDate, maximumDate]);

  // ── Time panel handlers ────────────────────────────────────────────────────
  const hours24 = draft.getHours();
  const hour12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const meridiem = hours24 < 12 ? 0 : 1;

  const setHour12 = useCallback(
    (h12: number) => {
      setDraft((prev) => {
        const pm = prev.getHours() >= 12;
        const h24 = (h12 % 12) + (pm ? 12 : 0);
        const next = new Date(prev.getTime());
        next.setHours(h24, prev.getMinutes(), 0, 0);
        return next;
      });
    },
    [],
  );

  const setMinute = useCallback((m: number) => {
    setDraft((prev) => {
      const next = new Date(prev.getTime());
      next.setMinutes(m, 0, 0);
      return next;
    });
  }, []);

  const setMeridiem = useCallback((value0Or1: number) => {
    setDraft((prev) => {
      const h = prev.getHours() % 12;
      const next = new Date(prev.getTime());
      next.setHours(value0Or1 === 1 ? h + 12 : h, prev.getMinutes(), 0, 0);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(clampForMode(new Date(draft.getTime()), mode, minimumDate, maximumDate));
  }, [draft, onConfirm, mode, minimumDate, maximumDate]);

  const summary =
    mode === 'time'
      ? formatTimeOfDay(draft)
      : mode === 'datetime'
      ? `${formatLongDate(draft)} \u00B7 ${formatTimeOfDay(draft)}`
      : formatLongDate(draft);

  const todayDisabled = isDayDisabled(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
    minimumDate,
    maximumDate,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Dismiss picker"
        />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onCancel}
              hitSlop={10}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {resolvedTitle}
            </Text>
            <Pressable
              onPress={handleConfirm}
              hitSlop={10}
              style={[styles.headerBtn, styles.headerBtnRight]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Text style={styles.doneText}>{confirmLabel}</Text>
            </Pressable>
          </View>

          <Text style={styles.summary} numberOfLines={1}>
            {summary}
          </Text>

          {/* Date | Time switch (datetime mode only) */}
          {mode === 'datetime' ? (
            <View style={styles.segmented}>
              {(['date', 'time'] as const).map((p) => {
                const active = panel === p;
                return (
                  <Pressable
                    key={p}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => setPanel(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={p === 'date' ? 'Pick date' : 'Pick time'}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {p === 'date' ? 'Date' : 'Time'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {/* Date panel */}
          {mode !== 'time' && panel === 'date' ? (
            <View>
              <View style={styles.monthRow}>
                <Pressable
                  onPress={goToPrevMonth}
                  hitSlop={8}
                  style={styles.monthNavBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                >
                  <ChevronLeft />
                </Pressable>
                <Text style={styles.monthLabel}>{formatMonthYear(year, month0)}</Text>
                <Pressable
                  onPress={goToNextMonth}
                  hitSlop={8}
                  style={styles.monthNavBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                >
                  <ChevronRight />
                </Pressable>
              </View>

              <View style={styles.weekRow}>
                {WEEKDAY_LABELS_SHORT.map((w) => (
                  <View key={w} style={styles.dayCell}>
                    <Text style={styles.weekdayText}>{w}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.grid}>
                {cells.map((day, idx) => {
                  if (day === null) {
                    // eslint-disable-next-line react/no-array-index-key
                    return <View key={`blank-${idx}`} style={styles.dayCell} />;
                  }
                  const cellDate = new Date(year, month0, day);
                  const selected = isSameDay(cellDate, draft);
                  const today = isSameDay(cellDate, startOfDay(new Date()));
                  const disabled = isDayDisabled(
                    year,
                    month0,
                    day,
                    minimumDate,
                    maximumDate,
                  );
                  return (
                    <Pressable
                      key={day}
                      style={styles.dayCell}
                      onPress={() => selectDay(day)}
                      disabled={disabled}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityLabel={formatLongDate(cellDate)}
                    >
                      <View
                        style={[
                          styles.dayInner,
                          today && !selected && styles.dayTodayRing,
                          selected && styles.daySelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            selected && styles.dayTextSelected,
                            disabled && styles.dayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {!todayDisabled ? (
                <Pressable
                  onPress={goToToday}
                  style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Jump to today"
                >
                  <Text style={styles.todayBtnText}>Today</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* Time panel */}
          {showsTime && panel === 'time' ? (
            <View style={styles.wheelRow}>
              <WheelHighlight />
              <WheelPicker
                items={HOUR_ITEMS}
                value={hour12}
                onChange={setHour12}
                width={74}
                accessibilityLabel="Hour"
              />
              <Text style={styles.wheelSeparator}>:</Text>
              <WheelPicker
                items={minuteItems}
                value={draft.getMinutes()}
                onChange={setMinute}
                width={74}
                accessibilityLabel="Minute"
              />
              <WheelPicker
                items={MERIDIEM_ITEMS}
                value={meridiem}
                onChange={setMeridiem}
                width={74}
                accessibilityLabel="AM or PM"
              />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  headerBtn: {
    minWidth: 64,
    height: 36,
    justifyContent: 'center',
  },
  headerBtnRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
  },
  cancelText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
  },
  doneText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 15,
  },
  summary: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginBottom: spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: 'rgba(139,111,58,0.16)',
  },
  segmentText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  segmentTextActive: {
    color: colors.gold,
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthLabel: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 3,
  },
  weekdayText: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTodayRing: {
    borderWidth: 1,
    borderColor: colors.gold,
  },
  daySelected: {
    backgroundColor: colors.gold,
  },
  dayText: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 14,
  },
  dayTextSelected: {
    color: colors.ctaText,
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  dayTextDisabled: {
    color: colors.neutralSubtle,
  },
  todayBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayBtnText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 12,
  },
  wheelRow: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  wheelSeparator: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 22,
    marginHorizontal: 2,
  },
});
