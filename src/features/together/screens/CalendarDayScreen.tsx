/**
 * CalendarDayScreen — the shared calendar's day view, reached by tapping a day
 * on the month grid in Together.
 *
 * Modelled on the iPhone calendar's day screen:
 *   - a Mon-first week strip you can tap to move between days (dots mark days
 *     that have something on them)
 *   - an all-day row for milestones and events saved without a time
 *   - a 24-hour grid with each timed event positioned and sized by its start
 *     and end time, side-by-side when they overlap, and a "now" line on today
 *   - tapping any hour (or the + button) opens the compose form pre-filled with
 *     that date and time
 *
 * All data is real (`useCalendarDay` → /api/calendar/events + /api/important-dates);
 * the screen refetches on focus so an event added on the compose screen shows
 * up on return.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import {
  DAY_NAMES_SHORT,
  addDays,
  formatDuration,
  formatHourLabel,
  formatMonthYear,
  formatTime12,
  isSameDay,
  minutesSinceMidnight,
  pad2,
  parseIsoDate,
  parseTimeString,
  startOfWeekMonday,
  toIsoDate,
  todayIsoDate,
} from '../../../shared/components/inputs';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { importantDateFallsOn, useCalendarDay } from '../hooks/useCalendarDay';
import type { CalendarEventResponse } from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'CalendarDay'>;
type Route = NativeStackScreenProps<TogetherStackParamList, 'CalendarDay'>['route'];

/** Pixel height of one hour row in the grid. */
const HOUR_HEIGHT = 56;
/** Width of the left-hand hour-label gutter. */
const GUTTER_WIDTH = 54;
const GRID_HEIGHT = HOUR_HEIGHT * 24;
/** Assumed length of an event saved with a start but no end time. */
const DEFAULT_EVENT_MINUTES = 60;
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const WEEK_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

// ─── Icons ───────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
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
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={colors.neutral} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Event layout ────────────────────────────────────────────────────────────

type PositionedEvent = {
  event: CalendarEventResponse;
  startMinutes: number;
  endMinutes: number;
  /** Which side-by-side column this event occupies. */
  lane: number;
  /** How many columns its overlap cluster needs. */
  laneCount: number;
};

/**
 * Place timed events on the grid, splitting overlapping events into columns
 * the way a calendar app does: events that share any minute sit side by side.
 */
function layoutTimedEvents(events: CalendarEventResponse[]): PositionedEvent[] {
  const spans = events
    .map((event) => {
      const start = parseTimeString(event.startTime);
      if (!start) return null;
      const startMinutes = start.hours * 60 + start.minutes;
      const end = parseTimeString(event.endTime);
      const rawEnd = end ? end.hours * 60 + end.minutes : startMinutes + DEFAULT_EVENT_MINUTES;
      // Guard against an end at/before the start (or crossing midnight).
      const endMinutes = Math.min(
        24 * 60,
        rawEnd > startMinutes ? rawEnd : startMinutes + DEFAULT_EVENT_MINUTES,
      );
      return { event, startMinutes, endMinutes };
    })
    .filter((s): s is { event: CalendarEventResponse; startMinutes: number; endMinutes: number } => s !== null)
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  const positioned: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -1;
  /** End minute of the last event placed in each lane of the current cluster. */
  let laneEnds: number[] = [];

  const closeCluster = () => {
    const laneCount = Math.max(1, laneEnds.length);
    for (const item of cluster) item.laneCount = laneCount;
    positioned.push(...cluster);
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const span of spans) {
    if (cluster.length > 0 && span.startMinutes >= clusterEnd) closeCluster();

    let lane = laneEnds.findIndex((end) => span.startMinutes >= end);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(span.endMinutes);
    } else {
      laneEnds[lane] = span.endMinutes;
    }

    cluster.push({ ...span, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, span.endMinutes);
  }
  if (cluster.length > 0) closeCluster();

  return positioned;
}

