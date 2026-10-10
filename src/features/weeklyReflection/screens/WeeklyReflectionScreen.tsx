/**
 * WeeklyReflectionScreen — a gentle Monday–Sunday retrospective of the user's
 * own week, aggregated client-side from moods, memories, timeline, hugs and the
 * bucket list (see useWeeklyReflection + aggregateWeek).
 *
 * Design follows the Sanctuary dashboard: rounded surfaceCard cards, EB Garamond
 * headlines, the gold accent reserved for positive/pleasant states, and the
 * same graceful-degradation posture (one failed request never blanks the screen).
 *
 * States:
 *   - loading (first load)  → centered gold spinner
 *   - empty (0 check-ins)   → gentle "quiet week" message instead of stats
 *   - populated             → mood strip, dominant anchor, stat cards, memories,
 *                             milestones, and a Save-to-Vault CTA
 *
 * Week navigation: arrows in the header row, plus a horizontal swipe. "Next" is
 * disabled on the current week (we never page into the future).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccessOverlay } from '../../../shared/state/successOverlayStore';
import { showErrorOverlay } from '../../../shared/state/errorOverlayStore';
import { authService } from '../../../services/auth/authService';
import type { MainTabParamList } from '../../../navigation/types';

import { useWeeklyReflection } from '../hooks/useWeeklyReflection';
import { weeklyReflectionArchive } from '../services/weeklyReflectionArchive';
import {
  WEEKDAY_LABELS,
  formatWeekRangeLabel,
  formatWeekRangeShort,
  getWeekRange,
  weekKey,
} from '../utils/weekRange';
import { QUADRANT_DISPLAY, isPleasant } from '../utils/quadrantDisplay';
import type {
  DayMood,
  WeeklyMilestone,
  WeeklyReflection,
} from '../types/weeklyReflection.types';
import type { ArchivedReflection } from '../types/archive.types';

// ─── Icons ─────────────────────────────────────────────────────────────────

function ChevronLeft({ disabled = false }: { disabled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6l-6 6 6 6"
        stroke={disabled ? colors.neutralSubtle : colors.gold}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight({ disabled = false }: { disabled?: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={disabled ? colors.neutralSubtle : colors.gold}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoonIcon({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function HeartIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21C12 21 3 14.5 3 8.5a4.5 4.5 0 018.5-2.12A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhotoIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v11A2.5 2.5 0 0117.5 20h-11A2.5 2.5 0 014 17.5z"
        stroke={colors.gold}
        strokeWidth={1.5}
      />
      <Circle cx={9} cy={9.5} r={1.5} stroke={colors.gold} strokeWidth={1.3} />
      <Path d="M5 17l4.5-4 3 2.5L16 12l3.5 3.5" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5l2.5 5.3 5.5.7-4 4 1 5.5L12 16.9 6.9 19l1-5.5-4-4 5.5-.7z"
        stroke={colors.gold}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ArchiveIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M6 7l1 12h10l1-12" stroke={colors.ctaText} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 4h6l1 3H8z" stroke={colors.ctaText} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M10 11h4" stroke={colors.ctaText} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Gold-outlined archive glyph for the header action (open saved reflections). */
function ArchiveOutlineIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M6 7l1 12h10l1-12" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 4h6l1 3H8z" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M10 11h4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** One MON…SUN column: label, day-of-month, and a mood dot. */
function DayCell({ day, label }: { day: DayMood; label: string }) {
  const display = day.quadrant ? QUADRANT_DISPLAY[day.quadrant] : null;
  return (
    <View style={styles.dayCell}>
      <Text style={styles.dayLabel}>{label}</Text>
      <Text style={[styles.dayNumber, !day.hasCheckIn && styles.dayNumberMuted]}>
        {day.dayOfMonth}
      </Text>
      <View
        style={[
          styles.dayDot,
          day.hasCheckIn && display
            ? { backgroundColor: display.dotColor }
            : day.hasCheckIn
              ? styles.dayDotUnmapped
              : styles.dayDotEmpty,
        ]}
      />
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  children,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statCardTop}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {children}
    </View>
  );
}

function MilestoneRow({ milestone }: { milestone: WeeklyMilestone }) {
  return (
    <View style={styles.milestoneRow}>
      <View style={styles.milestoneIcon}>
        <StarIcon size={16} />
      </View>
      <View style={styles.milestoneBody}>
        <Text style={styles.milestoneTitle} numberOfLines={1}>
          {milestone.title}
        </Text>
        <Text style={styles.milestoneKind}>
          {prettyKind(milestone.kind)}
          {milestone.source === 'bucketList' ? ' · bucket list' : ''}
        </Text>
      </View>
    </View>
  );
}

