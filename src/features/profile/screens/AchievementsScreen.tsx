/**
 * AchievementsScreen — displays all badges organized by category.
 *
 * Shows earned and locked badges with filtering by category.
 * Users can tap badges to see details and unlock criteria.
 * Integrates with badgeService for real-time badge data.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import { BadgeGrid } from '../../../shared/components/BadgeGrid';
import { BadgeDetailsModal } from '../../../shared/components/BadgeDetailsModal';
import { getSettingsBackground } from '../../../utils/backgroundImages';
import { ALL_BADGES, getBadgesByCategory, type BadgeCategory } from '../../../constants/badges';
import { useBadges } from '../hooks/useBadges';

export function AchievementsScreen() {
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'all'>('all');
  const [backgroundImage] = useState(() => getSettingsBackground());

  // Load badge data
  const {
    unlockedBadges,
    userStats,
    totalPoints,
    level,
    loading,
    error,
    refresh,
  } = useBadges();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<BadgeCategory>();
    ALL_BADGES.forEach(badge => cats.add(badge.category));
    return Array.from(cats).sort();
  }, []);

  // Filter badges by selected category
  const displayedBadges = useMemo(() => {
    if (selectedCategory === 'all') {
      return ALL_BADGES;
    }
    return getBadgesByCategory(selectedCategory as BadgeCategory);
  }, [selectedCategory]);

  // Group badges by category for display
  const badgesByCategory = useMemo(() => {
    const grouped: Record<BadgeCategory, string[]> = {} as Record<BadgeCategory, string[]>;
    
    displayedBadges.forEach(badge => {
      if (!grouped[badge.category]) {
        grouped[badge.category] = [];
      }
      grouped[badge.category].push(badge.id);
    });

    return grouped;
  }, [displayedBadges]);

  const handleBadgePress = useCallback((badgeId: string) => {
    setSelectedBadgeId(badgeId);
  }, []);

  const handleDismissModal = useCallback(() => {
    setSelectedBadgeId(null);
  }, []);

  // Stats
  const totalBadges = ALL_BADGES.length;
  const earnedCount = unlockedBadges.size;
  const completionPercent = Math.round((earnedCount / totalBadges) * 100);

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />

        <AppHeader title="Achievements" bordered={false} style={styles.headerTransparent} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={loading ? undefined : {
            refreshing: false,
            onRefresh: refresh,
          } as any}
        >
          {/* Loading state */}
          {loading && !unlockedBadges.size ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.gold} />
              <Text style={styles.loadingText}>Loading achievements...</Text>
            </View>
          ) : (
            <>
              {/* Level & Points Summary */}
              <View style={styles.summaryCard}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelText}>{level}</Text>
                  <Text style={styles.levelLabel}>Level</Text>
                </View>
                <View style={styles.pointsInfo}>
                  <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
                  <Text style={styles.pointsLabel}>Total Points</Text>
                </View>
              </View>

              {/* Progress summary */}
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Your Progress</Text>
                  <Text style={styles.progressPercent}>{completionPercent}%</Text>
                </View>
                
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${completionPercent}%` },
                    ]}
                  />
                </View>

                <Text style={styles.progressText}>
                  {earnedCount} of {totalBadges} badges earned
                </Text>
              </View>

              {/* Category filter */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContent}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.categoryChip,
                    selectedCategory === 'all' && styles.categoryChipActive,
                    pressed && styles.categoryChipPressed,
                  ]}
                  onPress={() => setSelectedCategory('all')}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === 'all' && styles.categoryChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>

                {categories.map(category => (
                  <Pressable
                    key={category}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      selectedCategory === category && styles.categoryChipActive,
                      pressed && styles.categoryChipPressed,
                    ]}
                    onPress={() => setSelectedCategory(category)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category && styles.categoryChipTextActive,
                      ]}
                    >
                      {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Badges by category */}
              {Object.entries(badgesByCategory).map(([category, badgeIds]) => (
                <View key={category} style={styles.categorySection}>
                  <Text style={styles.categoryTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                  </Text>
                  <BadgeGrid
                    badges={badgeIds}
                    variant="medium"
                    showNames={true}
                    unlockedBadges={unlockedBadges}
                    onBadgePress={handleBadgePress}
                    numColumns={3}
                  />
                </View>
              ))}
            </>
          )}

          {/* Error state */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load achievements</Text>
              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
                onPress={refresh}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Badge details modal */}
        <BadgeDetailsModal
          visible={selectedBadgeId !== null}
          badgeId={selectedBadgeId}
          onDismiss={handleDismissModal}
          isUnlocked={selectedBadgeId ? unlockedBadges.has(selectedBadgeId) : false}
          userStats={userStats}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  safe: {
    flex: 1,
  },

  headerTransparent: {
    backgroundColor: 'transparent',
    borderBottomColor: 'transparent',
  },

  scroll: {
    flex: 1,
  },

  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },

  loadingText: {
    ...typography.body,
    color: colors.neutralMuted,
    marginTop: spacing.md,
  },

  errorContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },

  errorText: {
    ...typography.body,
    color: colors.emergency,
    marginBottom: spacing.md,
  },

  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gold,
    borderRadius: 8,
  },

  retryButtonPressed: {
    opacity: 0.8,
  },

  retryButtonText: {
    ...typography.bodySemiBold,
    color: colors.background,
  },

  summaryCard: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  levelCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 111, 58, 0.2)',
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  levelText: {
    // headlineMd isn't in the scale; the size is overridden below anyway, so
    // this is purely about getting the serif font back.
    ...typography.headlineLg,
    color: colors.gold,
    fontSize: 36,
  },

  levelLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },

  pointsInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  pointsValue: {
    ...typography.headlineSm,
    color: colors.neutral,
    fontSize: 24,
  },

  pointsLabel: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    marginTop: spacing.xs,
  },

  progressCard: {
    backgroundColor: 'rgba(139, 111, 58, 0.15)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  progressTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
  },

  progressPercent: {
    ...typography.headlineSm,
    color: colors.gold,
    fontSize: 20,
  },

  progressBar: {
    height: 8,
    backgroundColor: 'rgba(139, 111, 58, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 4,
  },

  progressText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 12,
  },

  categoryScroll: {
    marginBottom: spacing.lg,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },

  categoryContent: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },

  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 111, 58, 0.1)',
    borderWidth: 1,
    borderColor: colors.neutralMuted,
  },

  categoryChipActive: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
  },

  categoryChipPressed: {
    opacity: 0.7,
  },

  categoryChipText: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 12,
    fontWeight: '600',
  },

  categoryChipTextActive: {
    color: colors.background,
  },

  categorySection: {
    marginBottom: spacing.xl,
  },

  categoryTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
