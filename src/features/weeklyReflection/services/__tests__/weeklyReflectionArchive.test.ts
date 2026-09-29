import AsyncStorage from '@react-native-async-storage/async-storage';

import { weeklyReflectionArchive } from '../weeklyReflectionArchive';
import type { WeeklyReflection } from '../../types/weeklyReflection.types';

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
});

describe('weeklyReflectionArchive', () => {
  it('round-trips a saved reflection, rehydrating day Dates', async () => {
    const reflection = makeReflection();
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'October 12 – 18, 2026',
      moodDataPartial: true,
      reflection,
    });

    const entry = await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12');
    expect(entry).not.toBeNull();
    expect(entry?.rangeLabel).toBe('October 12 – 18, 2026');
    expect(entry?.moodDataPartial).toBe(true);

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

  it('sorts archives newest week first', async () => {
    const reflection = makeReflection();
    const base = { rangeLabel: 'x', moodDataPartial: false, reflection };
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-05' });
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-19' });
    await weeklyReflectionArchive.save('user-1', { ...base, weekKey: '2026-10-12' });

    const all = await weeklyReflectionArchive.getAll('user-1');
    expect(all.map((e) => e.weekKey)).toEqual(['2026-10-19', '2026-10-12', '2026-10-05']);
  });

  it('namespaces archives per user (no cross-account leak)', async () => {
    const reflection = makeReflection();
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'x',
      moodDataPartial: false,
      reflection,
    });

    expect(await weeklyReflectionArchive.getAll('user-2')).toHaveLength(0);
    expect(await weeklyReflectionArchive.has('user-1', '2026-10-12')).toBe(true);
    expect(await weeklyReflectionArchive.has('user-2', '2026-10-12')).toBe(false);
  });

  it('removes a snapshot', async () => {
    const reflection = makeReflection();
    await weeklyReflectionArchive.save('user-1', {
      weekKey: '2026-10-12',
      rangeLabel: 'x',
      moodDataPartial: false,
      reflection,
    });
    await weeklyReflectionArchive.remove('user-1', '2026-10-12');
    expect(await weeklyReflectionArchive.getByWeekKey('user-1', '2026-10-12')).toBeNull();
  });

  it('tolerates corrupt storage by returning an empty list', async () => {
    await AsyncStorage.setItem('@amori:weeklyReflection:archive:user-1', 'not json {');
    expect(await weeklyReflectionArchive.getAll('user-1')).toEqual([]);
  });
});
