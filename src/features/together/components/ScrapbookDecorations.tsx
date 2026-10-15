/**
 * ScrapbookDecorations — decorative elements using your image assets.
 * Only requires files that exist in images/vision_board/.
 */
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

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

const DECORATIONS = [
  require('../../../../images/vision_board/decoration.png'),
  require('../../../../images/vision_board/decoration1.png'),
  require('../../../../images/vision_board/decoration2.png'),
  require('../../../../images/vision_board/decoration3.png'),
  require('../../../../images/vision_board/decoration4.png'),
  require('../../../../images/vision_board/decoration5.png'),
  require('../../../../images/vision_board/decoration6.png'),
  require('../../../../images/vision_board/decoration7.png'),
  require('../../../../images/vision_board/decoration8.png'),
  require('../../../../images/vision_board/decoration9.png'),
  require('../../../../images/vision_board/decoration10.png'),
  require('../../../../images/vision_board/decoration11.png'),
  require('../../../../images/vision_board/decoration12.png'),
  require('../../../../images/vision_board/decoration15.png'),
  require('../../../../images/vision_board/decoration16.png'),
];

const STAMPS = [
  require('../../../../images/vision_board/stamp.png'),
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

function getByVariant<T>(items: T[], variant: number): T {
  if (items.length === 0) return undefined as any;
  return items[(variant - 1) % items.length];
}

function getByIdSeed<T>(items: T[], seed: string): T {
  if (items.length === 0) return undefined as any;
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return items[hash % items.length];
}

export function FlowerDecor({
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
    ? getByVariant(FLOWERS, variant)
    : seedId
    ? getByIdSeed(FLOWERS, seedId)
    : FLOWERS[0];
  return <Image source={source} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

export function DecorationDecor({
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
    ? getByVariant(DECORATIONS, variant)
    : seedId
    ? getByIdSeed(DECORATIONS, seedId)
    : DECORATIONS[0];
  return <Image source={source} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

/** Alias for backward compat — previously LeafDecor, HeartDecor, TapeDecor etc. */
export const LeafDecor = DecorationDecor;
export const HeartDecor = DecorationDecor;
export const TapeDecor = DecorationDecor;
export const PinDecor = DecorationDecor;
export const PencilDecor = DecorationDecor;

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
  return <Image source={source} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

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
  return <Image source={source} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

/** CornerFlower — uses decoration images since corner PNGs no longer exist */
export function CornerFlower({
  size = 48,
  position = 'top-left',
  style,
}: {
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  style?: any;
}) {
  const idx = { 'top-left': 0, 'top-right': 1, 'bottom-left': 2, 'bottom-right': 3 }[position];
  return <Image source={DECORATIONS[idx]} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

/** EnvelopeDecor — uses a decoration image since envelope.png no longer exists */
export function EnvelopeDecor({ size = 40, style }: { size?: number; style?: any }) {
  return <Image source={DECORATIONS[4]} style={[style, { width: size, height: size, resizeMode: 'contain' }]} />;
}

/** StickyNoteBackground — uses a decoration image since sticky_note_background.png no longer exists */
export function StickyNoteBackground({ width = 200, height = 200, style }: { width?: number; height?: number; style?: any }) {
  return <Image source={DECORATIONS[5]} style={[style, { width, height, resizeMode: 'stretch' }]} />;
}

export function ScrapbookDecorationCluster({ style }: { style?: any }) {
  return (
    <View style={[styles.cluster, style]}>
      <FlowerDecor size={40} variant={1} style={{ opacity: 0.6 }} />
      <DecorationDecor size={28} variant={2} style={{ opacity: 0.5 }} />
      <DecorationDecor size={32} variant={3} style={{ opacity: 0.5 }} />
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
