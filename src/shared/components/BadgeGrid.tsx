/**
 * BadgeGrid — displays multiple badges in a responsive grid.
 *
 * Used for achievements screen, profile badge section, etc.
 */
import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { BadgeDisplay } from './BadgeDisplay';
import type { BadgeCategory } from '../../constants/badges';

export type BadgeGridProps = {
  badges: string[]; // Array of badge IDs
  category?: BadgeCategory;
  variant?: 'large' | 'medium' | 'small';
  showNames?: boolean;
  unlockedBadges?: Set<string>; // Set of unlocked badge IDs
  savedBadges?: Set<string>; // Set of badge IDs saved to the vault
  onBadgePress?: (badgeId: string) => void;
  emptyText?: string;
  numColumns?: number;
};

export function BadgeGrid({
  badges,
  variant = 'medium',
  showNames = false,
  unlockedBadges = new Set(),
  savedBadges = new Set(),
  onBadgePress,
  emptyText,
  numColumns = 3,
}: BadgeGridProps) {
  const data = useMemo(
    () =>
      badges.map((id) => ({
        id,
        isLocked: !unlockedBadges.has(id),
        isSaved: savedBadges.has(id),
      })),
    [badges, unlockedBadges, savedBadges]
  );

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyText || 'No badges yet'}</Text>
      </View>
    );
  }

  return (
    <FlatList
      scrollEnabled={false}
      data={data}
      numColumns={numColumns}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={[styles.gridItem, { flex: 1 / numColumns }]}>
          <BadgeDisplay
            badgeId={item.id}
            onPress={() => onBadgePress?.(item.id)}
            variant={variant}
            showName={showNames}
            isLocked={item.isLocked}
            isSaved={item.isSaved}
          />
        </View>
      )}
      columnWrapperStyle={styles.columnWrapper}
      style={styles.list}
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    // Don't use flex: 1 since this is often inside a ScrollView
    width: '100%',
  },

  content: {
    paddingVertical: spacing.md,
  },

  columnWrapper: {
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },

  gridItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },

  emptyContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
    textAlign: 'center',
  },
});
