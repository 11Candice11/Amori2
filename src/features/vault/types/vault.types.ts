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
 * Confirmation returned after sending a gift to your partner. Their vault is
 * private, so you get an acknowledgement (who it went to) rather than the saved
 * gift itself.
 */
export interface SendGiftResult {
  memoryId: string;
  /** Display name of the partner the gift was delivered to. */
  recipientName: string;
}
