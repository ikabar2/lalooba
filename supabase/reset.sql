-- Full public-schema reset for a Supabase project — use this (not a bare
-- `drop schema public cascade`) when you need to start the schema over.
--
-- `drop schema public cascade; create schema public;` on its own looks
-- complete but silently destroys more than the tables: it also wipes the
-- schema's default privilege configuration that Supabase sets up when a
-- project is first provisioned. Without that, `service_role` (and anon/
-- authenticated) get RLS-bypass but NO base table privilege on anything
-- created afterward — every query fails with "permission denied for table
-- X", which has nothing to do with RLS policies and everything to do with
-- object-level GRANTs. This script restores both halves in one step, so
-- a reset is actually safe to run standalone.
--
-- Usage: run this whole file as ONE query, then run 000_initial_schema.sql,
-- 001_avatars_bucket.sql, 002_marketplace_identity.sql in order, same as a
-- normal fresh setup.

drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

-- Default privileges for objects created from this point forward (the
-- migrations you're about to run) — without this, every table the
-- migrations create would need this same grant repeated by hand.
alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant all on sequences to postgres, service_role;
alter default privileges in schema public grant all on functions to postgres, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
