import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, ViewStyle } from 'react-native';

type SparklesAnimationProps = {
  /** Diameter (px) of the square the animation is drawn into. Defaults to 120. */
  size?: number;
  /** Extra style applied to the animation (e.g. margins). */
  style?: ViewStyle | ViewStyle[];
  /** Whether the animation plays automatically. Defaults to true. */
  autoPlay?: boolean;
  /** Fired once the animation reaches its final frame. */
  onFinish?: () => void;
};

// Gold color palette
const GOLD_COLORS = ['#8B6F3A', '#6B562C', '#A48344', '#7D5A29', '#956B38'];

interface Sparkle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
}

/**
 * Sparkles animation with gold particles floating up from the bottom,
 * gathering at the bottom nav bar area. Replaces the success lottie.
 */
export function SparklesAnimation({
  size = 120,
  style,
  autoPlay = true,
  onFinish,
}: SparklesAnimationProps) {
  const sparklesRef = useRef<Sparkle[]>([]);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef(autoPlay);
  const { height } = Dimensions.get('window');

  useEffect(() => {
    isPlayingRef.current = autoPlay;
    if (!autoPlay) return;

    // Create sparkles from bottom and animate them upward
    let sparkleId = 0;
    const sparkles: Sparkle[] = [];

    const createSparkle = () => {
      if (!isPlayingRef.current) return;

      const id = sparkleId++;
      const startX = Math.random() * size - size / 2;
      const startY = 0; // Start from bottom
      const color = GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)];

      const sparkle: Sparkle = {
        id,
        x: new Animated.Value(startX),
        y: new Animated.Value(startY),
        opacity: new Animated.Value(1),
        scale: new Animated.Value(1),
        color,
      };

      sparkles.push(sparkle);
      sparklesRef.current = sparkles;

      // Animation duration: 2-3 seconds for sparkle to float up
      const duration = 2000 + Math.random() * 1000;

      // Animate upward and fade out while drifting slightly
      Animated.parallel([
        // Move upward
        Animated.timing(sparkle.y, {
          toValue: -200, // Float up 200px
          duration,
          useNativeDriver: true,
        }),
        // Horizontal drift
        Animated.timing(sparkle.x, {
          toValue: Math.random() * 40 - 20, // Drift ±20px
          duration,
          useNativeDriver: true,
        }),
        // Fade out
        Animated.timing(sparkle.opacity, {
          toValue: 0,
          duration: duration * 0.8, // Fade earlier than motion ends
          useNativeDriver: true,
        }),
        // Scale down slightly
        Animated.timing(sparkle.scale, {
          toValue: 0.3,
          duration,
          useNativeDriver: true,
        }),
      ]).start();

      // Remove sparkle from array after animation completes
      setTimeout(() => {
        sparklesRef.current = sparklesRef.current.filter(s => s.id !== id);
      }, duration);
    };

    // Create sparkles at intervals
    const sparkleInterval = setInterval(() => {
      if (isPlayingRef.current) {
        createSparkle();
      }
    }, 100); // Create a new sparkle every 100ms

    // Stop creating new sparkles after 3 seconds and call onFinish after 5 seconds
    const stopTimeout = setTimeout(() => {
      clearInterval(sparkleInterval);
    }, 3000);

    const finishTimeout = setTimeout(() => {
      if (onFinish) onFinish();
    }, 5000);

    return () => {
      clearInterval(sparkleInterval);
      clearTimeout(stopTimeout);
      clearTimeout(finishTimeout);
    };
  }, [autoPlay, size, onFinish]);

  return (
    <View style={[{ width: size, height: size, overflow: 'hidden' }, style]}>
      {sparklesRef.current.map(sparkle => (
        <Animated.View
          key={sparkle.id}
          style={[
            styles.sparkle,
            {
              transform: [
                { translateX: sparkle.x },
                { translateY: sparkle.y },
                { scale: sparkle.scale },
              ],
              opacity: sparkle.opacity,
            },
          ]}
        >
          <View
            style={[
              styles.sparkleDot,
              { backgroundColor: sparkle.color },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleDot: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
});
