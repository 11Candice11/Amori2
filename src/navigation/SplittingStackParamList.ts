import type { SplittingFlowState } from '../features/splitting/types/splitting.types';

/**
 * Navigation params for the "I'm Splitting" grounding flow. The evolving
 * flow state is threaded through the screens via `flow` so each step can
 * carry forward earlier selections.
 */
export type SplittingStackParamList = {
  SplittingIntro: undefined;
  GroundingCheckpoint: { flow?: SplittingFlowState } | undefined;
  DeEscalationPacing: { flow?: SplittingFlowState } | undefined;
  InwardCheck: { flow?: SplittingFlowState } | undefined;
  CompassionBridge: { flow?: SplittingFlowState } | undefined;
  DistractionCentre: { flow?: SplittingFlowState } | undefined;
  GroundingActivities: { flow?: SplittingFlowState } | undefined;
  BreatheWithMe: { flow?: SplittingFlowState } | undefined;
  SafeTransition: { flow?: SplittingFlowState } | undefined;
  PartnerDispatch: { flow?: SplittingFlowState } | undefined;
  SanctuaryJournal: { flow?: SplittingFlowState } | undefined;
};
