/**
 * Navigation params for the mood check-in flow (the "Check-in" tab). The tab
 * hosts the check-in itself plus the follow-on action screens the user can
 * reach from the confirmation, tailored to their mood quadrant.
 */
export type MoodStackParamList = {
  /** The two-step mood check-in and its "Anchored" confirmation. */
  CheckInHome: undefined;
  /** Guided breathing (5s in · 6s hold · 7s out) for High Unpleasant. */
  MoodBreathe: undefined;
  /** Grounding exercises / distractions menu for Low Unpleasant. */
  MoodGrounding: undefined;
  /** Daily gift / surprise reveal for High Pleasant. */
  MoodGift: undefined;
  /** Read-only detail of a logged mood + the partner's mood. */
  MoodDetail: undefined;
};
