/**
 * MemoriesScreen — the couple's "Our Story" memories view (GET /api/memories).
 *
 * Fully backend-driven, no mocks: a header with real capture stats, category
 * filter tabs derived from the actual categories present, memories grouped by
 * month, and rich cards showing every field the API returns (category badge,
 * date-time, title, photo count from media, location, description, favorite,
 * and who added it). Reached from the Together dashboard.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { showSuccess, showError } from '../../../shared/state/bannerStore';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { api } from '../../../services/api/client';
import type { RelationshipResponse } from '../../../services/api/types';
import { memoriesService } from '../services/memoriesService';
import { PhotoCarousel } from '../components/PhotoCarousel';
import { MemoryLocationMap } from '../components/MemoryLocationMap';
import { MemoryDetailModal } from '../components/MemoryDetailModal';
import { openInMaps } from '../../../services/geocoding/openInMaps';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { MemoryCategory, MemoryResponse } from '../types/memory.types';
import {
  decodeMemoryCategory,
  isPhotoMedia,
} from '../types/memory.types';
import { formatMemoryDate } from '../utils/formatMemoryDateTime';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'Memories'>;

type Filter = 'All' | MemoryCategory;

// ─── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon({ color = colors.ctaText }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function PinIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-5.686 7-11a7 7 0 10-14 0c0 5.314 7 11 7 11z"
        stroke={colors.neutralSubtle}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path d="M12 12.5a2 2 0 100-4 2 2 0 000 4z" stroke={colors.neutralSubtle} strokeWidth={1.6} />
    </Svg>
  );
}

function PhotoIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A1.5 1.5 0 015.5 5h13A1.5 1.5 0 0120 6.5v11A1.5 1.5 0 0118.5 19h-13A1.5 1.5 0 014 17.5v-11z"
        stroke={colors.neutral}
        strokeWidth={1.5}
      />
      <Path d="M4 16l4-4 3 3 4-5 5 6" stroke={colors.neutral} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function categoryOf(m: MemoryResponse): MemoryCategory {
  return decodeMemoryCategory(m.category);
}

function photoCount(m: MemoryResponse): number {
  return m.media.filter((mm) => isPhotoMedia(mm.mediaType)).length;
}

/** Loadable photo URLs for a memory (skips media without a resolved URL). */
function photoUrls(m: MemoryResponse): string[] {
  return m.media
    .filter((mm) => isPhotoMedia(mm.mediaType) && !!mm.url)
    .map((mm) => resolveMediaUrl(mm.url));
}

/** "August 2026" grouping key + label. */
function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Parse the relationship start date ("YYYY-MM-DD") to a local Date at midnight.
 * Returns null when absent or unparseable.
 */
