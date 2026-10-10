/**
 * CardDeckView — displays all available cards in a 2-column grid.
 *
 * Shows all 43 cards with:
 * - Unlocked cards: full brightness, tappable to view details
 * - Locked cards: darkened with lock icon and card number
 * - Counter showing collected vs total cards
 */

import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { getCardImage, getAllCardNumbers } from '../../../utils/cardSelector';
import type { SavedGift } from '../types/vault.types';

type CardDeckViewProps = {
  gifts: SavedGift[];
  selectedGiftId: string | null;
  onSelectGift: (giftId: string) => void;
  loading?: boolean;
};

type CardGridItem = {
  cardNumber: number;
  gift: SavedGift | null;
  isUnlocked: boolean;
};

function LockIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 11V7a5 5 0 0110 0v4m-9 10h8a2 2 0 002-2v-6a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z"
        stroke={colors.gold}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CardGridCell({
  item,
  onPress,
}: {
  item: CardGridItem;
  onPress: () => void;
}) {
  const cardImage = getCardImage(item.cardNumber);

  return (
    <Pressable
      onPress={item.isUnlocked ? onPress : undefined}
      style={({ pressed }) => [
        styles.cardCell,
        pressed && item.isUnlocked && styles.pressed,
      ]}
      disabled={!item.isUnlocked}
      accessibilityRole="button"
      accessibilityLabel={
        item.isUnlocked
          ? `Card ${item.cardNumber}: ${item.gift?.title}`
          : `Card ${item.cardNumber}: Locked`
      }
    >
      <View style={styles.cardImageContainer}>
        <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
        {!item.isUnlocked ? (
          <View style={styles.lockedOverlay}>
            <LockIcon />
            <Text style={styles.cardNumberText}>CARD #{item.cardNumber}</Text>
          </View>
        ) : null}
      </View>
      
      {item.isUnlocked && item.gift ? (
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel} numberOfLines={1}>
            CARD #{item.cardNumber}
          </Text>
          <Text style={styles.cardTitleText} numberOfLines={2}>
            {item.gift.title}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function CardDeckView({
  gifts,
  onSelectGift,
  loading,
}: CardDeckViewProps) {
  // Map of card numbers to gifts
  const cardMap = useMemo(() => {
    const map = new Map<number, SavedGift>();
    gifts.forEach((gift) => {
      map.set(gift.cardNumber, gift);
    });
    return map;
  }, [gifts]);

  // Generate grid items for all cards
  const gridItems = useMemo(() => {
    const allCards = getAllCardNumbers();
    return allCards.map((cardNumber): CardGridItem => {
      const gift = cardMap.get(cardNumber) || null;
      return {
        cardNumber,
        gift,
        isUnlocked: gift !== null,
      };
    });
  }, [cardMap]);

  const handleCardPress = useCallback(
    (item: CardGridItem) => {
      if (item.gift) {
        onSelectGift(item.gift.id);
      }
    },
    [onSelectGift]
  );

  const renderCard = useCallback(
    ({ item }: { item: CardGridItem }) => (
      <CardGridCell item={item} onPress={() => handleCardPress(item)} />
    ),
    [handleCardPress]
  );

  const keyExtractor = useCallback(
    (item: CardGridItem) => `card-${item.cardNumber}`,
    []
  );

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Loading cards...</Text>
      </View>
    );
  }

  // The vault screen owns the scrolling and the collected counter, so this is
  // a plain two-column grid that grows to fit all cards.
  return (
    <FlatList
      data={gridItems}
      renderItem={renderCard}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.gridContent}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  gridContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },

  row: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  cardCell: {
    width: '48%',
    marginBottom: spacing.sm,
  },

  cardImageContainer: {
    width: '100%',
    aspectRatio: 524 / 664,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },

  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  cardNumberText: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 13,
    letterSpacing: 1,
  },

  cardInfo: {
    marginTop: spacing.sm,
    gap: 2,
  },

  cardLabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    letterSpacing: 1,
  },

  cardTitleText: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 13,
    lineHeight: 18,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },

  emptyText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 16,
  },
});
