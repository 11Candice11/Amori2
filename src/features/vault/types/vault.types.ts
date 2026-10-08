/**
 * Vault types — saved gifts/surprises from daily artifacts.
 *
 * Mirrors the server's VaultGiftResponse. A saved gift is a reference to one of
 * the relationship's memories that this user chose to keep, plus the card art it
 * arrived in. The memory's details — including its media (photos, voice note,
 * links) and coordinates — come back flattened onto the gift so a vault card can
 * render the full keepsake without a second request.
 */
import type { MemoryMediaResponse } from '../../memories/types/memory.types';

/**
 * A saved gift in the vault.
 */
export interface SavedGift {
  /** Unique ID for this saved gift entry */
  id: string;
  /**
   * The user who saved this gift. The vault is private per person, so the API
   * only ever returns entries belonging to the authenticated user.
   */
  userId: string;
  /** The original memory ID this gift references */
  memoryId: string;
  /** Memory title */
  title: string;
  /** Memory description/body text */
  description: string | null;
  /** ISO 8601 date when this memory occurred */
  memoryDateTime: string;
  /** Location where memory took place */
  location: string | null;
  /** Coordinates of the memory's location, when one was pinned. */
  latitude: number | null;
  longitude: number | null;
  /** ISO 8601 timestamp when this was saved to the vault */
  savedAt: string;
  /** The person who created the original memory */
  createdByName: string;
  /** The card number (1-10) associated with this gift */
  cardNumber: number;
  /**
   * The memory's media (photos, voice note, links), so the vault reveal can show
   * the same rich content the memory does.
   */
  media: MemoryMediaResponse[];
}

/**
 * Request payload for saving a gift to the vault.
 *
 * Only the reference is sent — the server reads the title, description, date
 * and location from the memory itself, so the client can't save content the
 * user isn't entitled to.
 */
export interface SaveGiftRequest {
  memoryId: string;
  /** The card number (1-10) the gift was revealed in. */
  cardNumber: number;
}

/**
 * Request payload for creating and sending a gift in one operation.
 * This creates a gift-only memory (not added to the regular memories feed)
 * and sends it directly to the partner's vault.
 */
export interface CreateGiftRequest {
  /** Gift title */
  title: string;
  /** Gift description/note */
  description?: string | null;
  /** Memory category (integer enum value) */
  category: number;
  /** ISO 8601 date-time when this gift/memory occurred */
  memoryDateTime: string;
  /** Location where memory took place */
  location?: string | null;
  /** Latitude of location */
  latitude?: number | null;
  /** Longitude of location */
  longitude?: number | null;
  /** The card number (1-10) the gift is wrapped in */
  cardNumber: number;
  /** Media attachments (photos, videos, voice notes, links) */
  media?: CreateGiftMediaRequest[];
}

/**
 * Media attachment for a gift being created.
 */
export interface CreateGiftMediaRequest {
  /** For Photo/Video/VoiceNote: storage key from media upload. For Link: the URL. */
  fileKey: string;
  /** Integer enum value for media type (Photo=1, VoiceNote=2, Link=3, Video=4) */
  mediaType: number;
  /** For VoiceNote: recording length in seconds */
  durationSeconds?: number | null;
  /** Optional label — link title or voice note caption */
  title?: string | null;
  /** Optional preview image URL for links */
  thumbnailUrl?: string | null;
}

/**
 * Confirmation returned after sending a gift to your partner. Their vault is
 * private, so you get an acknowledgement (who it went to) rather than the saved
 * gift itself.
 */
export interface SendGiftResult {
  memoryId: string;
  /** The ID of the gift entry in the recipient's vault */
  giftId: string;
  /** Display name of the partner the gift was delivered to. */
  recipientName: string;
}
