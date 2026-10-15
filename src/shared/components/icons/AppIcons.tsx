/**
 * AppIcons — illustrated PNG icon registry.
 *
 * These are the richly rendered, framed art icons (gold-on-botanical) used for
 * the bottom navigation tabs and the dashboard Attunement cards. Unlike the
 * line-glyph SVGs in TabIcons.tsx, these are full-colour images with their own
 * frame and background baked in, so they are NOT tinted — active/inactive state
 * is conveyed with opacity instead of colour.
 */
import React from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

// ─── Source registry ───────────────────────────────────────────────────────────

/** Bottom-nav tab art, keyed by tab route name. */
export const TAB_ICON_SOURCES = {
  Home: require('../../../../images/icons/home.png'),
  CheckIn: require('../../../../images/icons/checkin.png'),
  Together: require('../../../../images/icons/together.png'),
  Desk: require('../../../../images/icons/desk.png'),
  Profile: require('../../../../images/icons/settings.png'),
} satisfies Record<string, ImageSourcePropType>;

export type TabIconName = keyof typeof TAB_ICON_SOURCES;

/** Dashboard Attunement-card + Together collection art, keyed by action. */
export const ACTION_ICON_SOURCES = {
  hug: require('../../../../images/icons/hug.png'),
  distraction: require('../../../../images/icons/distraction.png'),
  incident: require('../../../../images/icons/log_incident.png'),
  sos: require('../../../../images/icons/sos.png'),
  wishlist: require('../../../../images/icons/wishlist.png'),
  memories: require('../../../../images/icons/memories.png'),
  chat: require('../../../../images/icons/lets_chat.png'),
  calendar: require('../../../../images/icons/calendar.png'),
  notifications: require('../../../../images/icons/notifications.png'),
  location: require('../../../../images/icons/location.png'),
  snapshot: require('../../../../images/icons/snapshot.png'),
} satisfies Record<string, ImageSourcePropType>;

export type ActionIconName = keyof typeof ACTION_ICON_SOURCES;

// ─── Components ─────────────────────────────────────────────────────────────────

type TabImageIconProps = {
  name: TabIconName;
  size?: number;
  /** Whether this tab is currently selected — full opacity when true. */
  active?: boolean;
};

/**
 * Bottom-nav icon. The art already carries its own gold frame, so we just
 * round the corners to match and dim inactive tabs.
 */
export function TabImageIcon({ name, size = 26, active = false }: TabImageIconProps) {
  return (
    <Image
      source={TAB_ICON_SOURCES[name]}
      style={[
        styles.tabIcon,
        { width: size, height: size, borderRadius: size * 0.28 },
        active ? styles.active : styles.inactive,
      ]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

type ActionImageIconProps = {
  name: ActionIconName;
  size?: number;
};

/** Dashboard Attunement-card icon. */
export function ActionImageIcon({ name, size = 40 }: ActionImageIconProps) {
  return (
    <Image
      source={ACTION_ICON_SOURCES[name]}
      style={[styles.actionIcon, { width: size, height: size, borderRadius: size * 0.24 }]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  tabIcon: {},
  actionIcon: {},
  active: {
    opacity: 1,
  },
  inactive: {
    opacity: 0.45,
  },
});
