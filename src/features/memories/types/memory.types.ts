/**
 * Memories feature types — mirror the backend C# DTOs exactly.
 * Do not invent fields here; they must match the API responses.
 *
 * Source: backend/Amori.Api/Features/Memories/DTOs
 *
 * C# `DateTime` serializes as ISO 8601, integer enums as their numeric value.
 */

/** Backend MemoryMediaType (integer enum). */
export type MemoryMediaType = 'Photo' | 'VoiceNote'; // 1 | 2

export const MEMORY_MEDIA_TYPE_VALUES: Record<MemoryMediaType, number> = {
  Photo: 1,
  VoiceNote: 2,
};

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
  fileKey: string;
  /** Serialized as the integer enum value. */
  mediaType: number;
  durationSeconds: number | null;
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
  /** Serialized as the integer enum value; decode with MEMORY_CATEGORY_LABELS. */
  category: number;
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
