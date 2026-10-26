/**
 * "12 Oct 2026" for an ISO timestamp (used for the date a wish was fulfilled or
 * a date idea was done), or null when the value is missing or unparseable.
 */
export function formatShortDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
