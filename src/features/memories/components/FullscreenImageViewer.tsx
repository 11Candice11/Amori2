/**
 * FullscreenImageViewer — a tap-to-open, full-screen photo viewer.
 *
 * Opened from the PhotoCarousel when a photo is tapped. Shows the whole image
 * with `resizeMode="contain"` (so nothing is cropped at the top/bottom), lets
 * you swipe between photos, and closes on the ✕ button or backdrop tap.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { typography } from '../../../shared/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FullscreenImageViewerProps {
  /** Loadable image URLs, in order. */
  uris: string[];
  /** Whether the viewer is visible. */
  visible: boolean;
  /** The photo to open on first paint. */
  initialIndex?: number;
  /** Called when the viewer is dismissed. */
  onClose: () => void;
}

export function FullscreenImageViewer({
  uris,
  visible,
  initialIndex = 0,
  onClose,
}: FullscreenImageViewerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(initialIndex);
  const count = uris.length;

  // Jump to the tapped photo whenever the viewer (re)opens.
  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      // Wait a tick so the ScrollView has laid out before we scroll.
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      });
    }
  }, [visible, initialIndex]);

  const onMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== index) setIndex(Math.max(0, Math.min(count - 1, next)));
  };

  if (count === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.backdrop}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEnabled={count > 1}
        >
          {uris.map((uri, i) => (
            // Tapping the image (outside the photo) closes the viewer.
            <Pressable key={`${uri}-${i}`} style={styles.page} onPress={onClose}>
              <Image
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel={`Photo ${i + 1} of ${count}`}
              />
            </Pressable>
          ))}
        </ScrollView>

        <SafeAreaView style={styles.topBar} pointerEvents="box-none" edges={['top']}>
          {count > 1 ? (
            <View style={styles.counterPill} pointerEvents="none">
              <Text style={styles.counterText}>
                {index + 1}/{count}
              </Text>
            </View>
          ) : (
            <View />
          )}

          <Pressable
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            hitSlop={12}
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000',
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  counterPill: {
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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  closeGlyph: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: { opacity: 0.7 },
});
