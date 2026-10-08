/**
 * ScrapbookCard — a vision board item styled as a scrapbook element
 * 
 * Image Usage:
 * - border: Frame around image (smaller, corners, on top)
 * - stamp: Behind notes (light color, dark cursive text)
 * - flower: Scattered decorations (mostly corners)
 * - paperclip: Always on top of images (corners)
 */
import React, { useMemo } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import { userSettingsStore } from '../../../shared/state/userSettingsStore';
import {
  VISION_BOARD_ITEM_TYPE_LABELS,
  decodeVisionBoardItemType,
  type VisionBoardItemResponse,
} from '../types/visionBoard.types';

type ScrapbookCardProps = {
  item: VisionBoardItemResponse;
  onPress: (item: VisionBoardItemResponse) => void;
  rotation?: number;
  isNote?: boolean;
};

// Image sources — simple background (no border variants, just the text area)

const FRAME_BORDERS = {
  border: require('../../../../images/vision_board/border.png'),
  border2: require('../../../../images/vision_board/border2.png'),
  border3: require('../../../../images/vision_board/border3.png'),
  border4: require('../../../../images/vision_board/border4.png'),
  border5: require('../../../../images/vision_board/border5.png'),
  border6: require('../../../../images/vision_board/border6.png'),
  border7: require('../../../../images/vision_board/border7.png'),
} as const;

const STAMPS = [
  require('../../../../images/vision_board/stamp.png'),
  require('../../../../images/vision_board/stamp2.png'),
  require('../../../../images/vision_board/stamp3.png'),
  require('../../../../images/vision_board/stamp4.png'),
  require('../../../../images/vision_board/stamp5.png'),
  require('../../../../images/vision_board/stamp6.png'),
  require('../../../../images/vision_board/stamp7.png'),
];

const FLOWERS = [
  require('../../../../images/vision_board/flower.png'),
  require('../../../../images/vision_board/flower2.png'),
  require('../../../../images/vision_board/flower3.png'),
  require('../../../../images/vision_board/flower4.png'),
  require('../../../../images/vision_board/flower5.png'),
  require('../../../../images/vision_board/flower6.png'),
  require('../../../../images/vision_board/flower7.png'),
  require('../../../../images/vision_board/flower8.png'),
  require('../../../../images/vision_board/flower9.png'),
  require('../../../../images/vision_board/flower10.png'),
  require('../../../../images/vision_board/flower11.png'),
  require('../../../../images/vision_board/flower12.png'),
  require('../../../../images/vision_board/flower13.png'),
  require('../../../../images/vision_board/flower14.png'),
  require('../../../../images/vision_board/flower15.png'),
];

const PAPERCLIPS = [
  require('../../../../images/vision_board/paperclip.png'),
  require('../../../../images/vision_board/paperclip2.png'),
];

const FRAME_STYLES = Object.keys(FRAME_BORDERS) as Array<keyof typeof FRAME_BORDERS>;

function getFrameBorder(itemId: string) {
  const seed = itemId.charCodeAt(0) + itemId.charCodeAt(itemId.length - 1);
  const styleIndex = seed % FRAME_STYLES.length;
  return FRAME_BORDERS[FRAME_STYLES[styleIndex]];
}

function getStamp(itemId: string) {
  const seed = itemId.charCodeAt(0);
  return STAMPS[seed % STAMPS.length];
}

function getFlower(itemId: string, index: number) {
  const seed = itemId.charCodeAt(0) + index;
  return FLOWERS[seed % FLOWERS.length];
}

function getPaperclip(itemId: string, corner: number) {
  const seed = itemId.charCodeAt(itemId.length - 1) + corner;
  return PAPERCLIPS[seed % PAPERCLIPS.length];
}

