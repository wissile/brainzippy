-- Parent contact for consent / progress-saving. ONLY the parent's email is stored: no child name, age or monster.
-- Unverified rows are purged after 7 days; verified rows follow the documented retention policy.
CREATE TABLE IF NOT EXISTS parent_signups (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,          -- lower-cased, trimmed
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified')),
  token_hash TEXT,                     -- SHA-256 of the one-time verification token (token itself never stored)
  consent_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  verified_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_parent_signups_status_created ON parent_signups(status, created_at);
