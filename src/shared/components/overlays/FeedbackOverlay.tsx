/**
 * FeedbackOverlayHost — the shared, centered "it worked / it didn't" popup.
 *
 * Mounted once near the app root (see App.tsx, beside <Banner />). Renders two
 * store-driven Lottie celebrations that create/save flows fire imperatively:
 *  - success (`success.json`)  via `showSuccessOverlay(...)`
 *  - failure (`unsuccess.json`) via `showErrorOverlay(...)`
 *
 * Both drop over the current screen with a dimmed backdrop, play their Lottie
 * once, show an optional message, then dismiss. Dismissal is driven by
 * whichever comes first: the animation finishing, a `durationMs` fallback
 * timer, or a backdrop tap — each clearing the store exactly once per show.
 *
 * Success and failure are mutually exclusive per flow, but if both were ever
 * active the failure overlay wins (an error is the more important thing to see).
 */
import React, { useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

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

type FeedbackModalProps = {
  overlay: OverlayState | null;
  hide: () => void;
  /** Haptic pattern to buzz when the overlay appears. */
  haptic: number | number[];
  render: (size: number, onFinish: () => void) => React.ReactNode;
};

/**
 * Shared modal shell for one feedback channel (success OR error). Owns the
 * "clear exactly once, only my own id" dismissal logic so both hosts behave
 * identically.
 */
function FeedbackModal({ overlay, hide, haptic, render }: FeedbackModalProps) {
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
