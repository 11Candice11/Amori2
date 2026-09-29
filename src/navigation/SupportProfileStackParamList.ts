import type { SectionKey } from '../features/supportProfile/types/supportProfile.types';

/**
 * Navigation params for the Support Preferences / "How to Know Me" flow.
 *
 * `SupportProfileHome`  — the owner's handbook: section list + completion.
 * `SupportSectionEditor`— edit one section of the owner's profile.
 * `PartnerSupportProfile`— read-only partner view. `focusSection` lets a
 *   contextual entry point (Splitting / Date planning / Let's Chat) open
 *   straight to the relevant section rather than the whole profile.
 */
export type SupportProfileStackParamList = {
  SupportProfileHome: undefined;
  SupportSectionEditor: { section: SectionKey };
  PartnerSupportProfile: { focusSection?: SectionKey } | undefined;
};
