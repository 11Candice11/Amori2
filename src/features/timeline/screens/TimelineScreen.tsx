/**
 * TimelineScreen — the couple's relationship milestone timeline
 * (GET /api/timeline).
 *
 * Fully backend-driven, no mocks: milestone events (first conversation, first
 * date, anniversary, trips, custom moments) are shown oldest → newest as a
 * vertical timeline with a connecting rail, an emoji marker per type, the event
 * date, title, optional photos/location/note and who recorded it. Tapping a
 * milestone flips it open in a detail popup (TimelineEventDetailModal); the
 * creator can edit or delete their own milestones from there. A floating button
 * opens the AddTimelineEvent compose screen.
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
import type { TimelineStackParamList } from '../../../navigation/TimelineStackParamList';
import { authService } from '../../../services/auth/authService';
import type { TimelineEventResponse } from '../../../services/api/types';
import { timelineService } from '../services/timelineService';
import { openInMaps } from '../../../services/geocoding/openInMaps';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { PhotoCarousel } from '../../memories/components/PhotoCarousel';
import { TimelineEventDetailModal } from '../components/TimelineEventDetailModal';
import { TIMELINE_EVENT_EMOJI, TIMELINE_EVENT_LABELS } from '../types/timeline.types';

type Nav = NativeStackNavigationProp<TimelineStackParamList, 'TimelineHome'>;

// ─── Icons ──────────────────────────────────────────────────────────────────

function PlusIcon({ color = colors.ctaText }: { color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Sortable epoch from a "YYYY-MM-DD" event date; NaN-safe. */
function dayOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** True when an event has usable map coordinates. */
function hasCoords(e: TimelineEventResponse): boolean {
  return e.latitude != null && e.longitude != null;
}

/** Loadable photo URLs for a milestone (skips entries without a resolved URL). */
function photoUrls(e: TimelineEventResponse): string[] {
  return e.photos.filter((p) => !!p.url).map((p) => resolveMediaUrl(p.url));
}

