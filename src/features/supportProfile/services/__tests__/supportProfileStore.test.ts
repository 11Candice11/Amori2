/**
 * Tests for supportProfileStore — the Support Preferences cache + persistence.
 *
 * Focus areas the feature depends on:
 *  - the OWN profile persists across an app restart (AsyncStorage mock keeps its
 *    data across a fresh module load), so hydrate() restores it;
 *  - reset() (called on sign-out) clears BOTH in-memory caches AND the persisted
 *    own-profile blob, so the next account on the device starts clean and no
 *    partner data leaks;
 *  - the partner profile is NEVER written to disk;
 *  - invalidatePartner() drops the partner cache (used on relink/unlink).
 *
 * The API service is mocked so these are pure store tests (no network).
 * AsyncStorage is mocked via jest.setup.js.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supportProfileStore } from '../supportProfileStore';
import { supportProfileService } from '../supportProfileService';
import type { SupportProfile, PartnerSupportProfile } from '../../types/supportProfile.types';

jest.mock('../supportProfileService', () => ({
  supportProfileService: {
    getMine: jest.fn(),
    getPartner: jest.fn(),
  },
}));

const OWN_STORAGE_KEY = '@amori/support-profile/own';

function makeOwn(id: string, nickname: string): SupportProfile {
  return {
    id,
    userId: 'user-1',
    whoIAm: {
      nickname: { value: nickname, visibility: 'Shared' },
      selfDescription: { value: null, visibility: 'Shared' },
      importantToMe: { value: null, visibility: 'Shared' },
      whatMakesMeFeelLikeMyself: { value: null, visibility: 'Shared' },
      whatImProudOf: { value: null, visibility: 'Shared' },
      whatImWorkingToward: { value: null, visibility: 'Shared' },
      whatIWishPeopleUnderstood: { value: null, visibility: 'Shared' },
    },
  } as unknown as SupportProfile;
}

function makePartner(name: string): PartnerSupportProfile {
  return {
    userId: 'partner-1',
    partnerName: name,
    whoIAm: { hasSharedContent: false },
    whatILike: { hasSharedContent: false },
    favorites: { hasSharedContent: false },
    howToHelpMe: { hasSharedContent: false },
    thingsToKnow: { hasSharedContent: false },
    boundaries: { categories: [], hasSharedContent: false },
    littleThings: { hasSharedContent: false },
    updatedAt: null,
  } as unknown as PartnerSupportProfile;
}

const mockGetMine = supportProfileService.getMine as jest.Mock;
const mockGetPartner = supportProfileService.getPartner as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  supportProfileStore.reset();
  jest.clearAllMocks();
});

describe('supportProfileStore', () => {
  it('caches and persists the own profile to disk', async () => {
    supportProfileStore.setOwn(makeOwn('p1', 'Robin'));

    expect(supportProfileStore.getOwn()?.whoIAm.nickname.value).toBe('Robin');

    const persisted = await AsyncStorage.getItem(OWN_STORAGE_KEY);
    expect(persisted).not.toBeNull();
    expect(JSON.parse(persisted as string).id).toBe('p1');
  });

  it('hydrate() restores the persisted own profile after an app restart', async () => {
    supportProfileStore.setOwn(makeOwn('p1', 'Robin'));
    // Simulate a restart: clear in-memory state but keep disk.
    supportProfileStore.reset(); // (also wipes disk) — so re-seed disk directly:
    await AsyncStorage.setItem(OWN_STORAGE_KEY, JSON.stringify(makeOwn('p1', 'Robin')));

    const restored = await supportProfileStore.hydrate();

    expect(restored?.id).toBe('p1');
    expect(supportProfileStore.getOwn()?.whoIAm.nickname.value).toBe('Robin');
  });

  it('loadOwn() fetches from the API and caches the result', async () => {
    mockGetMine.mockResolvedValue(makeOwn('p2', 'Sky'));

    const result = await supportProfileStore.loadOwn(true);

    expect(mockGetMine).toHaveBeenCalledTimes(1);
    expect(result?.id).toBe('p2');
    expect(supportProfileStore.getOwn()?.id).toBe('p2');
  });

  it('never persists the partner profile to disk', async () => {
    mockGetPartner.mockResolvedValue(makePartner('Alex'));

    await supportProfileStore.loadPartner(true);

    expect(supportProfileStore.getPartner()?.partnerName).toBe('Alex');
    // The only disk key we own is the own-profile one; partner is memory-only.
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).not.toContain('@amori/support-profile/partner');
  });

  it('invalidatePartner() drops the cached partner and forces a re-fetch', async () => {
    mockGetPartner.mockResolvedValueOnce(makePartner('Alex'));
    await supportProfileStore.loadPartner(true);
    expect(supportProfileStore.getPartner()?.partnerName).toBe('Alex');

    supportProfileStore.invalidatePartner();
    expect(supportProfileStore.getPartner()).toBeNull();

    mockGetPartner.mockResolvedValueOnce(makePartner('Jordan'));
    await supportProfileStore.loadPartner();
    expect(supportProfileStore.getPartner()?.partnerName).toBe('Jordan');
  });

  it('reset() clears in-memory own + partner AND wipes the persisted own profile', async () => {
    supportProfileStore.setOwn(makeOwn('p1', 'Robin'));
    mockGetPartner.mockResolvedValue(makePartner('Alex'));
    await supportProfileStore.loadPartner(true);

    expect(supportProfileStore.getOwn()).not.toBeNull();
    expect(supportProfileStore.getPartner()).not.toBeNull();

    supportProfileStore.reset();

    expect(supportProfileStore.getOwn()).toBeNull();
    expect(supportProfileStore.getPartner()).toBeNull();
    const persisted = await AsyncStorage.getItem(OWN_STORAGE_KEY);
    expect(persisted).toBeNull();
  });

  it('a new account on the same device cannot see the previous user\'s data after reset', async () => {
    // User A signs in, fills a profile, then signs out (reset clears everything).
    supportProfileStore.setOwn(makeOwn('userA', 'Alice'));
    supportProfileStore.reset();

    // User B signs in on the same device — hydrate finds nothing.
    const restored = await supportProfileStore.hydrate();
    expect(restored).toBeNull();
    expect(supportProfileStore.getOwn()).toBeNull();
  });

  it('notifies subscribers on change and unsubscribes cleanly', () => {
    let calls = 0;
    const unsub = supportProfileStore.subscribe(() => {
      calls += 1;
    });

    supportProfileStore.setOwn(makeOwn('p1', 'Robin'));
    expect(calls).toBe(1);

    unsub();
    supportProfileStore.setOwn(makeOwn('p1', 'Robin2'));
    expect(calls).toBe(1); // no further notifications after unsubscribe
  });
});
