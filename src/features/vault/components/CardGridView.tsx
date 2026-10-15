/**
 * CardGridView — displays saved gifts as a grid of cards with images and metadata.
 *
 * Features:
 * - Each card shows the image as foreground with border
 * - Card title and date displayed below
 * - Points earned indicator (card{{number * 15}} = points)
 * - Tap to view full card details
 */
import React, { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { getCardImage } from '../../../utils/cardSelector';
import type { SavedGift } from '../types/vault.types';
import { formatShortDate } from '../../../utils/dateUtils';

function PointsIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2L15.09 8.26H21.77L16.84 12.45L18.93 18.74L12 14.55L5.07 18.74L7.16 12.45L2.23 8.26H8.91L12 2Z" fill={colors.gold} />
    </Svg>
  );
}

type CardGridViewProps = {
  gifts: SavedGift[];
  onSelectGift: (gift: SavedGift) => void;
  loading?: boolean;
};

type CardItemProps = {
  gift: SavedGift;
  onPress: (gift: SavedGift) => void;
};

function CardGridItem({ gift, onPress }: CardItemProps) {
  const cardImage = getCardImage(gift.cardNumber);
  const memoryDate = formatShortDate(gift.memoryDateTime);
  // Points for each card = cardNumber * 15
  const points = gift.cardNumber * 15;

  return (
    <Pressable
      style={({ pressed }) => [styles.cardItem, pressed && styles.pressed]}
      onPress={() => onPress(gift)}
      android_ripple={{ color: colors.goldTint12 }}
      accessibilityRole="button"
      accessibilityLabel={`Card: ${gift.title}`}
    >
      {/* Card image with border */}
      <View style={styles.cardImageWrapper}>
        <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
      </View>

      {/* Card info below image */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {gift.title}
        </Text>

        {memoryDate && (
          <Text style={styles.cardDate} numberOfLines={1}>
            {memoryDate}
          </Text>
        )}

        {/* Points indicator */}
        <View style={styles.pointsRow}>
          <PointsIcon />
          <Text style={styles.pointsText}>+{points} pts</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function CardGridView({
  gifts,
  onSelectGift,
  loading,
}: CardGridViewProps) {
  const handleCardPress = useCallback(
    (gift: SavedGift) => {
      onSelectGift(gift);
    },
    [onSelectGift]
  );

  const renderCard = useCallback(
    ({ item }: { item: SavedGift }) => (
      <CardGridItem gift={item} onPress={handleCardPress} />
    ),
    [handleCardPress]
  );

  const keyExtractor = useCallback((item: SavedGift) => item.id, []);

  if (loading || !gifts || gifts.length === 0) {
    return null;
  }

  return (
    <FlatList
      data={gifts}
      renderItem={renderCard}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.listContent}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },

  columnWrapper: {
    gap: spacing.md,
  },

  cardItem: {
    flex: 1,
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  pressed: {
    opacity: 0.7,
  },

  cardImageWrapper: {
    width: '100%',
    aspectRatio: 524 / 664,
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
    margin: spacing.sm,
    marginBottom: 0,
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },

  cardInfo: {
    padding: spacing.sm,
    gap: 4,
  },

  cardTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
  },

  cardDate: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 11,
  },

  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  pointsText: {
    ...typography.label,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
