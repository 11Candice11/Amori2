/**
 * HomeScreen — Sanctuary Dashboard (shared across iOS and Android).
 *
 * Renders the redesigned dashboard (SanctuaryDashboard):
 *   1. Top bar        — heart · "<partner> · CONNECTED" · avatar
 *   2. Hero greeting  — "<time>, <you> & <partner>" + SANCTUARY
 *   3. Stats row      — days together | days till anniversary
 *   4. Partner state  — partner's most recent mood
 *   5. Check-in row   — record today's state
 *   6. Attunement 2×2 — Send hug · Distraction · Log Incident · Shared
 *   7. Daily Artifact — sealed "Mystery Booster Pack"
 *
 * All data comes from useDashboard() which calls the backend in parallel.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../../../navigation/types';

import { colors, spacing } from '../../../shared/theme';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { useDayChange } from '../../../hooks/useDayChange';
import { SanctuaryDashboard } from '../components/SanctuaryDashboard';
import { ArtifactRevealModal } from '../components/ArtifactRevealModal';
import { useDashboard } from '../hooks/useDashboard';
import { splittingService } from '../../splitting/services/splittingService';
import { artifactStore } from '../services/artifactStore';
import { dailyGiftService } from '../services/dailyGiftService';
import { vaultService } from '../../vault/services/vaultService';
import type { DailyGift } from '../services/dailyGiftService';
import { getDashboardBackground } from '../../../utils/backgroundImages';
import { isSunday } from '../../weeklyReflection/utils/weekRange';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Time-of-day word used in the greeting. */
function timeOfDayWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

/** Map backend MoodType enum → friendly display label. */
const MOOD_DISPLAY: Record<string, string> = {
  Happy: 'Joyful & Bright',
  Calm: 'Content & Grounded',
  Anxious: 'Anxious',
  Sad: 'Heavy & Sad',
  Angry: 'Irritable',
  Overwhelmed: 'Overwhelmed',
  Numb: 'Numb & Distant',
  Other: 'Something unnamed',
};

/** Friendly label for a stored mood — prefers the specific feelings text. */
function moodLabel(
  mood: { mood: string; feelings: string | null } | null,
): string | null {
  if (!mood) return null;
  if (mood.feelings) return mood.feelings;
  return MOOD_DISPLAY[mood.mood] ?? mood.mood;
}

/** Days until the next yearly anniversary given days-together. */
function daysTillAnniversary(days: number): number {
  if (days <= 0) return 365;
  const intoYear = days % 365;
  return intoYear === 0 ? 0 : 365 - intoYear;
}

