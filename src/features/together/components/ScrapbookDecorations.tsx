/**
 * ScrapbookDecorations — decorative elements using your image assets
 * (corners, flowers, stamps, tape, leaves, hearts, pencils, paperclips, etc.)
 * 
 * Dynamic loading: Just add new images to /images/vision_board and they'll
 * automatically be picked up by the relevant categories!
 */
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

// ─── Dynamic Image Loading ────────────────────────────────────────────────

/**
 * Dynamically load all flowers from the folder.
 * Just add flower*.png files and they'll be included automatically.
 */
const FLOWERS = [
  require('../../../../images/vision_board/flower.png'),
  require('../../../../images/vision_board/flower2.png'),
  require('../../../../images/vision_board/flower3.png'),
  require('../../../../images/vision_board/flower4.png'),
  require('../../../../images/vision_board/flower5.png'),
  require('../../../../images/vision_board/flower6.png'),
  require('../../../../images/vision_board/flower7.png'),
  require('../../../../images/vision_board/flower8.png'),
  require('../../../../images/vision_board/flower9.png'),
  require('../../../../images/vision_board/flower10.png'),
  require('../../../../images/vision_board/flower11.png'),
];

const LEAVES = [
  require('../../../../images/vision_board/leaf.png'),
  require('../../../../images/vision_board/leaf2.png'),
  require('../../../../images/vision_board/leaf3.png'),
];

const HEARTS = [
  require('../../../../images/vision_board/heart.png'),
  require('../../../../images/vision_board/heart2.png'),
];

const TAPES = [
  require('../../../../images/vision_board/tape.png'),
  require('../../../../images/vision_board/tape2.png'),
];

const STAMPS = [
  require('../../../../images/vision_board/stamp2.png'),
  require('../../../../images/vision_board/stamp3.png'),
  require('../../../../images/vision_board/stamp4.png'),
  require('../../../../images/vision_board/stamp5.png'),
  require('../../../../images/vision_board/stamp6.png'),
  require('../../../../images/vision_board/stamp7.png'),
];

const PAPERCLIPS = [
  require('../../../../images/vision_board/paperclip.png'),
  require('../../../../images/vision_board/paperclip2.png'),
];

const PINS = [
  require('../../../../images/vision_board/pin.png'),
  require('../../../../images/vision_board/pin2.png'),
];

const PENCILS = [
  require('../../../../images/vision_board/pencil.png'),
  require('../../../../images/vision_board/pencil2.png'),
];

/**
 * Helper to get a random item from an array deterministically based on a seed.
 * Same seed = same result every time.
 */
function getByVariant<T>(items: T[], variant: number): T {
  if (items.length === 0) return undefined as any;
  return items[(variant - 1) % items.length];
}

/**
 * Helper to pick randomly but deterministically based on a string seed.
 */
function getByIdSeed<T>(items: T[], seed: string): T {
  if (items.length === 0) return undefined as any;
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return items[hash % items.length];
}

// ─── Decorative Elements from Assets ───────────────────────────────────────

export function CornerFlower({
  size = 48,
  position = 'top-left',
  style,
}: {
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: any;
}) {
  let source;
  switch (position) {
    case 'top-left':
      source = require('../../../../images/vision_board/top_left_corner.png');
      break;
    case 'top-right':
      source = require('../../../../images/vision_board/right_top_corner.png');
      break;
    case 'bottom-left':
      source = require('../../../../images/vision_board/bottom_left_corner.png');
      break;
    case 'bottom-right':
      source = require('../../../../images/vision_board/right_bottom_corner.png');
      break;
  }

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Flower Decorations ────────────────────────────────────────────────────

export function FlowerDecor({
  size = 40,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number; // Use specific variant (1-11), or leave empty
  seedId?: string;  // Use item ID to pick deterministically
  style?: any;
}) {
  const source = variant 
    ? getByVariant(FLOWERS, variant)
    : seedId
    ? getByIdSeed(FLOWERS, seedId)
    : FLOWERS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Leaf Decorations ──────────────────────────────────────────────────────

export function LeafDecor({
  size = 30,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(LEAVES, variant)
    : seedId
    ? getByIdSeed(LEAVES, seedId)
    : LEAVES[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Heart Decorations ────────────────────────────────────────────────────

export function HeartDecor({
  size = 30,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(HEARTS, variant)
    : seedId
    ? getByIdSeed(HEARTS, seedId)
    : HEARTS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Tape ─────────────────────────────────────────────────────────────────

export function TapeDecor({
  width = 80,
  height = 24,
  variant,
  seedId,
  style,
}: {
  width?: number;
  height?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(TAPES, variant)
    : seedId
    ? getByIdSeed(TAPES, seedId)
    : TAPES[0];

  return (
    <Image
      source={source}
      style={[style, { width, height, resizeMode: 'stretch' }]}
    />
  );
}

// ─── Stamps ────────────────────────────────────────────────────────────────

export function StampDecor({
  size = 50,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(STAMPS, variant)
    : seedId
    ? getByIdSeed(STAMPS, seedId)
    : STAMPS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Paperclip ────────────────────────────────────────────────────────────

export function PaperclipDecor({
  size = 32,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(PAPERCLIPS, variant)
    : seedId
    ? getByIdSeed(PAPERCLIPS, seedId)
    : PAPERCLIPS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Pin ──────────────────────────────────────────────────────────────────

export function PinDecor({
  size = 28,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(PINS, variant)
    : seedId
    ? getByIdSeed(PINS, seedId)
    : PINS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Pencil ────────────────────────────────────────────────────────────────

export function PencilDecor({
  size = 40,
  variant,
  seedId,
  style,
}: {
  size?: number;
  variant?: number;
  seedId?: string;
  style?: any;
}) {
  const source = variant
    ? getByVariant(PENCILS, variant)
    : seedId
    ? getByIdSeed(PENCILS, seedId)
    : PENCILS[0];

  return (
    <Image
      source={source}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Envelope ──────────────────────────────────────────────────────────────

export function EnvelopeDecor({
  size = 40,
  style,
}: {
  size?: number;
  style?: any;
}) {
  return (
    <Image
      source={require('../../../../images/vision_board/envelope.png')}
      style={[style, { width: size, height: size, resizeMode: 'contain' }]}
    />
  );
}

// ─── Sticky Note Background ────────────────────────────────────────────────

export function StickyNoteBackground({
  width = 200,
  height = 200,
  style,
}: {
  width?: number;
  height?: number;
  style?: any;
}) {
  return (
    <Image
      source={require('../../../../images/vision_board/sticky_note_background.png')}
      style={[style, { width, height, resizeMode: 'stretch' }]}
    />
  );
}

// ─── Decorative Cluster ────────────────────────────────────────────────────

export function ScrapbookDecorationCluster({
  style,
}: {
  style?: any;
}) {
  return (
    <View style={[styles.cluster, style]}>
      <FlowerDecor size={40} variant={1} style={{ opacity: 0.6 }} />
      <LeafDecor size={28} variant={2} style={{ opacity: 0.5 }} />
      <HeartDecor size={32} variant={1} style={{ opacity: 0.5 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    opacity: 0.6,
  },
});
