/**
 * EmergencyBanner — floating "I'm not okay" emergency pill.
 * Sits between the keepsake and the milestone sections.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

function ArrowIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M13 6l6 6-6 6"
        stroke={colors.emergency}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type EmergencyBannerProps = {
  onPress?: () => void;
};

export function EmergencyBanner({ onPress }: EmergencyBannerProps) {
  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
        onPress={onPress}
        android_ripple={{ color: 'rgba(179,64,64,0.2)', borderless: true }}
        accessibilityRole="button"
        accessibilityLabel="Emergency: I'm not okay"
      >
        {/* Status dot */}
        <Svg width={8} height={8} viewBox="0 0 8 8">
          <Circle cx={4} cy={4} r={3} fill={colors.emergency} />
        </Svg>
        <Text style={styles.label}>Emergency: I'm not okay</Text>
        <ArrowIcon />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.emergencyBg,
    borderWidth: 1,
    borderColor: 'rgba(179,64,64,0.3)',
    borderRadius: 50,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.emergency,
    fontSize: 13,
  },
});
