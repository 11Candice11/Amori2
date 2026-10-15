/**
 * AppHeader — the single, standard top bar used across the app.
 *
 * Layout: a left-aligned back button (chevron), a centered title (with an
 * optional subtitle beneath it), and a right-side action slot. The right slot
 * always shows the notification bell (with its unread badge), optionally
 * alongside a screen-specific action passed via `right`. When there's no back
 * button, a left spacer keeps the title centered.
 *
 * Usage:
 *   - Normal navigation screen:  <AppHeader title="Timeline" onBack={() => navigation.goBack()} />
 *   - Tab root (no back):        <AppHeader title="Care Tickets" right={<...>} />
 *   - Modal:                     <AppHeader title="Link to partner" onBack={onClose} showNotificationBell={false} />
 *
 * The bell appears on every screen that uses AppHeader. Pass
 * `showNotificationBell={false}` to hide it (e.g. on the notifications screen
 * itself, or on modal-style headers where it doesn't belong).
 *
 * The Sanctuary dashboard (Home tab) intentionally does NOT use this header —
 * it renders its own bell in its bespoke top bar.
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { colors, spacing, typography } from '../../theme';
import { BackIcon } from '../icons/BackIcon';
import { NotificationBell } from './NotificationBell';
import { LevelBadge } from './LevelBadge';

type Props = {
  title: string;
  /** Small line beneath the title (e.g. step count, item count, flow name). */
  subtitle?: string;
  /** When provided, a left back button is shown and calls this on press. */
  onBack?: () => void;
  /** Optional right-side action (e.g. a "+ New" button), shown left of the bell. */
  right?: React.ReactNode;
  /** Show the notification bell in the right slot. Defaults to true. */
  showNotificationBell?: boolean;
  /** Draw a hairline divider under the header. Defaults to true. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function AppHeader({
  title,
  subtitle,
  onBack,
  right,
  showNotificationBell = true,
  bordered = true,
  style,
}: Props) {
  const navigation = useNavigation();

  // The Notifications route lives on the root tab navigator. `navigate` bubbles
  // up automatically from nested stacks, so a plain call resolves it whether
  // this header is on a tab root or a screen several stacks deep.
  const openNotifications = useCallback(() => {
    (navigation as { navigate: (name: string) => void }).navigate('Notifications');
  }, [navigation]);

  const hasRightContent = Boolean(right) || showNotificationBell;

  return (
    <View style={[styles.header, bordered && styles.bordered, style]}>
      {onBack ? (
        <Pressable
          style={styles.side}
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          android_ripple={{ color: 'rgba(139,111,58,0.15)', borderless: true }}
        >
          <BackIcon />
        </Pressable>
      ) : (
        <View style={styles.side} />
      )}

      <View style={styles.titleBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {hasRightContent ? (
        <View style={[styles.side, styles.sideRight, styles.rightGroup]}>
          {right}
          <LevelBadge />
          {showNotificationBell ? (
            <NotificationBell onPress={openNotifications} />
          ) : null}
        </View>
      ) : (
        <View style={styles.side} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  side: {
    minWidth: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  title: {
    ...typography.headlineSm,
    color: colors.neutral,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.neutralMuted,
    fontSize: 12,
    marginTop: 1,
    textAlign: 'center',
  },
});
