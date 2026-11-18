-- Daily reminder push subscriptions (parent-enabled, behind the parent gate).
-- No personal data: `id` is a random UUID minted on the device; the endpoint/keys are opaque values
-- issued by the browser's push service. `last_sent` is the LOCAL date (YYYY-MM-DD, in `tz`) of the
-- last reminder, which enforces "at most one per day". Rows not refreshed for 180 days are purged.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 8 AND 19),
  tz TEXT NOT NULL,
  last_sent TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at ON push_subscriptions (updated_at);
