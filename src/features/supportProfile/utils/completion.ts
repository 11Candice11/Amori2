/**
 * Client-side, deterministic Support Profile completion — mirrors the backend
 * rule (a section counts when it has at least one populated field; percentage =
 * round(completedSections / 7 * 100)). Used so a freshly-edited profile can show
 * an updated completion immediately, and so the calculation is unit-testable
 * without the network. The server remains authoritative (SupportProfile.completion).
 */
import type { SupportProfile, TextField, ListField } from '../types/supportProfile.types';

const TOTAL_SECTIONS = 7;

function textHasValue(f: TextField | undefined): boolean {
  return !!f && typeof f.value === 'string' && f.value.trim().length > 0;
}

function listHasValue(f: ListField | undefined): boolean {
  return !!f && f.values.some((v) => typeof v === 'string' && v.trim().length > 0);
}

export interface CompletionResult {
  percentage: number;
  completedSections: number;
  totalSections: number;
  completedSectionKeys: string[];
}

export function calculateCompletion(profile: SupportProfile): CompletionResult {
  const completed: string[] = [];

  const who = profile.whoIAm;
  if (
    textHasValue(who?.nickname) || textHasValue(who?.selfDescription) ||
    textHasValue(who?.importantToMe) || textHasValue(who?.whatMakesMeFeelLikeMyself) ||
    textHasValue(who?.whatImProudOf) || textHasValue(who?.whatImWorkingToward) ||
    textHasValue(who?.whatIWishPeopleUnderstood)
  ) {
    completed.push('whoIAm');
  }

  const like = profile.whatILike;
  if (like && Object.values(like).some((f) => listHasValue(f as ListField))) {
    completed.push('whatILike');
  }

  const fav = profile.favorites;
  if (
    fav &&
    Object.entries(fav).some(
      ([key, val]) => key !== 'favoriteColorHex' && textHasValue(val as TextField),
    )
  ) {
    completed.push('favorites');
  }

  const help = profile.howToHelpMe;
  if (
    help &&
    (textHasValue(help.whenHavingDifficultDay) || textHasValue(help.whatToAvoid) ||
      textHasValue(help.preferredReassurance) || textHasValue(help.howToApproachMe) ||
      textHasValue(help.howIAskForSpace) || textHasValue(help.whatHelpsMeRecover) ||
      textHasValue(help.neverAssume) || help.supportOptions.length > 0 ||
      help.customOptions.some((v) => v.trim().length > 0))
  ) {
    completed.push('howToHelpMe');
  }

  const know = profile.thingsToKnow;
  if (know && Object.values(know).some((f) => listHasValue(f as ListField))) {
    completed.push('thingsToKnow');
  }

  const bounds = profile.boundaries;
  if (
    bounds?.categories?.some(
      (c) =>
        c.comfortableWith.some((v) => v.trim()) ||
        c.askBefore.some((v) => v.trim()) ||
        c.pleaseDont.some((v) => v.trim()),
    )
  ) {
    completed.push('boundaries');
  }

  const little = profile.littleThings;
  if (little && Object.values(little).some((f) => textHasValue(f as TextField))) {
    completed.push('littleThings');
  }

  const percentage = Math.round((completed.length * 100) / TOTAL_SECTIONS);

  return {
    percentage,
    completedSections: completed.length,
    totalSections: TOTAL_SECTIONS,
    completedSectionKeys: completed,
  };
}
