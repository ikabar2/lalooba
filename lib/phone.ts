// Shared US/Canada (NANP) phone normalization + validation.
//
// WHY THE OLD RULE FALSELY REJECTED VALID NUMBERS: the previous regex
// (^\+1[2-9]\d{2}[2-9]\d{6}$) enforced BOTH the area-code rule AND the
// exchange-code first-digit rule, and normalizePhone() returned null for any
// input that didn't reduce to exactly 10 digits (or 11 starting with 1) —
// so a pasted number with a stray digit, a "+1 " prefix plus formatting, or
// an uncommon-but-real exchange pattern produced the harsh "not available in
// your region" rejection. This helper is deliberately more tolerant:
//   • strips ALL non-digit characters (handles +1 (416) 555-0134, dots, etc.)
//   • accepts 10 digits, or 11 with a leading 1
//   • validates only the stable NANP invariant (area code starts 2–9),
//     dropping the exchange-digit rule that produced edge false-negatives.
// The DB constraint is relaxed to the same rule in migration 021 (a strict
// superset of the old one — every previously valid number still passes).

export function normalizePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isValidNANP(e164: string | null): boolean {
  return !!e164 && /^\+1[2-9]\d{9}$/.test(e164);
}

// Convenience: normalize + validate in one step. Returns the normalized
// +1XXXXXXXXXX string, or null if the input can't be a US/Canada number.
export function toValidNANP(raw: string): string | null {
  const n = normalizePhone(raw);
  return isValidNANP(n) ? n : null;
}
