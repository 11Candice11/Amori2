/**
 * FlipRevealModal — the shared "spin to reveal" card popup.
 *
 * A tapped item's small card spins up into the foreground (scaling up while
 * rotating on its Y axis) and flips over to reveal its full content on the
 * back, fullscreen. Closing spins the card back down and dismisses.
 *
 * This is the single, reusable home for the flip used by the daily-gift reveal
 * (ArtifactRevealModal) and the memory detail (MemoryDetailModal), so the
 * animation stays consistent and can be dropped onto any future single-item
 * detail popup. Callers supply the two faces via the `front`/`back` render
 * props and receive the animated transform for each face plus a `close`
 * callback that plays the reverse spin.
 *
 * Built on React Native's built-in Animated API (the project has no animation
 * library). The flip is a classic two-faced card: both faces set
 * `backfaceVisibility: 'hidden'`; the front sits at rotateY(progress·180°) and
 * the back at rotateY(progress·180° + 180°), so exactly one face is visible at
 * any moment through the half-turn.
 *
 * Lifecycle notes (these fix two bugs the duplicated copies used to share):
 * - `onClose` is called only *after* the close animation finishes, so the
 *   parent's `visible` state resets in step with the card leaving the screen.
 *   Without this the parent still thinks the popup is open, and re-tapping the
 *   same item is a no-op that never reopens it.
 * - The open animation is keyed on `visible` (not on a `mounted` transition),
 *   so every open re-runs the reveal — including reopening the *same* item
 *   before a previous close animation has fully settled.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography, layout } from '../../theme';

const SPIN_MS = 700;

/** Default card footprint — most reveals fit comfortably in this slot. */
const DEFAULT_CARD_WIDTH = Math.min(layout.width - spacing.lg * 2, 340);
const DEFAULT_CARD_HEIGHT = Math.round(DEFAULT_CARD_WIDTH * 1.4);

/**
 * The pieces a caller needs to build one face: the shared base card style
 * (border, background, rounded corners, backfaceVisibility) and the animated
 * transform for this face (scale + rotateY). Compose them onto your own
 * `Animated.View`, plus any per-face styling of your own.
 */
export type FlipFace = {
  /** Base card frame — spread first so your own styles can override it. */
  cardStyle: StyleProp<ViewStyle>;
  /** Animated transform for this face; put it last in the style array. */
  animatedStyle: {
    transform: Animated.WithAnimatedArray<
      | { perspective: number }
      | { scale: Animated.AnimatedInterpolation<number> }
      | { rotateY: Animated.AnimatedInterpolation<string> }
    >;
  };
};

export type FlipRevealModalProps = {
  visible: boolean;
  /** Fired once the closing spin completes (so the parent can reset state). */
  onClose: () => void;
  /**
   * Front face — the small card the reveal grows from. Render your own
   * `Animated.View` using the provided `cardStyle` + `animatedStyle`.
   */
  front: (face: FlipFace) => React.ReactNode;
  /**
   * Back face — the revealed content. Same as `front`, plus a `close` callback
   * that plays the reverse spin (wire it to Done/X buttons).
   */
  back: (face: FlipFace, close: () => void) => React.ReactNode;
  /** Card slot width. Defaults to a screen-relative size. */
  cardWidth?: number;
  /** Card slot height. Defaults to 1.4× the width. */
  cardHeight?: number;
  /** Optional caption shown centered below the card. */
  hint?: string;
  /** Optional content rendered below the card (e.g. action buttons). */
  footer?: (close: () => void) => React.ReactNode;
  /** Whether tapping the backdrop closes the reveal. Defaults to false. */
  tapOutsideToClose?: boolean;
};

export function FlipRevealModal({
  visible,
  onClose,
  front,
  back,
  cardWidth = DEFAULT_CARD_WIDTH,
  cardHeight = DEFAULT_CARD_HEIGHT,
  hint,
  footer,
  tapOutsideToClose = false,
}: FlipRevealModalProps) {
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
      if (finished) {
        setMounted(false);
        onClose();
      }
    });
  }, [progress, backdrop, onClose]);

  // Open: mount then run the spin. Close request: run the reverse spin.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Wait for the Modal to actually mount before animating; running the
      // spin in the same tick can be dropped if the native view isn't up yet.
      requestAnimationFrame(() => animateOpen());
    } else if (mounted) {
      animateClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

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
  // Grow from roughly the tapped card size into the foreground.
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 1],
  });

  const frontFace: FlipFace = {
    cardStyle: styles.card,
    animatedStyle: {
      transform: [{ perspective: 1200 }, { scale }, { rotateY: frontRotate }],
    },
  };
  const backFace: FlipFace = {
    cardStyle: styles.card,
    animatedStyle: {
      transform: [{ perspective: 1200 }, { scale }, { rotateY: backRotate }],
    },
  };

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={animateClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />
      {tapOutsideToClose ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={animateClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
      ) : null}

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.cardArea} pointerEvents="box-none">
          <View style={[styles.cardSlot, { width: cardWidth, height: cardHeight }]}>
            {/* Front face — the card being opened. */}
            {front(frontFace)}
            {/* Back face — the revealed content. Pre-rotated so it's upright post-flip. */}
            {back(backFace, animateClose)}
          </View>
        </View>

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        {footer ? footer(animateClose) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 9, 6, 0.92)',
  },
  safe: { flex: 1 },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSlot: {
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
  hint: {
    ...typography.bodySm,
    color: colors.neutralSubtle,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
