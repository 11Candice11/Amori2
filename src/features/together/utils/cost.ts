/**
 * Parsing for a cost the user types (date ideas). The backend column is
 * numeric(10,2) and 0 means "free", so an empty field is "no cost" (null) and is
 * distinct from 0.
 */

/** The largest value the backend column holds (numeric(10,2)). */
export const MAX_COST = 99_999_999.99;

export const COST_ERROR = 'Enter the cost as a number, like 25 or 12.50 (0 for free).';

export type ParsedCost = { ok: true; value: number | null } | { ok: false };

/**
 * How a cost shows on a card: "Free" for 0, whole euros without decimals
 * (€25), anything else with cents (€12.50) so a typed 12.50 is never shown as
 * €13. Null means no cost, so nothing is shown.
 */
export function formatCost(cost: number | null | undefined): string | null {
  if (cost == null) return null;
  if (cost === 0) return 'Free';
  const digits = Number.isInteger(cost) ? 0 : 2;
  return cost.toLocaleString(undefined, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * "25", "12.50", "12,50" and "€12.50" are accepted (a comma is read as the
 * decimal point, as people type it in much of Europe). Empty means no cost.
 * Thousands separators, negatives and more than two decimals are rejected so a
 * typo can't silently become the wrong amount.
 */
export function parseCost(input: string | null | undefined): ParsedCost {
  const cleaned = (input ?? '').trim().replace(/[€$£\s]/g, '').replace(',', '.');
  if (cleaned === '') return { ok: true, value: null };
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return { ok: false };

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value > MAX_COST) return { ok: false };
  return { ok: true, value };
}
