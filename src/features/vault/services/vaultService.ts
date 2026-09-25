/**
 * vaultService — the Hearth Vault of saved gifts.
 *
 * Endpoints (all require auth; the vault is scoped server-side to the
 * authenticated user, so a partner never sees what you've saved):
 *   GET    /api/vault/gifts            → VaultGiftResponse[]  (newest first)
 *   GET    /api/vault/gifts/{giftId}   → VaultGiftResponse
 *   POST   /api/vault/gifts            → VaultGiftResponse     (idempotent)
 *   DELETE /api/vault/gifts/{giftId}   → 204
 *
 * This used to be backed by AsyncStorage under a single device-wide key, which
 * meant both partners signing into the same install saw one shared vault. The
 * key is now cleaned up on first use — see purgeLocalVaultRemnants.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { api } from '../../../services/api/client';
import type { SavedGift, SaveGiftRequest, SendGiftResult } from '../types/vault.types';

/** Keys used by the retired on-device vault, removed on first access. */
const RETIRED_VAULT_KEY_PREFIX = '@amori:vault:saved_gifts';

let remnantsPurged = false;

/**
 * Best-effort removal of the old locally-stored vault. Those blobs are dead
 * data now the server owns the vault, and the un-namespaced one held both
 * partners' gifts, so it shouldn't linger on disk.
 */
async function purgeLocalVaultRemnants(): Promise<void> {
  if (remnantsPurged) return;
  remnantsPurged = true;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const stale = keys.filter(key => key.startsWith(RETIRED_VAULT_KEY_PREFIX));
    if (stale.length > 0) await AsyncStorage.multiRemove(stale);
  } catch {
    // Ignore — cleanup is housekeeping, never a reason to fail a vault read.
  }
}

export const vaultService = {
  /**
   * The signed-in user's saved gifts, most recently saved first. Ordering comes
   * from the server, so there's nothing to sort here.
   */
  async getAll(): Promise<SavedGift[]> {
    void purgeLocalVaultRemnants();
    return api.get<SavedGift[]>('/api/vault/gifts');
  },

  /** A specific saved gift. Rejects if it isn't in the caller's vault. */
  getById(giftId: string): Promise<SavedGift> {
    return api.get<SavedGift>(`/api/vault/gifts/${giftId}`);
  },

  /**
   * Save a memory as a gift to the vault. Saving the same memory twice returns
   * the existing entry rather than erroring, so a double tap is harmless.
   */
  save(payload: SaveGiftRequest): Promise<SavedGift> {
    return api.post<SavedGift>('/api/vault/gifts', payload);
  },

  /**
   * Send a memory as a gift to your partner. It lands in *their* vault (not
   * yours) and notifies them. The server returns only a confirmation, since a
   * partner's vault is private — you can't read what you sent.
   */
  sendToPartner(payload: SaveGiftRequest): Promise<SendGiftResult> {
    return api.post<SendGiftResult>('/api/vault/gifts/send', payload);
  },

  /** Remove a saved gift from the vault. */
  remove(giftId: string): Promise<void> {
    return api.delete<void>(`/api/vault/gifts/${giftId}`);
  },
};
