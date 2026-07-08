# Archived migrations

These 15 files (`000`–`014`) are the original incremental migration history —
kept here for reference only, **not meant to be run**. They've been replaced
by a single consolidated migration: `../migrations/000_initial_schema.sql`,
which represents the same final schema state in one file, written cleanly
rather than as a sequence of `alter table` patches on top of earlier
decisions.

If you already ran some or all of these files against a real Supabase
project before this consolidation happened, do **not** also run
`000_initial_schema.sql` against that same project — it will conflict with
tables/policies that already exist. It's meant for a **fresh** project only.

For a project with no data yet, use `../migrations/000_initial_schema.sql`
and ignore this folder entirely.
