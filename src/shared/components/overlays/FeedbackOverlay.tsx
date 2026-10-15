/**
 * FeedbackOverlayHost — the shared, centered "it worked / it didn't" popup.
 *
 * Mounted once near the app root (see App.tsx, beside <Banner />). Renders two
 * store-driven animations that create/save flows fire imperatively:
 *  - success (gold sparkles floating up)  via `showSuccessOverlay(...)`
 *  - failure (`unsuccess.json` Lottie)   via `showErrorOverlay(...)`
 *
 * Both drop over the current screen with a dimmed backdrop, play their animation
 * once, show an optional message, then dismiss. Dismissal is driven by
 * whichever comes first: the animation finishing, a `durationMs` fallback
 * timer, or a backdrop tap — each clearing the store exactly once per show.
 *
 * Success and failure are mutually exclusive per flow, but if both were ever
 * active the failure overlay wins (an error is the more important thing to see).
 *
 * Success overlays also show a warm bright-golden edge glow that spans the
 * screen border for ~2.5 s: quick fade-in (200 ms), hold, then fade-out.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { vibrate } from '../../haptics';
import {
  hideSuccessOverlay,
  useSuccessOverlay,
} from '../../state/successOverlayStore';
import {
  hideErrorOverlay,
  useErrorOverlay,
} from '../../state/errorOverlayStore';
import { SuccessAnimation, ErrorAnimation } from '../screens';

type OverlayState = { id: number; message?: string; durationMs: number };

/**
 * Warm golden screen-edge glow shown during the success overlay.
 *
 * Renders an absolutely-positioned View that covers the entire Modal
 * surface with a thick golden border, a matching outer shadow, and an
 * inner soft-glow layer. The glow sequence:
 *   0 ms  →  200 ms : fade in  (ease-out)
 *   200 ms → 2500 ms: hold at full opacity
 *   2500 ms → 2900 ms: fade out (the Lottie continues playing for the
 *                      remaining ~3 s before the overlay dismisses)
 */
function SuccessGlowEdge({ trigger }: { trigger: number | null }) {
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === null) {
      glowAnim.setValue(0);
      return;
    }
    // Fade in → hold → fade out, all while the Lottie keeps playing.
    const seq = Animated.sequence([
      // Fade in: 200 ms
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Hold: 2300 ms  (200 + 2300 = 2500 ms total visible)
      Animated.delay(2300),
      // Fade out: 400 ms
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);
    seq.start();
    return () => {
      seq.stop();
    };
  }, [trigger, glowAnim]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[glowStyles.edge, { opacity: glowAnim }]}
    >

      {/* Inner soft-glow ring — slightly inset, lighter opacity */}
      <View style={glowStyles.innerRing} />
    </Animated.View>
  );
}

const GOLD_BRIGHT = '#8B6F3A';   // deep dark brown gold
const GOLD_SOFT   = '#6B562C';   // darker brown gold for inner ring

const glowStyles = StyleSheet.create({
  edge: {
    ...StyleSheet.absoluteFillObject,
    // Outer border glow
    borderWidth: 6,
    borderColor: GOLD_BRIGHT,
    borderRadius: 0,
    // Shadow gives the bloom effect on both iOS and Android
    shadowColor: GOLD_BRIGHT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 28,
    elevation: 32,
    // Pointer events disabled — taps fall through to the backdrop Pressable
  },
  innerRing: {
    ...StyleSheet.absoluteFillObject,
    margin: 6,
    borderWidth: 3,
    borderColor: `${GOLD_SOFT}99`, // ~60% opacity
    borderRadius: 0,
  },
});

type FeedbackModalProps = {
  overlay: OverlayState | null;
  hide: () => void;
  /** Haptic pattern to buzz when the overlay appears. */
  haptic: number | number[];
  render: (size: number, onFinish: () => void) => React.ReactNode;
  /** When true the golden screen-edge glow plays alongside the overlay. */
  showGlow?: boolean;
};

/**
 * Shared modal shell for one feedback channel (success OR error). Owns the
 * "clear exactly once, only my own id" dismissal logic so both hosts behave
 * identically.
 */
function FeedbackModal({ overlay, hide, haptic, render, showGlow = false }: FeedbackModalProps) {
  // The id we're currently showing, so the fallback timer and finish handler
  // only ever clear the overlay they belong to (not a newer one).
  const shownId = useRef<number | null>(null);

  useEffect(() => {
    if (!overlay) {
      shownId.current = null;
      return;
    }

    shownId.current = overlay.id;
    vibrate(haptic);

    const timer = setTimeout(() => {
      if (shownId.current === overlay.id) hide();
    }, overlay.durationMs);

    return () => clearTimeout(timer);
  }, [overlay, hide, haptic]);

  const dismiss = () => {
    if (overlay && shownId.current === overlay.id) hide();
  };

  return (
    <Modal
      visible={overlay !== null}
      transparent
      animationType="fade"
      onRequestClose={dismiss}
    >
      {/* Golden screen-edge glow — only rendered for success, keyed by id
          so it restarts whenever a new overlay fires. */}
      {showGlow ? (
        <SuccessGlowEdge key={overlay?.id ?? 0} trigger={overlay ? overlay.id : null} />
      ) : null}
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <View style={styles.card}>
          {/* Keyed by id so re-firing restarts the animation from frame 0. */}
          {overlay ? render(160, dismiss) : null}
          {overlay?.message ? (
            <Text style={styles.message}>{overlay.message}</Text>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  );
}

export function FeedbackOverlayHost() {
  const success = useSuccessOverlay();
  const error = useErrorOverlay();

  return (
    <>
      {/* Success is suppressed while an error overlay is showing. */}
      <FeedbackModal
        overlay={error ? null : success}
        hide={hideSuccessOverlay}
        haptic={20}
        showGlow
        render={(size, onFinish) => (
          <SuccessAnimation key={success?.id} size={size} onFinish={onFinish} />
        )}
      />
      <FeedbackModal
        overlay={error}
        hide={hideErrorOverlay}
        haptic={[0, 30, 40, 30]}
        render={(size, onFinish) => (
          <ErrorAnimation key={error?.id} size={size} onFinish={onFinish} />
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    padding: spacing.lg,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderRadius: 24,
    backgroundColor: colors.surfaceCard,
  },
  message: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
