// Shared password-strength policy, used by both the signup and reset-password
// forms so the client-side rule is identical everywhere and matches the
// server-side policy configured in Supabase Auth (Dashboard → Authentication
// → Policies → Password Requirements: minimum length 8, "letters, digits,
// and symbols" or at least "lower/upper + digits"). Client validation is for
// fast feedback; Supabase enforces the real rule server-side on signUp /
// updateUser, so a bypassed client can't set a weak password.
//
// Policy: at least 8 characters, AND at least one digit OR one special
// character (so a purely-alphabetic password is rejected). This meaningfully
// raises entropy against dictionary/brute-force attacks without frustrating
// users with baroque composition rules.

export const PASSWORD_MIN_LENGTH = 8;

export type PasswordCheck = { ok: true } | { ok: false; reason: string };

export function validatePassword(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { ok: false, reason: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.` };
  }
  // At least one digit OR one special (non-alphanumeric) character.
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (!hasDigit && !hasSpecial) {
    return {
      ok: false,
      reason: "Password must include at least one number or special character.",
    };
  }
  return { ok: true };
}
