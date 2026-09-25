/**
 * Navigation params for the mood check-in flow (the "Check-in" tab). The tab
 * hosts the check-in itself plus the follow-on action screens the user can
 * reach from the confirmation, tailored to their mood quadrant.
 */
export type MoodStackParamList = {
  /** The two-step mood check-in and its "Anchored" confirmation. */
  CheckInHome: undefined;
  /**
   * Guided breathing (5s in · 4s hold · 4s out) for High Unpleasant.
   *
   * `applyTheme` names the color variant to switch to when the user finally
   * leaves this screen for Home. The switch is deferred to exit because
   * changing the theme remounts the navigator (see ThemeProvider), which would
   * otherwise discard an in-stack navigation and bounce the user to the
   * dashboard. Omitted when the theme shouldn't change.
   */
  MoodBreathe: { applyTheme?: 'gold' | 'botanical' } | undefined;
  /** Grounding exercises / distractions menu for Low Unpleasant. */
  MoodGrounding: { applyTheme?: 'gold' | 'botanical' } | undefined;
  /** Daily gift / surprise reveal for High Pleasant. */
  MoodGift: { applyTheme?: 'gold' | 'botanical' } | undefined;
  /** Read-only detail of a logged mood + the partner's mood. */
  MoodDetail: undefined;
  /** 5-4-3-2-1 Senses grounding exercise */
  Exercise54321: undefined;
  /** Gentle body scan exercise */
  ExerciseBodyScan: undefined;
  /** Make a warm drink exercise */
  ExerciseWarmDrink: undefined;
  /** Short slow walk exercise */
  ExerciseWalk: undefined;
};
