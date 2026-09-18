/**
 * ArtifactRevealModal — the daily gift "spin to reveal" experience.
 *
 * When opened, the card spins from the dashboard's small card into the
 * foreground (scaling up while rotating on its Y axis) and flips over to
 * reveal the gift on its back, fullscreen. An X in the top corner spins the
 * card back and closes to the dashboard.
 *
 * Uses React Native's built-in Animated API (the project has no animation
 * library installed). The flip is a classic two-faced card: both faces use
 * `backfaceVisibility: 'hidden'`; the front sits at rotateY(progress·180°) and
 * the back at rotateY(progress·180° + 180°), so exactly one face is visible at
 * any moment through the half-turn.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography, layout } from '../../../shared/theme';

const cardImage = require('../../../../images/card.png');

const SPIN_MS = 700;
// The revealed card fills most of the screen while keeping a comfortable margin.
const CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 340);
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.4);

export type ArtifactRevealModalProps = {
  visible: boolean;
  onClose: () => void;
  /**
   * Called when the person taps "Save to Vault" to keep this surprise (note,
   * image, voice note, link, song, etc.) in their Hearth Vault.
   */
  onSaveToVault?: () => void;
  /** Small badge above the gift, e.g. "SERIES 01 · REVEALED". */
  badge?: string;
  /** The gift headline shown on the back of the card. */
  title?: string;
  /** The gift body copy shown on the back of the card. */
  body?: string;
};

export function ArtifactRevealModal({
  visible,
  onClose,
  onSaveToVault,
  badge = 'SERIES 01 · REVEALED',
  title = "Tonight's Intimate Prompt",
  body = "Share one small moment from today that made you think of each other. Then trade a memory keepsake to seal it.",
}: ArtifactRevealModalProps) {
  // Whether this surprise has been tucked into the vault during this reveal.
  const [saved, setSaved] = useState(false);
  // Drives both the spin (rotateY) and the scale-into-foreground.
  const progress = useRef(new Animated.Value(0)).current;
  // Backdrop fade, kept separate so it can fade in before the spin.
  const backdrop = useRef(new Animated.Value(0)).current;
  // Keep the Modal mounted through the closing animation.
  const [mounted, setMounted] = useState(visible);

  const animateOpen = useCallback(() => {
    progress.setValue(0);
    backdrop.setValue(0);
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(progress, {
        toValue: 1,
        duration: SPIN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress, backdrop]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(progress, {
        toValue: 0,
        duration: SPIN_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdrop, {
        toValue: 0,
        duration: 260,
        delay: 160,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [progress, backdrop]);

  // Open: mount then run the spin. Close request: run the reverse spin.
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Once mounted (for an open), kick off the opening animation and reset the
  // per-reveal "saved" confirmation.
  useEffect(() => {
    if (mounted && visible) {
      setSaved(false);
      animateOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const handleSave = useCallback(() => {
    setSaved(true);
    onSaveToVault?.();
  }, [onSaveToVault]);

  if (!mounted) return null;

  // 0 → 1 maps to a half-turn (0° → 180°) for the flip.
  const frontRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backRotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  // Grow from roughly the dashboard card size into the foreground.
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 1],
  });

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={animateClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Spinning card — both faces share one fixed-size, centered slot. */}
        <View style={styles.cardArea} pointerEvents="box-none">
          <View style={styles.cardSlot}>
            {/* Front face — the card art (card.png). */}
            <Animated.View
              style={[
                styles.card,
                {
                  transform: [
                    { perspective: 1200 },
                    { scale },
                    { rotateY: frontRotate },
                  ],
                },
              ]}
            >
              <Image source={cardImage} style={styles.cardFaceImage} resizeMode="contain" />
            </Animated.View>

            {/* Back face — the revealed gift. Pre-rotated so it's upright post-flip. */}
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                {
                  transform: [
                    { perspective: 1200 },
                    { scale },
                    { rotateY: backRotate },
                  ],
                },
              ]}
            >
              <View style={styles.giftInner}>
                <Text style={styles.giftBadge}>{badge}</Text>
                <View style={styles.giftStar}>
                  <Text style={styles.giftStarGlyph}>★</Text>
                </View>
                <Text style={styles.giftTitle}>{title}</Text>
                <Text style={styles.giftBody}>{body}</Text>
              </View>
            </Animated.View>
          </View>
        </View>

        <Text style={styles.hint}>Your keepsake for today</Text>

        <View style={styles.footerBtns}>
          {/* Save to Vault — keeps this surprise in the Hearth Vault. */}
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              saved && styles.saveBtnDone,
              pressed && styles.pressed,
            ]}
            onPress={handleSave}
            disabled={saved}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Saved to vault' : 'Save to vault'}
            android_ripple={{ color: 'rgba(197,163,101,0.15)' }}
          >
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved to Vault' : 'Save to Vault'}</Text>
          </Pressable>

          {/* Done — reachable bottom button that closes the card. */}
          <Pressable
            style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed]}
            onPress={animateClose}
            accessibilityRole="button"
            accessibilityLabel="Done"
            android_ripple={{ color: 'rgba(10,20,15,0.2)' }}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 9, 6, 0.92)',
  },
  safe: {
    flex: 1,
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSlot: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surfaceCard,
    // Both faces share the same slot; hide whichever is turned away.
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    alignItems: 'center',
    justifyContent: 'center',
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
  hint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    marginBottom: spacing.md,
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
