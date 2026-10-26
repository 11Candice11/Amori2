/**
 * Helpers for user-entered links (wishlist items).
 *
 * People type "amazon.com/xyz" as often as "https://amazon.com/xyz", so a bare
 * address gets https:// prepended. Only http(s) links are ever accepted, so a
 * stored link can't launch some other app when the partner taps it. The backend
 * enforces the same rule (WishlistService.NormalizeLink).
 */

// A scheme is "word:" not followed by a digit, so "example.com:8080" is a host + port.
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const HTTP_URL = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/**
 * Turn what the user typed into an openable http(s) URL, or null if it isn't
 * one. Blank input returns null as well (callers treat blank as "no link").
 */
export function normalizeLink(input: string | null | undefined): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (!HTTP_URL.test(candidate)) return null;

  // Require a dotted host (or localhost) so "hello" doesn't become https://hello.
  const host = linkHost(candidate);
  if (!host || !(host.includes('.') || host === 'localhost')) return null;

  return candidate;
}

/** The host to show on a link chip, e.g. "www.amazon.com" -> "amazon.com". */
export function linkHost(url: string): string | null {
  const match = /^https?:\/\/([^/:?#\s]+)/i.exec(url);
  return match ? match[1].toLowerCase().replace(/^www\./, '') : null;
}
