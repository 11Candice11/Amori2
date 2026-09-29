/**
 * "Us" Vision Board types — mirror the backend C# DTOs exactly.
 * Do not invent fields here; they must match the API responses.
 *
 * Source: backend/Amori.Api/Features/VisionBoard/DTOs
 *
 * The backend registers a global string-enum JSON converter, so `type` comes
 * back as the enum *name* (e.g. "Place") and accepts either the name or the
 * numeric value on write. C# `DateTime` serializes as ISO 8601, `decimal` as a
 * JSON number.
 */

// ─── Item type ────────────────────────────────────────────────────────────────

export type VisionBoardItemType =
  | 'Dream' // 1
  | 'Place' // 2
  | 'Experience' // 3
  | 'Home' // 4
  | 'Future' // 5
  | 'LittleThing' // 6
  | 'Custom'; // 7

export const VISION_BOARD_ITEM_TYPE_VALUES: Record<VisionBoardItemType, number> = {
  Dream: 1,
  Place: 2,
  Experience: 3,
  Home: 4,
  Future: 5,
  LittleThing: 6,
  Custom: 7,
};

/** The types in display order, for the type picker. */
export const VISION_BOARD_ITEM_TYPE_ORDER: VisionBoardItemType[] = [
  'Dream',
  'Place',
  'Experience',
  'Home',
  'Future',
  'LittleThing',
  'Custom',
];

/** Human-friendly labels for each type. */
export const VISION_BOARD_ITEM_TYPE_LABELS: Record<VisionBoardItemType, string> = {
  Dream: 'Dream',
  Place: 'Place',
  Experience: 'Experience',
  Home: 'Home',
  Future: 'Future',
  LittleThing: 'Little thing',
  Custom: 'Custom',
};

/**
 * Decode a `type` from an API response into a VisionBoardItemType label.
 * Accepts the enum name (the common case), its integer, or a numeric string;
 * falls back to Dream for anything unrecognized.
 */
export function decodeVisionBoardItemType(value: number | string): VisionBoardItemType {
  if (typeof value === 'number') {
    const byNum = VISION_BOARD_ITEM_TYPE_ORDER.find(
      (t) => VISION_BOARD_ITEM_TYPE_VALUES[t] === value,
    );
    return byNum ?? 'Dream';
  }
  if (value in VISION_BOARD_ITEM_TYPE_VALUES) return value as VisionBoardItemType;
  const asNum = Number(value);
  if (!Number.isNaN(asNum)) {
    const byNum = VISION_BOARD_ITEM_TYPE_ORDER.find(
      (t) => VISION_BOARD_ITEM_TYPE_VALUES[t] === asNum,
    );
    if (byNum) return byNum;
  }
  return 'Dream';
}

// ─── Responses ────────────────────────────────────────────────────────────────

export interface VisionBoardItemResponse {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  createdByName: string;
  sectionId: string;
  title: string;
  description: string | null;
  /** Serialized as the string enum name (e.g. "Place"). Decode with decodeVisionBoardItemType. */
  type: number | string;
  imageFileKey: string | null;
  /** A loadable URL resolved from imageFileKey (may be presigned). Null when no image. */
  imageUrl: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  /** ISO 8601 date-time, an aspirational "when". */
  targetDate: string | null;
  budget: number | null;
  externalReference: string | null;
  notes: string | null;
  isPinned: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  completedNote: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface VisionBoardSectionResponse {
  id: string;
  relationshipId: string;
  name: string;
  description: string | null;
  coverImageFileKey: string | null;
  coverImageUrl: string | null;
  sortOrder: number;
  isDefault: boolean;
  /** Count of active (not completed, not deleted) items on this shelf. */
  itemCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface VisionBoardResponse {
  sections: VisionBoardSectionResponse[];
  items: VisionBoardItemResponse[];
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export interface CreateVisionBoardItemRequest {
  title: string;
  description?: string | null;
  /** Integer enum value or name (see VISION_BOARD_ITEM_TYPE_VALUES). */
  type?: number;
  sectionId?: string | null;
  imageFileKey?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  targetDate?: string | null;
  budget?: number | null;
  externalReference?: string | null;
  notes?: string | null;
  isPinned?: boolean;
}

export interface UpdateVisionBoardItemRequest {
  title?: string | null;
  description?: string | null;
  type?: number | null;
  imageFileKey?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  targetDate?: string | null;
  budget?: number | null;
  externalReference?: string | null;
  notes?: string | null;
  isPinned?: boolean | null;
}

export interface CompleteVisionBoardItemRequest {
  completedNote?: string | null;
}

export interface MoveVisionBoardItemRequest {
  sectionId: string;
}

export interface PinVisionBoardItemRequest {
  isPinned: boolean;
}

export interface ReorderVisionBoardItemsRequest {
  sectionId?: string | null;
  itemIds: string[];
}

export interface CreateVisionBoardSectionRequest {
  name: string;
  description?: string | null;
  coverImageFileKey?: string | null;
}

export interface UpdateVisionBoardSectionRequest {
  name?: string | null;
  description?: string | null;
  coverImageFileKey?: string | null;
}

export interface ReorderVisionBoardSectionsRequest {
  sectionIds: string[];
}
