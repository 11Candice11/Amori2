/**
 * CalendarScreen — the full shared calendar (month grid) as its own view,
 * reached from the "Calendar" tab in Together.
 *
 * Wraps the existing SharedCalendarCard month grid with its own month state and
 * data loading (calendar events + important dates for the visible month). A day
 * tap opens the day view; the add button opens the compose form. Refetches on
 * focus so events added on pushed screens show on return.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { SharedCalendarCard } from '../components';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { togetherService } from '../services/togetherService';
import type {
  CalendarEventResponse,
  ImportantDateResponse,
} from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'Calendar'>;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingAnniversaries, setAddingAnniversaries] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Calendar API months are 1-indexed. Important dates are relationship-wide.
      const [ev, dates] = await Promise.all([
        togetherService.getCalendarEvents(year, month + 1).catch(() => [] as CalendarEventResponse[]),
        togetherService.getImportantDates().catch(() => [] as ImportantDateResponse[]),
      ]);
      setEvents(ev);
      setImportantDates(dates);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goPrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleSelectDay = useCallback(
    (day: number) => {
      navigation.navigate('CalendarDay', {
        date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      });
    },
    [navigation, year, month],
  );

  const handleAddEvent = useCallback(() => {
    navigation.navigate('AddCalendarEvent', {
      date: `${year}-${pad2(month + 1)}-${pad2(now.getDate())}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, year, month]);

  const handleAddAnniversaries = useCallback(async () => {
    if (addingAnniversaries) return;
    setAddingAnniversaries(true);
    try {
      await togetherService.syncAnniversaryEvents();
      await load();
    } finally {
      setAddingAnniversaries(false);
    }
  }, [addingAnniversaries, load]);

  const content = useMemo(
    () => (
      <SharedCalendarCard
        year={year}
        month={month}
        events={events}
        importantDates={importantDates}
        loading={loading}
        onPrevMonth={goPrevMonth}
        onNextMonth={goNextMonth}
        onAddEvent={handleAddEvent}
        onSelectDay={handleSelectDay}
        onAddAnniversaries={handleAddAnniversaries}
        addingAnniversaries={addingAnniversaries}
      />
    ),
    [
      year, month, events, importantDates, loading,
      goPrevMonth, goNextMonth, handleAddEvent, handleSelectDay,
      handleAddAnniversaries, addingAnniversaries,
    ],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Our Calendar" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
