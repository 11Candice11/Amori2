/**
 * WeeklyReflectionArchiveScreen — the browsable list of saved (archived) weekly
 * reflections. Each row opens the frozen snapshot in read-only mode.
 *
 * Reached from the Weekly Reflection header action and from the Vault. Archives
 * are stored per user on-device (see weeklyReflectionArchive), so this list
 * reflects only the signed-in user's kept weeks.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { authService } from '../../../services/auth/authService';
import type { MainTabParamList } from '../../../navigation/types';

import { weeklyReflectionArchive } from '../services/weeklyReflectionArchive';
import { QUADRANT_DISPLAY } from '../utils/quadrantDisplay';
import type { ArchivedReflection } from '../types/archive.types';

function ArchiveGlyph({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16M6 7l1 12h10l1-12" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M9 4h6l1 3H8z" stroke={colors.gold} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M10 11h4" stroke={colors.gold} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronRight() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={colors.neutralMuted}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function summarise(entry: ArchivedReflection): string {
  const r = entry.reflection;
  const parts: string[] = [];
  parts.push(`${r.checkInDays}/7 check-ins`);
  if (r.memoryCount > 0) parts.push(`${r.memoryCount} ${r.memoryCount === 1 ? 'memory' : 'memories'}`);
  const hugs = r.hugsSent + r.hugsReceived;
  if (hugs > 0) parts.push(`${hugs} ${hugs === 1 ? 'hug' : 'hugs'}`);
  if (r.milestones.length > 0) {
    parts.push(`${r.milestones.length} ${r.milestones.length === 1 ? 'milestone' : 'milestones'}`);
  }
  return parts.join(' · ');
}

function ArchiveRow({
  entry,
  onOpen,
  onDelete,
}: {
  entry: ArchivedReflection;
  onOpen: (entry: ArchivedReflection) => void;
  onDelete: (entry: ArchivedReflection) => void;
}) {
  const dominant = entry.reflection.dominantQuadrant
    ? QUADRANT_DISPLAY[entry.reflection.dominantQuadrant]
    : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onOpen(entry)}
      onLongPress={() => onDelete(entry)}
      android_ripple={{ color: 'rgba(139,111,58,0.12)' }}
      accessibilityRole="button"
      accessibilityLabel={`Saved reflection for ${entry.rangeLabel}`}
    >
      <View
        style={[
          styles.rowDot,
          { backgroundColor: dominant?.dotColor ?? colors.neutralSubtle },
        ]}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{entry.rangeLabel}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          {dominant ? `${dominant.title} · ` : ''}
          {summarise(entry)}
        </Text>
      </View>
      <ChevronRight />
    </Pressable>
  );
}

type ArchiveNavProp = BottomTabNavigationProp<
  MainTabParamList,
  'WeeklyReflectionArchive'
>;

export function WeeklyReflectionArchiveScreen() {
  const navigation = useNavigation<ArchiveNavProp>();
  const [entries, setEntries] = useState<ArchivedReflection[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let userId: string | null = null;
    try {
      userId = (await authService.getMe()).id;
    } catch {
      userId = null;
    }
    const all = await weeklyReflectionArchive.getAll(userId);
    setEntries(all);
    setLoading(false);
  }, []);

  // Reload on focus so a week just saved on the live screen shows up here.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleOpen = useCallback(
    (entry: ArchivedReflection) => {
      navigation.navigate('WeeklyReflection', { archivedWeekKey: entry.weekKey });
    },
    [navigation],
  );

  const handleDelete = useCallback(
    (entry: ArchivedReflection) => {
      Alert.alert(
        'Remove this reflection?',
        `“${entry.rangeLabel}” will be removed from your Sanctuary archive. This can’t be undone.`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              let userId: string | null = null;
              try {
                userId = (await authService.getMe()).id;
              } catch {
                userId = null;
              }
              await weeklyReflectionArchive.remove(userId, entry.weekKey);
              void load();
            },
          },
        ],
      );
    },
    [load],
  );

  const renderItem = useCallback(
    ({ item }: { item: ArchivedReflection }) => (
      <ArchiveRow entry={item} onOpen={handleOpen} onDelete={handleDelete} />
    ),
    [handleOpen, handleDelete],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title="Saved Reflections" onBack={() => navigation.goBack()} />

      {loading && entries.length === 0 ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.gold} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.weekKey}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyGlyph}>
                <ArchiveGlyph />
              </View>
              <Text style={styles.emptyTitle}>No saved reflections yet</Text>
              <Text style={styles.emptyBody}>
                When you tap “Save to Sanctuary Archive” on a weekly reflection,
                it’s kept here so you can revisit it exactly as it was.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  safe: { flex: 1, backgroundColor: colors.background },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  listContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  separator: { height: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  rowDot: { width: 12, height: 12, borderRadius: 6 },
  rowBody: { flex: 1 },
  rowTitle: {
    ...typography.bodyMedium,
    color: colors.neutral,
  },
  rowSub: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    marginTop: 2,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
  },
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
});
