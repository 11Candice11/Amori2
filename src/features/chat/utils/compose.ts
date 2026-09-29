/**
 * Pure helpers for the guided flow: composing the sentence from answers and
 * required-field validation. Kept free of React so they can be unit-tested and
 * reused by the preview screen. Mirrors the backend ChatComposer so the preview
 * matches what the server will store on send.
 */
import type {
  ChatAnswers,
  ChatTemplateDefinition,
  ChatTemplateStep,
} from '../types/chat.types';

/** Trim an answer; undefined/whitespace-only becomes ''. */
export function trimmedAnswer(answers: ChatAnswers, input: string): string {
  return (answers[input] ?? '').trim();
}

/**
 * Whether the given step's answer is empty (after trimming). Used to disable
 * Continue and to validate required fields. Optional steps are never "missing".
 */
export function isStepEmpty(step: ChatTemplateStep, answers: ChatAnswers): boolean {
  return trimmedAnswer(answers, step.input).length === 0;
}

/**
 * Whether the user may advance from / submit the given step. A required step
 * needs a non-empty answer; an optional step is always satisfiable.
 */
export function canContinue(step: ChatTemplateStep, answers: ChatAnswers): boolean {
  if (!step.required) return true;
  return !isStepEmpty(step, answers);
}

/** The required steps that are still empty — empty array means ready to send. */
export function missingRequiredSteps(
  template: ChatTemplateDefinition,
  answers: ChatAnswers,
): ChatTemplateStep[] {
  return template.steps.filter((s) => s.required && isStepEmpty(s, answers));
}

/** True when every required step has a non-empty answer. */
export function isReadyToSend(
  template: ChatTemplateDefinition,
  answers: ChatAnswers,
): boolean {
  return missingRequiredSteps(template, answers).length === 0;
}

/**
 * Flatten answers into the composed sentence using each step's prefix. Steps
 * with no answer are skipped so a partial draft still composes cleanly.
 * Whitespace is trimmed and terminal punctuation is added if missing — matching
 * the server's ChatComposer.
 */
export function composeMessage(
  template: ChatTemplateDefinition,
  answers: ChatAnswers,
): string {
  const parts: string[] = [];
  for (const step of template.steps) {
    const value = trimmedAnswer(answers, step.input);
    if (!value) continue;
    parts.push(step.prefix ? `${step.prefix} ${value}` : value);
  }

  let composed = parts.join(' ').trim();
  if (composed.length > 0 && !/[.!?…]$/.test(composed)) {
    composed += '.';
  }
  return composed;
}