/** "7:30 PM – 9:00 PM · 1h 30m" style label for an event card. */
function timeRangeLabel(item: PositionedEvent): string {
  const start = formatTime12(
    Math.floor(item.startMinutes / 60),
    item.startMinutes % 60,
  );
  const hasExplicitEnd = parseTimeString(item.event.endTime) !== null;
  if (!hasExplicitEnd) return start;
  const end = formatTime12(
    Math.floor(item.endMinutes / 60) % 24,
    item.endMinutes % 60,
  );
  const duration = formatDuration(item.endMinutes - item.startMinutes);
  return duration ? `${start} \u2013 ${end} \u00B7 ${duration}` : `${start} \u2013 ${end}`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function CalendarDayScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();

  const [selectedIso, setSelectedIso] = useState<string>(
    () => route.params?.date ?? todayIsoDate(),
  );
  const selectedDate = useMemo(
    () => parseIsoDate(selectedIso) ?? new Date(),
    [selectedIso],
  );

  const day = useCalendarDay(selectedIso);
  const { refresh } = day;

  // Come back from the compose screen and the new event is already here.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // ── Week strip ─────────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(selectedDate);
    return WEEK_OFFSETS.map((i) => addDays(start, i));
  }, [selectedDate]);

  /** iso → what kind of marker that day needs in the week strip. */
  const markers = useMemo(() => {
    const map: Record<string, { event: boolean; milestone: boolean }> = {};
    for (const d of weekDays) {
      const iso = toIsoDate(d);
      map[iso] = {
        event: day.events.some((ev) => ev.eventDate.slice(0, 10) === iso),
        milestone: day.importantDates.some((id) => importantDateFallsOn(id, d)),
      };
    }
    return map;
  }, [weekDays, day.events, day.importantDates]);

  // ── Timed event layout ─────────────────────────────────────────────────────
  const positioned = useMemo(
    () => layoutTimedEvents(day.timedEvents),
    [day.timedEvents],
  );

  // ── "Now" line, only on today ──────────────────────────────────────────────
  const isToday = isSameDay(selectedDate, new Date());
  const [nowMinutes, setNowMinutes] = useState(() => minutesSinceMidnight(new Date()));
  useEffect(() => {
    if (!isToday) return;
    setNowMinutes(minutesSinceMidnight(new Date()));
    const id = setInterval(() => {
      setNowMinutes(minutesSinceMidnight(new Date()));
    }, 60_000);
    return () => clearInterval(id);
  }, [isToday, selectedIso]);

  // ── Open the grid near where the day actually starts ───────────────────────
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (day.loading) return;
    if (scrolledFor.current === selectedIso) return;
    scrolledFor.current = selectedIso;

    const firstEventMinutes = positioned.length > 0 ? positioned[0].startMinutes : null;
    const anchorMinutes =
      firstEventMinutes ?? (isToday ? minutesSinceMidnight(new Date()) : 8 * 60);
    // Show a little context above the anchor.
    const y = Math.max(0, (anchorMinutes / 60) * HOUR_HEIGHT - HOUR_HEIGHT);
    const handle = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: false });
    });
    return () => cancelAnimationFrame(handle);
  }, [day.loading, selectedIso, positioned, isToday]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const goToDay = useCallback((d: Date) => {
    setSelectedIso(toIsoDate(d));
  }, []);

  const goPrevDay = useCallback(() => {
    goToDay(addDays(selectedDate, -1));
  }, [goToDay, selectedDate]);

  const goNextDay = useCallback(() => {
    goToDay(addDays(selectedDate, 1));
  }, [goToDay, selectedDate]);

  const goToday = useCallback(() => {
    setSelectedIso(todayIsoDate());
  }, []);

  const addEventAt = useCallback(
    (hour?: number) => {
      navigation.navigate('AddCalendarEvent', {
        date: selectedIso,
        startTime: hour === undefined ? undefined : `${pad2(hour)}:00`,
      });
    },
    [navigation, selectedIso],
  );

  // Tapping an existing event (timed card or all-day chip) opens it for editing.
  const editEvent = useCallback(
    (event: CalendarEventResponse) => {
      navigation.navigate('AddCalendarEvent', { date: selectedIso, event });
    },
    [navigation, selectedIso],
  );

  const monthLabel = formatMonthYear(selectedDate.getFullYear(), selectedDate.getMonth());
  const dayHeading = `${DAY_NAMES_SHORT[selectedDate.getDay()]} ${selectedDate.getDate()}`;
  const allDayItems = day.untimedEvents;
  const milestones = day.dayImportantDates;
  const hasAnything =
    allDayItems.length > 0 || milestones.length > 0 || positioned.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <AppHeader
        title={dayHeading}
        subtitle={monthLabel}
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerRight}>
            {!isToday ? (
              <Pressable
                onPress={goToday}
                hitSlop={8}
                style={({ pressed }) => [styles.todayBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
              >
                <Text style={styles.todayBtnText}>Today</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={styles.iconBtn}
              onPress={() => addEventAt()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Add an event on this day"
            >
              <PlusIcon />
            </Pressable>
          </View>
        }
      />

      {/* Week strip */}
      <View style={styles.weekStrip}>
        <Pressable
          onPress={goPrevDay}
          hitSlop={8}
          style={styles.weekNavBtn}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <ChevronLeft />
        </Pressable>

        <View style={styles.weekDays}>
          {weekDays.map((d) => {
            const iso = toIsoDate(d);
            const selected = iso === selectedIso;
            const today = isSameDay(d, new Date());
            const marker = markers[iso];
            return (
              <Pressable
                key={iso}
                style={styles.weekDay}
                onPress={() => goToDay(d)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${DAY_NAMES_SHORT[d.getDay()]} ${d.getDate()}`}
              >
                <Text style={[styles.weekDayName, selected && styles.weekDayNameSelected]}>
                  {DAY_NAMES_SHORT[d.getDay()].toUpperCase()}
                </Text>
                <View
                  style={[
                    styles.weekDayNumWrap,
                    today && !selected && styles.weekDayToday,
                    selected && styles.weekDaySelected,
                  ]}
                >
                  <Text style={[styles.weekDayNum, selected && styles.weekDayNumSelected]}>
                    {d.getDate()}
                  </Text>
                </View>
                <View style={styles.weekDayDots}>
                  {marker?.milestone ? (
                    <View style={[styles.weekDot, styles.weekDotMilestone]} />
                  ) : null}
                  {marker?.event ? (
                    <View style={[styles.weekDot, styles.weekDotEvent]} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={goNextDay}
          hitSlop={8}
          style={styles.weekNavBtn}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <ChevronRight />
        </Pressable>
      </View>

      {/* All-day: milestones + events saved without a time */}
      {milestones.length > 0 || allDayItems.length > 0 ? (
        <View style={styles.allDay}>
          <Text style={styles.allDayLabel}>ALL DAY</Text>
          <View style={styles.allDayItems}>
            {milestones.map((m) => (
              <View key={m.id} style={[styles.allDayChip, styles.allDayChipMilestone]}>
                <Text style={styles.allDayChipText} numberOfLines={1}>
                  {m.name}
                </Text>
              </View>
            ))}
            {allDayItems.map((ev) => (
              <Pressable
                key={ev.id}
                style={({ pressed }) => [styles.allDayChip, pressed && styles.pressed]}
                onPress={() => editEvent(ev)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${ev.title}`}
              >
                <Text style={styles.allDayChipText} numberOfLines={1}>
                  {ev.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {day.loading && !hasAnything ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!hasAnything ? (
            <Text style={styles.emptyHint}>
              Nothing planned yet. Tap a time to add something.
            </Text>
          ) : null}

          <View style={styles.grid}>
            {/* Hour rows double as the "tap a time to add" targets. */}
            {HOURS.map((hour) => (
              <Pressable
                key={hour}
                style={styles.hourRow}
                onPress={() => addEventAt(hour)}
                accessibilityRole="button"
                accessibilityLabel={`Add an event at ${formatHourLabel(hour)}`}
              >
                <View style={styles.hourGutter}>
                  <Text style={styles.hourLabel}>{formatHourLabel(hour)}</Text>
                </View>
                <View style={styles.hourLine} />
              </Pressable>
            ))}

            {/*
              Timed events sit above the hour rows. The layer uses box-none so
              empty space still passes taps through to the hour row (add an
              event), while each card is a Pressable that opens the event for
              editing.
            */}
            <View style={styles.eventLayer} pointerEvents="box-none">
              {positioned.map((item) => {
                const top = (item.startMinutes / 60) * HOUR_HEIGHT;
                const height = Math.max(
                  26,
                  ((item.endMinutes - item.startMinutes) / 60) * HOUR_HEIGHT - 2,
                );
                const widthPct = 100 / item.laneCount;
                return (
                  <Pressable
                    key={item.event.id}
                    onPress={() => editEvent(item.event)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.event.title}`}
                    style={({ pressed }) => [
                      styles.eventCard,
                      {
                        top,
                        height,
                        left: `${item.lane * widthPct}%`,
                        width: `${widthPct}%`,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.eventAccent} />
                    <View style={styles.eventBody}>
                      <Text style={styles.eventTitle} numberOfLines={height < 44 ? 1 : 2}>
                        {item.event.title}
                      </Text>
                      {height >= 44 ? (
                        <Text style={styles.eventMeta} numberOfLines={1}>
                          {timeRangeLabel(item)}
                        </Text>
                      ) : null}
                      {height >= 70 && item.event.location ? (
                        <Text style={styles.eventMeta} numberOfLines={1}>
                          {item.event.location}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Now line */}
            {isToday ? (
              <View
                style={[styles.nowLine, { top: (nowMinutes / 60) * HOUR_HEIGHT }]}
                pointerEvents="none"
              >
                <View style={styles.nowDot} />
                <View style={styles.nowBar} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      {day.error ? <Text style={styles.error}>{day.error}</Text> : null}

      {/* Footer add button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => addEventAt()}
          accessibilityRole="button"
          accessibilityLabel="Add an event on this day"
        >
          <Text style={styles.addBtnText}>Add Event</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMonth: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  headerDay: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  todayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayBtnText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 11,
  },

  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  weekNavBtn: {
    width: 26,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDays: { flex: 1, flexDirection: 'row' },
  weekDay: { flex: 1, alignItems: 'center', gap: 2 },
  weekDayName: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
  },
  weekDayNameSelected: { color: colors.gold },
  weekDayNumWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayToday: { borderWidth: 1, borderColor: colors.gold },
  weekDaySelected: { backgroundColor: colors.gold },
  weekDayNum: {
    ...typography.body,
    color: colors.neutral,
    fontSize: 14,
  },
  weekDayNumSelected: {
    color: colors.ctaText,
    fontFamily: typography.bodySemiBold.fontFamily,
  },
  weekDayDots: { flexDirection: 'row', gap: 3, height: 6, alignItems: 'center' },
  weekDot: { width: 4, height: 4, borderRadius: 2 },
  weekDotMilestone: { backgroundColor: colors.gold },
  weekDotEvent: { backgroundColor: colors.primaryLight },

  allDay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  allDayLabel: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
    width: GUTTER_WIDTH - spacing.md,
    marginTop: 7,
  },
  allDayItems: { flex: 1, gap: spacing.xs },
  allDayChip: {
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: 'rgba(167,210,182,0.14)',
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryLight,
  },
  allDayChipMilestone: {
    backgroundColor: 'rgba(139,111,58,0.16)',
    borderLeftColor: colors.gold,
  },
  allDayChipText: {
    ...typography.bodySm,
    color: colors.neutral,
    fontSize: 13,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  emptyHint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  grid: {
    height: GRID_HEIGHT,
    position: 'relative',
  },
  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hourGutter: {
    width: GUTTER_WIDTH,
    alignItems: 'flex-end',
    paddingRight: spacing.sm,
  },
  hourLabel: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 10,
    marginTop: -6,
  },
  hourLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  eventLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: GUTTER_WIDTH,
    right: spacing.md,
  },
  eventCard: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(167,210,182,0.16)',
    paddingRight: 2,
    marginRight: 2,
  },
  eventAccent: {
    width: 3,
    backgroundColor: colors.primaryLight,
  },
  eventBody: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 1,
  },
  eventTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
    lineHeight: 17,
  },
  eventMeta: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
    lineHeight: 15,
  },

  nowLine: {
    position: 'absolute',
    left: GUTTER_WIDTH - 5,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.emergency,
  },
  nowBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: colors.emergency,
  },

  error: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  addBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: { opacity: 0.6 },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
