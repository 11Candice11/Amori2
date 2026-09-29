/**
 * MonthlyMemoriesScreen — the full "Monthly Memories" view (like iOS Photos
 * "Memories"), reached by tapping the dashboard's Rediscovery Archive widget.
 *
 * Surfaces the selected calendar month across the current and past years, in
 * two sections:
 *   - "Added this [Month]"        — a grid of memories added in the selected
 *                                   month/year, newest first.
 *   - "On this [Month] in [year]" — horizontally-scrolling cards grouped by
 *                                   past year, most-recent year first.
 *
 * A month stepper (‹ / ›) browses other months without refetching — all data
 * comes from the shared `useMonthlyMemories` hook (fetch once, group client-side).
 * Tapping a thumbnail opens the existing MemoryDetailModal (no new detail
 * screen). Each section has its own empty state, so one can be populated while
 * the other is empty. Loading is shown while the initial fetch is in flight.
 *
 * Memory visibility follows the same rules as the rest of Memories — both
 * partners see shared memories the same way; there is no extra privacy toggle.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography, layout } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { memoriesService } from '../services/memoriesService';
import { MemoryDetailModal } from '../components/MemoryDetailModal';
import { formatMemoryDate } from '../utils/formatMemoryDateTime';
import {
  MEMORY_CATEGORY_DISPLAY,
  decodeMemoryCategory,
  type MemoryResponse,
} from '../types/memory.types';
import {
  useMonthlyMemories,
  memoryPhotoUrls,
  type MonthKey,
  type PastYearGroup,
} from '../hooks/useMonthlyMemories';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'MonthlyMemories'>;
type ScreenRoute = RouteProp<TogetherStackParamList, 'MonthlyMemories'>;

// Grid: two columns with a gutter, inside the screen's horizontal padding.
const GRID_GUTTER = spacing.sm;
const GRID_COLUMNS = 2;
const GRID_TILE = Math.floor(
  (layout.width - spacing.lg * 2 - GRID_GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
);
const FLASHBACK_CARD_WIDTH = Math.round(layout.width * 0.62);

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeft({ disabled }: { disabled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={disabled ? colors.neutralSubtle : colors.gold}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight({ disabled }: { disabled?: boolean }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={disabled ? colors.neutralSubtle : colors.gold}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PhotoGlyph({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A1.5 1.5 0 015.5 5h13A1.5 1.5 0 0120 6.5v11A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-11z"
        stroke={colors.neutralSubtle}
        strokeWidth={1.5}
      />
      <Path
        d="M4 16l4-4 3 3 4-5 5 6"
        stroke={colors.neutralSubtle}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Thumbnail ──────────────────────────────────────────────────────────────────

/** First loadable photo for a memory, or null if it has none. */
function firstPhoto(m: MemoryResponse): string | null {
  const uris = memoryPhotoUrls(m);
  return uris.length > 0 ? uris[0] : null;
}

/**
 * A tappable memory tile — a cover photo (or a category-badge fallback) with
 * the title, date, and a favorite heart overlaid.
 */
function MemoryTile({
  memory,
  width,
  onOpen,
}: {
  memory: MemoryResponse;
  width: number;
  onOpen: (m: MemoryResponse) => void;
}) {
  const photo = firstPhoto(memory);
  const category = MEMORY_CATEGORY_DISPLAY[decodeMemoryCategory(memory.category)];

  return (
    <Pressable
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
      onPress={() => onOpen(memory)}
      accessibilityRole="button"
      accessibilityLabel={`Open memory ${memory.title}, ${formatMemoryDate(memory.memoryDateTime)}`}
    >
      <View style={[styles.tileImageWrap, { height: width }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.tileImage} resizeMode="cover" />
        ) : (
          <View style={styles.tileFallback}>
            <PhotoGlyph />
            <Text style={styles.tileFallbackText}>{category}</Text>
          </View>
        )}
        {memory.isFavorite ? (
          <View style={styles.heartPill}>
            <Text style={styles.heart}>♥</Text>
          </View>
        ) : null}
        <View style={styles.tileDatePill}>
          <Text style={styles.tileDateText}>{formatMemoryDate(memory.memoryDateTime)}</Text>
        </View>
      </View>
      <Text style={styles.tileTitle} numberOfLines={1}>
        {memory.title}
      </Text>
    </Pressable>
  );
}

// ─── Section: empty placeholder ──────────────────────────────────────────────────

function SectionEmpty({ text }: { text: string }) {
  return (
    <View style={styles.sectionEmpty}>
      <PhotoGlyph size={18} />
      <Text style={styles.sectionEmptyText}>{text}</Text>
    </View>
  );
}

// ─── Section: past-year flashback row ─────────────────────────────────────────────

