/**
 * CardDeckView — displays all available cards in a 2-column grid.
 *
 * Shows all 43 cards with:
 * - Unlocked cards: full brightness, tappable to view details
 * - Locked cards: darkened with lock icon and card number
 * - Counter showing collected vs total cards
 *
 * The same card can be drawn on several days, so one card may hold many saved
 * gifts. A card with one gift opens it straight away. A card with several is
 * drawn as a pile; tapping it grows the cards out to the centre of the screen
 * (CardStackViewer) where you swipe between them, so no saved gift is hidden.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { CardStackViewer, type StackOrigin } from './CardStackViewer';

type CardDeckViewProps = {
  gifts: SavedGift[];
  selectedGiftId: string | null;
  onSelectGift: (giftId: string) => void;
  loading?: boolean;
};

type CardGridItem = {
  cardNumber: number;
  /** Every gift saved under this card, in the order the server returned them (newest first). */
  gifts: SavedGift[];
  isUnlocked: boolean;
};

/** How far each card behind the top one peeks out, in px. */
const STACK_STEP = 5;
/** Cards drawn behind the top one, however many gifts the stack holds. */
const MAX_BACK_LAYERS = 2;

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
  /** `origin` is where the card sits on screen, so a stack can grow out of it. */
  onPress: (origin: StackOrigin | null) => void;
}) {
  const cardImage = getCardImage(item.cardNumber);
  const stackRef = useRef<View>(null);
  const count = item.gifts.length;
  const hasMany = count > 1;
  const backLayers = hasMany ? Math.min(count - 1, MAX_BACK_LAYERS) : 0;

  let accessibilityLabel = `Card ${item.cardNumber}: Locked`;
  if (hasMany) {
    accessibilityLabel = `Card ${item.cardNumber}: ${count} saved gifts`;
  } else if (count === 1) {
    accessibilityLabel = `Card ${item.cardNumber}: ${item.gifts[0].title}`;
  }

  const handlePress = useCallback(() => {
    const node = stackRef.current;
    if (!hasMany || !node) {
      onPress(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }));
  }, [hasMany, onPress]);

  return (
    <Pressable
      onPress={item.isUnlocked ? handlePress : undefined}
      style={({ pressed }) => [
        styles.cardCell,
        pressed && item.isUnlocked && styles.pressed,
      ]}
      disabled={!item.isUnlocked}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={hasMany ? 'Opens the gifts saved with this card. Swipe to browse them' : undefined}
    >
      {/* Same footprint as a single card, so a pile lines up with its neighbours. */}
      <View ref={stackRef} collapsable={false} style={styles.stack}>
        {/* Cards behind the top one, furthest first, each peeking out up and to the right. */}
        {Array.from({ length: backLayers }, (_, i) => backLayers - i).map((depth) => (
          <View
            key={depth}
            pointerEvents="none"
            style={[
              styles.stackLayer,
              {
                transform: [
                  { translateX: depth * STACK_STEP },
                  { translateY: -depth * STACK_STEP },
                ],
              },
            ]}
          >
            <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
            <View style={[styles.stackShade, { opacity: 0.18 + depth * 0.14 }]} />
          </View>
        ))}

        <View style={styles.cardImageContainer}>
          <Image source={cardImage} style={styles.cardImage} resizeMode="cover" />
          {!item.isUnlocked ? (
            <View style={styles.lockedOverlay}>
              <LockIcon />
              <Text style={styles.cardNumberText}>CARD #{item.cardNumber}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.isUnlocked ? (
        <View style={styles.cardInfo}>
          <Text style={styles.cardLabel} numberOfLines={1}>
            CARD #{item.cardNumber}
          </Text>
          <Text style={styles.cardTitleText} numberOfLines={2}>
            {hasMany ? `${count} saved gifts` : item.gifts[0].title}
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
  // Card number -> every gift saved under it. A card can be drawn more than
  // once, so this keeps all of them rather than the last one seen.
  const cardMap = useMemo(() => {
    const map = new Map<number, SavedGift[]>();
    gifts.forEach((gift) => {
      const existing = map.get(gift.cardNumber);
      if (existing) existing.push(gift);
      else map.set(gift.cardNumber, [gift]);
    });
    return map;
  }, [gifts]);

  // Generate grid items for all cards
  const gridItems = useMemo(() => {
    const allCards = getAllCardNumbers();
    return allCards.map((cardNumber): CardGridItem => {
      const cardGifts = cardMap.get(cardNumber) ?? [];
      return {
        cardNumber,
        gifts: cardGifts,
        isUnlocked: cardGifts.length > 0,
      };
    });
  }, [cardMap]);

  // The stack being viewed. The card and origin are kept while the viewer
  // shrinks back, so its contents don't vanish mid-animation.
  const [viewerCard, setViewerCard] = useState<number | null>(null);
  const [viewerOrigin, setViewerOrigin] = useState<StackOrigin | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const handleCardPress = useCallback(
    (item: CardGridItem, origin: StackOrigin | null) => {
      if (item.gifts.length === 1) {
        onSelectGift(item.gifts[0].id);
      } else if (item.gifts.length > 1) {
        setViewerCard(item.cardNumber);
        setViewerOrigin(origin);
        setViewerVisible(true);
      }
    },
    [onSelectGift]
  );

  // Fired by the viewer once its closing animation has finished.
  const closeViewer = useCallback(() => setViewerVisible(false), []);

  const viewerGifts = viewerCard !== null ? cardMap.get(viewerCard) ?? [] : [];

  const renderCard = useCallback(
    ({ item }: { item: CardGridItem }) => (
      <CardGridCell item={item} onPress={(origin) => handleCardPress(item, origin)} />
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
    <>
      <FlatList
        data={gridItems}
        renderItem={renderCard}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        scrollEnabled={false}
      />
      <CardStackViewer
        visible={viewerVisible}
        gifts={viewerGifts}
        origin={viewerOrigin}
        onClose={closeViewer}
      />
    </>
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

  // Sized by the top card; cards behind it are laid over the same footprint.
  stack: {
    width: '100%',
  },

  stackLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },

  // Darkens the cards further back so the pile reads as depth.
  stackShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
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
