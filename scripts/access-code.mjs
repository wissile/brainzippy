#!/usr/bin/env node
/**
 * Owner CLI for free-access codes (bypass payment). Runs `wrangler d1 execute`; there is deliberately no admin
 * HTTP endpoint. The plain code is printed ONCE and never stored (D1 keeps only its SHA-256).
 *
 *   node scripts/access-code.mjs create --kind free_forever [--max 1] [--expires 2027-06-30] [--note "Grandma"] --local|--staging|--prod
 *   node scripts/access-code.mjs create --kind free_days --days 30 --max 200 --note "School pilot" --prod
 *   (Custom codes such as TEACHERS2027 are not supported: a human-chosen code is guessable whatever its length.
 *    Every code is 12 random characters from a 31-letter alphabet, ≈59 bits.)
 *   node scripts/access-code.mjs list --prod
 *   node scripts/access-code.mjs disable <id> --prod
 *
 * --local   local D1 used by `npm run dev` / e2e (wrangler --local)
 * --staging brainzippy-db-staging (wrangler --env staging --remote)
 * --prod    brainzippy-db (wrangler --remote). Production: only with the owner's approval.
 * --dry-run print the SQL instead of running it.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const ACCESS_CODE_PREFIX = "bz-access:"; // must match src/billing/codes.ts
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O, 1/I/L

export function normaliseAccessCode(x) {
  if (typeof x !== "string" || x.length > 64) return null;
  const s = x.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return s.length >= 6 && s.length <= 24 ? s : null;
}

export const hashAccessCode = (normalised) => createHash("sha256").update(ACCESS_CODE_PREFIX + normalised).digest("hex");

/** 12 characters (≈59 bits), rejection-sampled so every character is equally likely; shown as XXXX-XXXX-XXXX. */
export function generateCode() {
  let s = "";
  while (s.length < 12) for (const b of randomBytes(24)) if (b < 248 && s.length < 12) s += ALPHABET[b % ALPHABET.length];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}

const sqlStr = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);

export function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const o = { cmd, flags: {}, positional: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (["local", "staging", "prod", "dry-run"].includes(k)) o.flags[k] = true;
      else o.flags[k] = rest[++i];
    } else o.positional.push(a);
  }
  return o;
}

/** Validates options and returns { code, sql } for a new code. Throws Error with a readable message. */
export function buildCreate(flags, now = Date.now()) {
  const kind = flags.kind;
  if (kind !== "free_forever" && kind !== "free_days") throw new Error("--kind must be free_forever or free_days");
  let days = null;
  if (kind === "free_days") {
    days = Number(flags.days);
    if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error("--days must be a whole number from 1 to 3650");
  } else if (flags.days !== undefined) throw new Error("--days only applies to free_days");
  const max = flags.max === undefined ? 1 : Number(flags.max);
  if (!Number.isInteger(max) || max < 1 || max > 100000) throw new Error("--max must be a whole number from 1 to 100000");
  let expires = null;
  if (flags.expires !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(flags.expires)) throw new Error("--expires must be YYYY-MM-DD");
    expires = Date.parse(`${flags.expires}T23:59:59Z`);
    if (!Number.isFinite(expires) || expires <= now) throw new Error("--expires must be a future date");
  }
  const note = flags.note === undefined ? null : String(flags.note).slice(0, 200);
  // Custom codes were removed (security review 2026-11-18): a chosen word can't carry ≥59 bits of entropy.
  if (flags.code !== undefined) throw new Error("--code is not supported: codes are always generated (12 random characters, ≈59 bits)");
  const display = generateCode();
  const normalised = normaliseAccessCode(display);
  const id = randomUUID();
  const sql = `INSERT INTO access_codes (id, code_hash, kind, days, max_redemptions, redemptions, expires_at, note, disabled, created_at) VALUES (${sqlStr(id)}, ${sqlStr(hashAccessCode(normalised))}, ${sqlStr(kind)}, ${days ?? "NULL"}, ${max}, 0, ${expires ?? "NULL"}, ${sqlStr(note)}, 0, ${now});`;
  return { id, code: display, sql, kind, days, max, expires, note };
}

export function wranglerArgs(flags, sql) {
  const targets = ["local", "staging", "prod"].filter((k) => flags[k]);
  if (targets.length !== 1) throw new Error("choose exactly one of --local, --staging, --prod");
  const t = targets[0];
  const db = t === "staging" ? "brainzippy-db-staging" : "brainzippy-db";
  return ["wrangler", "d1", "execute", db, ...(t === "local" ? ["--local"] : ["--remote"]), ...(t === "staging" ? ["--env", "staging"] : []), "--command", sql, ...(sql.trim().toUpperCase().startsWith("SELECT") ? ["--json"] : [])];
}

function run(flags, sql) {
  const args = wranglerArgs(flags, sql);
  if (flags["dry-run"]) {
    console.log(`npx ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
    return { ok: true, stdout: "" };
  }
  const r = spawnSync("npx", args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (r.status !== 0) {
    console.error("wrangler failed; nothing was created.");
    process.exit(1);
  }
  return { ok: true, stdout: r.stdout };
}

function main() {
  const { cmd, flags, positional } = parseArgs(process.argv.slice(2));
  try {
    if (cmd === "create") {
      const c = buildCreate(flags);
      run(flags, c.sql);
      console.log("\nFree-access code created. It is shown only now; copy it somewhere safe:\n");
      console.log(`    ${c.code}\n`);
      console.log(`id ${c.id} · ${c.kind}${c.days ? ` (${c.days} days)` : ""} · up to ${c.max} famil${c.max === 1 ? "y" : "ies"}${c.expires ? ` · redeem by ${new Date(c.expires).toISOString().slice(0, 10)}` : ""}${c.note ? ` · ${c.note}` : ""}`);
      console.log("Parents redeem it on the parent page under Plan and billing → I have a code.");
    } else if (cmd === "list") {
      const r = run(flags, "SELECT id, kind, days, redemptions, max_redemptions, expires_at, disabled, note, created_at FROM access_codes ORDER BY created_at DESC LIMIT 200");
      if (r.stdout) console.log(r.stdout);
    } else if (cmd === "disable") {
      const id = positional[0];
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) throw new Error("usage: disable <id> --local|--staging|--prod");
      run(flags, `UPDATE access_codes SET disabled = 1 WHERE id = ${sqlStr(id)};`);
      console.log(`Disabled ${id}. Families who already redeemed it keep their access.`);
    } else {
      console.log("usage: node scripts/access-code.mjs create|list|disable … --local|--staging|--prod (see the header of this file)");
      process.exit(cmd ? 1 : 0);
    }
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
