/**
 * MemoryLocationMap — a compact, read-only map used on memory cards when a
 * memory has coordinates but no photo. It stands in for a photo (the "map
 * thumbnail like an image" fallback), with a pin at the saved spot and an
 * optional address caption.
 *
 * It's intentionally non-interactive (scroll/zoom disabled) so it behaves like
 * an image inside the scrolling list rather than capturing gestures.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { colors, spacing, typography } from '../../../shared/theme';

interface MemoryLocationMapProps {
  latitude: number;
  longitude: number;
  /** Optional address caption shown over the bottom of the map. */
  label?: string | null;
  height?: number;
}

export function MemoryLocationMap({
  latitude,
  longitude,
  label,
  height = 160,
}: MemoryLocationMapProps) {
  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        region={{
          latitude,
          longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker coordinate={{ latitude, longitude }} />
      </MapView>

      {label ? (
        <View style={styles.caption} pointerEvents="none">
          <Text style={styles.captionText} numberOfLines={1}>
            📍 {label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  captionText: {
    ...typography.bodySm,
    color: '#fff',
    fontSize: 12,
  },
});
