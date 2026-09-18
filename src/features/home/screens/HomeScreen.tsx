/**
 * HomeScreen — Sanctuary Dashboard (shared across iOS and Android).
 *
 * Renders the redesigned dashboard (SanctuaryDashboard):
 *   1. Top bar        — heart · "<partner> · CONNECTED" · avatar
 *   2. Hero greeting  — "<time>, <you> & <partner>" + SANCTUARY
 *   3. Stats row      — days together | days till anniversary
 *   4. Partner state  — partner's most recent mood
 *   5. Check-in row   — record today's state
 *   6. Attunement 2×2 — Send hug · Distraction · Log Incident · Not okay
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
import { SanctuaryDashboard } from '../components/SanctuaryDashboard';
import { ArtifactRevealModal } from '../components/ArtifactRevealModal';
import { useDashboard } from '../hooks/useDashboard';
import { artifactStore } from '../services/artifactStore';

// Cozy backgrounds for the dashboard. One is picked at random each time the
// app launches (evaluated once at module load) so the sanctuary feels fresh
// every session while staying stable during a single run.
const BACKGROUND_IMAGES = [
  require('../../../../images/cozy.png'),
  require('../../../../images/fireplace.png'),
  require('../../../../images/forest.png'),
];
const backgroundImage =
  BACKGROUND_IMAGES[Math.floor(Math.random() * BACKGROUND_IMAGES.length)];

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

  // Hydrate the opened flag from local storage on mount.
  useEffect(() => {
    let active = true;
    artifactStore.isOpenedToday().then((opened) => {
      if (active && opened) setArtifactOpened(true);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const handleNotOkay = useCallback(() => {
    // "Not okay" opens the grounding / "I'm splitting" sanctuary flow.
    navigation.navigate('Splitting', { screen: 'SplittingIntro' });
  }, [navigation]);

  const handleOpenArtifact = useCallback(() => {
    setArtifactOpen(true);
  }, []);

  const handleCloseArtifact = useCallback(() => {
    setArtifactOpen(false);
    // Opening the pack is a one-time action for the day. Persist it so the
    // "opened" state survives app relaunches.
    setArtifactOpened(true);
    void artifactStore.markOpenedToday();
  }, []);

  const handleViewVault = useCallback(() => {
    navigation.navigate('Vault');
  }, [navigation]);

  const handleSaveToVault = useCallback(() => {
    // TODO: persist the surprise to the Hearth Vault via the vault service
    // once the backend endpoint is wired up. For now the reveal modal shows a
    // local "Saved" confirmation.
  }, []);

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
            isPartnerOnline={dashboard.isPartnerOnline}
            relationshipDays={dashboard.relationshipDays}
            daysTillAnniversary={anniversaryDays}
            timeOfDay={timeOfDay}
            partnerMoodLabel={partnerMoodLabel}
            partnerUpdatedAgo={partnerUpdatedAgo}
            userMoodLabel={userMoodLabel}
            spaceWindowOwner={dashboard.spaceWindow?.owner ?? null}
            spaceWindowEndsAt={dashboard.spaceWindow?.spaceEndsAt ?? null}
            hasMoodToday={dashboard.hasMoodToday}
            onCheckIn={handleCheckIn}
            onHug={handleHug}
            onDistraction={handleDistraction}
            onLogIncident={handleLogIncident}
            onNotOkay={handleNotOkay}
            onOpenArtifact={handleOpenArtifact}
            artifactOpened={artifactOpened}
            onViewVault={handleViewVault}
          />

          {/* Bottom breathing room above nav bar */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Daily gift — spin-to-reveal fullscreen card */}
        <ArtifactRevealModal
          visible={artifactOpen}
          onClose={handleCloseArtifact}
          onSaveToVault={handleSaveToVault}
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
