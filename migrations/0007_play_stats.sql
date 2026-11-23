-- Anonymous play statistics (D-033). Aggregate counters only: one row per (UTC day, event, game, k1, k2).
-- No device/session id, no IP, no user agent, no timestamps finer than a day, no free text: nothing links two
-- counts to the same child. Allowed events and dimension values: src/analytics/schema.ts. Rows older than
-- 400 days are deleted by the daily purge (worker/jobs/purge.ts).
CREATE TABLE IF NOT EXISTS play_stats (
  day TEXT NOT NULL,
  event TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT '',
  k1 TEXT NOT NULL DEFAULT '',
  k2 TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, event, game, k1, k2)
) WITHOUT ROWID;
-- No extra index: every query filters by day, which leads the primary key, and an index would double the rows
-- written per new counter (D1 bills index writes).
