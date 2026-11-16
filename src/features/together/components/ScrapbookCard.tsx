/**
 * ScrapbookCard — a vision board item styled as a polaroid with handwritten text
 * 
 * Features:
 * - Clean polaroid with no borders
 * - Handwritten cursive text
 * - Paperclips on corners
 * - Can be displayed in 2-column layout
 */
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { spacing } from '../../../shared/theme';
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
  isDoubleColumn?: boolean;
};

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
];

const PAPERCLIPS = [
  require('../../../../images/vision_board/paperclip.png'),
  require('../../../../images/vision_board/paperclip2.png'),
];

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
  isDoubleColumn = false,
}: ScrapbookCardProps) {
  const imageUrl = resolveMediaUrl(item.imageUrl);
  const typeLabel = VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(item.type)];
  const myId = userSettingsStore.get()?.id;
  const isCreatedByMe = myId && item.createdByUserId === myId;

  // Note style with stamp background
  if (isNote) {
    const stampImage = getStamp(item.id);
    return (
      <View style={[styles.noteCardContainer, isDoubleColumn && styles.noteCardDouble]}>
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
          <Image source={stampImage} style={styles.noteStamp} resizeMode="cover" />
          <View style={styles.noteContent}>
            <Text style={styles.noteTitle} numberOfLines={2}>{item.title}</Text>
            {item.description && (
              <Text style={styles.noteDesc} numberOfLines={3}>{item.description}</Text>
            )}
          </View>
        </Pressable>
      </View>
    );
  }

  // Clean polaroid with no borders
  return (
    <View style={[styles.polaroidContainer, isDoubleColumn && styles.polaroidDouble]}>
      <Pressable
        style={({ pressed }) => [
          styles.polaroid,
          { transform: [{ rotate: `${rotation}deg` }] },
          pressed && styles.pressed,
        ]}
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}`}
      >
        {/* Image section */}
        <View style={styles.imageWrapper}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderText}>📷</Text>
            </View>
          )}

          {/* Paperclips on corners - positioned outside image */}
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

        {/* Text area with handwritten style */}
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
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.9 },

  // ─── Polaroid Card ─────────────────────────────────────────────────────
  polaroidContainer: {
    flex: 1,
    padding: spacing.sm,
    minWidth: '50%',
  },

  polaroidDouble: {
    minWidth: '100%',
  },

  polaroid: {
    backgroundColor: '#fef9e7',
    borderRadius: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 300,
  },

  imageWrapper: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#f0ede6',
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

  // Paperclips positioned at corners, partially outside image
  paperclipTL: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 40,
    height: 40,
    zIndex: 10,
  },

  paperclipTR: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 40,
    height: 40,
    zIndex: 10,
  },

  // Text area with handwritten cursive font
  textArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flex: 1,
    justifyContent: 'flex-end',
  },

  cardTitle: {
    fontSize: 18,
    color: '#2d2d2d',
    marginBottom: spacing.xs,
    fontStyle: 'italic',
    fontWeight: '600',
    fontFamily: 'cursive',
  },

  cardDesc: {
    fontSize: 13,
    color: '#2d2d2d',
    opacity: 0.85,
    marginBottom: spacing.xs,
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },

  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    opacity: 0.6,
  },

  cardType: {
    fontSize: 9,
    color: '#2d2d2d',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: '500',
  },

  cardOwner: {
    fontSize: 10,
    color: '#2d2d2d',
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },

  completionNote: {
    fontSize: 11,
    color: '#4a7c59',
    marginTop: spacing.xs,
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },

  // ─── Note Card ─────────────────────────────────────────────────────────
  noteCardContainer: {
    flex: 1,
    padding: spacing.sm,
    minWidth: '100%',
  },

  noteCardDouble: {
    minWidth: '50%',
  },

  noteCard: {
    backgroundColor: '#fef9e7',
    borderRadius: 4,
    padding: spacing.md,
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 15,
    color: '#2d2d2d',
    marginBottom: spacing.xs,
    fontStyle: 'italic',
    fontWeight: '600',
    fontFamily: 'cursive',
  },

  noteDesc: {
    fontSize: 12,
    color: '#555',
    fontStyle: 'italic',
    fontFamily: 'cursive',
  },
});
