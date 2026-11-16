/**
 * LevelBadge — displays the user's current level with a diamond icon in the header.
 *
 * Shows a small diamond icon alongside the level number, styled to match
 * the notification bell. Taps navigate to the profile to show gamification stats.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Polygon } from 'react-native-svg';

import { colors, typography } from '../../theme';
import { useUserLevel } from '../../state/userPointsStore';

function DiamondIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Polygon
        points="12,2 22,12 12,22 2,12"
        stroke={colors.gold}
        strokeWidth={1.5}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type LevelBadgeProps = {
  onPress?: () => void;
};

export function LevelBadge({ onPress }: LevelBadgeProps) {
  const navigation = useNavigation();
  const { level } = useUserLevel();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to profile to show gamification stats
      (navigation as { navigate: (name: string) => void }).navigate('Profile');
    }
  };

  return (
    <Pressable
      style={styles.badge}
      onPress={handlePress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Level ${level}`}
      android_ripple={{ color: 'rgba(139,111,58,0.15)', borderless: true }}
    >
      <View style={styles.content}>
        <DiamondIcon />
        <Text style={styles.level}>{level}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  level: {
    ...typography.bodySemiBold,
    color: colors.gold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
