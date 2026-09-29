/**
 * Tests for the client-side completion calculation. Deterministic and pure, so
 * these assert the exact section→percentage mapping the UI shows, matching the
 * backend rule (round(completedSections / 7 * 100)). Private-but-populated
 * fields still count.
 */
import { calculateCompletion } from '../completion';
import type { SupportProfile, TextField, ListField } from '../../types/supportProfile.types';

const t = (value: string | null, visibility: 'Shared' | 'Private' = 'Shared'): TextField => ({
  value,
  visibility,
});
const l = (values: string[], visibility: 'Shared' | 'Private' = 'Shared'): ListField => ({
  values,
  visibility,
});

/** An all-empty profile skeleton with every field present but blank. */
function emptyProfile(): SupportProfile {
  return {
    id: 'p',
    userId: 'u',
    whoIAm: {
      nickname: t(null),
      selfDescription: t(null),
      importantToMe: t(null),
      whatMakesMeFeelLikeMyself: t(null),
      whatImProudOf: t(null),
      whatImWorkingToward: t(null),
      whatIWishPeopleUnderstood: t(null),
    },
    whatILike: {
      hobbies: l([]),
      activities: l([]),
      datePreferences: l([]),
      music: l([]),
      movies: l([]),
      shows: l([]),
      books: l([]),
      games: l([]),
      food: l([]),
      places: l([]),
    },
    favorites: {
      favoriteColor: t(null),
      favoriteColorHex: null,
      favoriteFood: t(null),
      favoriteDrink: t(null),
      favoriteSnack: t(null),
      favoriteRestaurant: t(null),
      favoritePlace: t(null),
      favoriteFlower: t(null),
      favoriteAnimal: t(null),
      favoriteMovie: t(null),
      favoriteSong: t(null),
      favoriteArtist: t(null),
      favoriteSeason: t(null),
      favoriteHoliday: t(null),
      favoriteSmell: t(null),
      favoriteActivity: t(null),
    },
    howToHelpMe: {
      whenHavingDifficultDay: t(null),
      whatToAvoid: t(null),
      preferredReassurance: t(null),
      howToApproachMe: t(null),
      howIAskForSpace: t(null),
      whatHelpsMeRecover: t(null),
      neverAssume: t(null),
      supportOptions: [],
      customOptions: [],
      optionsVisibility: 'Shared',
    },
    thingsToKnow: {
      stressors: l([]),
      comforts: l([]),
      thingsThatMakeMeFeelAppreciated: l([]),
      thingsThatMakeMeFeelIgnored: l([]),
      importantRoutines: l([]),
      importantDates: l([]),
      sensitivities: l([]),
      thingsToRemember: l([]),
    },
    boundaries: { categories: [] },
    littleThings: {
      usualCoffeeOrder: t(null),
      comfortFood: t(null),
      comfortMovie: t(null),
      whatMakesMeSmile: t(null),
      guiltyPleasure: t(null),
      alwaysLosing: t(null),
      couldTalkAboutForever: t(null),
      tinyThingThatMakesMyDay: t(null),
      secretlyLove: t(null),
    },
    completion: { percentage: 0, completedSections: 0, totalSections: 7, completedSectionKeys: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: null,
  };
}

describe('calculateCompletion', () => {
  it('reports 0% for an empty profile', () => {
    const r = calculateCompletion(emptyProfile());
    expect(r.percentage).toBe(0);
    expect(r.completedSections).toBe(0);
    expect(r.totalSections).toBe(7);
  });

  it('reports 71% (round 5/7) for five populated sections', () => {
    const p = emptyProfile();
    p.whoIAm.nickname = t('A');
    p.whatILike.hobbies = l(['Reading']);
    p.favorites.favoriteDrink = t('Tea');
    p.howToHelpMe.supportOptions = ['Listen'];
    p.thingsToKnow.comforts = l(['Blankets']);

    const r = calculateCompletion(p);
    expect(r.completedSections).toBe(5);
    expect(r.percentage).toBe(71);
  });

  it('reports 100% when all seven sections are populated', () => {
    const p = emptyProfile();
    p.whoIAm.nickname = t('A');
    p.whatILike.hobbies = l(['Reading']);
    p.favorites.favoriteDrink = t('Tea');
    p.howToHelpMe.customOptions = ['Bring tea'];
    p.thingsToKnow.comforts = l(['Blankets']);
    p.boundaries.categories = [
      { category: 'Communication', comfortableWith: ['Texts'], askBefore: [], pleaseDont: [], visibility: 'Shared' },
    ];
    p.littleThings.usualCoffeeOrder = t('Oat flat white');

    const r = calculateCompletion(p);
    expect(r.completedSections).toBe(7);
    expect(r.percentage).toBe(100);
  });

  it('counts a populated-but-Private field toward completion', () => {
    const p = emptyProfile();
    p.whoIAm.nickname = t('Hidden', 'Private');

    const r = calculateCompletion(p);
    expect(r.completedSections).toBe(1);
    expect(r.completedSectionKeys).toContain('whoIAm');
  });

  it('does not count blank/whitespace values', () => {
    const p = emptyProfile();
    p.whoIAm.nickname = t('   ');
    p.favorites.favoriteColor = t('');

    expect(calculateCompletion(p).completedSections).toBe(0);
  });

  it('is deterministic for the same input', () => {
    const p = emptyProfile();
    p.favorites.favoriteColor = t('Gold');
    const a = calculateCompletion(p);
    const b = calculateCompletion(p);
    expect(a).toEqual(b);
  });
});
