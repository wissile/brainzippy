#!/usr/bin/env node
/**
 * Generate a VAPID key pair (RFC 8292) for BrainZippy daily reminders. Prints both keys; stores nothing.
 *
 *   node scripts/gen-vapid.mjs
 *
 * Then:
 *   - VAPID_PUBLIC_KEY  → "vars" in wrangler.jsonc (public; browsers receive it as applicationServerKey)
 *   - VAPID_PRIVATE_KEY → `npx wrangler secret put VAPID_PRIVATE_KEY` (and `.dev.vars` locally — gitignored)
 *   - VAPID_SUBJECT     → "vars": a contact URL or mailto: the push services can reach
 *
 * Rotating keys invalidates every existing subscription (browsers must re-subscribe), so generate once per environment.
 */
import { webcrypto } from "node:crypto";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const pair = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const jwk = await webcrypto.subtle.exportKey("jwk", pair.privateKey);
const pub = new Uint8Array(await webcrypto.subtle.exportKey("raw", pair.publicKey));

console.log(`VAPID_PUBLIC_KEY=${b64url(pub)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
