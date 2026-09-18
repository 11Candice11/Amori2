/**
 * Types for the "I'm Splitting" de-escalation / grounding flow.
 *
 * This flow is a guided, self-paced sanctuary experience. The UI-facing types
 * (triggers, needs, climate) describe the in-app selections a person makes as
 * they move through grounding; the backend-facing types below mirror the C#
 * DTOs at /api/splitting/sessions exactly and carry the persisted session.
 */

// ─── Backend enums (match C# enum NAMES; API serializes enums as strings) ───

export type MoodType =
  | 'Happy'
  | 'Calm'
  | 'Anxious'
  | 'Sad'
  | 'Angry'
  | 'Overwhelmed'
  | 'Numb'
  | 'Other';

export type SplittingAction =
  | 'Reassurance'
  | 'Cbt'
  | 'Grounding'
  | 'VoiceNote'
  | 'Distraction'
  | 'ContactPartner'
  | 'Space';

export type SplittingSessionStatus = 'InProgress' | 'Completed' | 'Cancelled';

// ─── Backend DTOs (mirror SplittingSessionResponse / request bodies) ────────

export interface SplittingSession {
  id: string;
  userId: string;
  relationshipId: string;
  feelingsSelected: string[];
  trigger: string | null;
  description: string | null;
  whatINeed: string | null;
  recommendedSupportType: SplittingAction | null;
  actionsTaken: SplittingAction[];
  initialMood: MoodType | null;
  finalMood: MoodType | null;
  status: SplittingSessionStatus;
  /** ISO timestamp when the self-regulation window ends, or null. */
  spaceEndsAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

/**
 * Privacy-safe view of the partner's active grounding session, from
 * GET /api/splitting/sessions/partner-active. Lets both people see a shared
 * self-regulation window without exposing the partner's private details.
 */
export interface PartnerSplittingWindow {
  sessionId: string;
  recommendedSupportType: SplittingAction | null;
  /** ISO timestamp when the window ends, or null if open-ended. */
  spaceEndsAt: string | null;
  /** ISO timestamp when the session started. */
  startedAt: string;
}

export interface CreateSplittingSessionPayload {
  feelingsSelected: string[];
  trigger?: string | null;
  description?: string | null;
  whatINeed?: string | null;
  initialMood?: MoodType | null;
}

export interface UpdateSplittingSessionPayload {
  feelingsSelected?: string[];
  trigger?: string | null;
  description?: string | null;
  whatINeed?: string | null;
  actionsTaken?: SplittingAction[];
  finalMood?: MoodType | null;
  /** ISO timestamp when the self-regulation window ends. */
  spaceEndsAt?: string | null;
}

export interface CompleteSplittingSessionPayload {
  finalMood?: MoodType | null;
  actionsTaken?: SplittingAction[];
}

// ─── Grounding checkpoint (what's making things harder) ─────────────────────

export type TriggerGroup = 'physical' | 'emotional' | 'relational';

export interface TriggerOption {
  id: string;
  label: string;
  group: TriggerGroup;
}

// ─── Inward check (what do you need right now) ──────────────────────────────

export type SupportNeed = 'space' | 'reassurance' | 'distraction' | 'support';

export interface NeedOption {
  id: SupportNeed;
  title: string;
  tag: string;
  description: string;
}

// ─── Safe transition (how are you feeling now) ──────────────────────────────

export type ClimateState = 'steadier' | 'same' | 'worse';

export type NextStep =
  | 'okay'
  | 'more-space'
  | 'reassurance'
  | 'distraction'
  | 'support';

// ─── Space timer durations ──────────────────────────────────────────────────

export type SpaceDuration = '15m' | '30m' | '1h' | 'later';

// ─── Aggregate flow state carried between screens ───────────────────────────

export interface SplittingFlowState {
  /** Id of the persisted backend session, once created. */
  sessionId?: string;
  /** Trigger option ids selected on the grounding checkpoint. */
  triggers: string[];
  /** Whether the person chose "I don't know" / skip on the checkpoint. */
  dontKnow: boolean;
  /** The support need chosen on the inward check. */
  need?: SupportNeed;
  /** How they described their internal climate on the transition check. */
  climate?: ClimateState;
  /** The path they chose to continue with after the transition check. */
  nextStep?: NextStep;
  /** Whether Cat was notified that space was requested. */
  notifiedPartner: boolean;
  /** Requested space duration, if any. */
  spaceDuration?: SpaceDuration;
  /**
   * Epoch ms when the requested self-regulation window ends. Set when a fixed
   * space duration is chosen so the countdown can be shown live across screens.
   * Undefined for the open-ended ("I'll decide later") choice.
   */
  spaceEndsAt?: number;
}

/** Minutes for each fixed space duration ("later" is open-ended → null). */
export const SPACE_DURATION_MINUTES: Record<SpaceDuration, number | null> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  later: null,
};

export const EMPTY_FLOW_STATE: SplittingFlowState = {
  triggers: [],
  dontKnow: false,
  notifiedPartner: false,
};

// ─── UI → backend mapping helpers ───────────────────────────────────────────

/**
 * Map a support need chosen on the inward check to a backend action. These
 * mirror the outcome each need routes to: "support" now leads to guided
 * grounding exercises, so it records a Grounding action.
 */
export const NEED_TO_ACTION: Record<SupportNeed, SplittingAction> = {
  space: 'Space',
  reassurance: 'Reassurance',
  distraction: 'Distraction',
  support: 'Grounding',
};

/**
 * Infer an initial mood from the selected trigger ids. The trigger ids come
 * from TRIGGER_OPTIONS; the strongest emotional signal wins, otherwise we fall
 * back to Overwhelmed (the most common splitting state) or Other.
 */
export function inferInitialMood(triggerIds: string[]): MoodType {
  if (triggerIds.includes('angry')) return 'Angry';
  if (triggerIds.includes('overwhelmed') || triggerIds.includes('too-much')) return 'Overwhelmed';
  if (triggerIds.includes('rejected') || triggerIds.includes('ignored')) return 'Sad';
  if (triggerIds.includes('need-reassurance') || triggerIds.includes('disconnected')) return 'Anxious';
  if (triggerIds.includes('misunderstood') || triggerIds.includes('conflict')) return 'Anxious';
  if (triggerIds.length === 0) return 'Other';
  return 'Overwhelmed';
}

/** Map the transition-check climate to a backend final mood. */
export const CLIMATE_TO_MOOD: Record<ClimateState, MoodType> = {
  steadier: 'Calm',
  same: 'Overwhelmed',
  worse: 'Sad',
};