/** "FirstDate" → "First Date"; passthrough for already-friendly names. */
function prettyKind(kind: string): string {
  return kind
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ─── Reflection body (shared by the live screen and archived snapshots) ──────

/**
 * The scrollable reflection content — mood strip, dominant mood, stats,
 * memories, milestones. Rendered identically whether the data is live or a
 * frozen archive snapshot, so a saved week looks exactly like when it was kept.
 */
function ReflectionBody({
  reflection,
  moodDataPartial,
  onCheckIn,
}: {
  reflection: WeeklyReflection;
  moodDataPartial: boolean;
  /** Shown in the empty state on the current, live week only. */
  onCheckIn?: () => void;
}) {
  const dominant = reflection.dominantQuadrant
    ? QUADRANT_DISPLAY[reflection.dominantQuadrant]
    : null;
  const dominantIsPleasant =
    reflection.dominantQuadrant != null && isPleasant(reflection.dominantQuadrant);

  return (
    <>
      {/* ── Mood strip (always shown; dots read empty on a quiet week) ── */}
      <View style={styles.card}>
        <View style={styles.stripHeader}>
          <Text style={styles.cardLabel}>DAILY RHYTHM</Text>
          <Text style={styles.cardLabelMuted}>{reflection.checkInDays}/7 LOGGED</Text>
        </View>
        <View style={styles.strip}>
          {reflection.days.map((day) => (
            <DayCell key={day.dayIndex} day={day} label={WEEKDAY_LABELS[day.dayIndex]} />
          ))}
        </View>
        {moodDataPartial ? (
          <Text style={styles.partialNote}>
            Mood shown from your latest check-in. A full-week mood history isn’t
            available yet.
          </Text>
        ) : null}
      </View>

      {reflection.isEmpty ? (
        // ── Empty state ─────────────────────────────────────────────────
        <View style={[styles.card, styles.emptyCard]}>
          <View style={styles.emptyGlyph}>
            <MoonIcon />
          </View>
          <Text style={styles.emptyTitle}>A Quiet Week</Text>
          <Text style={styles.emptyBody}>
            You haven’t logged any moods over these seven days. There’s no
            pressure and no streak to keep — whenever you’re ready to check in,
            your sanctuary is right here.
          </Text>
          {onCheckIn ? (
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              onPress={onCheckIn}
              accessibilityRole="button"
              accessibilityLabel="Check in today"
            >
              <Text style={styles.ghostBtnText}>Check in today</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          {/* ── Dominant emotional anchor ─────────────────────────────── */}
          {dominant ? (
            <View
              style={[
                styles.card,
                styles.dominantCard,
                dominantIsPleasant && styles.dominantCardPleasant,
              ]}
            >
              <View style={styles.dominantHeader}>
                <Text style={styles.cardLabel}>DOMINANT MOOD</Text>
                <View style={[styles.dominantDot, { backgroundColor: dominant.dotColor }]} />
              </View>
              <Text style={styles.dominantTitle}>{dominant.title}</Text>
              <Text style={styles.dominantTagline}>{dominant.tagline}</Text>
              <Text style={styles.dominantMeta}>
                Across {reflection.dominantCount} of {reflection.checkInDays}{' '}
                {reflection.checkInDays === 1 ? 'check-in' : 'check-ins'} this week
              </Text>
            </View>
          ) : null}

          {/* ── Stat cards ─────────────────────────────────────────────── */}
          <View style={styles.statRow}>
            <StatCard
              icon={<PhotoIcon />}
              value={String(reflection.memoryCount)}
              label={reflection.memoryCount === 1 ? 'MEMORY' : 'MEMORIES'}
            />
            <StatCard
              icon={<HeartIcon />}
              value={String(reflection.hugsSent + reflection.hugsReceived)}
              label="HUGS"
            >
              <Text style={styles.statSub}>
                {reflection.hugsSent} sent · {reflection.hugsReceived} received
              </Text>
            </StatCard>
            <StatCard
              icon={<StarIcon />}
              value={`${reflection.checkInDays}/7`}
              label="STREAK"
            />
          </View>

          {/* ── Memory thumbnails ──────────────────────────────────────── */}
          {reflection.memoryThumbs.length > 0 ? (
            <View style={styles.card}>
              <View style={styles.stripHeader}>
                <Text style={styles.cardLabel}>MOMENTS CAPTURED</Text>
                <Text style={styles.cardLabelMuted}>{reflection.memoryCount} TOTAL</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}
              >
                {reflection.memoryThumbs.map((thumb) => (
                  <View key={thumb.id} style={styles.thumb}>
                    {thumb.thumbnailUrl ? (
                      <Image
                        source={{ uri: thumb.thumbnailUrl }}
                        style={styles.thumbImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbImage, styles.thumbPlaceholder]}>
                        <PhotoIcon size={22} />
                      </View>
                    )}
                    <Text style={styles.thumbTitle} numberOfLines={1}>
                      {thumb.title}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ── Milestones ─────────────────────────────────────────────── */}
          {reflection.milestones.length > 0 ? (
            <View style={styles.card}>
              <Text style={[styles.cardLabel, styles.milestonesLabel]}>
                MILESTONES & MOMENTS
              </Text>
              {reflection.milestones.map((m) => (
                <MilestoneRow key={`${m.source}-${m.id}`} milestone={m} />
              ))}
            </View>
          ) : null}
        </>
      )}
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type WeeklyReflectionRoute = RouteProp<MainTabParamList, 'WeeklyReflection'>;

export function WeeklyReflectionScreen() {
  const route = useRoute<WeeklyReflectionRoute>();
  const archivedWeekKey = route.params?.archivedWeekKey ?? null;

  // Archived snapshots are read-only and don't fetch or page weeks — render the
  // frozen version instead of the live hook.
  if (archivedWeekKey) {
    return <ArchivedReflectionView weekKey={archivedWeekKey} />;
  }
  return <LiveReflectionView />;
}

// ── Live (current + past weeks, recomputed) ─────────────────────────────────

function LiveReflectionView() {
  const navigation = useNavigation();
  const {
    reflection,
    loading,
    error,
    currentUserId,
    weekOffset,
    isCurrentWeek,
    moodDataPartial,
    goToPreviousWeek,
    goToNextWeek,
  } = useWeeklyReflection();

  const range = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const rangeLabel = useMemo(() => formatWeekRangeLabel(range), [range]);
  const rangeShort = useMemo(() => formatWeekRangeShort(range), [range]);

  const [saving, setSaving] = useState(false);

  // Horizontal swipe → page weeks. Swipe right = older week, left = newer.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_evt, g) => {
        if (g.dx > 60) goToPreviousWeek();
        else if (g.dx < -60) goToNextWeek();
      },
    }),
  ).current;

  const handleSaveToArchive = useCallback(async () => {
    setSaving(true);
    try {
      await weeklyReflectionArchive.save(currentUserId, {
        weekKey: weekKey(range),
        rangeLabel,
        moodDataPartial,
        reflection,
      });
      showSuccessOverlay('Held in your Sanctuary');
    } catch {
      showErrorOverlay("Couldn't save reflection");
    } finally {
      setSaving(false);
    }
  }, [currentUserId, range, rangeLabel, moodDataPartial, reflection]);

  const handleCheckIn = useCallback(
    () => (navigation as { navigate: (n: string) => void }).navigate('CheckIn'),
    [navigation],
  );

  const openArchive = useCallback(
    () =>
      (navigation as { navigate: (n: string) => void }).navigate(
        'WeeklyReflectionArchive',
      ),
    [navigation],
  );

  const headerRight = (
    <Pressable
      onPress={openArchive}
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="View saved reflections"
    >
      <ArchiveOutlineIcon />
    </Pressable>
  );

  // ── Loading (first load) ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader
          title="Weekly Reflection"
          onBack={() => navigation.goBack()}
          right={headerRight}
        />
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Weekly Reflection"
        onBack={() => navigation.goBack()}
        right={headerRight}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        {...panResponder.panHandlers}
      >
        {/* ── Week navigation ─────────────────────────────────────────── */}
        <View style={styles.weekNav}>
          <Pressable
            onPress={goToPreviousWeek}
            style={({ pressed }) => [styles.weekNavBtn, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Previous week"
            android_ripple={{ color: 'rgba(139,111,58,0.15)', borderless: true }}
          >
            <ChevronLeft />
          </Pressable>

          <View style={styles.weekNavCenter}>
            <Text style={styles.weekLabel}>
              {isCurrentWeek ? 'This Week' : rangeShort}
            </Text>
            <Text style={styles.weekRange}>{rangeLabel}</Text>
          </View>

          <Pressable
            onPress={goToNextWeek}
            disabled={isCurrentWeek}
            style={({ pressed }) => [
              styles.weekNavBtn,
              pressed && !isCurrentWeek && styles.pressed,
            ]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Next week"
            accessibilityState={{ disabled: isCurrentWeek }}
            android_ripple={{ color: 'rgba(139,111,58,0.15)', borderless: true }}
          >
            <ChevronRight disabled={isCurrentWeek} />
          </Pressable>
        </View>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <Text style={styles.heroLabel}>SANCTUARY RETROSPECTIVE</Text>
        <Text style={styles.heroTitle}>Your Week</Text>

        <ReflectionBody
          reflection={reflection}
          moodDataPartial={moodDataPartial}
          onCheckIn={isCurrentWeek ? handleCheckIn : undefined}
        />

        {error ? <Text style={styles.softError}>{error}</Text> : null}

        {/* ── Save CTA ─────────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && styles.pressed,
            saving && styles.ctaBtnDisabled,
          ]}
          onPress={handleSaveToArchive}
          disabled={saving}
          android_ripple={{ color: 'rgba(10,20,15,0.15)' }}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          accessibilityLabel="Save reflection to your Sanctuary archive"
        >
          <ArchiveIcon />
          <Text style={styles.ctaBtnText}>
            {saving ? 'SAVING…' : 'SAVE TO SANCTUARY ARCHIVE'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Archived (frozen snapshot, read-only) ────────────────────────────────────

function ArchivedReflectionView({ weekKey: key }: { weekKey: string }) {
  const navigation = useNavigation();
  const [entry, setEntry] = useState<ArchivedReflection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // The archive is namespaced per user; resolve the id, then the snapshot.
      let userId: string | null = null;
      try {
        userId = (await authService.getMe()).id;
      } catch {
        userId = null;
      }
      const found = await weeklyReflectionArchive.getByWeekKey(userId, key);
      if (active) {
        setEntry(found);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [key]);

  const reflection = useMemo(
    () => (entry ? weeklyReflectionArchive.hydrate(entry.reflection) : null),
    [entry],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Saved Reflection" onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry || !reflection) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Saved Reflection" onBack={() => navigation.goBack()} />
        <View style={styles.centerFill}>
          <Text style={styles.softError}>This reflection is no longer saved.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const savedLabel = new Date(entry.savedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Saved Reflection" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Frozen week label — a snapshot is a single week, so no navigation. */}
        <View style={styles.weekNav}>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekLabel}>KEPT REFLECTION</Text>
            <Text style={styles.weekRange}>{entry.rangeLabel}</Text>
          </View>
        </View>

        <Text style={styles.heroLabel}>
          SANCTUARY ARCHIVE · SAVED {savedLabel.toUpperCase()}
        </Text>
        <Text style={styles.heroTitle}>Your Week</Text>

        <ReflectionBody
          reflection={reflection}
          moodDataPartial={entry.moodDataPartial}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Week nav
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  weekNavCenter: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm },
  weekLabel: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
  },
  weekRange: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 2,
  },

  // Hero
  heroLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.headline,
    color: colors.neutral,
    marginTop: 2,
    marginBottom: spacing.md,
  },

  // Generic card
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 1,
  },
  cardLabelMuted: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Mood strip
  stripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: { alignItems: 'center', flex: 1 },
  dayLabel: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  dayNumber: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 15,
    marginTop: 4,
  },
  dayNumberMuted: { color: colors.neutralSubtle },
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 8,
  },
  dayDotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayDotUnmapped: { backgroundColor: colors.neutralSubtle },
  partialNote: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    marginTop: spacing.md,
    fontStyle: 'italic',
  },

  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyGlyph: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  ghostBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  ghostBtnText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
  },

  // Dominant
  dominantCard: { paddingVertical: spacing.lg },
  dominantCardPleasant: { borderColor: colors.gold },
  dominantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  dominantDot: { width: 12, height: 12, borderRadius: 6 },
  dominantTitle: {
    ...typography.headline,
    color: colors.neutral,
    fontStyle: 'italic',
  },
  dominantTagline: {
    ...typography.body,
    color: colors.neutralMuted,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  dominantMeta: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    marginTop: spacing.md,
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statCardTop: { marginBottom: spacing.sm },
  statValue: {
    ...typography.headlineSm,
    color: colors.neutral,
  },
  statLabel: {
    ...typography.label,
    color: colors.neutralSubtle,
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  statSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
    marginTop: 4,
  },

  // Thumbnails
  thumbRow: { gap: spacing.sm, paddingRight: spacing.sm },
  thumb: { width: 120 },
  thumbImage: {
    width: 120,
    height: 90,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbTitle: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: spacing.xs,
  },

  // Milestones
  milestonesLabel: { marginBottom: spacing.md },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  milestoneBody: { flex: 1 },
  milestoneTitle: {
    ...typography.bodyMedium,
    color: colors.neutral,
  },
  milestoneKind: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    marginTop: 2,
  },

  softError: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: {
    ...typography.label,
    color: colors.ctaText,
    fontSize: 12,
  },

  headerAction: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
