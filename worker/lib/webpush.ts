/**
 * Web Push for Cloudflare Workers, implemented with WebCrypto only (no dependencies):
 *  - RFC 8291 message encryption (aes128gcm content coding, RFC 8188), single record
 *  - RFC 8292 VAPID authorisation (ES256 JWT)
 *  - RFC 8030 delivery (POST to the subscription endpoint with TTL / Urgency / Topic)
 * Verified against the RFC 8291 Appendix A vectors in tests/unit/webpush.test.ts.
 */

type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();
const utf8 = (text: string): Bytes => new Uint8Array(enc.encode(text));

export function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode base64url (padding optional). Throws on characters outside the alphabet. */
export function b64urlDecode(text: string): Bytes {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(text)) throw new Error("invalid base64url");
  const b64 = text.replace(/=+$/, "").replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/** HKDF-SHA-256 (extract + expand) — equals the RFC 8291 HMAC chain for outputs ≤ 32 bytes. */
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** Import a P-256 private key from raw `d` + uncompressed public point (65 bytes). */
export function importP256Private(d: Bytes, publicPoint: Bytes, usage: "ECDH" | "ECDSA"): Promise<CryptoKey> {
  if (publicPoint.length !== 65 || publicPoint[0] !== 4 || d.length !== 32) throw new Error("invalid P-256 key");
  const jwk: JsonWebKey = { kty: "EC", crv: "P-256", d: b64urlEncode(d), x: b64urlEncode(publicPoint.slice(1, 33)), y: b64urlEncode(publicPoint.slice(33, 65)), ext: false };
  const alg = usage === "ECDH" ? { name: "ECDH", namedCurve: "P-256" } : { name: "ECDSA", namedCurve: "P-256" };
  return crypto.subtle.importKey("jwk", jwk, alg, false, usage === "ECDH" ? ["deriveBits"] : ["sign"]);
}

export interface EncryptOptions {
  /** Fixed salt (tests only). Default: 16 random bytes. */
  salt?: Bytes;
  /** Fixed application-server ECDH key pair (tests only). Default: a fresh ephemeral pair per message. */
  serverKeys?: { privateKey: CryptoKey; publicKey: Bytes };
  /** Record size advertised in the header (RFC 8188). */
  recordSize?: number;
}

/**
 * Encrypt a push message for one subscription (RFC 8291 §3.4). Returns the complete request body:
 * header (salt ‖ rs ‖ idlen ‖ keyid=as_public) followed by one aes128gcm record.
 */
export async function encryptPayload(plaintext: Uint8Array, uaPublic: Bytes, authSecret: Bytes, opts: EncryptOptions = {}): Promise<Bytes> {
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error("invalid p256dh");
  if (authSecret.length !== 16) throw new Error("invalid auth secret");
  const rs = opts.recordSize ?? 4096;
  if (plaintext.length + 1 + 16 > rs) throw new Error("payload too large for a single record");

  let asPrivate: CryptoKey;
  let asPublic: Bytes;
  if (opts.serverKeys) {
    asPrivate = opts.serverKeys.privateKey;
    asPublic = opts.serverKeys.publicKey;
  } else {
    const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    asPrivate = pair.privateKey;
    asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", pair.publicKey)) as ArrayBuffer);
  }

  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0], asPrivate, 256));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" ‖ 0x00 ‖ ua_public ‖ as_public, 32)
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  if (salt.length !== 16) throw new Error("salt must be 16 bytes");
  const cek = await hkdf(salt, ikm, utf8("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, utf8("Content-Encoding: nonce\0"), 12);

  // single (= last) record: plaintext ‖ 0x02 delimiter, no padding
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, record));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, ciphertext);
}

export interface VapidKeys {
  /** base64url uncompressed P-256 point (65 bytes) — also given to browsers as applicationServerKey */
  publicKey: string;
  /** base64url raw private scalar d (32 bytes) */
  privateKey: string;
}

/** RFC 8292 §2 + §3: `Authorization: vapid t=<JWT>, k=<public key>`. exp is capped at 24h; we use 12h. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, subject: string, nowSec = Math.floor(Date.now() / 1000)): Promise<string> {
  const aud = new URL(endpoint).origin;
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64urlEncode(enc.encode(JSON.stringify({ aud, exp: nowSec + 12 * 3600, sub: subject })));
  const signingInput = `${header}.${claims}`;
  const key = await importP256Private(b64urlDecode(keys.privateKey), b64urlDecode(keys.publicKey), "ECDSA");
  // WebCrypto ECDSA returns IEEE P1363 r ‖ s (64 bytes) — exactly the JWS ES256 format.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(signingInput)));
  return `vapid t=${signingInput}.${b64urlEncode(sig)}, k=${keys.publicKey}`;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendOptions {
  /** Seconds the push service may hold the message for an offline device (RFC 8030 §5.2). */
  ttl: number;
  /** Replaces an undelivered earlier message with the same topic (RFC 8030 §5.4). */
  topic?: string;
  urgency?: "very-low" | "low" | "normal" | "high";
  fetchImpl?: typeof fetch;
}

/** Encrypt and deliver one message. Returns the push service's HTTP status (201 = accepted). */
export async function sendWebPush(target: PushTarget, payload: string, keys: VapidKeys, subject: string, opts: SendOptions): Promise<number> {
  const body = await encryptPayload(utf8(payload), b64urlDecode(target.p256dh), b64urlDecode(target.auth));
  const headers: Record<string, string> = {
    authorization: await vapidAuthorization(target.endpoint, keys, subject),
    ttl: String(Math.max(0, Math.floor(opts.ttl))),
    "content-encoding": "aes128gcm",
    "content-type": "application/octet-stream",
    urgency: opts.urgency ?? "normal",
  };
  if (opts.topic) headers.topic = opts.topic;
  const res = await (opts.fetchImpl ?? fetch)(target.endpoint, { method: "POST", headers, body });
  // drain so the connection can be reused; push services return tiny bodies
  await res.body?.cancel();
  return res.status;
}
