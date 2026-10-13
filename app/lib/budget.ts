/**
 * Shared budget-navigation helpers.
 *
 * The canonical `budget` URL parameter format is a lakh range:
 *   "min-max"  → e.g. "0-5", "5-10", "10-15"
 *   "min-"     → open-ended (min and above), e.g. "15-"
 * A missing/empty param means "any budget".
 */

export interface BudgetRange {
  min: number; // in lakhs, inclusive
  max: number; // in lakhs, exclusive; Infinity for open-ended
}

/** Parse a `budget` query param into a range. Returns null for any/invalid. */
export function parseBudget(value: string | null | undefined): BudgetRange | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)?$/);
  if (!match) return null;
  const min = parseFloat(match[1]);
  const max = match[2] !== undefined ? parseFloat(match[2]) : Infinity;
  if (Number.isNaN(min) || Number.isNaN(max) || min > max) return null;
  return { min, max };
}

/** Build a canonical `budget` query param from a lakh range. */
export function budgetToParam(min: number, max: number): string {
  const maxPart = max === Infinity ? "" : String(max);
  return `${min}-${maxPart}`;
}

/** Convert a price string like "₹12.5 Lakh" into a numeric lakh value. */
export function priceToLakhs(price: string): number {
  const match = String(price).toLowerCase().match(/([\d.]+)\s*lakh/);
  if (!match) return NaN;
  const val = parseFloat(match[1]);
  // Support "crore" prices too (1 crore = 100 lakh)
  if (/crore/.test(String(price).toLowerCase())) return val * 100;
  return val;
}

/** Whether a car priced at `lakhs` falls within `range`. */
export function inBudgetRange(lakhs: number, range: BudgetRange): boolean {
  return !Number.isNaN(lakhs) && lakhs >= range.min && lakhs < range.max;
}
