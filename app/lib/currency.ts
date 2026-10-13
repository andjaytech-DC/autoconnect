/**
 * Central Indian currency + number formatting for Progressive AutoHub.
 *
 * Every customer-facing monetary value in the web app should route through
 * these helpers so that ₹ + Indian grouping (1,00,000 / 10,00,000) is
 * applied consistently. Do not scatter raw `toLocaleString("en-IN")`
 * + "₹" string concatenation across components.
 */

const INDIAN_LOCALE = "en-IN";

/** Safe numeric coercion: null / undefined / NaN → 0. */
function toAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * Format a numeric amount as Indian Rupees with Indian grouping.
 *
 * Examples:
 *   formatINR(550000)   → "₹5,50,000"
 *   formatINR(1275000)  → "₹12,75,000"
 *   formatINR(8999)     → "₹8,999"
 *   formatINR(10000000) → "₹1,00,00,000"
 *   formatINR(0)        → "₹0"
 *   formatINR(null)     → "₹0"
 */
export function formatINR(value: unknown): string {
  const amount = toAmount(value);
  return `₹${Math.round(amount).toLocaleString(INDIAN_LOCALE)}`;
}

/**
 * Format using lakh / crore human-readable Indian convention.
 *
 * Examples:
 *   formatINRLakhs(550000)   → "₹5.5 Lakh"
 *   formatINRLakhs(1275000)  → "₹12.75 Lakh"
 *   formatINRLakhs(10000000) → "₹1 Crore"
 *   formatINRLakhs(25000000) → "₹2.5 Crore"
 *   formatINRLakhs(8999)     → "₹8,999"
 */
export function formatINRLakhs(value: unknown): string {
  const amount = toAmount(value);
  if (amount <= 0) return "₹0";

  const crores = amount / 1_00_00_000;
  if (crores >= 1) {
    const formatted = crores % 1 === 0 ? crores.toFixed(0) : crores.toFixed(2).replace(/\.?0+$/, "");
    return `₹${formatted} Crore`;
  }

  const lakhs = amount / 1_00_000;
  if (lakhs >= 1) {
    const formatted = lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, "");
    return `₹${formatted} Lakh`;
  }

  return `₹${Math.round(amount).toLocaleString(INDIAN_LOCALE)}`;
}

/**
 * Format a number with Indian grouping but no currency symbol.
 *
 * Examples:
 *   formatIndianNumber(550000) → "5,50,000"
 *   formatIndianNumber(1275000) → "12,75,000"
 */
export function formatIndianNumber(value: unknown): string {
  return toAmount(value).toLocaleString(INDIAN_LOCALE);
}

/** Alias kept for backward compatibility with existing imports. */
export const inr = formatINR;
