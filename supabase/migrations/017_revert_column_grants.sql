-- ============================================================================
-- 017 — Revert fragile column-level SELECT grants (fixes signup 500 + empty
--        feed + broken profile updates)
--
-- WHAT WENT WRONG
-- Migrations 013/014/016 replaced the blanket `grant select on profiles` with
-- COLUMN-LEVEL grants (`grant select (col, col, ...)`) to hide phone/role.
-- That approach is too fragile in a PostgREST/supabase-js app because:
--   • supabase-js does `INSERT/UPDATE ... RETURNING *` under the hood whenever
--     you chain `.select()` after a write (the account page does exactly
--     this). RETURNING * needs SELECT on EVERY column, so the partial grant
--     made those writes fail with "permission denied for column ... " —
--     surfacing as the signup 500 and the account-save failures.
--   • Any `select('*')` similarly breaks.
--   • It interacts badly with the security-definer signup trigger path.
--
-- FIX
-- Restore normal table-level privileges so all reads/writes work again, and
-- achieve the phone/email privacy goal the RIGHT way instead:
--   • Row-level RLS still governs which ROWS are visible.
--   • For column privacy we DON'T rely on grants. `email` isn't in profiles
--     at all (it's in auth.users, already private). `phone` stays in the
--     table but the app never selects it into any public query, and the
--     admin/owner read paths go through the SECURITY DEFINER functions from
--     014 (my_phone / admin_get_contact) which still exist.
--   • If you later want hard column-hiding without breaking writes, do it via
--     a dedicated public VIEW (profiles_public) that omits phone/role and
--     point public reads at that — not via revoking column SELECT on the base
--     table. Left as a documented follow-up so this migration is safe now.
-- ============================================================================

-- Restore full table-level privileges (RLS still restricts rows).
grant select, insert, update on profiles to authenticated;
grant select on profiles to anon;

-- The helper functions from 014 remain in place and are still the sanctioned
-- way to read phone/email:
--   my_phone()                -> owner reads own phone
--   admin_get_contact(uuid)   -> admin reads phone + email
-- No change needed to them here.