/** "12 August 2026" from a "YYYY-MM-DD" event date. */
function formatEventDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function TimelineItem({
  item,
  isLast,
  onOpen,
}: {
  item: TimelineEventResponse;
  isLast: boolean;
  onOpen: (e: TimelineEventResponse) => void;
}) {
  const photos = photoUrls(item);

  return (
    <View style={styles.item}>
      <View style={styles.rail}>
        <View style={styles.dot}>
          <Text style={styles.dotEmoji}>{TIMELINE_EVENT_EMOJI[item.eventType]}</Text>
        </View>
        {isLast ? null : <View style={styles.line} />}
      </View>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={() => onOpen(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open milestone ${item.title}`}
      >
        <View style={styles.cardTop}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{TIMELINE_EVENT_LABELS[item.eventType]}</Text>
          </View>
          <Text style={styles.date}>{formatEventDate(item.eventDate)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>

        {photos.length > 0 ? (
          <View style={styles.carouselWrap}>
            <PhotoCarousel uris={photos} height={180} />
          </View>
        ) : null}

        {item.description ? (
          <Text style={styles.desc}>{item.description}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          {item.location ? (
            hasCoords(item) ? (
              <Pressable
                onPress={() =>
                  openInMaps(item.latitude as number, item.longitude as number, item.location)
                }
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.location} in Maps`}
              >
                <Text style={[styles.location, styles.locationLink]}>📍 {item.location}</Text>
              </Pressable>
            ) : (
              <Text style={styles.location}>📍 {item.location}</Text>
            )
          ) : null}
          <Text style={styles.byLine}>by {item.createdByName}</Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function TimelineScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<TimelineEventResponse[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The milestone whose detail popup is open (null = closed).
  const [selected, setSelected] = useState<TimelineEventResponse | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [me, list] = await Promise.all([
        authService.getMe().catch(() => null),
        timelineService.getEvents(),
      ]);
      setMeId(me?.id ?? null);
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the timeline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  // Oldest → newest, so the story reads top to bottom.
  const chronological = useMemo(
    () => [...items].sort((a, b) => dayOf(a.eventDate) - dayOf(b.eventDate)),
    [items],
  );

  // Only the creator of a milestone may edit or delete it.
  const canModifySelected = useMemo(
    () => !!selected && !!meId && selected.createdByUserId === meId,
    [selected, meId],
  );

  const openDetail = useCallback((e: TimelineEventResponse) => {
    setSelected(e);
    setDetailVisible(true);
  }, []);

  const closeDetail = useCallback(() => setDetailVisible(false), []);

  const goEdit = useCallback(
    (e: TimelineEventResponse) => {
      setDetailVisible(false);
      navigation.navigate('AddTimelineEvent', { eventId: e.id });
    },
    [navigation],
  );

  const confirmDelete = useCallback((e: TimelineEventResponse) => {
    Alert.alert('Delete milestone', `Remove "${e.title}" from your timeline?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDetailVisible(false);
          setItems((cur) => cur.filter((x) => x.id !== e.id));
          try {
            await timelineService.deleteEvent(e.id);
            showSuccess('Deleted!');
          } catch {
            setItems((cur) => [...cur, e]);
            showError('Sorry that failed :(');
          }
        },
      },
    ]);
  }, []);

  const goAdd = useCallback(() => navigation.navigate('AddTimelineEvent'), [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Our Timeline" onBack={() => navigation.goBack()} />

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
          <Text style={styles.pageTitle}>The story so far</Text>
          <Text style={styles.subtitle}>
            {items.length} {items.length === 1 ? 'milestone' : 'milestones'} on your journey.
          </Text>

          {chronological.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>
                Your story starts with the first milestone you add.
              </Text>
              <Pressable style={styles.retryBtn} onPress={goAdd}>
                <Text style={styles.retryText}>Add your first</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.timeline}>
              {chronological.map((e, i) => (
                <TimelineItem
                  key={e.id}
                  item={e}
                  isLast={i === chronological.length - 1}
                  onOpen={openDetail}
                />
              ))}
            </View>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      )}

      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={goAdd}
          accessibilityRole="button"
          accessibilityLabel="Add a milestone"
        >
          <PlusIcon />
          <Text style={styles.fabText}>Add milestone</Text>
        </Pressable>
      </View>

      <TimelineEventDetailModal
        visible={detailVisible}
        event={selected}
        canModify={canModifySelected}
        onClose={closeDetail}
        onEdit={goEdit}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}

const DOT_SIZE = 34;

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
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerKicker: { ...typography.label, color: colors.gold, fontSize: 11, letterSpacing: 1.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  pageTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 28 },
  subtitle: { ...typography.body, color: colors.neutralMuted, fontSize: 14, marginTop: 4, marginBottom: spacing.md },

  timeline: { marginTop: spacing.sm },
  item: { flexDirection: 'row' },
  rail: { width: DOT_SIZE + 8, alignItems: 'center' },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: 'rgba(197,163,101,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dotEmoji: { fontSize: 16 },
  line: { flex: 1, width: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  badge: {
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.28)',
  },
  badgeText: { ...typography.label, color: colors.gold, fontSize: 10 },
  date: { ...typography.bodySm, color: colors.neutralMuted, fontSize: 12 },
  title: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 17, marginTop: spacing.sm },
  carouselWrap: { marginTop: spacing.sm },
  desc: { ...typography.body, color: colors.neutralMuted, fontSize: 14, marginTop: 6 },
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
  location: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 12, flexShrink: 1 },
  locationLink: { color: colors.gold, textDecorationLine: 'underline' },
  byLine: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 12 },

  emptyBlock: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  emptyText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  errorText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: { ...typography.bodySemiBold, color: colors.ctaText },

  pressed: { opacity: 0.8 },
  bottomPad: { height: 80 },
  fabWrap: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
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
  fabText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },
});
