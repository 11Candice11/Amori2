/**
 * Support Preferences / "How to Know Me" types — the client mirror of the
 * backend Support Profile DTOs (backend/Amori.Api/Features/SupportProfile/DTOs).
 *
 * Enum-like values (visibility, support options, boundary categories) are the
 * backend enum NAMES, because the API serializes/accepts enums as strings via
 * JsonStringEnumConverter. Never send display text where an identifier is
 * expected.
 */

/** Per-field privacy. Matches backend FieldVisibility. */
export type FieldVisibility = 'Shared' | 'Private';

/** Stable identifiers for the "How to Help Me" default support options. */
export type SupportPreferenceOption =
  | 'GiveSpace'
  | 'StayClose'
  | 'Reassure'
  | 'Listen'
  | 'HelpSolve'
  | 'Distract'
  | 'MakeMeLaugh'
  | 'PhysicalAffection'
  | 'CheckInLater'
  | 'AskWhatINeed';

/** Stable identifiers for the "My Boundaries" categories. */
export type BoundaryCategory =
  | 'Communication'
  | 'PersonalSpace'
  | 'PhysicalAffection'
  | 'Social'
  | 'TimeTogether'
  | 'Conflict'
  | 'Privacy';

/** The seven section keys, in display order. */
export type SectionKey =
  | 'whoIAm'
  | 'whatILike'
  | 'favorites'
  | 'howToHelpMe'
  | 'thingsToKnow'
  | 'boundaries'
  | 'littleThings';

// ── Owner field shapes (value + privacy) ──────────────────────────────────────

export interface TextField {
  value: string | null;
  visibility: FieldVisibility;
}

export interface ListField {
  values: string[];
  visibility: FieldVisibility;
}

export interface WhoIAmSection {
  nickname: TextField;
  selfDescription: TextField;
  importantToMe: TextField;
  whatMakesMeFeelLikeMyself: TextField;
  whatImProudOf: TextField;
  whatImWorkingToward: TextField;
  whatIWishPeopleUnderstood: TextField;
}

export interface WhatILikeSection {
  hobbies: ListField;
  activities: ListField;
  datePreferences: ListField;
  music: ListField;
  movies: ListField;
  shows: ListField;
  books: ListField;
  games: ListField;
  food: ListField;
  places: ListField;
}

export interface FavoritesSection {
  favoriteColor: TextField;
  favoriteColorHex: string | null;
  favoriteFood: TextField;
  favoriteDrink: TextField;
  favoriteSnack: TextField;
  favoriteRestaurant: TextField;
  favoritePlace: TextField;
  favoriteFlower: TextField;
  favoriteAnimal: TextField;
  favoriteMovie: TextField;
  favoriteSong: TextField;
  favoriteArtist: TextField;
  favoriteSeason: TextField;
  favoriteHoliday: TextField;
  favoriteSmell: TextField;
  favoriteActivity: TextField;
}

export interface HowToHelpMeSection {
  whenHavingDifficultDay: TextField;
  whatToAvoid: TextField;
  preferredReassurance: TextField;
  howToApproachMe: TextField;
  howIAskForSpace: TextField;
  whatHelpsMeRecover: TextField;
  neverAssume: TextField;
  supportOptions: SupportPreferenceOption[];
  customOptions: string[];
  optionsVisibility: FieldVisibility;
}

export interface ThingsToKnowSection {
  stressors: ListField;
  comforts: ListField;
  thingsThatMakeMeFeelAppreciated: ListField;
  thingsThatMakeMeFeelIgnored: ListField;
  importantRoutines: ListField;
  importantDates: ListField;
  sensitivities: ListField;
  thingsToRemember: ListField;
}

export interface BoundaryEntry {
  category: BoundaryCategory;
  comfortableWith: string[];
  askBefore: string[];
  pleaseDont: string[];
  visibility: FieldVisibility;
}

export interface BoundariesSection {
  categories: BoundaryEntry[];
}

export interface LittleThingsSection {
  usualCoffeeOrder: TextField;
  comfortFood: TextField;
  comfortMovie: TextField;
  whatMakesMeSmile: TextField;
  guiltyPleasure: TextField;
  alwaysLosing: TextField;
  couldTalkAboutForever: TextField;
  tinyThingThatMakesMyDay: TextField;
  secretlyLove: TextField;
}

export interface ProfileCompletion {
  percentage: number;
  completedSections: number;
  totalSections: number;
  completedSectionKeys: string[];
}

/** The owner's own full profile (GET/PATCH /api/support-profile/me). */
export interface SupportProfile {
  id: string;
  userId: string;
  whoIAm: WhoIAmSection;
  whatILike: WhatILikeSection;
  favorites: FavoritesSection;
  howToHelpMe: HowToHelpMeSection;
  thingsToKnow: ThingsToKnowSection;
  boundaries: BoundariesSection;
  littleThings: LittleThingsSection;
  completion: ProfileCompletion;
  createdAt: string;
  updatedAt: string | null;
}

// ── Partner (read-only, shared-only) shapes ───────────────────────────────────
// Fields are optional/nullable because the server omits anything private or
// empty. `hasSharedContent` tells the client whether to render the section or
// show "They haven't shared this yet."

export interface PartnerWhoIAm {
  nickname?: string | null;
  selfDescription?: string | null;
  importantToMe?: string | null;
  whatMakesMeFeelLikeMyself?: string | null;
  whatImProudOf?: string | null;
  whatImWorkingToward?: string | null;
  whatIWishPeopleUnderstood?: string | null;
  hasSharedContent: boolean;
}

