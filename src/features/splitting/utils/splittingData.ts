/**
 * Static content for the "I'm Splitting" grounding flow — trigger options,
 * support needs, grounding activities, and pre-written reassurance copy.
 * Kept in one place so screens stay presentational.
 */
import type { NeedOption, TriggerOption } from '../types/splitting.types';

export const PARTNER_NAME = 'Your love';

// ─── Grounding checkpoint triggers ──────────────────────────────────────────

export const TRIGGER_OPTIONS: TriggerOption[] = [
  // Physical baseline
  { id: 'no-sleep', label: 'No sleep', group: 'physical' },
  { id: 'not-hydrated', label: 'Not hydrated', group: 'physical' },
  { id: 'hungry', label: 'Hungry', group: 'physical' },
  { id: 'sensory', label: 'Sensory overload', group: 'physical' },
  // Emotional state
  { id: 'overwhelmed', label: 'Overwhelmed', group: 'emotional' },
  { id: 'need-reassurance', label: 'Need reassurance', group: 'emotional' },
  { id: 'rejected', label: 'Feeling rejected', group: 'emotional' },
  { id: 'angry', label: 'Angry', group: 'emotional' },
  { id: 'misunderstood', label: 'Feeling misunderstood', group: 'emotional' },
  { id: 'ignored', label: 'Feeling ignored', group: 'emotional' },
  { id: 'disconnected', label: 'Feeling disconnected', group: 'emotional' },
  // Relational & context
  { id: 'conflict', label: 'Conflict', group: 'relational' },
  { id: 'too-much', label: 'Too much happening', group: 'relational' },
  { id: 'something-happened', label: 'Something happened', group: 'relational' },
];

/**
 * Resolve selected trigger ids to their human-readable labels (for the API).
 * Pass the person's saved custom triggers as `extraOptions` so their own
 * wording resolves alongside the built-in list instead of being dropped.
 */
export function triggerLabels(ids: string[], extraOptions: TriggerOption[] = []): string[] {
  const all = [...TRIGGER_OPTIONS, ...extraOptions];
  return ids
    .map(id => all.find(o => o.id === id)?.label)
    .filter((label): label is string => Boolean(label));
}

export const TRIGGER_GROUP_TITLES: Record<TriggerOption['group'], string> = {
  physical: 'Physical baseline',
  emotional: 'Emotional state',
  relational: 'Relational & context',
};

export const TRIGGER_GROUP_HINTS: Record<TriggerOption['group'], string> = {
  physical: 'Body signals',
  emotional: 'Internal tides',
  relational: 'The moment',
};

// ─── Inward check needs ─────────────────────────────────────────────────────

export const NEED_OPTIONS: NeedOption[] = [
  {
    id: 'space',
    title: 'Space',
    tag: 'Self-Regulation',
    description: 'Give me some quiet time. Step away to decompress without pressure.',
  },
  {
    id: 'reassurance',
    title: 'Reassurance',
    tag: 'Emotional Safety',
    description: `Remind me that we're okay. Loving reminders and our shared warmth.`,
  },
  {
    id: 'distraction',
    title: 'Distraction',
    tag: 'Mental Shift',
    description: 'Help me get my mind somewhere else. Calming games and playful activities.',
  },
  {
    id: 'support',
    title: 'Support',
    tag: 'Guided Grounding',
    description: 'Walk me through it. Guided breathing and grounding exercises to steady me.',
  },
];

// ─── De-escalation grounding rituals ────────────────────────────────────────

export interface GroundingRitual {
  id: string;
  title: string;
  subtitle: string;
}

export const GROUNDING_RITUALS: GroundingRitual[] = [
  { id: 'breath', title: 'Take 5 slow breaths', subtitle: 'Visual pacing · 60 sec' },
  { id: 'cold-water', title: 'Cold water', subtitle: 'Sip slowly & reset' },
  { id: 'headphones', title: 'Headphones', subtitle: 'Isolate all noise' },
  { id: 'dark-quiet', title: 'Dark & quiet', subtitle: 'Dim screen & eyes' },
  { id: 'forest-rain', title: 'Forest rain', subtitle: 'Muted canopy audio' },
];

// ─── Distraction centre escapes ─────────────────────────────────────────────

export interface DistractionEscape {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
}

export const DISTRACTION_ESCAPES: DistractionEscape[] = [
  {
    id: 'would-you-rather',
    title: 'Would You Rather — Cozy Ed.',
    subtitle: 'Low-stakes, hilarious dilemmas to gently reset focus without overthinking.',
    tags: ['Cozy debate', 'Zero pressure'],
  },
  {
    id: '2048-forest',
    title: '2048: Forest Canopy',
    subtitle: 'Soothing tactile tile matching with soft rainfall and gentle cedar wind sounds.',
    tags: ['Soundscape included', 'Solo focus'],
  },
  {
    id: 'constellation',
    title: 'Constellation Matcher',
    subtitle: 'Gentle stargazing lines puzzle with no timer, no scores, and no game-overs.',
    tags: ['Visual meditation'],
  },
];

// ─── Gentle grounding activities ────────────────────────────────────────────

export interface GroundingActivity {
  id: string;
  title: string;
  meta: string;
  description: string;
  category: 'solo' | 'sensory' | 'quick';
  recommended?: boolean;
}

export const GROUNDING_ACTIVITIES: GroundingActivity[] = [
  {
    id: 'five-min-reset',
    title: '5-Minute Reset',
    meta: '5 MIN · BOX BREATHING',
    description: 'Slow rhythmic breathing exercise with visual pacing. Softens the fight-or-flight spike.',
    category: 'quick',
    recommended: true,
  },
  {
    id: 'hydration',
    title: 'Hydration Break',
    meta: '2 MIN',
    description: 'Grab a cool glass of water. Sip slowly and notice the cool sensation traveling down.',
    category: 'sensory',
  },
  {
    id: '5-4-3-2-1',
    title: '5-4-3-2-1 Sensory Grounding',
    meta: '4 MIN · COGNITIVE SHIFT',
    description: 'Name 5 things you can see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
    category: 'sensory',
  },
  {
    id: 'cold-splash',
    title: 'Cold Splash or Shower',
    meta: '10 MIN · VAGUS RESET',
    description: 'Reset the mammalian dive reflex. Cool water over your wrists, back of neck, or face.',
    category: 'solo',
  },
  {
    id: 'forest-rain',
    title: 'Listen to Forest Rain',
    meta: '15 MIN · SOUND BATH',
    description: 'Deep immersive redwood canopy soundscape to drown out racing thoughts.',
    category: 'sensory',
  },
  {
    id: 'write-it-out',
    title: 'Write It Out (No Filter)',
    meta: 'UNTIMED · SAFE VAULT',
    description: 'Private unedited scribble pad. Let the rage, fear, or frustration spill freely.',
    category: 'solo',
  },
];

// ─── Reassurance copy ───────────────────────────────────────────────────────

export const REASSURANCE_NOTES = [
  'You are loved.',
  'You are safe.',
  'This moment will pass.',
  `You don't have to solve everything right now.`,
];

export const PREWRITTEN_SPACE_MESSAGE =
  `I'm taking a little space right now. I'll reach out when I'm ready. We're okay.`;
