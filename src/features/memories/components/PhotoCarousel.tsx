/**
 * PhotoCarousel — an Instagram-style paged photo viewer.
 *
 * Shows one photo at a time, swipe sideways to move between them. A "2/4"
 * counter pill (top-right) and a row of dots (bottom) appear only when there's
 * more than one photo. Widths are measured from layout so it fills whatever
 * container it's dropped into (e.g. a memory card).
 */
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing, typography } from '../../../shared/theme';
import { FullscreenImageViewer } from './FullscreenImageViewer';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PhotoCarouselProps {
  /** Loadable image URLs, in order. */
  uris: string[];
  /** Height of the viewer. Defaults to 240. */
  height?: number;
  /** Corner radius. Defaults to 12. */
  borderRadius?: number;
}

export function PhotoCarousel({
  uris,
  height = 240,
  borderRadius = 12,
}: PhotoCarouselProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  // Which photo (if any) is open full-screen.
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const count = uris.length;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(Math.max(0, Math.min(count - 1, next)));
  };

  const dots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (count === 0) return null;

  // Until the container has been measured we don't yet know each page's width.
  // Fall back to the full screen width so the first paint still shows the
  // image — otherwise the carousel renders an empty box (the counter/dots show
  // but no photo) on the very first layout pass.
  const pageWidth = width > 0 ? width : SCREEN_WIDTH;

  return (
    <View style={[styles.container, { height, borderRadius }]} onLayout={onLayout}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEnabled={count > 1}
        style={StyleSheet.absoluteFill}
      >
        {uris.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => setViewerIndex(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${count}. Tap to view full screen.`}
          >
            <Image
              source={{ uri }}
              style={{ width: pageWidth, height }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {count > 1 ? (
        <>
          <View style={styles.counterPill} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1}/{count}
            </Text>
          </View>

          <View style={styles.dotsRow} pointerEvents="none">
            {dots.map((i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
        </>
      ) : null}

      <FullscreenImageViewer
        uris={uris}
        visible={viewerIndex !== null}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  counterPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  counterText: {
    ...typography.bodySm,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dotsRow: {
    position: 'absolute',
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
