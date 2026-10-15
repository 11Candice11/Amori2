/**
 * MonthlySnapshotScreen — a month-at-a-glance for the couple: this month's
 * memories plus warmth stats (hugs sent / held / received). Reached from the
 * "Us" view's "Monthly snapshot" button.
 *
 * Memories come from useMonthlyMemories (grouped for the selected month); hug
 * counts are derived client-side by useMonthlyHugStats for the same month. A
 * "See all memories" link opens the full monthly memories archive.
 */
import React, { useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { ActionImageIcon } from '../../../shared/components/icons/AppIcons';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { useMonthlyMemories } from '../../memories/hooks/useMonthlyMemories';
import { isVisualMedia } from '../../memories/types/memory.types';
import type { MemoryResponse } from '../../memories/types/memory.types';
import { useMonthlyHugStats } from '../hooks/useMonthlyHugStats';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'MonthlySnapshot'>;

function firstPhotoUrl(memory: MemoryResponse): string | null {
  const visual = memory.media?.find((m) => isVisualMedia(m.mediaType));
  return visual ? resolveMediaUrl(visual.url) : null;
}

function StatTile({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function ChevronLeft() {
  return <Text style={styles.chevron}>‹</Text>;
}
function ChevronRight() {
  return <Text style={styles.chevron}>›</Text>;
}

export function MonthlySnapshotScreen() {
  const navigation = useNavigation<Nav>();
  const {
    monthKey,
    monthLabel,
    grouping,
    loading,
    refreshing,
    refresh,
    goToPreviousMonth,
    goToNextMonth,
  } = useMonthlyMemories();
  const hugStats = useMonthlyHugStats(monthKey);

  const onRefresh = useCallback(() => {
    refresh();
    hugStats.refresh();
  }, [refresh, hugStats]);

  const openAllMemories = useCallback(() => {
    navigation.navigate('MonthlyMemories', { month: monthKey });
  }, [navigation, monthKey]);

  const openMemory = useCallback(
    (memory: MemoryResponse) => {
      navigation.navigate('AddMemory', { memoryId: memory.id });
    },
    [navigation],
  );

  const thisMonth = grouping.addedThisMonth;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Monthly Snapshot" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
        }
      >
        {/* Snapshot masthead */}
        <View style={styles.masthead}>
          <ActionImageIcon name="snapshot" size={56} />
          <Text style={styles.mastheadText}>A month at a glance</Text>
        </View>

        {/* Month selector */}
        <View style={styles.monthRow}>
          <Pressable onPress={goToPreviousMonth} hitSlop={10} accessibilityRole="button" accessibilityLabel="Previous month">
            <ChevronLeft />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={goToNextMonth} hitSlop={10} accessibilityRole="button" accessibilityLabel="Next month">
            <ChevronRight />
          </Pressable>
        </View>

        {/* Warmth stats */}
        <Text style={styles.sectionLabel}>OUR WARMTH THIS MONTH</Text>
        <View style={styles.statRow}>
          <StatTile label="Hugs sent" value={hugStats.sent} hint="from you" />
          <StatTile label="Hugs held" value={hugStats.held} hint="you held onto" />
          <StatTile label="Received" value={hugStats.received} hint="came your way" />
        </View>

        {/* Memories this month */}
        <View style={styles.memoriesHeader}>
          <Text style={styles.sectionLabel}>MEMORIES THIS MONTH</Text>
          <Pressable onPress={openAllMemories} hitSlop={8} accessibilityRole="button" accessibilityLabel="See all memories">
            <Text style={styles.linkText}>See all →</Text>
          </Pressable>
        </View>

        {loading && thisMonth.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : thisMonth.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No memories captured this month yet. Add one to start the collection.
            </Text>
          </View>
        ) : (
          <View style={styles.memoryGrid}>
            {thisMonth.map((memory) => {
              const photo = firstPhotoUrl(memory);
              return (
                <Pressable
                  key={memory.id}
                  style={styles.memoryTile}
                  onPress={() => openMemory(memory)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${memory.title}`}
                >
                  {photo ? (
                    <Image source={{ uri: photo }} style={styles.memoryImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.memoryImage, styles.memoryImagePlaceholder]}>
                      <Text style={styles.placeholderGlyph}>✦</Text>
                    </View>
                  )}
                  <Text style={styles.memoryTitle} numberOfLines={2}>
                    {memory.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {grouping.pastYearsCount > 0 ? (
          <Pressable style={styles.flashbackCard} onPress={openAllMemories} accessibilityRole="button">
            <Text style={styles.flashbackText}>
              {grouping.pastYearsCount} memory{grouping.pastYearsCount === 1 ? '' : 's'} from this month in past years — tap to revisit.
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },

  masthead: { alignItems: 'center', marginBottom: spacing.md },
  mastheadText: { ...typography.bodySm, color: colors.neutralMuted, marginTop: spacing.xs },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthLabel: { ...typography.headlineSm, color: colors.neutral, fontSize: 20 },
  chevron: { color: colors.gold, fontSize: 30, paddingHorizontal: spacing.sm },

  sectionLabel: { ...typography.label, color: colors.gold, marginBottom: spacing.sm },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statTile: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { ...typography.headlineSm, color: colors.gold, fontSize: 26 },
  statLabel: { ...typography.bodyMedium, color: colors.neutral, fontSize: 13, marginTop: 4, textAlign: 'center' },
  statHint: { ...typography.bodySm, color: colors.neutralSubtle, fontSize: 11, marginTop: 2, textAlign: 'center' },

  memoriesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { ...typography.bodyMedium, color: colors.gold, fontSize: 14, marginBottom: spacing.sm },

  emptyCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  emptyText: { ...typography.bodySm, color: colors.neutralMuted, textAlign: 'center', lineHeight: 20 },

  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  memoryTile: { width: '47%', marginBottom: spacing.sm },
  memoryImage: { width: '100%', aspectRatio: 1, borderRadius: 14, backgroundColor: colors.surfaceCard },
  memoryImagePlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  placeholderGlyph: { color: colors.gold, fontSize: 28 },
  memoryTitle: { ...typography.bodySm, color: colors.neutral, fontSize: 13, marginTop: 6 },

  flashbackCard: {
    backgroundColor: 'rgba(139,111,58,0.1)',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gold,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  flashbackText: { ...typography.bodySm, color: colors.neutral, lineHeight: 19 },
});
