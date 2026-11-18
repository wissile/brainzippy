// @vitest-environment node
import { describe, expect, it } from "vitest";
import { b64urlDecode, b64urlEncode, encryptPayload, importP256Private, vapidAuthorization } from "../../worker/lib/webpush";

/** RFC 8291 Appendix A — "Intermediate Values for Encryption". */
const V = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  header: "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  ciphertext: "8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ",
};

describe("RFC 8291 message encryption (aes128gcm)", () => {
  it("reproduces the Appendix A header and ciphertext exactly", async () => {
    const asPublic = b64urlDecode(V.asPublic);
    const privateKey = await importP256Private(b64urlDecode(V.asPrivate), asPublic, "ECDH");
    const body = await encryptPayload(b64urlDecode(V.plaintext), b64urlDecode(V.uaPublic), b64urlDecode(V.authSecret), {
      salt: b64urlDecode(V.salt),
      serverKeys: { privateKey, publicKey: asPublic },
    });
    const header = b64urlDecode(V.header);
    expect(b64urlEncode(body.slice(0, header.length))).toBe(V.header);
    expect(b64urlEncode(body.slice(header.length))).toBe(V.ciphertext);
    expect(new TextDecoder().decode(b64urlDecode(V.plaintext))).toBe("When I grow up, I want to be a watermelon");
  });

  it("uses a fresh salt and ephemeral key per message", async () => {
    const a = await encryptPayload(new Uint8Array([1, 2, 3]), b64urlDecode(V.uaPublic), b64urlDecode(V.authSecret));
    const b = await encryptPayload(new Uint8Array([1, 2, 3]), b64urlDecode(V.uaPublic), b64urlDecode(V.authSecret));
    expect(a.length).toBe(86 + 3 + 1 + 16);
    expect(b64urlEncode(a.slice(0, 16))).not.toBe(b64urlEncode(b.slice(0, 16)));
    expect(b64urlEncode(a.slice(21, 86))).not.toBe(b64urlEncode(b.slice(21, 86)));
    expect(new DataView(a.buffer).getUint32(16)).toBe(4096);
    expect(a[20]).toBe(65);
  });

  it("rejects malformed subscription keys", async () => {
    await expect(encryptPayload(new Uint8Array(1), new Uint8Array(64), b64urlDecode(V.authSecret))).rejects.toThrow();
    await expect(encryptPayload(new Uint8Array(1), b64urlDecode(V.uaPublic), new Uint8Array(15))).rejects.toThrow();
    expect(() => b64urlDecode("not base64!")).toThrow();
  });
});

describe("RFC 8292 VAPID", () => {
  it("builds a verifiable ES256 JWT with aud, exp ≤ 24h and sub", async () => {
    const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
    const keys = { publicKey: b64urlEncode(pub), privateKey: jwk.d! };
    const now = 1_800_000_000;
    const auth = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc:def", keys, "mailto:hello@brainzippy.com", now);

    const m = auth.match(/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/);
    expect(m).not.toBeNull();
    const [, h, c, s, k] = m!;
    expect(k).toBe(keys.publicKey);
    expect(JSON.parse(new TextDecoder().decode(b64urlDecode(h!)))).toEqual({ typ: "JWT", alg: "ES256" });
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c!)));
    expect(claims.aud).toBe("https://fcm.googleapis.com");
    expect(claims.sub).toBe("mailto:hello@brainzippy.com");
    expect(claims.exp - now).toBeGreaterThan(0);
    expect(claims.exp - now).toBeLessThanOrEqual(24 * 3600);
    const sig = b64urlDecode(s!);
    expect(sig.length).toBe(64);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pair.publicKey, sig, new TextEncoder().encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});
