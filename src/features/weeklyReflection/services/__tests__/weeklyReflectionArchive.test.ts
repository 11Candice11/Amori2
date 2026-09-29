import AsyncStorage from '@react-native-async-storage/async-storage';

import { weeklyReflectionArchive } from '../weeklyReflectionArchive';
import { weeklyReflectionApi } from '../weeklyReflectionApi';
import type { WeeklyReflection } from '../../types/weeklyReflection.types';
import type { ArchivedReflection } from '../../types/archive.types';

// The store is backend-first with a local cache. Mock the API with a small
// in-memory fake so these tests exercise the store's cache/fallback contract
// without a network. (Server-side per-user isolation is covered by the backend
// integration tests; here the fake stands in for "the server for this user".)
jest.mock('../weeklyReflectionApi', () => {
  let rows: ArchivedReflection[] = [];
  let failing = false;
  return {
    __setFailing: (v: boolean) => {
      failing = v;
    },
    __reset: () => {
      rows = [];
      failing = false;
    },
    weeklyReflectionApi: {
      getAll: jest.fn(async () => {
        if (failing) throw new Error('offline');
        return [...rows].sort((a, b) => (a.weekKey < b.weekKey ? 1 : -1));
      }),
      getByWeekKey: jest.fn(async (key: string) => {
        if (failing) throw new Error('offline');
        const found = rows.find((r) => r.weekKey === key);
        if (!found) throw new Error('404');
        return found;
      }),
      save: jest.fn(async (entry: ArchivedReflection) => {
        if (failing) throw new Error('offline');
        // The server stamps its own savedAt on write and returns/persists that
        // same value — so store the stamped version, not the client's.
        const stamped = { ...entry, savedAt: '2026-10-20T00:00:00.000Z' };
        rows = [stamped, ...rows.filter((r) => r.weekKey !== entry.weekKey)];
        return stamped;
      }),
      remove: jest.fn(async (key: string) => {
        if (failing) throw new Error('offline');
        rows = rows.filter((r) => r.weekKey !== key);
      }),
    },
  };
});

