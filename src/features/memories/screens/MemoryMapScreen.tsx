/**
 * MemoryMapScreen — a fullscreen, interactive map for a single memory's saved
 * location. Reached by tapping the map/location on a memory card.
 *
 * Users can pan/zoom the map and tap "Open in Maps" to hand off to the native
 * maps app (Apple Maps on iOS, Google Maps on Android).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { colors, spacing, typography } from '../../../shared/theme';
import { AppHeader } from '../../../shared/components/header';
import type { TogetherStackParamList } from '../../../navigation/TogetherStackParamList';
import { openInMaps } from '../../../services/geocoding/openInMaps';

type Nav = NativeStackNavigationProp<TogetherStackParamList, 'MemoryMap'>;
type Route = NativeStackScreenProps<TogetherStackParamList, 'MemoryMap'>['route'];

export function MemoryMapScreen() {
  const navigation = useNavigation<Nav>();
  const { latitude, longitude, title, location } = useRoute<Route>().params;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader title={title} onBack={() => navigation.goBack()} />

      <MapView
        style={styles.map}
        initialRegion={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          title={title}
          description={location ?? undefined}
        />
      </MapView>

      <View style={styles.footer}>
        {location ? (
          <Text style={styles.locationText} numberOfLines={2}>
            📍 {location}
          </Text>
        ) : null}
        <Pressable
          style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}
          onPress={() => openInMaps(latitude, longitude, location ?? title)}
          accessibilityRole="button"
          accessibilityLabel="Open in Maps app"
        >
          <Text style={styles.openBtnText}>Open in Maps</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    minWidth: 60,
    height: 36,
    justifyContent: 'center',
  },
  backText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 15,
  },
  headerTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 16,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.sm,
  },
  map: {
    flex: 1,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  locationText: {
    ...typography.body,
    color: colors.neutralMuted,
    fontSize: 14,
  },
  openBtn: {
    backgroundColor: colors.ctaBackground,
    borderRadius: 14,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnPressed: {
    opacity: 0.6,
  },
  openBtnText: {
    ...typography.bodySemiBold,
    color: colors.ctaText,
    fontSize: 15,
  },
});
