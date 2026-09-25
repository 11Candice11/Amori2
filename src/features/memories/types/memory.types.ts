/**
 * Memories feature types — mirror the backend C# DTOs exactly.
 * Do not invent fields here; they must match the API responses.
 *
 * Source: backend/Amori.Api/Features/Memories/DTOs
 *
 * C# `DateTime` serializes as ISO 8601, integer enums as their numeric value.
 */

/** Backend MemoryMediaType (integer enum). */
export type MemoryMediaType = 'Photo' | 'VoiceNote' | 'Link' | 'Video'; // 1 | 2 | 3 | 4

export const MEMORY_MEDIA_TYPE_VALUES: Record<MemoryMediaType, number> = {
  Photo: 1,
  VoiceNote: 2,
  Link: 3,
  Video: 4,
};

/**
 * True when a media item is a photo, tolerating both response shapes.
 *
 * The backend's global string-enum JSON converter serializes `mediaType` as
 * the enum *name* (e.g. "Photo"), despite the `mediaType: number` typing — the
 * same round-trip quirk documented for `category`. Some responses may still
 * send the integer (or a numeric string). Compare against all forms so photos
 * survive the round-trip; anything else (VoiceNote, etc.) is not a photo.
 */
export function isPhotoMedia(mediaType: number | string): boolean {
  return matchesMediaType(mediaType, 'Photo');
}

/** True when a media item is a voice note, tolerating both response shapes. */
export function isVoiceNoteMedia(mediaType: number | string): boolean {
  return matchesMediaType(mediaType, 'VoiceNote');
}

/** True when a media item is a link, tolerating both response shapes. */
export function isLinkMedia(mediaType: number | string): boolean {
  return matchesMediaType(mediaType, 'Link');
}

/** True when a media item is a video, tolerating both response shapes. */
export function isVideoMedia(mediaType: number | string): boolean {
  return matchesMediaType(mediaType, 'Video');
}

/**
 * True for visual media shown in the swipeable gallery — photos and videos.
 * (Voice notes and links get their own dedicated UI.)
 */
export function isVisualMedia(mediaType: number | string): boolean {
  return isPhotoMedia(mediaType) || isVideoMedia(mediaType);
}

/**
 * Compare a wire `mediaType` (which may be the enum name, its integer, or a
 * numeric string thanks to the backend's string-enum converter) against a
 * known media type.
 */
function matchesMediaType(mediaType: number | string, expected: MemoryMediaType): boolean {
  const expectedNum = MEMORY_MEDIA_TYPE_VALUES[expected];
  if (typeof mediaType === 'number') return mediaType === expectedNum;
  if (mediaType === expected) return true;
  return Number(mediaType) === expectedNum;
}

/**
 * Backend MemoryCategory (integer enum). Drives the "Our Story" filter tabs
 * and per-card badges.
 */
export type MemoryCategory =
  | 'Everyday' // 1
  | 'Trip' // 2
  | 'Date' // 3
  | 'Milestone' // 4
  | 'Adventure' // 5
  | 'Celebration'; // 6

export const MEMORY_CATEGORY_VALUES: Record<MemoryCategory, number> = {
  Everyday: 1,
  Trip: 2,
  Date: 3,
  Milestone: 4,
  Adventure: 5,
  Celebration: 6,
};

/** Numeric → label, for decoding responses (backend serializes enums as ints). */
export const MEMORY_CATEGORY_LABELS: Record<number, MemoryCategory> = {
  1: 'Everyday',
  2: 'Trip',
  3: 'Date',
  4: 'Milestone',
  5: 'Adventure',
  6: 'Celebration',
};

/**
 * Decode a category from an API response into a MemoryCategory label.
 *
 * The backend is configured with a string-enum JSON converter, so responses
 * carry the enum's *name* (e.g. "Date"), not its integer value — despite the
 * `category: number` typing. Older/other responses may still send the integer.
 * Accept both forms (and the numeric string form) so the category survives the
 * round-trip; anything unrecognized falls back to Everyday.
 */
export function decodeMemoryCategory(value: number | string): MemoryCategory {
  if (typeof value === 'number') {
    return MEMORY_CATEGORY_LABELS[value] ?? 'Everyday';
  }
  // String name straight from the API (the common case).
  if (value in MEMORY_CATEGORY_VALUES) {
    return value as MemoryCategory;
  }
  // Numeric string, e.g. "3".
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && MEMORY_CATEGORY_LABELS[asNum]) {
    return MEMORY_CATEGORY_LABELS[asNum];
  }
  return 'Everyday';
}

/** Display label for a category (human-friendly, includes the plural tab form). */
export const MEMORY_CATEGORY_DISPLAY: Record<MemoryCategory, string> = {
  Everyday: 'Everyday',
  Trip: 'Trip',
  Date: 'Date',
  Milestone: 'Milestone',
  Adventure: 'Adventure',
  Celebration: 'Celebration',
};

export interface MemoryMediaResponse {
  id: string;
  /** For Photo/VoiceNote: the storage key. For Link: the URL. */
  fileKey: string;
  /**
   * A loadable URL. For Photo/VoiceNote it's resolved from the key (may be
   * presigned / time-limited); for Link it's the link URL itself.
   */
  url: string;
  /**
   * The media type. Like `category`, the backend's string-enum JSON converter
   * serializes this as the enum *name* (e.g. "Photo"); some responses may send
   * the integer. Test with `isPhotoMedia` / `isVoiceNoteMedia` / `isLinkMedia`
   * rather than comparing directly.
   */
  mediaType: number | string;
  /** For VoiceNote: recording length in seconds. Null otherwise. */
  durationSeconds: number | null;
  /** Optional label — the link title, or a caption for a voice note. */
  title: string | null;
  /** Optional preview image URL for links. */
  thumbnailUrl: string | null;
  /** ISO 8601 */
  createdAt: string;
}

export interface MemoryResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  title: string;
  description: string | null;
  /**
   * The memory's category. The backend's string-enum JSON converter serializes
   * this as the enum *name* (e.g. "Date"); some responses may send the integer.
   * Decode with `decodeMemoryCategory` rather than reading it directly.
   */
  category: number | string;
  /** ISO 8601 date-time — when the memory happened. Always present. */
  memoryDateTime: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[];
  isFavorite: boolean;
  media: MemoryMediaResponse[];
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateMemoryRequest {
  title: string;
  description?: string | null;
  /** Integer enum value (see MEMORY_CATEGORY_VALUES). */
  category: number;
  /** Required. ISO 8601 date-time for when the memory happened. */
  memoryDateTime: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[];
}

/**
 * Attach an already-uploaded media file (see mediaService.uploadImage) to a
 * memory. Sent to POST /api/memories/{id}/media.
 */
export interface AddMemoryMediaRequest {
  /** For Photo/VoiceNote: storage key from the media upload. For Link: the URL. */
  fileKey: string;
  /** Integer enum value (see MEMORY_MEDIA_TYPE_VALUES). */
  mediaType: number;
  /** For VoiceNote: recording length in seconds. */
  durationSeconds?: number | null;
  /** Optional label — the link title, or a caption for a voice note. */
  title?: string | null;
  /** Optional preview image URL for links. */
  thumbnailUrl?: string | null;
}

export interface UpdateMemoryRequest {
  title?: string;
  description?: string | null;
  category?: number;
  memoryDateTime?: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string[];
}
