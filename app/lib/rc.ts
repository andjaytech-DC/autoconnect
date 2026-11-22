/**
 * Registration-number (RC) handling shared by the lookup routes.
 *
 * Accepts what people actually type ("mh 12-ab 1234") and returns the compact
 * upper-case form, or null when it is not a plausible Indian registration.
 */
const RC_PATTERN = /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/;

export function normaliseRc(raw: string | null): string | null {
  if (!raw) return null;
  const rc = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return RC_PATTERN.test(rc) ? rc : null;
}
