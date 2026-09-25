/**
 * Auth field validation and sanitization.
 *
 * Uses zod to validate the email field and sanitize both email and password
 * before they are sent to the auth service.
 *
 * Sanitization strategy:
 * - email: trim surrounding whitespace and lowercase (emails are case-insensitive
 *   on the local/domain parts in practice, and the backend expects a normalized form).
 * - password: trim surrounding whitespace only. We deliberately do NOT alter the
 *   interior of the password, since every character is significant.
 */
import { z } from 'zod';

/**
 * Login credentials schema.
 * - `email` is trimmed + lowercased, then validated as an email address.
 * - `password` is trimmed and required to be non-empty.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Please enter a valid email address.')),
  password: z
    .string()
    .trim()
    .min(1, 'Please enter your password.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validate and sanitize login credentials.
 *
 * @returns On success, `{ success: true, data }` with sanitized values.
 *          On failure, `{ success: false, error }` with the first user-facing message.
 */
export function validateLogin(
  input: { email: string; password: string },
):
  | { success: true; data: LoginInput }
  | { success: false; error: string } {
  const result = loginSchema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstIssue = result.error.issues[0];
  return {
    success: false,
    error: firstIssue?.message ?? 'Please check your details and try again.',
  };
}
