/**
 * A softly pulsing concentric circle used as the grounding focal point on the
 * intro and breathing screens. Uses RN's built-in Animated API (no animation
 * library is installed in this project).
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, Vibration, View } from 'react-native';
import { colors, typography } from '../../../shared/theme';

type Props = {
  size?: number;
  /** Seconds for one grow-and-shrink cycle. */
  durationMs?: number;
  /** Whether the pulse animation is running. */
  active?: boolean;
  /**
   * When true, the device gently vibrates through the inhale (grow) phase and
   * falls still on the exhale (shrink) phase, so the breath can be felt as
   * well as seen.
   */
  haptics?: boolean;
  centerContent?: React.ReactNode;
  label?: string;
  sublabel?: string;
};

export function PulseCircle({
  size = 220,
  durationMs = 4000,
  active = true,
  haptics = false,
  centerContent,
  label,
  sublabel,
}: Props) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      return;
    }
    const inhaleMs = durationMs / 2;

    // A soft, repeating buzz for the inhale: short pulses spaced by pauses so
    // it reads as a gentle swell rather than a harsh continuous rumble. The
    // pattern is [wait, vibrate, wait, vibrate, ...] and is looped for the
    // duration of the inhale, then cancelled on the exhale.
    const gentlePattern = [0, 40, 160];
    let inhaleTimer: ReturnType<typeof setTimeout> | undefined;

    const startInhaleBuzz = () => {
      if (!haptics) return;
      Vibration.vibrate(gentlePattern, true);
      // Stop the buzz once the inhale completes; the exhale stays still.
      inhaleTimer = setTimeout(() => Vibration.cancel(), inhaleMs);
    };

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: inhaleMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: inhaleMs,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    // Kick off the first inhale buzz immediately, then re-trigger it at the
    // start of every subsequent cycle.
    startInhaleBuzz();
    const cycleTimer = haptics
      ? setInterval(startInhaleBuzz, durationMs)
      : undefined;

    loop.start();
    return () => {
      loop.stop();
      if (inhaleTimer) clearTimeout(inhaleTimer);
      if (cycleTimer) clearInterval(cycleTimer);
      Vibration.cancel();
    };
  }, [active, durationMs, haptics, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
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
