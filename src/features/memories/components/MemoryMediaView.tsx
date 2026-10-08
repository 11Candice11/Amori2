/**
 * MemoryMediaView — the shared renderer for a memory's rich media.
 *
 * Given a memory's `media` array (and optional coordinates) it lays out, in a
 * consistent order used everywhere the app shows a memory or a saved gift:
 *   1. Photos — a swipeable PhotoCarousel.
 *   2. A location map thumbnail (when coordinates are present), tappable to
 *      open the native Maps app.
 *   3. A voice note — a play/pause VoiceNotePlayer.
 *   4. Link cards — a tappable card per link, with optional thumbnail + title.
 *
 * This is deliberately presentational and self-contained so the memory detail
 * popup and the gift reveal render identical media. Callers pass the media in
 * whatever wire shape they have (MemoryResponse.media or SavedGift.media — the
 * two are the same MemoryMediaResponse type).
 */
import React from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing, typography } from '../../../shared/theme';
import { MediaGallery, type GalleryItem } from './MediaGallery';
import { MemoryLocationMap } from './MemoryLocationMap';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { openInMaps } from '../../../services/geocoding/openInMaps';
import { resolveMediaUrl } from '../../../services/media/mediaUrl';
import {
  isLinkMedia,
  isVideoMedia,
  isVisualMedia,
  isVoiceNoteMedia,
  type MemoryMediaResponse,
} from '../types/memory.types';

interface MemoryMediaViewProps {
  media: MemoryMediaResponse[];
  latitude?: number | null;
  longitude?: number | null;
  /** Address label for the map caption / accessibility. */
  locationLabel?: string | null;
  /** Height for the photo carousel. Defaults to 220. */
  photoHeight?: number;
}

function LinkGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 13a5 5 0 007.07 0l2-2a5 5 0 10-7.07-7.07l-1 1"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <Path
        d="M14 11a5 5 0 00-7.07 0l-2 2a5 5 0 107.07 7.07l1-1"
        stroke={colors.gold}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** A friendly hostname for a URL, for when a link has no title. */
function hostLabel(url: string): string {
  const m = /^https?:\/\/([^/?#]+)/i.exec(url);
  return m ? m[1].replace(/^www\./, '') : url;
}

export function MemoryMediaView({
  media,
  latitude,
  longitude,
  locationLabel,
  photoHeight = 220,
}: MemoryMediaViewProps) {
  // Safety check: ensure media is an array
  const safeMedia = Array.isArray(media) ? media : [];
  
  // Photos and videos share one swipeable gallery, in their original order.
  const visualItems: GalleryItem[] = safeMedia
    .filter((m) => isVisualMedia(m.mediaType) && !!m.url)
    .map((m) => ({
      uri: resolveMediaUrl(m.url),
      kind: isVideoMedia(m.mediaType) ? ('video' as const) : ('photo' as const),
    }));

  const voiceNotes = safeMedia.filter((m) => isVoiceNoteMedia(m.mediaType) && !!m.url);
  const links = safeMedia.filter((m) => isLinkMedia(m.mediaType) && !!m.url);
  const hasCoords = latitude != null && longitude != null && !isNaN(latitude) && !isNaN(longitude);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (visualItems.length === 0 && voiceNotes.length === 0 && links.length === 0 && !hasCoords) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {visualItems.length > 0 ? (
        <MediaGallery items={visualItems} height={photoHeight} />
      ) : null}

      {hasCoords ? (
        <Pressable
          onPress={() =>
            openInMaps(latitude as number, longitude as number, locationLabel ?? 'Location')
          }
          accessibilityRole="button"
          accessibilityLabel={
            locationLabel ? `Open ${locationLabel} in Maps` : 'Open location in Maps'
          }
        >
          <MemoryLocationMap
            latitude={latitude as number}
            longitude={longitude as number}
            label={locationLabel}
          />
        </Pressable>
      ) : null}

      {voiceNotes.map((vn) => (
        <VoiceNotePlayer
          key={vn.id}
          uri={resolveMediaUrl(vn.url)}
          durationSeconds={vn.durationSeconds}
          label={vn.title ?? 'Voice note'}
        />
      ))}

      {links.map((link) => {
        const url = link.url;
        const title = link.title?.trim() || hostLabel(url);
        return (
          <Pressable
            key={link.id}
            style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}
            onPress={() => openLink(url)}
            accessibilityRole="link"
            accessibilityLabel={`Open link: ${title}`}
          >
            {link.thumbnailUrl ? (
              <Image
                source={{ uri: resolveMediaUrl(link.thumbnailUrl) }}
                style={styles.linkThumb}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.linkIconBox}>
                <LinkGlyph />
              </View>
            )}
            <View style={styles.linkTextWrap}>
              <Text style={styles.linkTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.linkUrl} numberOfLines={1}>
                {hostLabel(url)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  pressed: { opacity: 0.75 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    borderRadius: 14,
    padding: spacing.sm,
  },
  linkThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  linkIconBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197,163,101,0.3)',
    backgroundColor: colors.background,
  },
  linkTextWrap: {
    flex: 1,
    gap: 2,
  },
  linkTitle: {
    ...typography.bodySemiBold,
    color: colors.neutral,
    fontSize: 14,
  },
  linkUrl: {
    ...typography.bodySm,
    color: colors.gold,
    fontSize: 12,
  },
});