export function ScrapbookCard({
  item,
  onPress,
  rotation = Math.random() * 6 - 3,
  isNote = false,
}: ScrapbookCardProps) {
  const imageUrl = resolveMediaUrl(item.imageUrl);
  const typeLabel = VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(item.type)];
  const myId = userSettingsStore.get()?.id;
  const isCreatedByMe = myId && item.createdByUserId === myId;

  // Note style - uses stamp background with text
  if (isNote) {
    const stampImage = getStamp(item.id);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.noteCard,
          { transform: [{ rotate: `${rotation}deg` }] },
          pressed && styles.pressed,
        ]}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Dream: ${item.title}`}
      >
        {/* Stamp background behind text */}
        <Image source={stampImage} style={styles.noteStamp} resizeMode="cover" />

        {/* Text content on top */}
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.noteDesc} numberOfLines={3}>
              {item.description}
            </Text>
          )}
        </View>

        {/* Decorative flowers in corners */}
        <Image source={getFlower(item.id, 0)} style={styles.flowerTL} resizeMode="contain" />
        <Image source={getFlower(item.id, 1)} style={styles.flowerBR} resizeMode="contain" />
      </Pressable>
    );
  }

  // Vision item with image
  const frameBorder = getFrameBorder(item.id);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { transform: [{ rotate: `${rotation}deg` }] },
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title}`}
    >
      {/* Cream polaroid background */}
      <View style={[styles.cardBG, { backgroundColor: '#fef9e7' }]}>
        {/* Polaroid border with image */}
        <View style={styles.polaroidBorder}>
          {/* Image section */}
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
            )}

            {/* Frame border - smaller, on top of image, in corners */}
            <Image source={frameBorder} style={styles.frameBorderImage} resizeMode="contain" />

            {/* Paperclips - top corners */}
            <Image
              source={getPaperclip(item.id, 0)}
              style={styles.paperclipTL}
              resizeMode="contain"
            />
            <Image
              source={getPaperclip(item.id, 1)}
              style={styles.paperclipTR}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Text area (at bottom of cream polaroid) */}
        <View style={styles.textArea}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description && (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          <View style={styles.cardMeta}>
            <Text style={styles.cardType}>{typeLabel}</Text>
            <Text style={styles.cardOwner}>{isCreatedByMe ? 'by me' : 'by partner'}</Text>
          </View>

          {item.isCompleted && item.completedNote && (
            <Text style={styles.completionNote}>✓ {item.completedNote}</Text>
          )}
        </View>
      </View>

      {/* Flower decorations - scattered around card */}
      <Image source={getFlower(item.id, 0)} style={styles.flowerTopLeft} resizeMode="contain" />
      <Image source={getFlower(item.id, 1)} style={styles.flowerTopRight} resizeMode="contain" />
      <Image source={getFlower(item.id, 2)} style={styles.flowerBottomLeft} resizeMode="contain" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },

  // ─── Vision Card ───────────────────────────────────────────────────────────
  card: {
    marginBottom: spacing.lg,
    marginHorizontal: spacing.sm,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  cardBG: {
    width: '100%',
    minHeight: 350,
  },

  polaroidBorder: {
    padding: spacing.md,
    backgroundColor: '#fef9e7',
  },

  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    marginBottom: spacing.md,
  },

  image: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  placeholderText: {
    fontSize: 48,
    opacity: 0.3,
  },

  // Frame border - small, on top, in corners
  frameBorderImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },

  // Paperclips - top corners, always on top
  paperclipTL: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 40,
    height: 40,
    zIndex: 10,
  },

  paperclipTR: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    zIndex: 10,
  },

  // Text area (bottom of card)
  textArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flex: 1,
    justifyContent: 'flex-end',
  },

  cardTitle: {
    ...typography.bodySemiBold,
    color: '#2d2d2d',
    fontSize: 15,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },

  cardDesc: {
    ...typography.bodySm,
    color: '#2d2d2d',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },

  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  cardType: {
    ...typography.label,
    color: '#666',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  cardOwner: {
    ...typography.bodySm,
    color: '#666',
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.7,
  },

  completionNote: {
    ...typography.bodySm,
    color: '#4a7c59',
    fontSize: 11,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },

  // Flower decorations - scattered around card
  flowerTopLeft: {
    position: 'absolute',
    top: -15,
    left: -15,
    width: 50,
    height: 50,
    opacity: 0.6,
  },

  flowerTopRight: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 50,
    height: 50,
    opacity: 0.6,
  },

  flowerBottomLeft: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 50,
    height: 50,
    opacity: 0.6,
  },

  // ─── Note Card ─────────────────────────────────────────────────────────────
  noteCard: {
    backgroundColor: '#fef9e7',
    borderRadius: 4,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: '#f5f1e0',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
  },

  noteStamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
    zIndex: 0,
  },

  noteContent: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    justifyContent: 'center',
  },

  noteTitle: {
    ...typography.bodySemiBold,
    color: '#2d2d2d',
    fontSize: 15,
    marginBottom: spacing.sm,
    fontStyle: 'italic',
  },

  noteDesc: {
    ...typography.bodySm,
    color: '#555',
    fontSize: 12,
    fontStyle: 'italic',
  },

  flowerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    opacity: 0.5,
    zIndex: 2,
  },

  flowerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    opacity: 0.5,
    zIndex: 2,
  },
});
