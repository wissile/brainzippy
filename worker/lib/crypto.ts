/** Token, hashing and signing helpers (Web Crypto only). Secrets are never logged or returned. */
const hex = (buf: ArrayBuffer | Uint8Array) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

/** 256-bit random token, hex encoded (64 chars). */
export function randomToken(bytes = 32): string {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export const TOKEN_RE = /^[0-9a-f]{64}$/;

export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function hmacHex(secret: string, message: string): Promise<string> {
  return hex(await crypto.subtle.sign("HMAC", await hmacKey(secret), new TextEncoder().encode(message)));
}

/** Constant-time comparison of two equal-length hex strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyHmac(secret: string, message: string, sig: string): Promise<boolean> {
  if (!TOKEN_RE.test(sig)) return false;
  return safeEqual(await hmacHex(secret, message), sig);
}

/** Human-friendly invite code: 10 chars from an unambiguous alphabet (≈50 bits), shown as XXXXX-XXXXX. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function inviteCode(): string {
  let s = "";
  // rejection sampling keeps every character equally likely (248 = 8 × 31)
  while (s.length < 10) for (const b of crypto.getRandomValues(new Uint8Array(16))) if (b < 248 && s.length < 10) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
export const INVITE_CODE_RE = /^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/;
export const normaliseInviteCode = (x: unknown) => {
  if (typeof x !== "string") return null;
  const s = x.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const code = `${s.slice(0, 5)}-${s.slice(5)}`;
  return s.length === 10 && INVITE_CODE_RE.test(code) ? code : null;
};
