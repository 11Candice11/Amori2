import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '../../theme';
import { SparklesAnimation } from './SparklesAnimation';

type SuccessAnimationProps = {
  /** Diameter (px) of the square the animation is drawn into. Defaults to 120. */
  size?: number;
  /** Extra style applied to the animation (e.g. margins). */
  style?: ViewStyle | ViewStyle[];
  /** Whether the animation loops. Success is a one-shot, so defaults to false. */
  loop?: boolean;
  /** Whether the animation plays automatically. Defaults to true. */
  autoPlay?: boolean;
  /** Fired once the (non-looping) animation reaches its final frame. */
  onFinish?: () => void;
};

/**
 * The canonical success indicator. Renders a gold sparkles animation that
 * floats upward and gathers at the bottom nav bar. Calls `onFinish` when it
 * completes. Use it inline to confirm a create/save action (a new todo,
 * memory, timeline event, etc.).
 */
export function SuccessAnimation({
  size = 120,
  style,
  loop = false,
  autoPlay = true,
  onFinish,
}: SuccessAnimationProps) {
  return (
    <SparklesAnimation
      size={size}
      style={style}
      autoPlay={autoPlay}
      onFinish={onFinish}
    />
  );
}

type SuccessScreenProps = {
  /** Size passed through to the underlying animation. */
  size?: number;
  /** Fired when the animation completes. */
  onFinish?: () => void;
};

/**
 * Full-screen, theme-aware success state. Centers the sparkles animation on the
 * app background — handy right after a create flow before navigating away.
 */
export function SuccessScreen({ size = 160, onFinish }: SuccessScreenProps) {
  return (
    <View style={styles.fill}>
      <SuccessAnimation size={size} onFinish={onFinish} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
