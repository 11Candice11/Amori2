/**
 * ArtifactRevealModal — the daily gift "spin to reveal" experience.
 *
 * A thin wrapper over the shared FlipRevealModal: the front face is the card
 * art, the back is the revealed gift, and the footer carries the
 * "Save to Vault" / "Done" actions. All the spin/flip lifecycle (reopen-safe,
 * onClose-after-close) lives in FlipRevealModal so it stays consistent with the
 * other reveal popups.
 */
import React, { useCallback, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography, layout } from '../../../shared/theme';
import { getCardImage } from '../../../utils/cardSelector';
import {
  FlipRevealModal,
  type FlipFace,
} from '../../../shared/components/overlays/FlipRevealModal';
import { MemoryMediaView } from '../../memories/components/MemoryMediaView';
import type { MemoryMediaResponse } from '../../memories/types/memory.types';

// The revealed card fills most of the screen while keeping a comfortable margin.
const CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 340);
// A gift carrying media needs a taller card to fit photos/map/voice/links.
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.4);
const CARD_HEIGHT_MEDIA = Math.round(CARD_WIDTH * 1.62);

export type ArtifactRevealModalProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Called when the person taps "Save to Vault" to keep this surprise (note,
   * image, voice note, link, song, etc.) in their Hearth Vault.
   */
  onSaveToVault?: () => void | Promise<void>;
  /** Small badge above the gift, e.g. "SERIES 01 · REVEALED". */
  badge?: string;
  /** The gift headline shown on the back of the card. */
  title?: string;
  /** The gift body copy shown on the back of the card. */
  body?: string;
  /** The card number (1-10) for the front face image. Defaults to 1. */
  cardNumber?: number;
  /** Whether this gift has already been saved to the vault (disables save button). */
  alreadySaved?: boolean;
  /**
   * The gift's media (photos, voice note, links). When present, the revealed
   * back face shows the full keepsake — a photo carousel, a location map, a
   * voice-note player, and link cards — instead of text only.
   */
  media?: MemoryMediaResponse[];
  /** Coordinates of the gift's location, for a map on the revealed face. */
  latitude?: number | null;
  longitude?: number | null;
  /** Address label for the location, shown as the map caption. */
  location?: string | null;
};

export function ArtifactRevealModal({
  visible,
  onClose,
  onSaveToVault,
  badge = 'SERIES 01 · REVEALED',
  title = "Tonight's Intimate Prompt",
  body = "Share one small moment from today that made you think of each other. Then trade a memory keepsake to seal it.",
  cardNumber = 1,
  alreadySaved = false,
  media,
  latitude,
  longitude,
  location,
}: ArtifactRevealModalProps) {
  // A gift with any attachments or a pinned location reveals rich media.
  const hasMedia =
    (media != null && media.length > 0) || (latitude != null && longitude != null);
  // Whether this surprise has been tucked into the vault during this reveal.
  const [saved, setSaved] = useState(alreadySaved);

  // Reset the per-reveal "saved" confirmation each time the gift is opened
  // (unless it was already saved externally).
  React.useEffect(() => {
    if (visible) setSaved(alreadySaved);
  }, [visible, alreadySaved]);

  const cardImage = getCardImage(cardNumber);

  const handleSave = useCallback(async () => {
    // Optimistically show the saved state, but roll back if the save fails so
    // the button doesn't falsely read "Already in Vault".
    setSaved(true);
    try {
      await onSaveToVault?.();
    } catch {
      setSaved(false);
    }
  }, [onSaveToVault]);

  return (
    <FlipRevealModal
      visible={visible}
      onClose={onClose}
      cardWidth={CARD_WIDTH}
      cardHeight={hasMedia ? CARD_HEIGHT_MEDIA : CARD_HEIGHT}
      hint="Your keepsake for today"
      front={({ cardStyle, animatedStyle }: FlipFace) => (
        <Animated.View style={[cardStyle, animatedStyle]}>
          <Image source={cardImage} style={styles.cardFaceImage} resizeMode="contain" />
        </Animated.View>
      )}
      back={({ cardStyle, animatedStyle }: FlipFace) =>
        hasMedia ? (
          <Animated.View style={[cardStyle, styles.cardBack, styles.cardBackMedia, animatedStyle]}>
            <ScrollView
              contentContainerStyle={styles.mediaScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.giftBadge}>{badge}</Text>
              <Text style={styles.giftTitleMedia}>{title}</Text>
              {body ? <Text style={styles.giftBodyMedia}>{body}</Text> : null}
              <View style={styles.mediaBlock}>
                <MemoryMediaView
                  media={media ?? []}
                  latitude={latitude}
                  longitude={longitude}
                  locationLabel={location ?? title}
                  photoHeight={180}
                />
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <Animated.View style={[cardStyle, styles.cardBack, animatedStyle]}>
            <View style={styles.giftInner}>
              <Text style={styles.giftBadge}>{badge}</Text>
              <View style={styles.giftStar}>
                <Text style={styles.giftStarGlyph}>★</Text>
              </View>
              <Text style={styles.giftTitle}>{title}</Text>
              <Text style={styles.giftBody}>{body}</Text>
            </View>
          </Animated.View>
        )
      }
      footer={(close) => (
        <View style={styles.footerBtns}>
          {/* Save to Vault — keeps this surprise in the Hearth Vault. */}
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saved && styles.saveBtnDone,
              pressed && !saved && styles.pressed,
            ]}
            onPress={handleSave}
            disabled={saved}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Already saved to vault' : 'Save to vault'}
            android_ripple={{ color: 'rgba(197,163,101,0.15)' }}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Already in Vault' : 'Save to Vault'}</Text>
          </Pressable>

          {/* Done — reachable bottom button that closes the card. */}
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Done"
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  cardBack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackMedia: {
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  mediaScroll: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  mediaBlock: {
    marginTop: spacing.sm,
  },
  giftTitleMedia: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
  },
  giftBodyMedia: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  cardFaceImage: {
    width: '100%',
    height: '100%',
  },
  giftInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  giftBadge: {
    ...typography.label,
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: spacing.lg,
  },
  giftStar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
  },
  giftStarGlyph: {
    color: colors.gold,
    fontSize: 34,
    lineHeight: 40,
  },
  giftTitle: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  giftBody: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerBtns: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  saveBtnDone: {
    backgroundColor: 'rgba(197,163,101,0.14)',
  },
  saveBtnText: {
    ...typography.bodySemiBold,
    color: colors.gold,
  },
  doneBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ctaBackground,
  },
  doneBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
  },
});
