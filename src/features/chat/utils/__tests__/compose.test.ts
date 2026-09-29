/**
 * Tests for the guided-flow composition and validation helpers. These are pure
 * functions (no RN/native deps), covering: template loading shape, per-template
 * composition, required-field validation, and back-navigation answer
 * preservation.
 */
import {
  canContinue,
  composeMessage,
  isReadyToSend,
  isStepEmpty,
  missingRequiredSteps,
  trimmedAnswer,
} from '../compose';
import type { ChatTemplateDefinition } from '../../types/chat.types';

// A local mirror of the backend template catalog shape used to exercise the
// helpers deterministically (the real catalog is fetched from the API).
const FEELING: ChatTemplateDefinition = {
  type: 'Feeling',
  title: "Something I'm feeling",
  description: 'x',
  steps: [
    { input: 'feeling', label: 'How are you feeling?', prefix: 'I feel', required: true, multiline: false },
    { input: 'situation', label: 'What brought this up?', prefix: 'because of', required: true, multiline: true },
    { input: 'need', label: 'What did you need?', prefix: 'and I needed', required: true, multiline: false },
  ],
};

const ON_MY_MIND: ChatTemplateDefinition = {
  type: 'SomethingOnMyMind',
  title: 'Just something on my mind',
  description: 'x',
  steps: [
    { input: 'thought', label: 'Something on my mind is…', prefix: 'Something on my mind is', required: true, multiline: true },
  ],
};

const FUTURE_WITH_OPTIONAL: ChatTemplateDefinition = {
  type: 'Future',
  title: 'Something about our future',
  description: 'x',
  steps: [
    { input: 'goal', label: 'What?', prefix: 'I would love for us to', required: true, multiline: true },
    { input: 'reason', label: 'Why?', prefix: 'because', required: false, multiline: true },
  ],
};

describe('trimmedAnswer', () => {
  it('trims whitespace and treats missing keys as empty', () => {
    expect(trimmedAnswer({ feeling: '  tender  ' }, 'feeling')).toBe('tender');
    expect(trimmedAnswer({}, 'feeling')).toBe('');
    expect(trimmedAnswer({ feeling: '   ' }, 'feeling')).toBe('');
  });
});

describe('composeMessage', () => {
  it('composes the FEELING template with each prefix', () => {
    const answers = { feeling: 'tender', situation: 'a long week', need: 'rest' };
    expect(composeMessage(FEELING, answers)).toBe(
      'I feel tender because of a long week and I needed rest.',
    );
  });

  it('composes the free-form SomethingOnMyMind template', () => {
    expect(composeMessage(ON_MY_MIND, { thought: 'our next trip' })).toBe(
      'Something on my mind is our next trip.',
    );
  });

  it('skips steps with no answer so a partial draft still composes', () => {
    expect(composeMessage(FEELING, { feeling: 'tender' })).toBe('I feel tender.');
  });

  it('does not double terminal punctuation', () => {
    expect(composeMessage(ON_MY_MIND, { thought: 'I wonder?' })).toBe(
      'Something on my mind is I wonder?',
    );
  });

  it('trims whitespace inside answers', () => {
    expect(composeMessage(ON_MY_MIND, { thought: '  breathe  ' })).toBe(
      'Something on my mind is breathe.',
    );
  });
});

describe('required-field validation', () => {
  it('isStepEmpty reflects trimmed emptiness', () => {
    expect(isStepEmpty(FEELING.steps[0], {})).toBe(true);
    expect(isStepEmpty(FEELING.steps[0], { feeling: '  ' })).toBe(true);
    expect(isStepEmpty(FEELING.steps[0], { feeling: 'ok' })).toBe(false);
  });

  it('canContinue blocks empty required, allows empty optional', () => {
    // Required + empty → blocked.
    expect(canContinue(FUTURE_WITH_OPTIONAL.steps[0], {})).toBe(false);
    // Required + filled → allowed.
    expect(canContinue(FUTURE_WITH_OPTIONAL.steps[0], { goal: 'travel' })).toBe(true);
    // Optional + empty → allowed.
    expect(canContinue(FUTURE_WITH_OPTIONAL.steps[1], {})).toBe(true);
  });

  it('missingRequiredSteps lists only empty required steps', () => {
    const missing = missingRequiredSteps(FEELING, { feeling: 'tender' });
    expect(missing.map((s) => s.input)).toEqual(['situation', 'need']);
  });

  it('isReadyToSend requires every required field, ignoring optional ones', () => {
    expect(isReadyToSend(FEELING, { feeling: 'a', situation: 'b', need: 'c' })).toBe(true);
    expect(isReadyToSend(FEELING, { feeling: 'a', situation: 'b' })).toBe(false);
    // Optional reason omitted → still ready.
    expect(isReadyToSend(FUTURE_WITH_OPTIONAL, { goal: 'travel' })).toBe(true);
  });
});

describe('back navigation preserves answers', () => {
  it('recomposes correctly after editing an earlier answer', () => {
    // Simulate: fill all three, go back to step 1, change it — the later
    // answers are still present and the recomposition reflects the edit.
    let answers: Record<string, string> = {
      feeling: 'tender',
      situation: 'a long week',
      need: 'rest',
    };
    expect(composeMessage(FEELING, answers)).toBe(
      'I feel tender because of a long week and I needed rest.',
    );

    answers = { ...answers, feeling: 'overwhelmed' };
    expect(answers.situation).toBe('a long week'); // preserved
    expect(answers.need).toBe('rest'); // preserved
    expect(composeMessage(FEELING, answers)).toBe(
      'I feel overwhelmed because of a long week and I needed rest.',
    );
  });
});
