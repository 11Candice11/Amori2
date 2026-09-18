/**
 * RelationshipTimelineScreen — a chronological timeline of the couple's
 * memories (GET /api/memories), rendered oldest → newest as a vertical
 * timeline with a connecting rail and dated markers.
 *
 * Reached from the Memories screen and the Together dashboard.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { memoriesService } from '../services/memoriesService';
import type { MemoryResponse } from '../types/memory.types';
import { formatMemoryDate } from '../utils/formatMemoryDateTime';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'RelationshipTimeline'>;

function BackIcon() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={colors.neutral} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Milliseconds for sorting; NaN-safe (unparseable sorts last-ish as 0). */
function timeOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function TimelineItem({ item, isLast }: { item: MemoryResponse; isLast: boolean }) {
  return (
    <View style={styles.item}>
      <View style={styles.rail}>
        <View style={styles.dot} />
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={styles.card}>
        <Text style={styles.date}>{formatMemoryDate(item.memoryDateTime)}</Text>
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        {item.location ? <Text style={styles.location}>{item.location}</Text> : null}
      </View>
    </View>
  );
}

export function RelationshipTimelineScreen() {
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<MemoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await memoriesService.getAll();
      setItems(result);
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

  // Timeline reads oldest → newest (the API returns newest first).
  const chronological = useMemo(
    () => [...items].sort((a, b) => timeOf(a.memoryDateTime) - timeOf(b.memoryDateTime)),
    [items],
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Relationship Timeline</Text>
        <View style={styles.iconBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : error && chronological.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={chronological}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
          renderItem={({ item, index }) => (
            <TimelineItem item={item} isLast={index === chronological.length - 1} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                Your story starts with the first memory you add.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const RAIL_WIDTH = 28;
const DOT_SIZE = 12;

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
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  item: {
    flexDirection: 'row',
  },
  rail: {
    width: RAIL_WIDTH,
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.gold,
    marginTop: 6,
  },
  line: {
    flex: 1,
    width: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.border,
    marginTop: 4,
  },
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
  date: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    marginTop: 2,
  },
  desc: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 13,
    marginTop: 6,
  },
  location: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    fontSize: 12,
    marginTop: 6,
  },
  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
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
});
