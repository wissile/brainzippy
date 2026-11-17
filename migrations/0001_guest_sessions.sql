-- Anonymous guest progress. No names, emails, ages, IPs, or device fingerprints are stored.
CREATE TABLE IF NOT EXISTS guest_sessions (
  id TEXT PRIMARY KEY,               -- random UUID generated server-side
  created_at INTEGER NOT NULL,       -- unix ms
  updated_at INTEGER NOT NULL,       -- unix ms; used for 180-day retention purge
  progress_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_updated ON guest_sessions(updated_at);
