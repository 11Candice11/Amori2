import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';

import { colors } from '../../theme';

// Shared Lottie source used for every "system is loading" state across the app.
const LOADING_SOURCE = require('../../../../images/lottie/loading.json');

type LoadingAnimationProps = {
  /** Diameter (px) of the square the animation is drawn into. Defaults to 96. */
  size?: number;
  /** Extra style applied to the wrapping view (e.g. margins). */
  style?: ViewStyle | ViewStyle[];
  /** Whether the animation loops. Defaults to true. */
  loop?: boolean;
  /** Whether the animation plays automatically. Defaults to true. */
  autoPlay?: boolean;
};

/**
 * The canonical loading indicator. Renders the shared `loading.json` Lottie
 * animation. Use this in place of `ActivityIndicator` for a consistent look.
 */
export function LoadingAnimation({
  size = 96,
  style,
  loop = true,
  autoPlay = true,
}: LoadingAnimationProps) {
  return (
    <LottieView
      source={LOADING_SOURCE}
      autoPlay={autoPlay}
      loop={loop}
      style={[{ width: size, height: size }, style]}
    />
  );
}

type LoadingScreenProps = {
  /** Size passed through to the underlying animation. */
  size?: number;
};

/**
 * Full-screen, theme-aware loading state. Centers the loading animation on the
 * app background. Handy for startup, route transitions, and empty-until-loaded
 * screens.
 */
export function LoadingScreen({ size = 120 }: LoadingScreenProps) {
  return (
    <View style={styles.fill}>
      <LoadingAnimation size={size} />
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
