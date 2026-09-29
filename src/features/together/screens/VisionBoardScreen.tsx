/**
 * VisionBoardScreen — the couple's shared "Us" Vision Board.
 *
 *   GET /api/vision-board → { sections, items }
 *
 * Everything the couple is building, dreaming and becoming together, grouped
 * onto shelves (sections). Within the active board, pinned items float to the
 * top, then follow custom sort order, then newest (the server already returns
 * items in that order). Completed items are pulled out into a visually separate
 * "Achieved" area.
 *
 * States handled: loading, error+retry, not-linked (relationship 404), empty
 * board, and empty Achieved area. Both partners can read and modify shared
 * items; the "Added by you / by partner" label is derived from createdByUserId.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { ApiError } from '../../../services/api/client';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { visionBoardService } from '../services/visionBoardService';
import {
  VISION_BOARD_ITEM_TYPE_LABELS,
  decodeVisionBoardItemType,
  type VisionBoardItemResponse,
  type VisionBoardResponse,
  type VisionBoardSectionResponse,
} from '../types/visionBoard.types';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'VisionBoard'>;

// ─── Item card ────────────────────────────────────────────────────────────────

function ownershipLabel(item: VisionBoardItemResponse): string {
  const myId = userSettingsStore.get()?.id;
  if (myId && item.createdByUserId === myId) return 'Added by you';
  const name = item.createdByName?.trim();
  return name ? `Added by ${name}` : 'Added by partner';
}

function ItemCard({
  item,
  onPress,
}: {
  item: VisionBoardItemResponse;
  onPress: (item: VisionBoardItemResponse) => void;
}) {
  const imageUrl = resolveMediaUrl(item.imageUrl);
  const typeLabel = VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(item.type)];

  return (
    <Pressable
      style={({ pressed }) => [styles.itemCard, pressed && styles.pressed]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
      ) : null}

      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemType}>{typeLabel.toUpperCase()}</Text>
          {item.isPinned ? <Text style={styles.pin}>★</Text> : null}
        </View>

        <Text style={styles.itemTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={styles.itemDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {item.isCompleted && item.completedNote ? (
          <Text style={styles.completedNote} numberOfLines={2}>
            “{item.completedNote}”
          </Text>
        ) : null}

        <Text style={styles.itemOwner}>{ownershipLabel(item)}</Text>
      </View>
    </Pressable>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function VisionBoardScreen() {
  const navigation = useNavigation<Nav>();

  const [board, setBoard] = useState<VisionBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** True when the relationship is not linked (board 404). */
  const [notLinked, setNotLinked] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await visionBoardService.getBoard();
      setBoard(result);
      setNotLinked(false);
    } catch (err) {
      // A 404 means there's no relationship yet — that's an empty state, not an
      // error banner. Everything else is a real, retryable failure.
      if (err instanceof ApiError && err.status === 404) {
        setNotLinked(true);
        setBoard(null);
      } else {
        setError(err instanceof Error ? err.message : 'Could not load your Vision Board.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refetch on focus so items added/edited on pushed screens show on return.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const handleOpenItem = useCallback(
    (item: VisionBoardItemResponse) => {
      navigation.navigate('VisionBoardItemDetail', { itemId: item.id });
    },
    [navigation],
  );

  const handleAdd = useCallback(() => {
    navigation.navigate('AddVisionBoardItem');
  }, [navigation]);

  const { activeBySection, completed, orderedSections } = useMemo(() => {
    const items = board?.items ?? [];
    const sections = [...(board?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

    const active = items.filter((i) => !i.isCompleted);
    const done = items.filter((i) => i.isCompleted);

    const grouped = new Map<string, VisionBoardItemResponse[]>();
    for (const item of active) {
      const list = grouped.get(item.sectionId) ?? [];
      list.push(item);
      grouped.set(item.sectionId, list);
    }

    return { activeBySection: grouped, completed: done, orderedSections: sections };
  }, [board]);

  const totalActive = useMemo(
    () => (board?.items ?? []).filter((i) => !i.isCompleted).length,
    [board],
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Our Vision" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Not linked ───────────────────────────────────────────────────────────────
  if (notLinked) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Our Vision" onBack={() => navigation.goBack()} />
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
        >
          <Text style={styles.emptyGlyph}>✦</Text>
          <Text style={styles.emptyTitle}>Your shared space, in waiting</Text>
          <Text style={styles.emptyBody}>
            This becomes your shared space once you link with your partner.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Error (nothing loaded) ─────────────────────────────────────────────────
  if (error && !board) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppHeader title="Our Vision" onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const boardIsEmpty = (board?.items.length ?? 0) === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Our Vision" onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        <View style={styles.intro}>
          <Text style={styles.introKicker}>OUR VISION · SHARED SANCTUARY</Text>
          <Text style={styles.introTitle}>Our Us</Text>
          <Text style={styles.introSub}>
            Everything we're building, dreaming, and becoming together.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel="Add to our vision"
        >
          <Text style={styles.addBtnText}>+  Add to Our Vision</Text>
        </Pressable>

        {boardIsEmpty ? (
          <View style={styles.emptyBoard}>
            <Text style={styles.emptyTitle}>Our story is still being written.</Text>
            <Text style={styles.emptyBody}>Start with one little dream.</Text>
          </View>
        ) : (
          <>
            {orderedSections.map((section) => {
              const sectionItems = activeBySection.get(section.id) ?? [];
              if (sectionItems.length === 0) return null;
              return (
                <SectionBlock
                  key={section.id}
                  section={section}
                  items={sectionItems}
                  onOpenItem={handleOpenItem}
                />
              );
            })}

            {/* An active board with only completed items still deserves a nudge. */}
            {totalActive === 0 ? (
              <View style={styles.emptyBoard}>
                <Text style={styles.emptyBody}>
                  Every active dream is achieved. Add a new one whenever you're ready.
                </Text>
              </View>
            ) : null}

            {/* ── Achieved ── */}
            <View style={styles.achievedHeader}>
              <Text style={styles.achievedTitle}>Achieved</Text>
              <View style={styles.achievedRule} />
            </View>

            {completed.length === 0 ? (
              <View style={styles.achievedEmpty}>
                <Text style={styles.emptyBody}>
                  Nothing here yet. Give yourselves something to look forward to.
                </Text>
              </View>
            ) : (
              completed.map((item) => (
                <ItemCard key={item.id} item={item} onPress={handleOpenItem} />
              ))
            )}
          </>
        )}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionBlock({
  section,
  items,
  onOpenItem,
}: {
  section: VisionBoardSectionResponse;
  items: VisionBoardItemResponse[];
  onOpenItem: (item: VisionBoardItemResponse) => void;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionName}>{section.name}</Text>
        <Text style={styles.sectionCount}>{items.length}</Text>
      </View>
      {section.description ? (
        <Text style={styles.sectionDesc}>{section.description}</Text>
      ) : null}
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onPress={onOpenItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  pressed: { opacity: 0.85 },

  intro: { marginBottom: spacing.md },
  introKicker: {
    ...typography.label,
    color: colors.gold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  introTitle: { ...typography.headline, color: colors.neutral, fontSize: 26 },
  introSub: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4 },

  addBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  addBtnText: { ...typography.bodySemiBold, color: colors.ctaText, fontSize: 15 },

  section: { marginBottom: spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionName: { ...typography.headlineSm, color: colors.gold, fontSize: 17 },
  sectionCount: { ...typography.bodySm, color: colors.neutralSubtle },
  sectionDesc: { ...typography.bodySm, color: colors.neutralMuted, marginBottom: spacing.sm },

  itemCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  itemImage: { width: '100%', height: 150, backgroundColor: colors.surface },
  itemBody: { padding: spacing.md },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemType: { ...typography.label, color: colors.gold, letterSpacing: 0.8, fontSize: 10 },
  pin: { color: colors.gold, fontSize: 16 },
  itemTitle: { ...typography.bodySemiBold, color: colors.neutral, fontSize: 16 },
  itemDesc: { ...typography.bodySm, color: colors.neutralMuted, marginTop: 4 },
  completedNote: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontStyle: 'italic',
    marginTop: 6,
  },
  itemOwner: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginTop: 8 },

  achievedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  achievedTitle: { ...typography.headlineSm, color: colors.neutral, fontSize: 16 },
  achievedRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  achievedEmpty: { paddingVertical: spacing.md },

  emptyScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyBoard: { alignItems: 'center', paddingVertical: spacing.xl, gap: 6 },
  emptyGlyph: { color: colors.gold, fontSize: 34, marginBottom: spacing.md },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 18,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },

  errorText: { ...typography.body, color: colors.neutralMuted, textAlign: 'center' },
  inlineError: { ...typography.bodySm, color: colors.emergency, textAlign: 'center', marginTop: spacing.sm },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
  },
  retryText: { ...typography.bodySemiBold, color: colors.ctaText },

  bottomPad: { height: spacing.xl },
});
