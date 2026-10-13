/**
 * Indian vehicle registration number validation (client-side mirror of the
 * backend rule in progressive-autohub-backend/src/common/validators).
 *
 * The backend is authoritative; this exists so staff see the problem while
 * typing instead of after a failed save. Keep the two in step.
 */

const STATE_CODES = new Set([
  'AN', 'AP', 'AR', 'AS', 'BR', 'CG', 'CH', 'DD', 'DH', 'DL', 'GA', 'GJ',
  'HR', 'HP', 'JK', 'JH', 'KA', 'KL', 'LA', 'LD', 'MH', 'ML', 'MN', 'MP',
  'MZ', 'NL', 'OD', 'PB', 'PY', 'RA', 'RJ', 'SK', 'TN', 'TR', 'TS', 'UK',
  'UP', 'WB', 'BH',
]);

export function normaliseRegistrationNumber(input: string): string {
  return (input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export interface PlateValidation {
  valid: boolean;
  normalised: string;
  reason?: string;
}

export function validateRegistrationNumber(
  input: string,
): PlateValidation {
  const normalised = normaliseRegistrationNumber(input);

  if (!normalised) {
    return { valid: false, normalised, reason: 'Registration number is required.' };
  }
  if (normalised.length < 6 || normalised.length > 12) {
    return {
      valid: false,
      normalised,
      reason: 'Too short or too long — use a format like MH01AB1234.',
    };
  }
  if (!STATE_CODES.has(normalised.slice(0, 2))) {
    return {
      valid: false,
      normalised,
      reason: `"${normalised.slice(0, 2)}" is not a valid Indian state or RTO code.`,
    };
  }

  const afterState = normalised.slice(2);
  if (!/^\d{1,2}/.test(afterState)) {
    return {
      valid: false,
      normalised,
      reason: 'Add the district number after the state code, e.g. MH01.',
    };
  }
  const rest = afterState.slice(/^\d{2}/.test(afterState) ? 2 : 1);
  if (!/^[A-Z]{1,4}\d{1,4}$/.test(rest)) {
    return {
      valid: false,
      normalised,
      reason: 'Finish with letters then numbers, e.g. AB1234.',
    };
  }

  return { valid: true, normalised };
}

export const STATE_CODES_BY_PLATE = STATE_CODES;
