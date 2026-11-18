-- Parent accounts (email magic link), child profiles, friends, challenges, rate limits.
-- Data minimisation: the only direct identifier stored is the PARENT's email. Children are profiles under a parent:
-- monster design, monster name, coarse age band, optional nickname (NULL unless the parent opts in), settings, progress.
-- Retention and deletion rules: docs/PRIVACY_SECURITY.md. Every delete path also deletes rows explicitly (not only via
-- ON DELETE CASCADE) so deletion never depends on foreign-key enforcement.

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,                          -- random UUID
  email TEXT NOT NULL UNIQUE,                   -- lower-cased, trimmed
  consent_version TEXT NOT NULL,                -- version of the consent wording accepted (src/account/consent.ts)
  consented_at INTEGER NOT NULL,                -- unix ms
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  digest_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (digest_opt_in IN (0, 1)),
  digest_last_sent_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_parents_digest ON parents(digest_opt_in, digest_last_sent_at);

-- Single-use magic-link tokens: only SHA-256(token) is stored; 15-minute expiry; used_at set on first use.
CREATE TABLE IF NOT EXISTS auth_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'signin')),
  consent_version TEXT,                         -- set for signup tokens (consent given when the link was requested)
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- Sessions: only SHA-256(session id) is stored; the id lives in an HttpOnly cookie. 30-day rolling expiry.
CREATE TABLE IF NOT EXISTS sessions (
  id_hash TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_parent ON sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,                          -- random UUID
  parent_id TEXT NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  monster_json TEXT NOT NULL,                   -- {body,color,eyes,mouth,arms,top} from a fixed list
  monster_name TEXT NOT NULL,                   -- 1–16 letters; shown to approved friends
  age_band TEXT NOT NULL CHECK (age_band IN ('ages-3-5', 'ages-6-8', 'ages-9-11', 'ages-12-14')),
  nickname TEXT,                                -- NULL by default; only set when the parent opts in; never shown to friends
  settings_json TEXT NOT NULL,                  -- {dailyLimit 3–10, sound, music}
  progress_json TEXT NOT NULL,                  -- ChildProgress (src/account/schema.ts); no personal data
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);

-- Friend invites: single-use code (only its hash stored), 7-day expiry.
CREATE TABLE IF NOT EXISTS friend_invites (
  code_hash TEXT PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_friend_invites_child ON friend_invites(child_id);
CREATE INDEX IF NOT EXISTS idx_friend_invites_expires ON friend_invites(expires_at);

-- Friendship between two children. Active only when BOTH parents approved (approved_a = approved_b = 1).
CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  child_a TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE, -- the inviting child
  child_b TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE, -- the accepting child
  approved_a INTEGER NOT NULL DEFAULT 0 CHECK (approved_a IN (0, 1)),
  approved_b INTEGER NOT NULL DEFAULT 0 CHECK (approved_b IN (0, 1)),
  created_at INTEGER NOT NULL,
  UNIQUE (child_a, child_b)
);
CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(child_b);

-- "Beat my score" challenges: the same seeded round. Link token stored only as a hash; 14-day expiry.
CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  from_child TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  world_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  seed INTEGER NOT NULL,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_challenges_from ON challenges(from_child);
CREATE INDEX IF NOT EXISTS idx_challenges_expires ON challenges(expires_at);

CREATE TABLE IF NOT EXISTS challenge_results (
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (challenge_id, child_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_results_child ON challenge_results(child_id);

-- Fixed-window rate-limit counters. Keys are keyed hashes (no raw IPs or emails). Purged daily.
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- parent_signups is SUPERSEDED by parents. Verified sign-ups become parent accounts (consent carried over);
-- the table now only holds pending onboarding confirmations (7-day TTL) until the onboarding step moves to magic links.
INSERT OR IGNORE INTO parents (id, email, consent_version, consented_at, created_at, digest_opt_in)
  SELECT id, email, consent_version, COALESCE(verified_at, created_at), created_at, 0 FROM parent_signups WHERE status = 'verified';
DELETE FROM parent_signups WHERE status = 'verified';
