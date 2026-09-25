/**
 * MediaGallery — an Instagram-style paged viewer for mixed visual media.
 *
 * Like PhotoCarousel, but each page can be a photo OR a short video clip. One
 * item shows at a time; swipe sideways to move between them. A "2/4" counter
 * pill and a row of dots appear when there's more than one item.
 *
 * Videos use expo-av's `Video` with native controls, and only the item on the
 * currently-visible page is allowed to play — swiping away pauses a clip so two
 * videos never play at once. Tapping a video toggles play/pause.
 *
 * Widths are measured from layout so the gallery fills whatever container it's
 * dropped into (a memory card, the detail popup, a gift reveal).
 */
import React, { useMemo, useRef, useState } from 'react';
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
import { ResizeMode, Video } from 'expo-av';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

/** One item in the gallery. */
export interface GalleryItem {
  /** Loadable URL (already run through resolveMediaUrl). */
  uri: string;
  kind: 'photo' | 'video';
}

interface MediaGalleryProps {
  items: GalleryItem[];
  /** Height of the viewer. Defaults to 240. */
  height?: number;
  /** Corner radius. Defaults to 12. */
  borderRadius?: number;
}

function PlayBadge() {
  return (
    <View style={styles.playBadge} pointerEvents="none">
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
        <Path d="M8 5v14l11-7z" fill="#fff" />
      </Svg>
    </View>
  );
}

export function MediaGallery({ items, height = 240, borderRadius = 12 }: MediaGalleryProps) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  // Which video page the user has explicitly started (so a paused clip stays
  // paused until tapped, and only the active page plays).
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const videoRefs = useRef<Record<number, Video | null>>({});

  const count = items.length;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== width) setWidth(w);
  };

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) {
      // Pause whatever was playing when we swipe to a new page.
      const prev = videoRefs.current[index];
      prev?.pauseAsync().catch(() => {});
      setPlayingIndex(null);
      setIndex(Math.max(0, Math.min(count - 1, next)));
    }
  };

  const toggleVideo = (i: number) => {
    const ref = videoRefs.current[i];
    if (!ref) return;
    if (playingIndex === i) {
      ref.pauseAsync().catch(() => {});
      setPlayingIndex(null);
    } else {
      ref.playAsync().catch(() => {});
      setPlayingIndex(i);
    }
  };

  const dots = useMemo(() => Array.from({ length: count }, (_, i) => i), [count]);

  if (count === 0) return null;

  // Fall back to full screen width until measured so the first paint isn't empty.
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
        {items.map((item, i) =>
          item.kind === 'video' ? (
            <Pressable
              key={`${item.uri}-${i}`}
              onPress={() => toggleVideo(i)}
              style={{ width: pageWidth, height }}
              accessibilityRole="button"
              accessibilityLabel={`Video ${i + 1} of ${count}. Tap to ${
                playingIndex === i ? 'pause' : 'play'
              }.`}
            >
              <Video
                ref={(r) => {
                  videoRefs.current[i] = r;
                }}
                source={{ uri: item.uri }}
                style={{ width: pageWidth, height }}
                resizeMode={ResizeMode.COVER}
                useNativeControls={playingIndex === i}
                isLooping={false}
              />
              {playingIndex === i ? null : <PlayBadge />}
            </Pressable>
          ) : (
            <Image
              key={`${item.uri}-${i}`}
              source={{ uri: item.uri }}
              style={{ width: pageWidth, height }}
              resizeMode="cover"
              accessibilityLabel={`Photo ${i + 1} of ${count}`}
            />
          ),
        )}
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
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.surfaceCard,
  },
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
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
