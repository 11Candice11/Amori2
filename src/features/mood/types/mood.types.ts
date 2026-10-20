/**
 * Mood check-in types.
 *
 * Backend enums (integer values — must match the C# API exactly):
 *   CheckInType: Morning=1, Midday=2, Evening=3, AdHoc=4
 *   MoodType:    Happy=1, Calm=2, Anxious=3, Sad=4, Angry=5,
 *                Overwhelmed=6, Numb=7, Other=8
 */

// ─── Backend enums (numeric) ────────────────────────────────────────────────

/** CheckInType numeric values sent to the API. */
export const BackendCheckIn = {
  Morning: 1,
  Midday: 2,
  Evening: 3,
  AdHoc: 4,
} as const;
export type BackendCheckInType = (typeof BackendCheckIn)[keyof typeof BackendCheckIn];

/** MoodType numeric values sent to the API. */
export const BackendMood = {
  Happy: 1,
  Calm: 2,
  Anxious: 3,
  Sad: 4,
  Angry: 5,
  Overwhelmed: 6,
  Numb: 7,
  Other: 8,
} as const;
export type BackendMoodType = (typeof BackendMood)[keyof typeof BackendMood];

// ─── Quadrant model (valence × arousal) ─────────────────────────────────────

export type MoodQuadrant =
  | 'HIGH_PLEASANT'
  | 'LOW_PLEASANT'
  | 'HIGH_UNPLEASANT'
  | 'LOW_UNPLEASANT';

export interface QuadrantMeta {
  key: MoodQuadrant;
  label: string;
  tagline: string;
}

export const QUADRANTS: QuadrantMeta[] = [
  { key: 'HIGH_PLEASANT',   label: 'High Energy',  tagline: 'Pleasant & Energized' },
  { key: 'LOW_PLEASANT',    label: 'Low Energy',   tagline: 'Pleasant & Calm' },
  { key: 'HIGH_UNPLEASANT', label: 'High Energy',  tagline: 'Unpleasant & Stirred' },
  { key: 'LOW_UNPLEASANT',  label: 'Low Energy',   tagline: 'Unpleasant & Drained' },
];

// ─── Mood options ────────────────────────────────────────────────────────────

export interface MoodOption {
  id: string;
  label: string;
  description: string;
  quadrant: MoodQuadrant;
  /** Numeric MoodType value sent to the backend. */
  backendMood: BackendMoodType;
}

