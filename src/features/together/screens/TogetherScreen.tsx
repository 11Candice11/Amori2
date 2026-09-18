/**
 * TogetherScreen — the shared "Our Sacred Cadence" dashboard.
 *
 * Every card is wired to real backend data via useTogether:
 *   1. Header             — couple label + next important-date countdown
 *   2. Shared calendar    — real calendar events + important dates for the month
 *   3. Anniversary beacon  — the soonest upcoming important date
 *   4. Shared collections  — real bucket list (with add/complete) + wishlist
 *   5. Private repositories — the real shared wishlist summary
 *
 * Writes (add bucket item, complete bucket item, create calendar event) hit
 * the API and refresh. The screen refetches on focus so items added on the
 * pushed compose/wishlist screens appear on return.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../../../shared/theme';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import type { MainTabParamList } from '../../../navigation/types';
import {
  AnniversaryBeaconCard,
  MemoriesCard,
  PrivateRepositories,
  SharedCalendarCard,
  SharedCollections,
  TogetherHeader,
  countdownLabel,
  pickNextImportantDate,
} from '../components';
import { useTogether } from '../hooks/useTogether';
import { togetherService } from '../services/togetherService';
import type { BucketListItemResponse } from '../types/together.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'TogetherHome'>;

/** "YYYY-MM-DD" for a given visible month + day. */
function isoForDay(year: number, month0: number, day: number): string {
  const mm = String(month0 + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

export function TogetherScreen() {
  const navigation = useNavigation<Nav>();
  const together = useTogether();
  const { refresh } = together;

  const [savingBucket, setSavingBucket] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refetch whenever the screen regains focus (e.g. after adding an event on
  // the pushed compose screen). The stack keeps this screen mounted.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const next = pickNextImportantDate(together.importantDates);
  const countdownNote = next
    ? `Next up: ${next.name}`
    : null;
  const countdownTiming = countdownLabel(next?.daysUntilNext);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refresh();
    // useTogether flips its own loading flags; drop the pull spinner shortly.
    setTimeout(() => setRefreshing(false), 600);
  }, [refresh]);

  const handleAddBucketItem = useCallback(
    async (title: string) => {
      setSavingBucket(true);
      try {
        await togetherService.createBucketListItem(title);
        refresh();
      } catch {
        // Surfaced silently for now; the input keeps the text on failure.
      } finally {
        setSavingBucket(false);
      }
    },
    [refresh],
  );

  const handleToggleBucketComplete = useCallback(
    async (item: BucketListItemResponse) => {
      // Backend /complete only completes; don't call it for done items.
      if (item.isCompleted) return;
      try {
        await togetherService.completeBucketListItem(item.id);
        refresh();
      } catch {
        // no-op; a refresh will reconcile state
      }
    },
    [refresh],
  );

  const handlePrevMonth = useCallback(() => {
    together.goToMonth(together.year, together.month - 1);
  }, [together]);

  const handleNextMonth = useCallback(() => {
    together.goToMonth(together.year, together.month + 1);
  }, [together]);

  const handleAddEvent = useCallback(() => {
    navigation.navigate('AddCalendarEvent', {
      // Default the compose form's date to the 1st of the visible month.
      date: isoForDay(together.year, together.month, 1),
    });
  }, [navigation, together.year, together.month]);

  const handleSelectDay = useCallback(
    (day: number) => {
      navigation.navigate('AddCalendarEvent', {
        date: isoForDay(together.year, together.month, day),
      });
    },
    [navigation, together.year, together.month],
  );

  const handleOpenWishlist = useCallback(() => {
    navigation.navigate('Wishlist');
  }, [navigation]);

  const handleOpenMemories = useCallback(() => {
    navigation.navigate('Memories');
  }, [navigation]);

  const handleOpenTimeline = useCallback(() => {
    // The milestone timeline is a sibling hidden stack (real /api/timeline),
    // reached via the parent tab navigator.
    navigation
      .getParent<BottomTabNavigationProp<MainTabParamList>>()
      ?.navigate('Timeline', { screen: 'TimelineHome' });
  }, [navigation]);

  // ── Initial loading state ──────────────────────────────────────────────────
  if (together.loading && !together.coupleLabel) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
        translucent={false}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <TogetherHeader
          coupleLabel={together.coupleLabel}
          countdownNote={countdownNote}
          countdownTiming={countdownTiming}
        />

        <SharedCalendarCard
          year={together.year}
          month={together.month}
          events={together.calendarEvents}
          importantDates={together.importantDates}
          loading={together.calendarLoading}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onAddEvent={handleAddEvent}
          onSelectDay={handleSelectDay}
        />

        <AnniversaryBeaconCard
          dates={together.importantDates}
          onAddDate={handleAddEvent}
        />

        <SharedCollections
          bucketList={together.bucketList}
          wishlist={together.wishlist}
          loading={together.loading}
          saving={savingBucket}
          onAddBucketItem={handleAddBucketItem}
          onToggleBucketComplete={handleToggleBucketComplete}
        />

        <MemoriesCard
          onOpenMemories={handleOpenMemories}
          onOpenTimeline={handleOpenTimeline}
        />

        <PrivateRepositories
          wishlist={together.wishlist}
          onOpenWishlist={handleOpenWishlist}
        />

        {together.error ? <Text style={styles.error}>{together.error}</Text> : null}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