function FlashbackGroup({
  group,
  currentYear,
  onOpen,
}: {
  group: PastYearGroup;
  currentYear: number;
  onOpen: (m: MemoryResponse) => void;
}) {
  const yearsAgo = currentYear - group.year;
  return (
    <View style={styles.flashbackGroup}>
      <View style={styles.flashbackHeader}>
        <Text style={styles.flashbackYear}>{group.year}</Text>
        <Text style={styles.flashbackAgo}>
          {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flashbackRow}
      >
        {group.memories.map((m) => (
          <MemoryTile key={m.id} memory={m} width={FLASHBACK_CARD_WIDTH} onOpen={onOpen} />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────────

export function MonthlyMemoriesScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<ScreenRoute>();
  const initialMonth = route.params?.month as MonthKey | undefined;

  const {
    monthKey,
    monthLabel,
    monthName,
    grouping,
    loading,
    refreshing,
    error,
    goToPreviousMonth,
    goToNextMonth,
    refresh,
    reload,
  } = useMonthlyMemories(initialMonth);

  // The detail popup (reuses the existing MemoryDetailModal — no new screen).
  const [selected, setSelected] = useState<MemoryResponse | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Refetch on focus so a memory added elsewhere appears on return.
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const selectedYear = useMemo(() => Number(monthKey.slice(0, 4)), [monthKey]);

  // Only the creator may edit/delete (same rule as MemoriesScreen).
  const canModifySelected = useMemo(() => {
    const myId = userSettingsStore.get()?.id;
    return !!selected && !!myId && selected.createdByUserId === myId;
  }, [selected]);

  const openDetail = useCallback((m: MemoryResponse) => {
    setSelected(m);
    setDetailVisible(true);
  }, []);
  const closeDetail = useCallback(() => setDetailVisible(false), []);

  const goEdit = useCallback(
    (m: MemoryResponse) => {
      setDetailVisible(false);
      navigation.navigate('AddMemory', { memoryId: m.id });
    },
    [navigation],
  );

  const confirmDelete = useCallback(
    (m: MemoryResponse) => {
      Alert.alert('Delete memory', `Delete "${m.title}"? This can't be undone.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDetailVisible(false);
            try {
              await memoriesService.remove(m.id);
              showSuccess('Deleted!');
              reload();
            } catch {
              showError('Sorry that failed :(');
            }
          },
        },
      ]);
    },
    [reload],
  );

  const goAdd = useCallback(() => navigation.navigate('AddMemory'), [navigation]);

  const { addedThisMonth, onThisMonthInPastYears, addedThisMonthCount, pastYearsCount } =
    grouping;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Monthly Memories" onBack={() => navigation.goBack()} />

      {/* Month stepper */}
      <View style={styles.stepper}>
        <Pressable
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}
          onPress={goToPreviousMonth}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <ChevronLeft />
        </Pressable>

        <Text style={styles.stepperLabel}>{monthLabel}</Text>

        <Pressable
          style={({ pressed }) => [styles.stepperBtn, pressed && styles.pressed]}
          onPress={goToNextMonth}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <ChevronRight />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.gold}
            />
          }
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* ── Section 1: Flashbacks (On this [Month] in [year]) ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>On this {monthName} in past years</Text>
            {pastYearsCount > 0 ? (
              <Text style={styles.sectionCount}>
                {pastYearsCount} {pastYearsCount === 1 ? 'memory' : 'memories'}
              </Text>
            ) : null}
          </View>
          {onThisMonthInPastYears.length > 0 ? (
            onThisMonthInPastYears.map((group) => (
              <FlashbackGroup
                key={group.year}
                group={group}
                currentYear={selectedYear}
                onOpen={openDetail}
              />
            ))
          ) : (
            <SectionEmpty text={`No memories from ${monthName} in earlier years — yet.`} />
          )}

          {/* ── Section 2: Added this month (grid) ── */}
          <View style={[styles.sectionHeader, styles.sectionHeaderSpaced]}>
            <Text style={styles.sectionTitle}>Added this {monthName}</Text>
            {addedThisMonthCount > 0 ? (
              <Text style={styles.sectionCount}>
                {addedThisMonthCount} {addedThisMonthCount === 1 ? 'memory' : 'memories'}
              </Text>
            ) : null}
          </View>
          {addedThisMonth.length > 0 ? (
            <View style={styles.grid}>
              {addedThisMonth.map((m) => (
                <MemoryTile key={m.id} memory={m} width={GRID_TILE} onOpen={openDetail} />
              ))}
            </View>
          ) : (
            <SectionEmpty text={`Nothing captured this ${monthName} yet.`} />
          )}

          {/* Gentle add prompt */}
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            onPress={goAdd}
            accessibilityRole="button"
            accessibilityLabel={`Add a memory for ${monthName}`}
          >
            <Text style={styles.addBtnText}>+ Add a memory for {monthName}</Text>
          </Pressable>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      <MemoryDetailModal
        visible={detailVisible}
        memory={selected}
        canModify={canModifySelected}
        onClose={closeDetail}
        onEdit={goEdit}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    ...typography.bodySm,
    color: colors.emergency,
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.85,
  },

  // Month stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperLabel: {
    ...typography.headlineSm,
    color: colors.neutral,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionHeaderSpaced: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
  },
  sectionCount: {
    ...typography.bodySm,
    color: colors.gold,
  },
  sectionEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceCard,
  },
  sectionEmptyText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    flex: 1,
  },

  // Flashback (past-year) rows
  flashbackGroup: {
    marginBottom: spacing.lg,
  },
  flashbackHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  flashbackYear: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 15,
  },
  flashbackAgo: {
    ...typography.bodySm,
    color: colors.neutralMuted,
  },
  flashbackRow: {
    gap: GRID_GUTTER,
    paddingRight: spacing.lg,
  },

  // Added-this-month grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GUTTER,
  },

  // Memory tile
  tile: {
    marginBottom: spacing.xs,
  },
  tileImageWrap: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileImage: {
    width: '100%',
    height: '100%',
  },
  tileFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tileFallbackText: {
    ...typography.label,
    color: colors.neutralSubtle,
  },
  heartPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heart: {
    color: colors.gold,
    fontSize: 14,
  },
  tileDatePill: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  tileDateText: {
    ...typography.bodySm,
    color: '#fff',
    fontSize: 11,
  },
  tileTitle: {
    ...typography.bodyMedium,
    color: colors.neutral,
    fontSize: 14,
    marginTop: 6,
  },

  // Add prompt
  addBtn: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
  },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});