export const MOOD_OPTIONS: MoodOption[] = [
  // ── Red · High energy · unpleasant ──────────────────────────────────────
  // Maps to Anxious / Angry / Overwhelmed depending on the flavour.
  { id: 'enraged',       label: 'Enraged',       description: 'Boiling over with fury.',                  quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'terrified',     label: 'Terrified',     description: 'Gripped by fear.',                         quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'panicked',      label: 'Panicked',      description: 'Alarmed and unable to settle.',            quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'livid',         label: 'Livid',         description: 'White-hot, seething anger.',               quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'furious',       label: 'Furious',       description: 'Intensely, forcefully angry.',             quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'irate',         label: 'Irate',         description: 'Sharply, actively angry.',                 quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'frightened',    label: 'Frightened',    description: 'Afraid or fearful.',                       quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'frustrated',    label: 'Frustrated',    description: 'Blocked and exasperated.',                 quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'anxious',       label: 'Anxious',       description: 'Restless, on edge, worried.',              quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'stressed',      label: 'Stressed',      description: 'Under pressure and strained.',             quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'jealous',       label: 'Jealous',       description: 'Resentful of what another has.',           quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'irritated',     label: 'Irritated',     description: 'Slightly angry or annoyed.',               quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'annoyed',       label: 'Annoyed',       description: 'Bothered and impatient.',                  quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'angry',         label: 'Angry',         description: 'Frustrated or fired up.',                  quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'overwhelmed',   label: 'Overwhelmed',   description: 'Too much, all at once.',                   quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'shocked',       label: 'Shocked',       description: 'Jolted and taken aback.',                  quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'apprehensive',  label: 'Apprehensive',  description: 'Uneasy about what may come.',              quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'tense',         label: 'Tense',         description: 'Wound up and rigid.',                      quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'restless',      label: 'Restless',      description: "Can't sit still, keyed up.",               quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'nervous',       label: 'Nervous',       description: 'Jittery and worried.',                     quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'defensive',     label: 'Defensive',     description: 'Guarded and protective.',                   quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'hostile',       label: 'Hostile',       description: 'Aggressive and combative.',                 quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'scornful',      label: 'Scornful',      description: 'Contemptuous and dismissive.',              quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'bitter',        label: 'Bitter',        description: 'Resentful and embittered.',                 quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'cynical',       label: 'Cynical',       description: 'Distrustful and skeptical.',                quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'paranoid',      label: 'Paranoid',      description: 'Suspicious and mistrustful.',               quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },
  { id: 'frantic',       label: 'Frantic',       description: 'Wildly hurried and desperate.',             quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'desperate',     label: 'Desperate',     description: 'In urgent need or want.',                   quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Overwhelmed },
  { id: 'triggered',     label: 'Triggered',     description: 'Emotionally activated.',                    quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Angry },
  { id: 'agitated',      label: 'Agitated',      description: 'Stirred up and unsettled.',                 quadrant: 'HIGH_UNPLEASANT', backendMood: BackendMood.Anxious },

  // ── Yellow · High energy · pleasant ─────────────────────────────────────
  // Maps to Happy (all pleasant + energised).
  { id: 'happy',         label: 'Happy',         description: 'Light, warm, glad to be here.',            quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'excited',       label: 'Excited',       description: 'Buzzing with anticipation.',               quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'energized',     label: 'Energized',     description: 'Wide awake and ready to go.',              quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'enthusiastic',  label: 'Enthusiastic',  description: 'Highly interested and eager.',             quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'productive',    label: 'Productive',    description: 'Accomplishing and achieving.',             quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'joyful',        label: 'Joyful',        description: 'Full of joy and delight.',                 quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'thrilled',      label: 'Thrilled',      description: 'Elated and exhilarated.',                  quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'inspired',      label: 'Inspired',      description: 'Sparked with new ideas.',                  quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'motivated',     label: 'Motivated',     description: 'Driven and ready to act.',                 quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'optimistic',    label: 'Optimistic',    description: 'Hopeful about what lies ahead.',           quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'proud',         label: 'Proud',         description: 'Pleased with an accomplishment.',          quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'cheerful',      label: 'Cheerful',      description: 'Bright and good-humoured.',                quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'confident',     label: 'Confident',     description: 'Sure of yourself.',                        quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'hopeful',       label: 'Hopeful',       description: 'Looking forward with hope.',               quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'eager',         label: 'Eager',         description: 'Keen and impatient to begin.',             quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'curious',       label: 'Curious',       description: 'Interested and inquisitive.',              quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'amazed',        label: 'Amazed',        description: 'Wonder-struck and awed.',                  quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'upbeat',        label: 'Upbeat',        description: 'Positive and lively.',                     quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'focused',       label: 'Focused',       description: 'Sharp and locked in.',                     quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'surprised',     label: 'Surprised',     description: 'Caught off guard, in a good way.',         quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'playful',       label: 'Playful',       description: 'Lighthearted and fun-loving.',             quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'gleeful',       label: 'Gleeful',       description: 'Full of glee and delight.',                quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'exhilarated',   label: 'Exhilarated',   description: 'Thrilled and invigorated.',                quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'energetic',     label: 'Energetic',     description: 'Full of vitality and vigor.',              quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'pumped',        label: 'Pumped',        description: 'Fired up and ready to go.',                quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'elated',        label: 'Elated',        description: 'Extremely happy and joyful.',              quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'blissful',      label: 'Blissful',      description: 'In a state of perfect happiness.',         quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'accomplished',  label: 'Accomplished',  description: 'Successful and fulfilled.',                quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'empowered',     label: 'Empowered',     description: 'Strong and in control.',                    quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },
  { id: 'alive',         label: 'Alive',         description: 'Fully present and engaged.',               quadrant: 'HIGH_PLEASANT',   backendMood: BackendMood.Happy },

  // ── Green · Low energy · pleasant ───────────────────────────────────────
  // Maps to Calm (all pleasant + settled).
  { id: 'calm',          label: 'Calm',          description: 'Settled, steady, at ease.',                quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'content',       label: 'Content',       description: 'Quietly satisfied and grounded.',          quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'peaceful',      label: 'Peaceful',      description: 'Serene, undisturbed.',                     quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'relaxed',       label: 'Relaxed',       description: 'Loose, unhurried, easy.',                  quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'comfortable',   label: 'Comfortable',   description: 'Reassured in mind and body.',              quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'loved',         label: 'Loved',         description: 'Cared for and cherished.',                 quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'grateful',      label: 'Grateful',      description: 'Thankful and appreciative.',               quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'accepted',      label: 'Accepted',      description: 'Acknowledged and seen.',                   quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'secure',        label: 'Secure',        description: 'Safe and steady.',                         quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'valued',        label: 'Valued',        description: 'Respected and appreciated.',               quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'blessed',       label: 'Blessed',       description: 'Fortunate and thankful.',                  quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'serene',        label: 'Serene',        description: 'Deeply tranquil.',                         quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'thankful',      label: 'Thankful',      description: 'Full of gratitude.',                       quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'satisfied',     label: 'Satisfied',     description: 'Fulfilled and content.',                   quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'relieved',      label: 'Relieved',      description: 'Released from worry.',                     quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'balanced',      label: 'Balanced',      description: 'Centred and even.',                        quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'mellow',        label: 'Mellow',        description: 'Soft, gentle, unbothered.',                quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'carefree',      label: 'Carefree',      description: 'Light, without a worry.',                  quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'thoughtful',    label: 'Thoughtful',    description: 'Reflective and considerate.',              quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'good',          label: 'Good',          description: 'Simply doing well.',                       quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'cozy',          label: 'Cozy',          description: 'Warm and comfortable.',                     quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'nurtured',      label: 'Nurtured',      description: 'Cared for and supported.',                 quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'reassured',     label: 'Reassured',     description: 'Comforted and put at ease.',               quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'safe',          label: 'Safe',          description: 'Protected and secure.',                    quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'grounded',      label: 'Grounded',      description: 'Rooted and stable.',                       quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'whole',         label: 'Whole',         description: 'Complete and integrated.',                 quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'trusting',      label: 'Trusting',      description: 'Confident in what will come.',             quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'connected',     label: 'Connected',     description: 'Bonded and together.',                     quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'at-peace',      label: 'At Peace',      description: 'Inner harmony and stillness.',             quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },
  { id: 'supported',     label: 'Supported',     description: 'Held and upheld.',                         quadrant: 'LOW_PLEASANT',    backendMood: BackendMood.Calm },

  // ── Blue · Low energy · unpleasant ──────────────────────────────────────
  // Maps to Sad / Numb depending on the flavour.
  { id: 'sad',           label: 'Sad',           description: 'Heavy, low, tender.',                      quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'lonely',        label: 'Lonely',        description: 'Isolated and craving connection.',         quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'discouraged',   label: 'Discouraged',   description: 'Losing confidence and drive.',             quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'numb',          label: 'Numb',          description: 'Flat, distant, hard to feel.',             quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'tired',         label: 'Tired',         description: 'Low on energy.',                           quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'fatigued',      label: 'Fatigued',      description: 'Worn out and weary.',                      quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'exhausted',     label: 'Exhausted',     description: 'Completely drained.',                      quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'burned-out',    label: 'Burned Out',    description: 'Spent, with nothing left.',                quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'hopeless',      label: 'Hopeless',      description: 'Without hope or a way forward.',           quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'depressed',     label: 'Depressed',     description: 'Deeply low and weighed down.',             quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'miserable',     label: 'Miserable',     description: 'Wretched and unhappy.',                    quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'disappointed',  label: 'Disappointed',  description: 'Let down by how things went.',             quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'vulnerable',    label: 'Vulnerable',    description: 'Exposed and unguarded.',                   quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'guilty',        label: 'Guilty',        description: 'Weighed down by remorse.',                 quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'ashamed',       label: 'Ashamed',       description: 'Embarrassed and self-critical.',           quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'insecure',      label: 'Insecure',      description: 'Uncertain and unsteady.',                  quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'disconnected',  label: 'Disconnected',  description: 'Detached from others.',                    quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'apathetic',     label: 'Apathetic',     description: 'Indifferent, hard to care.',               quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'bored',         label: 'Bored',         description: 'Unengaged and listless.',                  quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'meh',           label: 'Meh',           description: 'Neither here nor there.',                  quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'hollow',        label: 'Hollow',        description: 'Empty and void inside.',                   quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'broken',        label: 'Broken',        description: 'Shattered and undone.',                    quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'heartbroken',   label: 'Heartbroken',   description: 'Deeply hurt and pained.',                 quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'aching',        label: 'Aching',        description: 'Sorrowful and tender.',                    quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'weary',         label: 'Weary',         description: 'Tired in body and spirit.',                quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'drained',       label: 'Drained',       description: 'Depleted and empty.',                      quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Numb },
  { id: 'heavy',         label: 'Heavy',         description: 'Weighed down with burden.',                quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'melancholy',    label: 'Melancholy',    description: 'Pensive and wistful sadness.',             quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'resigned',      label: 'Resigned',      description: 'Accepting of difficult fate.',            quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
  { id: 'morose',        label: 'Morose',        description: 'Gloomy and ill-tempered.',                quadrant: 'LOW_UNPLEASANT',  backendMood: BackendMood.Sad },
];

// ─── Quadrant descriptions & follow-on actions ──────────────────────────────

export interface QuadrantDescription {
  /** Short human-readable name for the quadrant (e.g. "High Energy · Pleasant"). */
  title: string;
  /** A gentle paragraph describing what this mood set tends to feel like. */
  description: string;
  /** Label for the follow-on action button on the check-in confirmation. */
  actionLabel: string;
}

export const QUADRANT_DESCRIPTIONS: Record<MoodQuadrant, QuadrantDescription> = {
  HIGH_PLEASANT: {
    title: 'High Energy · Pleasant',
    description:
      'A bright, energised, upbeat state — excited, joyful, and glad to be here. A wave worth savouring.',
    actionLabel: 'Open gift',
  },
  LOW_PLEASANT: {
    title: 'Low Energy · Pleasant',
    description:
      'Calm, settled, and at ease — quietly content and grounded. A soft, restful place to be.',
    actionLabel: 'Send hug',
  },
  HIGH_UNPLEASANT: {
    title: 'High Energy · Unpleasant',
    description:
      'Stirred up and on edge — anxious, angry, or overwhelmed. A lot of energy with nowhere settled to put it.',
    actionLabel: 'Breathe',
  },
  LOW_UNPLEASANT: {
    title: 'Low Energy · Unpleasant',
    description:
      'Heavy, drained, or distant — sad, flat, or numb. A tender place that asks for gentleness.',
    actionLabel: 'Grounding exercise',
  },
};

/**
 * Recover the mood quadrant from a persisted check-in. Prefers matching the
 * chosen `feelings` label (most precise, e.g. "Overwhelmed"), then falls back
 * to the backend mood enum name (e.g. "Anxious"). Returns null when unknown
 * (e.g. an "I don't know" check-in stored as Other).
 */
export function quadrantFromCheckIn(
  feelings: string | null | undefined,
  moodEnumName: string | null | undefined,
): MoodQuadrant | null {
  if (feelings) {
    const byLabel = MOOD_OPTIONS.find(
      o => o.label.toLowerCase() === feelings.trim().toLowerCase(),
    );
    if (byLabel) return byLabel.quadrant;
  }
  if (moodEnumName) {
    const enumEntry = Object.entries(BackendMood).find(
      ([name]) => name.toLowerCase() === moodEnumName.trim().toLowerCase(),
    );
    if (enumEntry) {
      const value = enumEntry[1];
      const byMood = MOOD_OPTIONS.find(o => o.backendMood === value);
      if (byMood) return byMood.quadrant;
    }
  }
  return null;
}
