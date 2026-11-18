-- Billing (Stripe subscriptions), free-access codes and webhook idempotency. See docs/BILLING.md.
-- Data minimisation: no card data ever reaches BrainZippy (Stripe Checkout and the Customer Portal collect it).
-- We keep only Stripe object ids, subscription status/dates, and the time the parent agreed to the renewal terms.

-- Start of the 14-day free period for an account: the earlier of account creation and the first play on any
-- device the parent signed in on (merged by POST /api/billing/status). NULL means "use parents.created_at".
ALTER TABLE parents ADD COLUMN trial_started_at INTEGER;

CREATE TABLE IF NOT EXISTS billing_accounts (
  parent_id TEXT PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,                 -- cus_…
  stripe_subscription_id TEXT,                    -- sub_… (the current one)
  sub_status TEXT,                                -- Stripe subscription status (trialing, active, past_due, canceled, unpaid, incomplete, incomplete_expired, paused)
  trial_end INTEGER,                              -- unix ms
  current_period_end INTEGER,                     -- unix ms
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  cancel_at INTEGER,                              -- unix ms
  ended_at INTEGER,                               -- unix ms
  payment_failed_at INTEGER,                      -- unix ms of the first failed payment since the last success (7-day grace)
  sub_event_at INTEGER,                           -- Stripe event.created (ms) of the last applied subscription event (out-of-order guard)
  trial_used INTEGER NOT NULL DEFAULT 0 CHECK (trial_used IN (0, 1)), -- a card trial was started once; no second trial
  free_kind TEXT CHECK (free_kind IN ('forever', 'days')),            -- free access from a redeemed code
  free_until INTEGER,                             -- unix ms, for free_kind = 'days'
  free_code_id TEXT,                              -- access_codes.id last redeemed
  renewal_consent_at INTEGER,                     -- unix ms the parent ticked the renewal-terms box before Checkout
  renewal_consent_version TEXT,                   -- version of that wording (src/billing/model.ts RENEWAL_TERMS_VERSION)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Stripe webhook event ids already processed (idempotency). Purged after 30 days (Stripe retries for up to 3 days).
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,                            -- evt_…
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stripe_events_received ON stripe_events(received_at);

-- Free-access codes, created only by the owner CLI (scripts/access-code.mjs). Only SHA-256 of the code is stored.
CREATE TABLE IF NOT EXISTS access_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('free_forever', 'free_days')),
  days INTEGER,
  max_redemptions INTEGER NOT NULL DEFAULT 1 CHECK (max_redemptions >= 1),
  redemptions INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER,                             -- unix ms; NULL = no expiry
  note TEXT,                                      -- owner's note (who/why); never shown to parents
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
  created_at INTEGER NOT NULL,
  CHECK ((kind = 'free_days' AND days BETWEEN 1 AND 3650) OR (kind = 'free_forever' AND days IS NULL))
);

CREATE TABLE IF NOT EXISTS access_code_redemptions (
  code_id TEXT NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  redeemed_at INTEGER NOT NULL,
  PRIMARY KEY (code_id, parent_id)
);
CREATE INDEX IF NOT EXISTS idx_access_code_redemptions_parent ON access_code_redemptions(parent_id);