function parseStartDate(startDate: string | null): Date | null {
  if (!startDate) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole years between the relationship start date and today. */
function yearsTogether(start: Date | null): number | null {
  if (!start) return null;
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const beforeAnniversary =
    now.getMonth() < start.getMonth() ||
    (now.getMonth() === start.getMonth() && now.getDate() < start.getDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function MemoryCard({
  item,
  onOpenMap,
  onOpen,
}: {
  item: MemoryResponse;
  onOpenMap: (item: MemoryResponse) => void;
  onOpen: (item: MemoryResponse) => void;
}) {
  const category = categoryOf(item);
  const photos = photoCount(item);
  const photoUris = photoUrls(item);
  const hasCoords = item.latitude != null && item.longitude != null;
  const hasPhotos = photoUris.length > 0;
  const isMilestone = category === 'Milestone';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isMilestone && styles.cardMilestone,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open memory ${item.title}`}
    >
      <View style={styles.cardTopRow}>
        <View style={[styles.badge, isMilestone && styles.badgeMilestone]}>
          <Text style={[styles.badgeText, isMilestone && styles.badgeTextMilestone]}>
            {category}
          </Text>
        </View>
        <Text style={styles.cardDate}>{formatMemoryDate(item.memoryDateTime)}</Text>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.isFavorite ? <Text style={styles.star}>♥</Text> : null}
      </View>

      {photoUris.length > 0 ? (
        <View style={styles.carouselWrap}>
          <PhotoCarousel uris={photoUris} />
        </View>
      ) : photos > 0 ? (
        <View style={styles.photoStrip}>
          <PhotoIcon />
          <Text style={styles.photoCount}>
            {photos} {photos === 1 ? 'photo' : 'photos'}
          </Text>
        </View>
      ) : hasCoords ? (
        <Pressable
          style={styles.carouselWrap}
          onPress={() => onOpenMap(item)}
          accessibilityRole="button"
          accessibilityLabel={`Open map for ${item.title}`}
        >
          <MemoryLocationMap
            latitude={item.latitude as number}
            longitude={item.longitude as number}
            label={item.location}
          />
        </Pressable>
      ) : null}

      {item.description ? (
        <Text style={styles.cardDesc}>{item.description}</Text>
      ) : null}

      <View style={styles.cardMeta}>
        {/* When a memory has photos, the carousel is the focus — hide the
            location row so the images carry the card. Tap through to the
            detail popup to see the location. */}
        {!hasPhotos && item.location ? (
          hasCoords ? (
            <Pressable
              style={styles.metaItem}
              onPress={() =>
                openInMaps(
                  item.latitude as number,
                  item.longitude as number,
                  item.location ?? item.title,
                )
              }
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.location} in Maps`}
            >
              <PinIcon />
              <Text style={[styles.metaText, styles.metaLink]} numberOfLines={1}>
                {item.location}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.metaItem}>
              <PinIcon />
              <Text style={styles.metaText}>{item.location}</Text>
            </View>
          )
        ) : null}
        <Text style={styles.byLine}>by {item.createdByName}</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function MemoriesScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<MemoryResponse[]>([]);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  // The memory whose detail popup is open (null = closed).
  const [selected, setSelected] = useState<MemoryResponse | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    // Memories and the relationship (for the start date) load together. The
    // relationship call 404s for a solo/unlinked user, so it degrades to null.
    const [memoriesResult, relResult] = await Promise.allSettled([
      memoriesService.getAll(),
      api.get<RelationshipResponse>('/api/relationships/me'),
    ]);

    if (memoriesResult.status === 'fulfilled') {
      setItems(memoriesResult.value);
    } else {
      const err = memoriesResult.reason;
      setError(err instanceof Error ? err.message : 'Could not load memories.');
    }

    setStartDate(
      relResult.status === 'fulfilled' ? relResult.value?.startDate ?? null : null,
    );

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Refetch on focus so a memory added on the compose screen appears on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Filter tabs: "All" plus each category actually present, in a stable order.
  const availableFilters = useMemo<Filter[]>(() => {
    const present = new Set(items.map((m) => categoryOf(m)));
    const order: MemoryCategory[] = [
      'Trip',
      'Date',
      'Milestone',
      'Adventure',
      'Celebration',
      'Everyday',
    ];
    return ['All', ...order.filter((c) => present.has(c))];
  }, [items]);

  const visible = useMemo(() => {
    const filtered =
      filter === 'All' ? items : items.filter((m) => categoryOf(m) === filter);
    return [...filtered].sort((a, b) => timeOf(b.memoryDateTime) - timeOf(a.memoryDateTime));
  }, [items, filter]);

  // Group the visible memories by "Month Year" (newest month first).
  const groups = useMemo(() => {
    const map = new Map<string, MemoryResponse[]>();
    for (const m of visible) {
      const key = monthLabel(m.memoryDateTime);
      const arr = map.get(key);
      if (arr) arr.push(m);
      else map.set(key, [m]);
    }
    return Array.from(map.entries());
  }, [visible]);

  const start = useMemo(() => parseStartDate(startDate), [startDate]);
  const years = useMemo(() => yearsTogether(start), [start]);

  // Only the creator of a memory may edit or delete it. Compare the memory's
  // creator to the signed-in user (cached from /api/users/me at bootstrap).
  const canModifySelected = useMemo(() => {
    const myId = userSettingsStore.get()?.id;
    return !!selected && !!myId && selected.createdByUserId === myId;
  }, [selected]);

  const goAdd = useCallback(() => navigation.navigate('AddMemory'), [navigation]);
  const goTimeline = useCallback(
    () => navigation.navigate('RelationshipTimeline'),
    [navigation],
  );

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
      Alert.alert(
        'Delete memory',
        `Delete "${m.title}"? This can't be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // Optimistically remove from the list and close the popup.
              setDetailVisible(false);
              setItems((prev) => prev.filter((x) => x.id !== m.id));
              try {
                await memoriesService.remove(m.id);
                showSuccess('Deleted!');
              } catch (err) {
                // Restore on failure and surface the error.
                setItems((prev) =>
                  [...prev, m].sort(
                    (a, b) => timeOf(b.memoryDateTime) - timeOf(a.memoryDateTime),
                  ),
                );
                setError(err instanceof Error ? err.message : 'Could not delete the memory.');
                showError('Sorry that failed :(');
              }
            },
          },
        ],
      );
    },
    [],
  );
  const goMap = useCallback(
    (m: MemoryResponse) => {
      if (m.latitude == null || m.longitude == null) return;
      navigation.navigate('MemoryMap', {
        latitude: m.latitude,
        longitude: m.longitude,
        title: m.title,
        location: m.location,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Memories" onBack={() => navigation.goBack()} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
        >
          {/* Title */}
          <Text style={styles.title}>Our Story</Text>
          <Text style={styles.subtitle}>Everything you've experienced together.</Text>

          {/* Stats banner */}
          <View style={styles.statsCard}>
            <Text style={styles.statsNumber}>
              {items.length} {items.length === 1 ? 'moment' : 'moments'} captured
            </Text>
            {years != null && years > 0 ? (
              <Text style={styles.statsSub}>
                Across {years} {years === 1 ? 'year' : 'years'} together
              </Text>
            ) : years === 0 ? (
              <Text style={styles.statsSub}>Your first year together</Text>
            ) : (
              <Text style={styles.statsSub}>
                Add your start date when linking to count the days.
              </Text>
            )}
          </View>

          {/* Category filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {availableFilters.map((f) => {
              const active = f === filter;
              return (
                <Pressable
                  key={f}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(f)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={f === 'All' ? 'All memories' : f}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {f === 'All' ? 'All' : `${f}s`}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Grouped memories */}
          {groups.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>
                {filter === 'All'
                  ? 'No memories yet.'
                  : `No ${filter.toLowerCase()} memories yet.`}
              </Text>
              <Pressable style={styles.retryBtn} onPress={goAdd}>
                <Text style={styles.retryText}>Add your first</Text>
              </Pressable>
            </View>
          ) : (
            groups.map(([label, memories]) => (
              <View key={label} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{label}</Text>
                  <Text style={styles.groupCount}>
                    {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
                  </Text>
                </View>
                {memories.map((m) => (
                  <MemoryCard
                    key={m.id}
                    item={m}
                    onOpenMap={goMap}
                    onOpen={openDetail}
                  />
                ))}
              </View>
            ))
          )}

          <Pressable
            style={({ pressed }) => [styles.timelineBtn, pressed && styles.pressed]}
            onPress={goTimeline}
            accessibilityRole="button"
            accessibilityLabel="Open the relationship timeline"
          >
            <Text style={styles.timelineBtnText}>View relationship timeline →</Text>
          </Pressable>

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      {/* Floating add-to-timeline / add-memory CTA */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={goAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a memory"
        >
          <PlusIcon />
          <Text style={styles.fabText}>Add to Memories</Text>
        </Pressable>
      </View>

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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerKicker: {
    ...typography.label,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 28,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  statsNumber: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 18,
  },
  statsSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    marginTop: 2,
  },
  filterRow: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  filterChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.16)',
  },
  filterText: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.gold,
  },
  group: {
    marginTop: spacing.sm,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  groupTitle: {
    ...typography.label,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  groupCount: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 11,
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardMilestone: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(197,163,101,0.06)',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.28)',
  },
  badgeMilestone: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },
  badgeText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
  },
  badgeTextMilestone: {
    color: colors.background,
  },
  cardDate: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cardTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 18,
    flexShrink: 1,
  },
  star: {
    color: colors.gold,
    fontSize: 16,
  },
  photoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  photoCount: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
  },
  carouselWrap: {
    marginTop: spacing.sm,
  },
  cardDesc: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 12,
    flexShrink: 1,
  },
  metaLink: {
    color: colors.gold,
    textDecorationLine: 'underline',
  },
  byLine: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 12,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
  },
  errorText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
  timelineBtn: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  timelineBtnText: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 13,
  },
  pressed: { opacity: 0.8 },
  bottomPad: { height: 72 },
  fabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.lg,
    alignItems: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.ctaBackground,
    borderRadius: 26,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
