/**
 * supportProfileStore — cache + device persistence for the Support Preferences
 * feature.
 *
 * Two things live here:
 *  1. The signed-in user's OWN profile, persisted to AsyncStorage so it's
 *     available immediately after an app restart (before the network refresh
 *     lands). This is the user's own data, safe to keep on-device under their
 *     session.
 *  2. The linked partner's shared-only profile, cached in memory for the
 *     session. It is NOT persisted to disk — partner data is more sensitive and
 *     we never want it to outlive the session or leak to another account.
 *
 * Privacy / multi-account safety:
 *  - reset() clears BOTH the in-memory caches AND the persisted own-profile
 *    blob. It is called on sign-out (App.tsx handleLogout + ProfileScreen), so
 *    the next user on the same device starts clean and can never see the
 *    previous user's data. This mirrors userSettingsStore.reset().
 *  - invalidatePartner() drops just the partner cache, called when the linked
 *    relationship changes (link / unlink / relink) so a stale partner profile
 *    is never shown for the wrong partner.
 *
 * Follows the app's hand-rolled store conventions: an observable singleton
 * (like userSettingsStore) with AsyncStorage persistence (like chatDraftStore).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supportProfileService } from './supportProfileService';
import type { SupportProfile, PartnerSupportProfile } from '../types/supportProfile.types';

/** Disk key for the persisted OWN profile only. Partner data is never persisted. */
const OWN_STORAGE_KEY = '@amori/support-profile/own';

type Listener = () => void;

let ownProfile: SupportProfile | null = null;
let partnerProfile: PartnerSupportProfile | null = null;
let partnerLoaded = false;
let ownInFlight: Promise<SupportProfile | null> | null = null;
let partnerInFlight: Promise<PartnerSupportProfile | null> | null = null;

const listeners = new Set<Listener>();

function notify(): void {
  listeners.forEach((l) => l());
}

async function persistOwn(profile: SupportProfile | null): Promise<void> {
  try {
    if (profile === null) {
      await AsyncStorage.removeItem(OWN_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(OWN_STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (err) {
    console.error('Failed to persist support profile:', err);
  }
}

export const supportProfileStore = {
  /** The cached own profile, or null before the first load. */
  getOwn(): SupportProfile | null {
    return ownProfile;
  },

  /** The cached partner profile, or null when none is loaded / no partner. */
  getPartner(): PartnerSupportProfile | null {
    return partnerProfile;
  },

  /** Replace the cached own profile and persist it to disk. */
  setOwn(profile: SupportProfile | null): void {
    ownProfile = profile;
    void persistOwn(profile);
    notify();
  },

  /**
   * Hydrate the own profile from disk on startup so it's present after an app
   * restart without waiting for the network. Safe to call once at bootstrap.
   */
  async hydrate(): Promise<SupportProfile | null> {
    try {
      const json = await AsyncStorage.getItem(OWN_STORAGE_KEY);
      if (json) {
        const parsed = JSON.parse(json) as SupportProfile;
        if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string') {
          ownProfile = parsed;
          notify();
        }
      }
    } catch {
      // Corrupt/missing cache — ignore and let the network refresh populate it.
    }
    return ownProfile;
  },

  /**
   * Fetch the own profile from the API and cache+persist it. Concurrent callers
   * share the in-flight request. On network failure the existing cache is kept.
   */
  async loadOwn(force = false): Promise<SupportProfile | null> {
    if (!force && ownProfile) return ownProfile;
    if (ownInFlight) return ownInFlight;

    ownInFlight = supportProfileService
      .getMine()
      .then((profile) => {
        supportProfileStore.setOwn(profile);
        return profile;
      })
      .catch(() => ownProfile)
      .finally(() => {
        ownInFlight = null;
      });

    return ownInFlight;
  },

  /**
   * Fetch the partner's shared-only profile and cache it in memory (not disk).
   * Concurrent callers share the in-flight request.
   */
  async loadPartner(force = false): Promise<PartnerSupportProfile | null> {
    if (!force && partnerLoaded) return partnerProfile;
    if (partnerInFlight) return partnerInFlight;

    partnerInFlight = supportProfileService
      .getPartner()
      .then((profile) => {
        partnerProfile = profile;
        partnerLoaded = true;
        notify();
        return profile;
      })
      .catch(() => partnerProfile)
      .finally(() => {
        partnerInFlight = null;
      });

    return partnerInFlight;
  },

  /**
   * Drop the cached partner profile and force the next read to re-fetch. Call
   * when the linked relationship changes (link / unlink / relink) so a stale
   * partner profile is never shown for the wrong partner.
   */
  invalidatePartner(): void {
    partnerProfile = null;
    partnerLoaded = false;
    partnerInFlight = null;
    notify();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Drop ALL cached state (own + partner) and wipe the persisted own profile
   * from disk. Called on sign-out so the next account on this device can never
   * inherit the previous user's data.
   */
  reset(): void {
    ownProfile = null;
    partnerProfile = null;
    partnerLoaded = false;
    ownInFlight = null;
    partnerInFlight = null;
    void persistOwn(null);
    notify();
  },
};
