-- Public names (security review 2026-11-18): other families must never see the free-text monster name a child typed.
-- Friends, leaderboards and challenges now show a PUBLIC NAME built only from curated pick lists
-- (src/account/publicName.ts): NULL = the deterministic default for the child id; otherwise the parent's choice,
-- validated against the lists on write and on read. The typed monster name stays on the child's device only, so the
-- server copy is dropped (data minimisation). SQLite/D1 support DROP COLUMN for a column with no index or constraint.
-- Deploy note: apply together with the Worker version that stops sending/reading monster_name.
ALTER TABLE children ADD COLUMN public_name TEXT;
ALTER TABLE children DROP COLUMN monster_name;
