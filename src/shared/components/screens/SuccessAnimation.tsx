import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import { colors } from '../../theme';

// Shared Lottie source used for every "created / saved successfully" moment.
const SUCCESS_SOURCE = require('../../../../images/lottie/success.json');

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
 * The canonical success indicator. Renders the shared `success.json` Lottie
 * animation once and calls `onFinish` when it completes. Use it inline to
 * confirm a create/save action (a new todo, memory, timeline event, etc.).
 */
export function SuccessAnimation({
  size = 120,
  style,
  loop = false,
  autoPlay = true,
  onFinish,
}: SuccessAnimationProps) {
  return (
    <LottieView
      source={SUCCESS_SOURCE}
      autoPlay={autoPlay}
      loop={loop}
      onAnimationFinish={onFinish}
      style={[{ width: size, height: size }, style]}
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
 * Full-screen, theme-aware success state. Centers the success animation on the
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
