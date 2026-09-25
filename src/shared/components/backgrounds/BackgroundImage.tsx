/**
 * BackgroundImage — a full-screen background image component.
 * Renders an image that covers the entire screen behind all content.
 */

import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

export interface BackgroundImageProps {
  /** Image source (require() result). */
  source: ImageSourcePropType;
  /** Optional opacity overlay (0-1). Default: 0 (no overlay). */
  overlayOpacity?: number;
  /** Children to render on top of the background. */
  children?: React.ReactNode;
}

export function BackgroundImage({
  source,
  overlayOpacity = 0,
  children,
}: BackgroundImageProps) {
  return (
    <View style={styles.container}>
      <ImageBackground
        source={source}
        style={styles.image}
        resizeMode="cover"
      >
        {overlayOpacity > 0 && (
          <View
            style={[
              styles.overlay,
              { backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` },
            ]}
          />
        )}
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
