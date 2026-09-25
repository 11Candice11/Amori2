/**
 * App-wide feedback banner.
 *
 * Renders a single, top-anchored pill that slides down on show and auto-dismisses.
 * Driven entirely by the observable `bannerStore` — fire it from anywhere with
 * `showBanner(...)`, `showSuccess(...)`, or `showError(...)`. Mounted once, near
 * the root of the app (see App.tsx), so it overlays every screen.
 *
 * Success uses the botanical green / gold accent; errors use the theme's
 * `emergency` tokens. Tapping the banner dismisses it early.
 */
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';
import { vibrate } from '../../haptics';
import { hideBanner, useBanner, type BannerType } from '../../state/bannerStore';

function iconFor(type: BannerType): string {
  return type === 'success' ? '✓' : '✕';
}

export function Banner() {
  const banner = useBanner();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // The id we're currently animating for, so the auto-dismiss timer belongs to
  // the right banner even when a new one replaces it mid-flight.
  const shownId = useRef<number | null>(null);

  useEffect(() => {
    if (!banner) {
      // Slide away when cleared.
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      shownId.current = null;
      return;
    }

    // A new (or replacement) banner arrived: buzz + slide in.
    shownId.current = banner.id;
    vibrate(banner.type === 'success' ? 20 : [0, 30, 40, 30]);

    translateY.setValue(-120);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 180,
        mass: 0.6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      // Only auto-dismiss if this banner is still the one on screen.
      if (shownId.current === banner.id) hideBanner();
    }, banner.durationMs);

    return () => clearTimeout(timer);
  }, [banner, translateY, opacity]);

  if (!banner) return null;

  const isSuccess = banner.type === 'success';
  const accent = isSuccess ? colors.primaryLight : colors.emergency;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={hideBanner}
        accessibilityRole="alert"
        accessibilityLabel={banner.message}
        style={[styles.pill, { borderColor: accent }]}
      >
        <View style={[styles.iconCircle, { backgroundColor: accent }]}>
          <Text style={styles.iconText}>{iconFor(banner.type)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {banner.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 1000,
    elevation: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 480,
    width: '100%',
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    // Soft shadow so it reads as floating above content.
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  iconText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 14,
    lineHeight: 16,
  },
  message: {
    ...typography.bodyMedium,
    color: colors.neutral,
    flex: 1,
  },
});
