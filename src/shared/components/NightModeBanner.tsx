/**
 * NightModeBanner
 *
 * A persistent top banner shown during night mode (10pm–7am SAST) while the
 * EC2 is stopped. It tells the user what they can and can't do, and disappears
 * automatically in the morning.
 *
 * Also shows a brief "syncing your offline saves..." banner when the morning
 * flush runs.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNightMode } from '../state/nightModeStore';
import { colors } from '../theme';

interface Props {
  /** Pending offline items count — shows a subtitle when > 0. */
  pendingCount?: number;
  /** Pass true while the morning flush is running. */
  isSyncing?: boolean;
}

export function NightModeBanner({ pendingCount = 0, isSyncing = false }: Props) {
  const { isNight } = useNightMode();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  // Fade in when night mode activates; fade out when it ends
  useEffect(() => {
    if (isNight || isSyncing) {
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [isNight, isSyncing, opacity]);

  if (!visible) return null;

  const title = isSyncing
    ? 'Syncing your offline saves...'
    : '🌙 Night mode — limited access until 7am';

  const subtitle = isSyncing
    ? undefined
    : pendingCount > 0
      ? `${pendingCount} item${pendingCount === 1 ? '' : 's'} saved offline — will sync at 7am`
      : 'Some features are paused. Mood, wishlist, and memories still work offline.';

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 8, opacity },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={title}
    >
      <View style={styles.row}>
        <View style={styles.textBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * A one-off inline notice used inside screens whose primary action is
 * unavailable at night (chat, hugs, SOS). Shows a moon icon and a short
 * explanation. Does not render outside night hours.
 */
export function NightModeNotice({ feature }: { feature: string }) {
  const { isNight } = useNightMode();
  if (!isNight) return null;

  return (
    <View
      style={styles.notice}
      accessibilityLabel={`${feature} is unavailable during night mode. Try again after 7am.`}
    >
      <Text style={styles.noticeText}>
        🌙 {feature} is paused until 7am while the app rests. Check back in the morning!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(10, 20, 15, 0.92)',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    // Sits above all navigation — rendered in App.tsx outside NavigationContainer
    zIndex: 999,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: '#c8e6c9',   // soft green, readable on dark background
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  subtitle: {
    color: 'rgba(200, 230, 201, 0.7)',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  notice: {
    backgroundColor: 'rgba(10, 20, 15, 0.85)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noticeText: {
    color: '#a5d6a7',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
