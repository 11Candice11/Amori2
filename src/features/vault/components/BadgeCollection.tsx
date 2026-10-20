/**
 * BadgeCollection — every badge in the app, earned or not.
 *
 * Earned badges show in full colour. Locked ones are dimmed with a lock, but
 * keep their title so people can see what there is to work towards. Tapping a
 * badge opens its details, including how to unlock it.
 *
 * The list comes from the badge registry (constants/badges.ts), so new badges
 * appear here automatically.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { ALL_BADGES } from '../../../constants/badges';
import { BadgeGrid } from '../../../shared/components/BadgeGrid';
import { BadgeDetailsModal } from '../../../shared/components/BadgeDetailsModal';
import { useBadges } from '../../profile/hooks/useBadges';
import { useSaveBadge } from '../../profile/hooks/useSaveBadge';

export function BadgeCollection() {
  const { unlockedBadges, savedBadges, userStats } = useBadges();
  const saveBadge = useSaveBadge();
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);

  const badgeIds = useMemo(() => ALL_BADGES.map((badge) => badge.id), []);

  const earnedCount = useMemo(
    () => ALL_BADGES.filter((badge) => unlockedBadges.has(badge.id)).length,
    [unlockedBadges],
  );

  const handleBadgePress = useCallback((badgeId: string) => {
    setSelectedBadgeId(badgeId);
  }, []);

  const handleDismiss = useCallback(() => {
    setSelectedBadgeId(null);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.count}>
          {earnedCount} / {ALL_BADGES.length}
        </Text>
      </View>

      <BadgeGrid
        badges={badgeIds}
        variant="medium"
        showNames
        unlockedBadges={unlockedBadges}
        savedBadges={savedBadges}
        onBadgePress={handleBadgePress}
        numColumns={3}
      />

      <BadgeDetailsModal
        visible={selectedBadgeId !== null}
        badgeId={selectedBadgeId}
        onDismiss={handleDismiss}
        isUnlocked={selectedBadgeId ? unlockedBadges.has(selectedBadgeId) : false}
        userStats={userStats}
        isSaved={selectedBadgeId ? savedBadges.has(selectedBadgeId) : false}
        onSaveToVault={saveBadge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  count: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 14,
  },
});
