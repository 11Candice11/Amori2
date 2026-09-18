/**
 * Formatting helpers for a memory's ISO 8601 date-time string.
 */

/** e.g. "15 Sep 2023, 19:30". Falls back to the raw string if unparseable. */
export function formatMemoryDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** e.g. "15 Sep 2023" — date only, for compact timeline markers. */
export function formatMemoryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
