/**
 * TogetherScreen — the shared "Our Sacred Cadence" dashboard.
 *
 * Every card is wired to real backend data via useTogether:
 *   1. Header             — couple label + next important-date countdown
 *   2. Shared calendar    — real calendar events + important dates for the month
 *   3. Shared collections  — real bucket list + to-do list (with add/complete)
 *   4. Private repositories — the real shared wishlist + date ideas summaries
 *
 * Writes (add bucket item, complete bucket item, create calendar event) hit
 * the API and refresh. The screen refetches on focus so items added on the
 * pushed compose/wishlist screens appear on return.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
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
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import type { MainTabParamList } from '../../../navigation/types';
import {
  MemoriesCard,
  PrivateRepositories,
  SharedCalendarCard,
  SharedCollections,
  TogetherHeader,
  TogetherTabs,
  VisionBoardCard,
  countdownLabel,
  pickNextImportantDate,
  type TogetherTabKey,
} from '../components';
import { useTogether } from '../hooks/useTogether';
import { togetherService } from '../services/togetherService';
import type { BucketListItemResponse } from '../types/together.types';
import { useMoodBackground } from '../../../shared/state/moodBackgroundStore';

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
  const [savingTodo, setSavingTodo] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addingAnniversaries, setAddingAnniversaries] = useState(false);
  /** Id of a list row with an action (toggle/delete) in flight. */
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // Shared with Check-in and Desk — driven by today's mood check-in.
  const backgroundImage = useMoodBackground();

  // Scroll-to-section support for the top tab strip. The tabs that own a screen
  // navigate; the ones that live inline on the dashboard (Bucket List, Important
  // Dates) scroll their card into view.
  const scrollRef = useRef<ScrollView>(null);
  const calendarY = useRef(0);
  const collectionsY = useRef(0);

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
        showSuccess('Created!');
        refresh();
      } catch {
        // The input keeps the text on failure so the user can retry.
        showError('Sorry that failed :(');
      } finally {
        setSavingBucket(false);
      }
    },
    [refresh],
  );

  const handleAddTodoItem = useCallback(
    async (title: string) => {
      setSavingTodo(true);
      try {
        await togetherService.createTodoItem(title);
        showSuccess('Created!');
        refresh();
      } catch {
        // The input keeps the text on failure so the user can retry.
        showError('Sorry that failed :(');
      } finally {
        setSavingTodo(false);
      }
    },
    [refresh],
  );

  // The /complete endpoint toggles completion both ways, so the same handler
  // marks an item done or un-does an accidental tick. Shared by both lists.
  const handleToggleComplete = useCallback(
    async (item: BucketListItemResponse) => {
      if (busyItemId) return;
      setBusyItemId(item.id);
      try {
        await togetherService.toggleBucketListItemComplete(item.id);
        refresh();
      } catch {
        // no-op; a refresh will reconcile state
      } finally {
        setBusyItemId(null);
      }
    },
    [busyItemId, refresh],
  );

  const handleDeleteItem = useCallback(
    async (item: BucketListItemResponse) => {
      if (busyItemId) return;
      setBusyItemId(item.id);
      try {
        await togetherService.deleteBucketListItem(item.id);
        showSuccess('Deleted!');
        refresh();
      } catch {
        showError('Sorry that failed :(');
      } finally {
        setBusyItemId(null);
      }
    },
    [busyItemId, refresh],
  );

  const handlePrevMonth = useCallback(() => {
    together.goToMonth(together.year, together.month - 1);
  }, [together]);

  const handleNextMonth = useCallback(() => {
    together.goToMonth(together.year, together.month + 1);
  }, [together]);

  const handleAddEvent = useCallback(() => {
    // Default to today when today is in view, otherwise the 1st of the month
    // the user is actually looking at.
    const now = new Date();
    const inCurrentMonth =
      now.getFullYear() === together.year && now.getMonth() === together.month;
    navigation.navigate('AddCalendarEvent', {
      date: isoForDay(
        together.year,
        together.month,
        inCurrentMonth ? now.getDate() : 1,
      ),
    });
  }, [navigation, together.year, together.month]);

  // Populate the shared calendar with the couple's upcoming anniversary
  // reminders (monthly while under a year together, otherwise yearly). Safe to
  // tap more than once — the service dedupes against events already present.
  const handleAddAnniversaries = useCallback(async () => {
    if (addingAnniversaries) return;
    setAddingAnniversaries(true);
    try {
      const result = await togetherService.syncAnniversaryEvents();
      if (!result.hasStartDate) {
        showError('Add your relationship start date first.');
      } else if (result.created > 0) {
        showSuccess(
          `Added ${result.created} anniversary ${
            result.created === 1 ? 'reminder' : 'reminders'
          }!`,
        );
        refresh();
      } else {
        showSuccess('Your anniversaries are already on the calendar.');
      }
    } catch {
      showError('Sorry that failed :(');
    } finally {
      setAddingAnniversaries(false);
    }
  }, [addingAnniversaries, refresh]);

  // Tapping a day opens the day view (that day's events), from which the user
  // can add an event — the same shape as the iPhone calendar.
  const handleSelectDay = useCallback(
    (day: number) => {
      navigation.navigate('CalendarDay', {
        date: isoForDay(together.year, together.month, day),
      });
    },
    [navigation, together.year, together.month],
  );

  const handleOpenWishlist = useCallback(() => {
    navigation.navigate('Wishlist');
  }, [navigation]);

  const handleOpenDateIdeas = useCallback(() => {
    navigation.navigate('DateIdeas');
  }, [navigation]);

  const handleOpenMemories = useCallback(() => {
    navigation.navigate('Memories');
  }, [navigation]);

  const handleOpenVisionBoard = useCallback(() => {
    navigation.navigate('VisionBoard');
  }, [navigation]);

  // Top tab strip. Tabs with a dedicated screen navigate there; the inline
  // dashboard sections (Calendar, Bucket List, Important Dates) scroll into view.
  const handleTabSelect = useCallback(
    (key: TogetherTabKey) => {
      switch (key) {
        case 'us':
          navigation.navigate('VisionBoard');
          break;
        case 'dateIdeas':
          navigation.navigate('DateIdeas');
          break;
        case 'wishlist':
          navigation.navigate('Wishlist');
          break;
        case 'calendar':
        case 'importantDates':
          // The calendar card also carries the important-dates beacon.
          scrollRef.current?.scrollTo({ y: Math.max(calendarY.current - 8, 0), animated: true });
          break;
        case 'bucketList':
          scrollRef.current?.scrollTo({ y: Math.max(collectionsY.current - 8, 0), animated: true });
          break;
      }
    },
    [navigation],
  );

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
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
        <View style={styles.scrim} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} size="large" />
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
          translucent={false}
        />

      <AppHeader title="Together" bordered={false} style={styles.headerTransparent} />

      <TogetherTabs activeKey="us" onSelect={handleTabSelect} />

      <ScrollView
        ref={scrollRef}
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

        <VisionBoardCard onOpen={handleOpenVisionBoard} />

        <View onLayout={(e) => { calendarY.current = e.nativeEvent.layout.y; }}>
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
            onAddAnniversaries={handleAddAnniversaries}
            addingAnniversaries={addingAnniversaries}
          />
        </View>

        <View onLayout={(e) => { collectionsY.current = e.nativeEvent.layout.y; }}>
          <SharedCollections
            bucketList={together.bucketList}
            todoList={together.todoList}
            loading={together.loading}
            saving={savingBucket || savingTodo}
            busyId={busyItemId}
            onAddBucketItem={handleAddBucketItem}
            onAddTodoItem={handleAddTodoItem}
            onToggleBucketComplete={handleToggleComplete}
            onToggleTodoComplete={handleToggleComplete}
            onDeleteBucketItem={handleDeleteItem}
            onDeleteTodoItem={handleDeleteItem}
          />
        </View>

        <MemoriesCard
          onOpenMemories={handleOpenMemories}
          onOpenTimeline={handleOpenTimeline}
        />

        <PrivateRepositories
          wishlist={together.wishlist}
          dateIdeas={together.dateIdeas}
          onOpenWishlist={handleOpenWishlist}
          onOpenDateIdeas={handleOpenDateIdeas}
        />

        {together.error ? <Text style={styles.error}>{together.error}</Text> : null}

        <View style={styles.bottomPadding} />
      </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 18, 10, 0.45)',
  },
  headerTransparent: { backgroundColor: 'transparent' },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
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
