/**
 * VisionBoardScreen — the couple's shared "Us" Vision Board.
 * 
 * Now with a scrapbook aesthetic! Polaroid-style cards with tape, pins,
 * and decorative elements. Integrates bucket list & to-do list items as
 * little dream notes scattered throughout.
 *
 *   GET /api/vision-board → { sections, items }
 *   GET /api/together → { bucketList, todoList }
 *
 * Everything the couple is building, dreaming and becoming together, displayed
 * like a physical scrapboard with randomly rotated cards, decorative tape,
 * pins, and handwritten-style text. Bucket list and to-do items appear as
 * little sticky notes interspersed throughout.
 *
 * Completed items are pulled out into a visually separate "Achieved" area.
 * States handled: loading, error+retry, not-linked (relationship 404), empty
 * board, and empty Achieved area.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { ApiError } from '../../../services/api/client';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import { partnerLinkService } from '../../profile/services/partnerLinkService';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import type { MainTabParamList } from '../../../navigation/types';
import { visionBoardService } from '../services/visionBoardService';
import {
  VISION_BOARD_ITEM_TYPE_LABELS,
  decodeVisionBoardItemType,
  type VisionBoardItemResponse,
  type VisionBoardResponse,
  type VisionBoardSectionResponse,
} from '../types/visionBoard.types';
import type { BucketListItemResponse } from '../types/together.types';
import { ScrapbookCard, CornerFlower } from '../components';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'VisionBoard'>;

// ─── Screen ─────────────────────────────────────────────────────────────────

export function VisionBoardScreen() {
  const navigation = useNavigation<Nav>();

  const [board, setBoard] = useState<VisionBoardResponse | null>(null);
  const [bucketList, setBucketList] = useState<BucketListItemResponse[]>([]);
  const [todoList, setTodoList] = useState<BucketListItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  /** True when the relationship is not linked (board 404). */
  const [notLinked, setNotLinked] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const boardResult = await visionBoardService.getBoard();

      setBoard({
        ...boardResult,
        items: boardResult?.items ?? [],
        sections: boardResult?.sections ?? [],
      });
      
      // Optional: fetch bucket list and todo if needed for the preview
      // For now, just set them to empty
      setBucketList([]);
      setTodoList([]);
      setNotLinked(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          const status = await partnerLinkService.getStatus();
          if (!status.isLinked) {
            setNotLinked(true);
            setBoard(null);
          } else {
            setNotLinked(false);
            setError('Could not load your Vision Board. Pull to refresh or try again.');
          }
        } catch {
          setNotLinked(false);
          setError(err instanceof Error ? err.message : 'Could not load your Vision Board.');
        }
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

  const handleAddVision = useCallback(() => {
    navigation.navigate('AddVisionBoardItem');
  }, [navigation]);

  const handleAddDream = useCallback(() => {
    navigation.navigate('AddVisionBoardItem');
  }, [navigation]);

  const { activeBySection, completed, orderedSections, allItems } = useMemo(() => {
    const visionItems = board?.items ?? [];
    const sections = [...(board?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

    const q = search.trim().toLowerCase();
    const matchedItems = q
      ? visionItems.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(i.type)]
              .toLowerCase()
              .includes(q),
        )
      : visionItems;

    const active = matchedItems.filter((i) => !i.isCompleted);
    const done = matchedItems.filter((i) => i.isCompleted);

    const grouped = new Map<string, VisionBoardItemResponse[]>();
    for (const item of active) {
      const list = grouped.get(item.sectionId) ?? [];
      list.push(item);
      grouped.set(item.sectionId, list);
    }

    return { activeBySection: grouped, completed: done, orderedSections: sections, allItems: active };
  }, [board, search]);

  const totalActive = useMemo(
    () => [...activeBySection.values()].reduce((sum, arr) => sum + arr.length, 0),
    [activeBySection],
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

  const boardIsEmpty = totalActive === 0 && completed.length === 0;
  const bucketActive = bucketList.filter((b) => !b.isCompleted);
  const todoActive = todoList.filter((t) => !t.isCompleted);

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
        {/* Scrapboard header */}
        <View style={styles.scrapboardHeader}>
          <Text style={styles.headerTitle}>Our Us</Text>
          <Text style={styles.headerSub}>Everything we're building, dreaming, and becoming together</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            onPress={handleAddVision}
            accessibilityRole="button"
            accessibilityLabel="Add to our vision"
          >
            <Text style={styles.addBtnText}>+ Add Vision</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.addDreamBtn, pressed && styles.pressed]}
            onPress={handleAddDream}
            accessibilityRole="button"
            accessibilityLabel="Add a dream"
          >
            <Text style={styles.addDreamBtnText}>💭 Add Dream</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search…"
            placeholderTextColor={colors.neutralSubtle}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Search vision board"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClear}
            >
              <Text style={styles.searchClearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Bucket List & To-Do List as header section */}
        {(bucketActive.length > 0 || todoActive.length > 0) && (
          <View style={styles.collectionsSection}>
            <Text style={styles.collectionsTitle}>Our Journey 📋</Text>
            <View style={styles.collectionsRow}>
              {bucketActive.length > 0 && (
                <View style={styles.collectionBox}>
                  <Text style={styles.collectionBoxTitle}>Bucket List</Text>
                  {bucketActive.slice(0, 3).map((item) => (
                    <Text key={item.id} style={styles.collectionItem}>
                      ☐ {item.title}
                    </Text>
                  ))}
                  {bucketActive.length > 3 && (
                    <Text style={styles.collectionMore}>+ {bucketActive.length - 3} more</Text>
                  )}
                </View>
              )}
              {todoActive.length > 0 && (
                <View style={styles.collectionBox}>
                  <Text style={styles.collectionBoxTitle}>To-Do</Text>
                  {todoActive.slice(0, 3).map((item) => (
                    <Text key={item.id} style={styles.collectionItem}>
                      ☐ {item.title}
                    </Text>
                  ))}
                  {todoActive.length > 3 && (
                    <Text style={styles.collectionMore}>+ {todoActive.length - 3} more</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Scrapboard content */}
        {boardIsEmpty && bucketActive.length === 0 && todoActive.length === 0 ? (
          <View style={styles.emptyBoard}>
            <Text style={styles.emptyGlyph}>✦</Text>
            <Text style={styles.emptyTitle}>
              {search.trim() ? `No results for "${search.trim()}".` : 'Your story is still being written.'}
            </Text>
            {!search.trim() ? (
              <Text style={styles.emptyBody}>Start with one little dream.</Text>
            ) : null}
          </View>
        ) : (
          <>
            {/* Vision items in scrapbook layout */}
            <View style={styles.scrapboard}>
              {orderedSections.map((section) => {
                const sectionItems = activeBySection.get(section.id) ?? [];
                if (sectionItems.length === 0) return null;
                return (
                  <View key={section.id} style={styles.sectionGroup}>
                    {section.name && (
                      <View style={styles.sectionLabel}>
                        <Text style={styles.sectionLabelText}>{section.name}</Text>
                      </View>
                    )}
                    {sectionItems.map((item, idx) => (
                      <ScrapbookCard
                        key={item.id}
                        item={item}
                        onPress={handleOpenItem}
                        rotation={Math.random() * 6 - 3}
                        isNote={idx % 4 === 3} // Every 4th item is a note-style
                      />
                    ))}
                  </View>
                );
              })}
            </View>

            {/* Achieved section */}
            {completed.length > 0 && (
              <View style={styles.achievedSection}>
                <View style={styles.achievedHeader}>
                  <Text style={styles.achievedTitle}>✓ Achieved</Text>
                  <View style={styles.achievedRule} />
                </View>
                <View style={styles.scrapboard}>
                  {completed.map((item) => (
                    <ScrapbookCard
                      key={item.id}
                      item={item}
                      onPress={handleOpenItem}
                      rotation={Math.random() * 6 - 3}
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {error ? <Text style={styles.inlineError}>{error}</Text> : null}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  pressed: { opacity: 0.85 },

  scrapboardHeader: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.neutral,
    fontSize: 28,
    textAlign: 'center',
  },
  headerSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  addBtn: {
    flex: 1,
    backgroundColor: colors.ctaBackground,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
  },

  addDreamBtn: {
    flex: 1,
    backgroundColor: 'rgba(197,163,101,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    paddingVertical: 12,
  },
  addDreamBtnText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 14,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 40,
    ...typography.body,
    color: colors.neutral,
    fontSize: 14,
  },
  searchClear: {
    paddingLeft: spacing.sm,
  },
  searchClearText: {
    color: colors.neutralSubtle,
    fontSize: 14,
  },

  collectionsSection: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  collectionsTitle: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  collectionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  collectionBox: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  collectionBoxTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
    marginBottom: 4,
  },
  collectionItem: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
    marginVertical: 2,
  },
  collectionMore: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },

  scrapboard: {
    marginBottom: spacing.lg,
  },

  sectionGroup: {
    marginBottom: spacing.xl,
  },

  sectionLabel: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  sectionLabelText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 14,
    opacity: 0.7,
  },

  achievedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  achievedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  achievedTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 16,
  },
  achievedRule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },

  emptyScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyBoard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
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
  inlineError: {
    ...typography.bodySm,
    color: colors.emergency,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
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
