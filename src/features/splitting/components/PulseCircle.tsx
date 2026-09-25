/**
 * A softly pulsing concentric circle used as the grounding focal point on the
 * intro and breathing screens. Uses RN's built-in Animated API (no animation
 * library is installed in this project).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../../shared/theme';
// Named imports rather than a `haptics` object: this component already takes a
// `haptics` prop, which such an import would shadow.
import { cancelVibration, vibrate } from '../../../shared/haptics';

type Props = {
  size?: number;
  /** Milliseconds for one grow-and-shrink cycle. */
  durationMs?: number;
  /** Whether the pulse animation is running. */
  active?: boolean;
  /**
   * When true, the device gently vibrates while the user is actively pressing
   * and holding the circle. Vibration syncs with the breathing animation:
   * - 4 seconds of gentle vibration (expand phase)
   * - 3 seconds of silence (contract phase)
   * Stops immediately when touch ends.
   */
  haptics?: boolean;
  centerContent?: React.ReactNode;
  label?: string;
  sublabel?: string;
};

export function PulseCircle({
  size = 220,
  durationMs = 7000, // 7 second cycle: 4s expand + 3s contract
  active = true,
  haptics = false,
  centerContent,
  label,
  sublabel,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;
  const isPressingRef = useRef(false);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      return;
    }

    const expandDuration = 4000; // 4 seconds expand (vibrating)
    const contractDuration = 3000; // 3 seconds contract (silent)

    const loop = Animated.loop(
      Animated.sequence([
        // Expand phase (4 seconds)
        Animated.timing(pulse, {
          toValue: 1,
          duration: expandDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Contract phase (3 seconds)
        Animated.timing(pulse, {
          toValue: 0,
          duration: contractDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [active, pulse]);

  // Clean up vibration on unmount
  useEffect(() => {
    return () => {
      cancelVibration();
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
    };
  }, []);

  const startBreathingVibration = () => {
    if (!haptics || !isPressingRef.current) return;

    // Gentle continuous vibration pattern (40ms pulse, 60ms pause = 100ms cycle)
    // Creates a soft, subtle vibration
    const gentlePattern = [0, 40, 60];
    
    let isVibratingPhase = true; // Start with vibration
    
    const runCycle = () => {
      if (!isPressingRef.current) return;
      
      if (isVibratingPhase) {
        // Vibrate for 4 seconds
        vibrate(gentlePattern, true);
        vibrationIntervalRef.current = setTimeout(() => {
          cancelVibration();
          isVibratingPhase = false;
          runCycle();
        }, 4000);
      } else {
        // Silent for 3 seconds
        cancelVibration();
        vibrationIntervalRef.current = setTimeout(() => {
          isVibratingPhase = true;
          runCycle();
        }, 3000);
      }
    };
    
    runCycle();
  };

  const handlePressIn = () => {
    if (!haptics) return;
    isPressingRef.current = true;
    startBreathingVibration();
  };

  const handlePressOut = () => {
    if (!haptics) return;
    isPressingRef.current = false;
    // Stop vibration immediately when touch ends
    cancelVibration();
    if (vibrationIntervalRef.current) {
      clearTimeout(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
  };

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const content = (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.core,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: (size * 0.82) / 2,
            transform: [{ scale }],
          },
        ]}
      >
        {centerContent}
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </Animated.View>
    </View>
  );

  if (haptics) {
    return (
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={() => {}}
        delayLongPress={100}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,78,59,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.5)',
  },
  label: {
    ...typography.headlineSm,
    color: colors.tertiary,
    fontSize: 22,
    marginTop: 6,
  },
  sublabel: {
    ...typography.label,
    color: colors.neutralMuted,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
});
