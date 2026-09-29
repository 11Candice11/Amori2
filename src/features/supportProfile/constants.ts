/**
 * Display metadata for the Support Preferences feature.
 *
 * The keys here are the STABLE identifiers exchanged with the backend; the
 * strings are display-only labels. Keeping them separate means UI wording can
 * change without touching stored data.
 */
import type {
  SectionKey,
  SupportPreferenceOption,
  BoundaryCategory,
} from './types/supportProfile.types';

export interface SectionMeta {
  key: SectionKey;
  title: string;
  blurb: string;
}

/** The seven sections, in display order. */
export const SECTIONS: SectionMeta[] = [
  { key: 'whoIAm', title: 'Who I Am', blurb: 'How I describe myself, what matters to me.' },
  { key: 'whatILike', title: 'What I Like', blurb: 'Hobbies, music, the ways I love to spend time.' },
  { key: 'favorites', title: 'My Favorites', blurb: 'Favourite drink, scents, places, and more.' },
  { key: 'howToHelpMe', title: 'How to Help Me', blurb: 'What eases a difficult day and how to approach me.' },
  { key: 'thingsToKnow', title: 'Things to Know', blurb: 'What soothes me, subtle stressors, routines.' },
  { key: 'boundaries', title: 'My Boundaries', blurb: 'Comfort levels across communication and closeness.' },
  { key: 'littleThings', title: 'My Little Things', blurb: 'Coffee order, comfort movies, small joys.' },
];

/** Default "How to Help Me" support options — identifier → display label. */
export const SUPPORT_OPTIONS: { id: SupportPreferenceOption; label: string }[] = [
  { id: 'GiveSpace', label: 'Give me space to settle' },
  { id: 'StayClose', label: 'Stay close by' },
  { id: 'Reassure', label: 'Reassure me' },
  { id: 'Listen', label: 'Just listen' },
  { id: 'HelpSolve', label: 'Help me solve it' },
  { id: 'Distract', label: 'Distract me' },
  { id: 'MakeMeLaugh', label: 'Make me laugh' },
  { id: 'PhysicalAffection', label: 'Physical affection' },
  { id: 'CheckInLater', label: 'Check in on me later' },
  { id: 'AskWhatINeed', label: 'Ask what I need' },
];

/** Boundary categories — identifier → display label. */
export const BOUNDARY_CATEGORIES: { id: BoundaryCategory; label: string }[] = [
  { id: 'Communication', label: 'Communication & Messaging' },
  { id: 'PersonalSpace', label: 'Personal Space & Solitude' },
  { id: 'PhysicalAffection', label: 'Physical Affection & Touch' },
  { id: 'Social', label: 'Social Situations' },
  { id: 'TimeTogether', label: 'Time Together' },
  { id: 'Conflict', label: 'Conflict & Disagreements' },
  { id: 'Privacy', label: 'Privacy' },
];

/** Text-field labels for the free-form sections, in editor order. */
export const WHO_I_AM_FIELDS: { key: string; label: string }[] = [
  { key: 'nickname', label: 'Nickname' },
  { key: 'selfDescription', label: 'How I describe myself' },
  { key: 'importantToMe', label: "What's important to me" },
  { key: 'whatMakesMeFeelLikeMyself', label: 'What makes me feel like myself' },
  { key: 'whatImProudOf', label: "What I'm proud of" },
  { key: 'whatImWorkingToward', label: "What I'm working toward" },
  { key: 'whatIWishPeopleUnderstood', label: 'What I wish people understood' },
];

export const WHAT_I_LIKE_FIELDS: { key: string; label: string }[] = [
  { key: 'hobbies', label: 'Hobbies' },
  { key: 'activities', label: 'Activities' },
  { key: 'datePreferences', label: 'Date preferences' },
  { key: 'music', label: 'Music' },
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'Shows' },
  { key: 'books', label: 'Books' },
  { key: 'games', label: 'Games' },
  { key: 'food', label: 'Food' },
  { key: 'places', label: 'Places' },
];

export const FAVORITES_FIELDS: { key: string; label: string }[] = [
  { key: 'favoriteColor', label: 'Favourite colour' },
  { key: 'favoriteFood', label: 'Favourite food' },
  { key: 'favoriteDrink', label: 'Favourite drink' },
  { key: 'favoriteSnack', label: 'Favourite snack' },
  { key: 'favoriteRestaurant', label: 'Favourite restaurant' },
  { key: 'favoritePlace', label: 'Favourite place' },
  { key: 'favoriteFlower', label: 'Favourite flower' },
  { key: 'favoriteAnimal', label: 'Favourite animal' },
  { key: 'favoriteMovie', label: 'Favourite movie' },
  { key: 'favoriteSong', label: 'Favourite song' },
  { key: 'favoriteArtist', label: 'Favourite artist' },
  { key: 'favoriteSeason', label: 'Favourite season' },
  { key: 'favoriteHoliday', label: 'Favourite holiday' },
  { key: 'favoriteSmell', label: 'Favourite smell' },
  { key: 'favoriteActivity', label: 'Favourite activity' },
];

export const HOW_TO_HELP_ME_FIELDS: { key: string; label: string }[] = [
  { key: 'whenHavingDifficultDay', label: 'When I’m having a difficult day' },
  { key: 'whatToAvoid', label: 'What to avoid' },
  { key: 'preferredReassurance', label: 'Reassurance that works' },
  { key: 'howToApproachMe', label: 'How to approach me' },
  { key: 'howIAskForSpace', label: 'How I ask for space' },
  { key: 'whatHelpsMeRecover', label: 'What helps me recover' },
  { key: 'neverAssume', label: 'Never assume' },
];

export const THINGS_TO_KNOW_FIELDS: { key: string; label: string }[] = [
  { key: 'stressors', label: 'Stressors' },
  { key: 'comforts', label: 'Comforts' },
  { key: 'thingsThatMakeMeFeelAppreciated', label: 'What makes me feel appreciated' },
  { key: 'thingsThatMakeMeFeelIgnored', label: 'What makes me feel ignored' },
  { key: 'importantRoutines', label: 'Important routines' },
  { key: 'importantDates', label: 'Important dates' },
  { key: 'sensitivities', label: 'Sensitivities' },
  { key: 'thingsToRemember', label: 'Things to remember' },
];

export const LITTLE_THINGS_FIELDS: { key: string; label: string }[] = [
  { key: 'usualCoffeeOrder', label: 'Usual coffee order' },
  { key: 'comfortFood', label: 'Comfort food' },
  { key: 'comfortMovie', label: 'Comfort movie' },
  { key: 'whatMakesMeSmile', label: 'What makes me smile' },
  { key: 'guiltyPleasure', label: 'Guilty pleasure' },
  { key: 'alwaysLosing', label: 'Always losing' },
  { key: 'couldTalkAboutForever', label: 'Could talk about forever' },
  { key: 'tinyThingThatMakesMyDay', label: 'Tiny thing that makes my day' },
  { key: 'secretlyLove', label: 'Secretly love' },
];

export function supportOptionLabel(id: SupportPreferenceOption): string {
  return SUPPORT_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

export function boundaryCategoryLabel(id: BoundaryCategory): string {
  return BOUNDARY_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}