/** Compact relative time, e.g. "24m ago", "3h ago", "2d ago". */
function relativeTimeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type HomeNavProp = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const dashboard = useDashboard();
  const [artifactOpen, setArtifactOpen] = useState(false);
  // Once the daily pack has been opened (revealed + closed), the dashboard
  // card flips to a "View vault" state and can't be torn open again. The flag
  // is persisted per-day on device, so it survives app relaunches and resets
  // when a new day's artifact becomes available.
  const [artifactOpened, setArtifactOpened] = useState(false);
  // The daily gift loaded from memories
  const [dailyGift, setDailyGift] = useState<DailyGift | null>(null);
  const [loadingGift, setLoadingGift] = useState(false);
  // Memory IDs already kept in the vault. A gift for one of these can't be
  // saved again, so the reveal shows "Already in Vault" instead of "Save".
  const [savedMemoryIds, setSavedMemoryIds] = useState<Set<string>>(new Set());

  // Load the opened flag and today's gift. Both are day-scoped: at midnight the
  // opened flag resolves to false again and the gift re-rolls, so re-running
  // this on a new day gives a fresh, sealed artifact.
  const loadArtifact = useCallback(async () => {
    try {
      const [opened, gift, savedGifts] = await Promise.all([
        artifactStore.isOpenedToday(),
        dailyGiftService.getTodaysGift(),
        vaultService.getAll().catch(() => []),
      ]);
      setArtifactOpened(opened);
      setDailyGift(gift);
      setSavedMemoryIds(new Set(savedGifts.map((g) => g.memoryId)));
    } catch (error) {
      console.error('Failed to load artifact data:', error);
    }
  }, []);

  // Hydrate on mount.
  useEffect(() => {
    void loadArtifact();
  }, [loadArtifact]);

  // Reset the artifact when the local day rolls over — the daily gift becomes
  // available again, so the card flips back to "Tear open".
  useDayChange(() => {
    void loadArtifact();
  });

  // Refresh the dashboard whenever Home regains focus (e.g. returning from a
  // check-in). Tab screens stay mounted, so without this the mood shown here
  // would go stale if the user re-checks in later in the day.
  const { refresh } = dashboard;
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const timeOfDay = useMemo(() => timeOfDayWord(), []);

  const partnerMoodLabel = useMemo(
    () => moodLabel(dashboard.partnerMood),
    [dashboard.partnerMood],
  );

  const userMoodLabel = useMemo(
    () => moodLabel(dashboard.currentMood),
    [dashboard.currentMood],
  );

  const partnerUpdatedAgo = useMemo(
    () => relativeTimeAgo(dashboard.partnerMood?.createdAt),
    [dashboard.partnerMood],
  );

  const anniversaryDays = useMemo(
    () => daysTillAnniversary(dashboard.relationshipDays),
    [dashboard.relationshipDays],
  );

  // The dashboard has its own artwork — it is not mood-driven. Only Check-in,
  // Together and Desk follow the mood. Picked once per mount so re-renders
  // (refresh, partner updates) don't swap the image mid-scroll.
  const [backgroundImage] = useState(() => getDashboardBackground());

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCheckIn = useCallback(() => {
    navigation.navigate('CheckIn');
  }, [navigation]);

  const handleDistraction = useCallback(() => {
    navigation.navigate('Distraction');
  }, [navigation]);

  const handleHug = useCallback(() => {
    navigation.navigate('Hugs', { screen: 'NeedAHug' });
  }, [navigation]);

  const handleLogIncident = useCallback(() => {
    navigation.navigate('Desk', { screen: 'LogIncident' });
  }, [navigation]);

  const handleLetsChat = useCallback(() => {
    navigation.navigate('Chat', { screen: 'ChatHome' });
  }, [navigation]);

  const handleSOS = useCallback(() => {
    // Navigate to Splitting (emergency) flow
    navigation.navigate('Splitting', { screen: 'SplittingIntro' } as never);
  }, [navigation]);

  const handleShared = useCallback(() => {
    // "Shared" navigates to the Together tab.
    navigation.navigate('Together');
  }, [navigation]);

  // Minutes added when the user chooses to extend a finished space window.
  const SPACE_EXTEND_MINUTES = 15;

  const spaceSessionId = dashboard.spaceWindow?.sessionId ?? null;

  // End the current user's own space window early (the "×" on the card). The
  // session is completed on the backend so it stops showing on both dashboards.
  const handleEndSpace = useCallback(async () => {
    if (!spaceSessionId) return;
    try {
      await splittingService.completeSession(spaceSessionId);
      refresh();
    } catch (error) {
      console.error('Failed to end space window:', error);
      showError('Could not end your space. Please try again.');
    }
  }, [spaceSessionId, refresh]);

  // Extend a finished (or nearly-finished) space window by a fixed amount so
  // the person can keep taking space without starting over.
  const handleExtendSpace = useCallback(async () => {
    if (!spaceSessionId) return;
    const newEndsAt = new Date(Date.now() + SPACE_EXTEND_MINUTES * 60_000).toISOString();
    try {
      await splittingService.updateSession(spaceSessionId, { spaceEndsAt: newEndsAt });
      refresh();
    } catch (error) {
      console.error('Failed to extend space window:', error);
      showError('Could not extend your space. Please try again.');
    }
  }, [spaceSessionId, refresh]);

  const handleOpenArtifact = useCallback(async () => {
    // If gift isn't loaded yet, load it now
    if (!dailyGift && !loadingGift) {
      setLoadingGift(true);
      try {
        const gift = await dailyGiftService.getTodaysGift();
        setDailyGift(gift);
      } catch (error) {
        console.error('Failed to load daily gift:', error);
      } finally {
        setLoadingGift(false);
      }
    }
    setArtifactOpen(true);
  }, [dailyGift, loadingGift]);

  const handleCloseArtifact = useCallback(() => {
    setArtifactOpen(false);
    // Don't automatically set opened here - only when user explicitly saves to vault
  }, []);

  const handleViewVault = useCallback(() => {
    navigation.navigate('Vault');
  }, [navigation]);

  const handleOpenMonthlyMemories = useCallback(() => {
    // Monthly Memories lives in the Together stack; open it with the current
    // month pre-selected (the screen defaults to "now" when month is omitted).
    navigation.navigate('Together', { screen: 'MonthlyMemories' });
  }, [navigation]);

  const handleOpenWeeklyReflection = useCallback(() => {
    navigation.navigate('WeeklyReflection');
  }, [navigation]);

  // The weekly reflection is surfaced on the dashboard every Sunday (it stays
  // reachable any day from the Vault). Computed once per mount — a day rollover
  // remounts the tree via the theme provider / re-focus refresh anyway.
  const showWeeklyReflection = useMemo(() => isSunday(), []);

  const handleOpenNotifications = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const handleSaveToVault = useCallback(async () => {
    if (!dailyGift) {
      console.warn('No daily gift to save');
      return;
    }

    // Guard against re-saving a memory that's already in the vault. The reveal
    // disables the button in this case, but this keeps the rule enforced even
    // if it's called some other way.
    if (savedMemoryIds.has(dailyGift.memory.id)) {
      return;
    }

    try {
      // Save the memory to the vault. The server reads the gift's details from
      // the memory itself, so only the reference goes over the wire.
      await vaultService.save({
        memoryId: dailyGift.memory.id,
        cardNumber: dailyGift.cardNumber,
      });

      // Remember it's now in the vault so it can't be saved again this session.
      setSavedMemoryIds((prev) => new Set(prev).add(dailyGift.memory.id));
      // Only flip the dashboard card to "View vault" once the save is confirmed.
      setArtifactOpened(true);
      void artifactStore.markOpenedToday();
      showSuccess('Saved!');
    } catch (error) {
      // Leave the card in its unopened state so the user can retry — a failed
      // save must not make it look like a gift was kept.
      console.error('Failed to save gift to vault:', error);
      showError('Sorry that failed :(');
      throw error;
    }
  }, [dailyGift, savedMemoryIds]);

  // Whether today's gift references a memory the user has already kept. Such a
  // gift can't be saved again, so the reveal shows it as already in the vault.
  const giftAlreadySaved = useMemo(
    () => (dailyGift ? savedMemoryIds.has(dailyGift.memory.id) : false),
    [dailyGift, savedMemoryIds],
  );

  // ── Loading state ────────────────────────────────────────────────────────
  if (dashboard.loading && !dashboard.partnerName) {
    return (
      <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
        <View style={styles.scrim} />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <StatusBar barStyle="light-content" backgroundColor={colors.background} translucent={false} />
          <View style={styles.loadingContainer}>
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

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <SanctuaryDashboard
            userName={dashboard.userName}
            partnerName={dashboard.partnerName}
            relationshipDays={dashboard.relationshipDays}
            daysTillAnniversary={anniversaryDays}
            timeOfDay={timeOfDay}
            partnerMoodLabel={partnerMoodLabel}
            partnerUpdatedAgo={partnerUpdatedAgo}
            userMoodLabel={userMoodLabel}
            spaceWindowOwner={dashboard.spaceWindow?.owner ?? null}
            spaceWindowEndsAt={dashboard.spaceWindow?.spaceEndsAt ?? null}
            canControlSpaceWindow={Boolean(spaceSessionId)}
            onEndSpace={handleEndSpace}
            onExtendSpace={handleExtendSpace}
            onReconnectHug={handleHug}
            onReconnectCheckIn={handleCheckIn}
            hasMoodToday={dashboard.hasMoodToday}
            onCheckIn={handleCheckIn}
            onHug={handleHug}
            onDistraction={handleDistraction}
            onLogIncident={handleLogIncident}
            onLetsChat={handleLetsChat}
            onSOS={handleSOS}
            onOpenArtifact={handleOpenArtifact}
            artifactOpened={artifactOpened}
            onViewVault={handleViewVault}
            onOpenMonthlyMemories={handleOpenMonthlyMemories}
            showWeeklyReflection={showWeeklyReflection}
            onOpenWeeklyReflection={handleOpenWeeklyReflection}
            onOpenNotifications={handleOpenNotifications}
            cardNumber={dailyGift?.cardNumber ?? null}
          />

          {/* Bottom breathing room above nav bar */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Daily gift — spin-to-reveal fullscreen card */}
        <ArtifactRevealModal
          visible={artifactOpen}
          onClose={handleCloseArtifact}
          onSaveToVault={handleSaveToVault}
          badge="SERIES 01 · REVEALED"
          title={dailyGift?.title ?? "Your Daily Memory"}
          body={dailyGift?.body ?? "Loading your memory gift..."}
          cardNumber={dailyGift?.cardNumber ?? 1}
          alreadySaved={giftAlreadySaved}
          media={dailyGift?.memory?.media}
          latitude={dailyGift?.memory?.latitude}
          longitude={dailyGift?.memory?.longitude}
          location={dailyGift?.memory?.location}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Subtle dark scrim over the image so the dashboard content stays readable.
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 18, 10, 0.45)',
  },
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
