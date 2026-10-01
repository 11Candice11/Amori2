import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import { colors } from '../../theme';

// Shared Lottie source for every "couldn't create / save failed" moment.
const ERROR_SOURCE = require('../../../../images/lottie/unsuccess.json');

type ErrorAnimationProps = {
  /** Diameter (px) of the square the animation is drawn into. Defaults to 120. */
  size?: number;
  /** Extra style applied to the animation (e.g. margins). */
  style?: ViewStyle | ViewStyle[];
  /** Whether the animation loops. Failure is a one-shot, so defaults to false. */
  loop?: boolean;
  /** Whether the animation plays automatically. Defaults to true. */
  autoPlay?: boolean;
  /** Fired once the (non-looping) animation reaches its final frame. */
  onFinish?: () => void;
};

/**
 * The canonical failure indicator. Renders the shared `unsuccess.json` Lottie
 * animation once and calls `onFinish` when it completes. Use it to signal that
 * a create/save action did NOT go through (the negative of SuccessAnimation).
 */
export function ErrorAnimation({
  size = 120,
  style,
  loop = false,
  autoPlay = true,
  onFinish,
}: ErrorAnimationProps) {
  return (
    <LottieView
      source={ERROR_SOURCE}
      autoPlay={autoPlay}
      loop={loop}
      onAnimationFinish={onFinish}
      style={[{ width: size, height: size }, style]}
    />
  );
}

type ErrorScreenProps = {
  /** Size passed through to the underlying animation. */
  size?: number;
  /** Fired when the animation completes. */
  onFinish?: () => void;
};

/**
 * Full-screen, theme-aware failure state. Centers the error animation on the
 * app background — handy when a create flow fails outright.
 */
export function ErrorScreen({ size = 160, onFinish }: ErrorScreenProps) {
  return (
    <View style={styles.fill}>
      <ErrorAnimation size={size} onFinish={onFinish} />
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
