/**
 * FeedbackOverlayHost — the shared, centered "it worked / it didn't" popup.
 *
 * Mounted once near the app root (see App.tsx, beside <Banner />). Renders two
 * store-driven animations that create/save flows fire imperatively:
 *  - success (text banner + golden edge glow) via `showSuccessOverlay(...)`
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
 * Success is just a small text banner over a golden edge glow that fades toward
 * the middle (no image or animation file, no dimmed backdrop). It dismisses after
 * `durationMs`.
 */
import React, { useEffect, useRef } from 'react';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
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
import { ErrorAnimation } from '../screens';

type OverlayState = { id: number; message?: string; durationMs: number };

/**
 * Warm golden glow around the screen edge that fades gently toward the middle,
 * like dust drifting away. A radial gradient (clear centre, gold rim) fades in,
 * drifts outward very slightly while it fades back out.
 */
function SuccessGlowEdge({ trigger }: { trigger: number | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (trigger === null) {
      anim.setValue(0);
      drift.setValue(0);
      return;
    }
    anim.setValue(0);
    drift.setValue(0);
    const opacitySeq = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.delay(900),
      Animated.timing(anim, { toValue: 0, duration: 1300, useNativeDriver: true }),
    ]);
    const driftAnim = Animated.timing(drift, {
      toValue: 1,
      duration: 2650,
      useNativeDriver: true,
    });
    const both = Animated.parallel([opacitySeq, driftAnim]);
    both.start();
    return () => both.stop();
  }, [trigger, anim, drift]);
  const scale = drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: anim, transform: [{ scale }] },
      ]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="amoriGlow" cx="50%" cy="50%" rx="80%" ry="80%" fx="50%" fy="50%">
            <Stop offset="0" stopColor={GLOW_GOLD} stopOpacity="0" />
            <Stop offset="0.35" stopColor={GLOW_GOLD} stopOpacity="0" />
            <Stop offset="0.55" stopColor={GLOW_GOLD} stopOpacity="0.06" />
            <Stop offset="0.75" stopColor={GLOW_GOLD} stopOpacity="0.18" />
            <Stop offset="0.9" stopColor={GLOW_AMBER} stopOpacity="0.32" />
            <Stop offset="1" stopColor={GLOW_AMBER} stopOpacity="0.45" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#amoriGlow)" />
      </Svg>
    </Animated.View>
  );
}
const GLOW_GOLD = '#FFC56B'; // soft honey gold
const GLOW_AMBER = '#FF9A3C'; // warm amber at the rim
type FeedbackModalProps = {
  overlay: OverlayState | null;
  hide: () => void;
  /** Haptic pattern to buzz when the overlay appears. */
  haptic: number | number[];
  render?: (size: number, onFinish: () => void) => React.ReactNode;
  /**
   * Success style: text-only banner over a golden edge glow, no animation
   * and no dimmed backdrop.
   */
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
      {showGlow ? (
        <>
          <SuccessGlowEdge key={overlay?.id ?? 0} trigger={overlay ? overlay.id : null} />
          <Pressable style={styles.glowBackdrop} onPress={dismiss}>
            {overlay?.message ? (
              <View style={styles.banner}>
                <Text style={styles.bannerText}>{overlay.message}</Text>
              </View>
            ) : null}
          </Pressable>
        </>
      ) : (
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <View style={styles.card}>
            {overlay && render ? render(160, dismiss) : null}
            {overlay?.message ? (
              <Text style={styles.message}>{overlay.message}</Text>
            ) : null}
          </View>
        </Pressable>
      )}
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
  glowBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  banner: {
    maxWidth: '90%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.surfaceCard,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bannerText: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
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
