/**
 * ScrapbookCard — a vision board item styled as a scrapbook element
 * with realistic polaroid borders using image assets, decorative tape,
 * pins, and handwritten text.
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
  /** Rotation angle in degrees for visual chaos */
  rotation?: number;
  /** Show as a mini text note instead of polaroid */
  isNote?: boolean;
};

// Dynamic frame image sources - automatically pick from available borders
const FRAME_IMAGES = {
  border: require('../../../../images/vision_board/border.png'),
  border2: require('../../../../images/vision_board/border2.png'),
  border3: require('../../../../images/vision_board/border3.png'),
  border4: require('../../../../images/vision_board/border4.png'),
  border5: require('../../../../images/vision_board/border5.png'),
  border6: require('../../../../images/vision_board/border6.png'),
  border7: require('../../../../images/vision_board/border7.png'),
} as const;

const FRAME_STYLES = Object.keys(FRAME_IMAGES) as Array<keyof typeof FRAME_IMAGES>;

function getFrameImage(itemId: string) {
  // Deterministic frame selection based on item ID
  const seed = itemId.charCodeAt(0) + itemId.charCodeAt(itemId.length - 1);
  const styleIndex = seed % FRAME_STYLES.length;
  return FRAME_IMAGES[FRAME_STYLES[styleIndex]];
}

export function ScrapbookCard({
  item,
  onPress,
  rotation = Math.random() * 6 - 3, // Random rotation -3 to +3 degrees
  isNote = false,
}: ScrapbookCardProps) {
  const imageUrl = resolveMediaUrl(item.imageUrl);
  const typeLabel = VISION_BOARD_ITEM_TYPE_LABELS[decodeVisionBoardItemType(item.type)];
  const myId = userSettingsStore.get()?.id;
  const isCreatedByMe = myId && item.createdByUserId === myId;

  // Tape positioning — top and bottom, slightly offset
  const tapePositions = useMemo(() => {
    const seed = item.id.charCodeAt(0);
    return {
      topLeft: (seed % 20) - 10,
      topRight: ((seed * 3) % 20) - 10,
      bottomLeft: ((seed * 7) % 20) - 10,
      bottomRight: ((seed * 11) % 20) - 10,
    };
  }, [item.id]);

  if (isNote) {
    // A small text note with informal styling
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
        {/* Pin at top */}
        <View style={styles.pinIcon}>
          <Text style={styles.pinText}>📌</Text>
        </View>

        {/* Text content */}
        <Text style={styles.noteText}>{item.title}</Text>
        {item.description && (
          <Text style={styles.noteSmallText} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Tiny tape accents */}
        <View style={[styles.tapeTiny, styles.tapeTinyTL]} />
        <View style={[styles.tapeTiny, styles.tapeTinyBR]} />
      </Pressable>
    );
  }

  // Full polaroid-style card with image frame asset
  const frameImage = getFrameImage(item.id);

  return (
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
      {/* Frame background using real image asset */}
      <ImageBackground
        source={frameImage}
        style={styles.frameContainer}
        imageStyle={styles.frameImage}
      >
        {/* Image or placeholder inside frame */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.polaroidImage} resizeMode="cover" />
        ) : (
          <View style={styles.polaroidImagePlaceholder}>
            <Text style={styles.placeholderText}>📷</Text>
          </View>
        )}

        {/* Polaroid caption area */}
        <View style={styles.polaroidCaption}>
          <Text style={styles.polaroidTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.description ? (
            <Text style={styles.polaroidDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Meta info */}
          <View style={styles.polaroidMeta}>
            <Text style={styles.polaroidType}>{typeLabel}</Text>
            {isCreatedByMe ? (
              <Text style={styles.polaroidOwner}>by me</Text>
            ) : (
              <Text style={styles.polaroidOwner}>by partner</Text>
            )}
          </View>

          {/* Completion note if applicable */}
          {item.isCompleted && item.completedNote && (
            <Text style={styles.completionNote}>✓ {item.completedNote}</Text>
          )}
        </View>
      </ImageBackground>

      {/* Pin indicator if pinned */}
      {item.isPinned && (
        <View style={styles.pinnedIndicator}>
          <Text style={styles.pinnedText}>📌</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
  },

  // ─── Polaroid ─────────────────────────────────────────────────────────────
  polaroid: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    marginHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },

  frameContainer: {
    width: '100%',
    height: 280,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },

  frameImage: {
    resizeMode: 'stretch',
  },

  polaroidImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },

  polaroidImagePlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    marginBottom: spacing.sm,
  },

  placeholderText: {
    fontSize: 48,
    opacity: 0.3,
  },

  polaroidCaption: {
    width: '100%',
    paddingHorizontal: spacing.sm,
  },

  polaroidTitle: {
    ...typography.bodySemiBold,
    color: '#2d2d2d',
    fontSize: 14,
    marginBottom: 3,
  },

  polaroidDesc: {
    ...typography.bodySm,
    color: '#555',
    fontSize: 11,
    marginBottom: 6,
    fontStyle: 'italic',
  },

  polaroidMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },

  polaroidType: {
    ...typography.label,
    color: colors.gold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  polaroidOwner: {
    ...typography.bodySm,
    color: '#888',
    fontSize: 10,
    fontStyle: 'italic',
  },

  completionNote: {
    ...typography.bodySm,
    color: '#4a7c59',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },

  // ─── Pin ──────────────────────────────────────────────────────────────────
  pinnedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  pinnedText: {
    fontSize: 20,
  },

  // ─── Note Card ────────────────────────────────────────────────────────────
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
    minHeight: 80,
    justifyContent: 'space-between',
  },

  pinIcon: {
    position: 'absolute',
    top: -8,
    left: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinText: {
    fontSize: 18,
  },

  noteText: {
    ...typography.bodySemiBold,
    color: '#2d2d2d',
    fontSize: 14,
    marginTop: 8,
  },

  noteSmallText: {
    ...typography.bodySm,
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },

  tapeTiny: {
    position: 'absolute',
    width: 20,
    height: 4,
    backgroundColor: 'rgba(255, 192, 152, 0.5)',
    borderRadius: 1,
  },

  tapeTinyTL: {
    top: 6,
    left: 6,
    transform: [{ rotate: '-15deg' }],
  },

  tapeTinyBR: {
    bottom: 6,
    right: 6,
    transform: [{ rotate: '15deg' }],
  },
});