export interface PartnerWhatILike {
  hobbies?: string[] | null;
  activities?: string[] | null;
  datePreferences?: string[] | null;
  music?: string[] | null;
  movies?: string[] | null;
  shows?: string[] | null;
  books?: string[] | null;
  games?: string[] | null;
  food?: string[] | null;
  places?: string[] | null;
  hasSharedContent: boolean;
}

export interface PartnerFavorites {
  favoriteColor?: string | null;
  favoriteColorHex?: string | null;
  favoriteFood?: string | null;
  favoriteDrink?: string | null;
  favoriteSnack?: string | null;
  favoriteRestaurant?: string | null;
  favoritePlace?: string | null;
  favoriteFlower?: string | null;
  favoriteAnimal?: string | null;
  favoriteMovie?: string | null;
  favoriteSong?: string | null;
  favoriteArtist?: string | null;
  favoriteSeason?: string | null;
  favoriteHoliday?: string | null;
  favoriteSmell?: string | null;
  favoriteActivity?: string | null;
  hasSharedContent: boolean;
}

export interface PartnerHowToHelpMe {
  whenHavingDifficultDay?: string | null;
  whatToAvoid?: string | null;
  preferredReassurance?: string | null;
  howToApproachMe?: string | null;
  howIAskForSpace?: string | null;
  whatHelpsMeRecover?: string | null;
  neverAssume?: string | null;
  supportOptions?: SupportPreferenceOption[] | null;
  customOptions?: string[] | null;
  hasSharedContent: boolean;
}

export interface PartnerThingsToKnow {
  stressors?: string[] | null;
  comforts?: string[] | null;
  thingsThatMakeMeFeelAppreciated?: string[] | null;
  thingsThatMakeMeFeelIgnored?: string[] | null;
  importantRoutines?: string[] | null;
  importantDates?: string[] | null;
  sensitivities?: string[] | null;
  thingsToRemember?: string[] | null;
  hasSharedContent: boolean;
}

export interface PartnerBoundaryEntry {
  category: BoundaryCategory;
  comfortableWith: string[];
  askBefore: string[];
  pleaseDont: string[];
}

export interface PartnerBoundaries {
  categories: PartnerBoundaryEntry[];
  hasSharedContent: boolean;
}

export interface PartnerLittleThings {
  usualCoffeeOrder?: string | null;
  comfortFood?: string | null;
  comfortMovie?: string | null;
  whatMakesMeSmile?: string | null;
  guiltyPleasure?: string | null;
  alwaysLosing?: string | null;
  couldTalkAboutForever?: string | null;
  tinyThingThatMakesMyDay?: string | null;
  secretlyLove?: string | null;
  hasSharedContent: boolean;
}

/** The read-only partner view (GET /api/support-profile/partner). */
export interface PartnerSupportProfile {
  userId: string;
  partnerName: string;
  whoIAm: PartnerWhoIAm;
  whatILike: PartnerWhatILike;
  favorites: PartnerFavorites;
  howToHelpMe: PartnerHowToHelpMe;
  thingsToKnow: PartnerThingsToKnow;
  boundaries: PartnerBoundaries;
  littleThings: PartnerLittleThings;
  updatedAt: string | null;
}

// ── Update payloads (partial) ──────────────────────────────────────────────────

export interface TextFieldInput {
  value?: string;
  visibility?: FieldVisibility;
}

export interface ListFieldInput {
  values?: string[];
  visibility?: FieldVisibility;
}

export type UpdateWhoIAm = Partial<Record<keyof WhoIAmSection, TextFieldInput>>;
export type UpdateWhatILike = Partial<Record<keyof WhatILikeSection, ListFieldInput>>;

export interface UpdateFavorites {
  favoriteColor?: TextFieldInput;
  favoriteColorHex?: { value?: string };
  favoriteFood?: TextFieldInput;
  favoriteDrink?: TextFieldInput;
  favoriteSnack?: TextFieldInput;
  favoriteRestaurant?: TextFieldInput;
  favoritePlace?: TextFieldInput;
  favoriteFlower?: TextFieldInput;
  favoriteAnimal?: TextFieldInput;
  favoriteMovie?: TextFieldInput;
  favoriteSong?: TextFieldInput;
  favoriteArtist?: TextFieldInput;
  favoriteSeason?: TextFieldInput;
  favoriteHoliday?: TextFieldInput;
  favoriteSmell?: TextFieldInput;
  favoriteActivity?: TextFieldInput;
}

export interface UpdateHowToHelpMe {
  whenHavingDifficultDay?: TextFieldInput;
  whatToAvoid?: TextFieldInput;
  preferredReassurance?: TextFieldInput;
  howToApproachMe?: TextFieldInput;
  howIAskForSpace?: TextFieldInput;
  whatHelpsMeRecover?: TextFieldInput;
  neverAssume?: TextFieldInput;
  supportOptions?: SupportPreferenceOption[];
  customOptions?: string[];
  optionsVisibility?: FieldVisibility;
}

export type UpdateThingsToKnow = Partial<Record<keyof ThingsToKnowSection, ListFieldInput>>;

export interface BoundaryCategoryInput {
  category: BoundaryCategory;
  comfortableWith?: string[];
  askBefore?: string[];
  pleaseDont?: string[];
  visibility?: FieldVisibility;
}

export interface UpdateBoundaries {
  categories: BoundaryCategoryInput[];
}

export type UpdateLittleThings = Partial<Record<keyof LittleThingsSection, TextFieldInput>>;
