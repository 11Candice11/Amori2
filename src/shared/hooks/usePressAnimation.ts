import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';

/**
 * A hook that provides press-down and release animation values for buttons.
 * Animates scale from 1.0 → 0.95 on press, and back to 1.0 on release.
 *
 * Usage:
 *   const { scaleValue, onPressIn, onPressOut } = usePressAnimation();
 *   <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
 *     <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
 */
export function usePressAnimation() {
  const scaleValue = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scaleValue, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleValue]);

  const onPressOut = useCallback(() => {
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleValue]);

  return { scaleValue, onPressIn, onPressOut };
}
