/**
 * NotificationBell — the header bell action. Shows the current unread
 * notification count as a small badge and calls `onPress` (typically to open
 * the notifications list) when tapped.
 *
 * Designed to be dropped into AppHeader's `right` slot:
 *   <AppHeader title="…" right={<NotificationBell onPress={openNotifications} />} />
 *
 * The count is read from the shared notificationStore, so every bell across the
 * tab roots stays in sync and there's a single poller behind them all.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '../../theme';
import { useNotificationCount } from '../../state/notificationStore';
import { BellIcon } from '../icons';

type Props = {
  onPress: () => void;
  /** Icon tint. Defaults to the neutral header colour. */
  color?: string;
};

export function NotificationBell({ onPress, color = colors.neutral }: Props) {
  const count = useNotificationCount();
  const hasUnread = count > 0;
  const label = count > 99 ? '99+' : String(count);

  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnread
          ? `Notifications, ${count} unread`
          : 'Notifications'
      }
      android_ripple={{ color: 'rgba(197,163,101,0.15)', borderless: true }}
    >
      <BellIcon color={color} />
      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.emergency,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  badgeText: {
    ...typography.label,
    color: colors.neutral,
    fontSize: 10,
    letterSpacing: 0,
  },
});