// Handles to the mock's test controls.
const apiMock = weeklyReflectionApi as unknown as {
  getAll: jest.Mock;
  getByWeekKey: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const apiModule = require('../weeklyReflectionApi') as {
  __setFailing: (v: boolean) => void;
  __reset: () => void;
};

/** A representative live reflection with a Date in days[] to exercise (de)serialize. */
function makeReflection(): WeeklyReflection {
  return {
    days: [
      {
        dayIndex: 0,
        date: new Date('2026-10-12T00:00:00.000Z'),
        dayOfMonth: 12,
        hasCheckIn: true,
        quadrant: 'LOW_PLEASANT',
        label: 'Content',
      },
      {
        dayIndex: 1,
        date: new Date('2026-10-13T00:00:00.000Z'),
        dayOfMonth: 13,
        hasCheckIn: false,
        quadrant: null,
        label: null,
      },
    ],
    checkInDays: 1,
    distribution: {
      HIGH_PLEASANT: 0,
      LOW_PLEASANT: 1,
      HIGH_UNPLEASANT: 0,
      LOW_UNPLEASANT: 0,
    },
    dominantQuadrant: 'LOW_PLEASANT',
    dominantCount: 1,
    memoryCount: 2,
    memoryThumbs: [
      {
        id: 'm1',
        title: 'Autumn walk',
        thumbnailUrl: 'https://example.test/1.jpg',
        createdByName: 'Juan',
        memoryDateTime: '2026-10-13T09:00:00.000Z',
      },
    ],
    hugsSent: 3,
    hugsReceived: 4,
    milestones: [
      { id: 'b1', title: 'Book club', kind: 'Personal', when: '2026-10-14', source: 'bucketList' },
    ],
    isEmpty: false,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  apiModule.__reset();
  jest.clearAllMocks();
});

describe('weeklyReflectionArchive (backend-first)', () => {
  it('saves through the API and round-trips the snapshot, rehydrating day Dates', async () => {
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: true,
      reflection: makeReflection(),
    });
    expect(apiMock.save).toHaveBeenCalledTimes(1);

    const entry = await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12');
    expect(entry).not.toBeNull();
    expect(entry?.rangeLabel).toBe('October 12 – 18, 2026');
    expect(entry?.moodDataPartial).toBe(true);
    // savedAt comes from the server.
    expect(entry?.savedAt).toBe('2026-10-20T00:00:00.000Z');

    const hydrated = weeklyReflectionArchive.hydrate(entry!.reflection);
    expect(hydrated.days[0].date).toBeInstanceOf(Date);
    expect(hydrated.days[0].date.toISOString()).toBe('2026-10-12T00:00:00.000Z');
    expect(hydrated.checkInDays).toBe(1);
    expect(hydrated.hugsSent).toBe(3);
    expect(hydrated.memoryThumbs[0].thumbnailUrl).toBe('https://example.test/1.jpg');
    expect(hydrated.milestones).toHaveLength(1);
  });

  it('keeps one entry per week (re-saving overwrites)', async () => {
    const reflection = makeReflection();
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: false,
      reflection,
    });
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: false,
      reflection: { ...reflection, memoryCount: 9 },
    });

    const all = await weeklyReflectionArchive.getAll('user-1');
    expect(all).toHaveLength(1);
    expect(all[0].reflection.memoryCount).toBe(9);
  });

  it('returns archives newest week first', async () => {
    const reflection = makeReflection();
    const base = { rangeLabel: 'x', moodDataPartial: false, reflection };
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-05' });
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-19' });
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-12' });

    const all = await weeklyReflectionArchive.getAll('user-1');
    expect(all.map((e) => e.weekKey)).toEqual(['2026-10-19', '2026-10-12', '2026-10-05']);
  });

  it('removes a snapshot via the API and clears the cache', async () => {
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'x',
      moodDataPartial: false,
      reflection: makeReflection(),
    });
    await weeklyReflectionArchive.remove('user-1', '2026-10-12');
    expect(apiMock.remove).toHaveBeenCalledWith('2026-10-12');
    expect(await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12')).toBeNull();
  });

  // ── Offline fallback ────────────────────────────────────────────────────

  it('falls back to the local cache when the server is unreachable on read', async () => {
    // Online save populates the cache.
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: false,
      reflection: makeReflection(),
    });

    // Now go offline: reads should still return the cached entry.
    apiModule.__setFailing(true);
    const all = await weeklyReflectionArchive.getAll('user-1');
    expect(all).toHaveLength(1);
    const one = await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12');
    expect(one?.weekKey).toBe('2026-10-12');
  });

  it('still caches a save locally when the server is unreachable', async () => {
    apiModule.__setFailing(true);
    const saved = await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: false,
      reflection: makeReflection(),
    });
    // Returns the local entry (client-stamped savedAt), not a server one.
    expect(saved.weekKey).toBe('2026-10-12');

    // Readable offline from the cache.
    const one = await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12');
    expect(one?.weekKey).toBe('2026-10-12');
  });

  it('namespaces the local cache per user (offline reads are isolated)', async () => {
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'x',
      moodDataPartial: false,
      reflection: makeReflection(),
    });

    // Offline, user-2 has nothing cached locally under their own key.
    apiModule.__setFailing(true);
    expect(await weeklyReflectionArchive.getAll('user-2')).toHaveLength(0);
    expect(await weeklyReflectionArchive.has('user-1', '2026-10-12')).toBe(true);
    expect(await weeklyReflectionArchive.has('user-2', '2026-10-12')).toBe(false);
  });

  it('tolerates corrupt local storage when falling back offline', async () => {
    apiModule.__setFailing(true);
    await AsyncStorage.setItem('@amori:weeklyReflection:archive:user-1', 'not json {');
    expect(await weeklyReflectionArchive.getAll('user-1')).toEqual([]);
  });
});
