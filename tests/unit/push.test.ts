// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_MONSTER, REMINDER_LINES, reminderBody, reminderVariant } from "../../src/pwa/reminderCopy";
import { MAX_SENDS_PER_RUN, type PushEnv, handlePush, isAllowedEndpoint, parseSubscribe, sendDueReminders } from "../../worker/routes/push";
import { b64urlEncode } from "../../worker/lib/webpush";
import { dueDecision, isValidTimeZone, localTime, selectDue } from "../../worker/lib/webpushSchedule";

const at = (iso: string) => new Date(iso);

describe("due-reminder selection", () => {
  it("sends during the chosen LOCAL hour, across timezones", () => {
    const now = at("2026-11-17T17:00:00Z");
    expect(dueDecision({ hour: 17, tz: "UTC", last_sent: null }, now).due).toBe(true);
    expect(dueDecision({ hour: 12, tz: "America/New_York", last_sent: null }, now).due).toBe(true); // 12:00 EST
    expect(dueDecision({ hour: 9, tz: "America/Los_Angeles", last_sent: null }, now).due).toBe(true); // 09:00 PST
    expect(dueDecision({ hour: 18, tz: "Europe/London", last_sent: null }, now)).toEqual({ due: false, reason: "hour" });
  });

  it("handles daylight saving: the same local hour maps to different UTC hours", () => {
    const sub = { hour: 9, tz: "Europe/Berlin", last_sent: null };
    expect(dueDecision(sub, at("2026-07-01T07:00:00Z")).due).toBe(true); // CEST, UTC+2
    expect(dueDecision(sub, at("2026-07-01T08:00:00Z")).due).toBe(false);
    expect(dueDecision(sub, at("2026-12-01T08:00:00Z")).due).toBe(true); // CET, UTC+1
  });

  it("half-hour zones send at hh:30 inside the chosen hour", () => {
    const d = dueDecision({ hour: 17, tz: "Asia/Kolkata", last_sent: null }, at("2026-11-17T12:00:00Z")); // 17:30 IST
    expect(d.due).toBe(true);
    expect(localTime(at("2026-11-17T12:00:00Z"), "Asia/Kolkata")).toEqual({ date: "2026-11-17", hour: 17, minute: 30 });
  });

  it("never sends in quiet hours (20:00–08:00 local), even if a bad row asks for it", () => {
    for (const hour of [0, 5, 7, 20, 21, 23]) expect(dueDecision({ hour, tz: "UTC", last_sent: null }, at(`2026-11-17T${String(hour).padStart(2, "0")}:00:00Z`)).due).toBe(false);
    expect(dueDecision({ hour: 8, tz: "UTC", last_sent: null }, at("2026-11-17T08:00:00Z")).due).toBe(true);
    expect(dueDecision({ hour: 19, tz: "UTC", last_sent: null }, at("2026-11-17T19:00:00Z")).due).toBe(true);
  });

  it("at most once per local day; the next local day is due again", () => {
    const now = at("2026-11-17T10:00:00Z");
    expect(dueDecision({ hour: 10, tz: "UTC", last_sent: "2026-11-17" }, now)).toEqual({ due: false, reason: "sent" });
    expect(dueDecision({ hour: 10, tz: "UTC", last_sent: "2026-11-16" }, now).due).toBe(true);
    // Tokyo is already on the 18th at 01:00Z: "today" is the local date
    const tokyo = dueDecision({ hour: 10, tz: "Asia/Tokyo", last_sent: "2026-11-17" }, at("2026-11-18T01:00:00Z"));
    expect(tokyo).toMatchObject({ due: true, localDate: "2026-11-18" });
  });

  it("TTL expires before quiet hours start", () => {
    const d = dueDecision({ hour: 19, tz: "UTC", last_sent: null }, at("2026-11-17T19:00:00Z"));
    expect(d).toMatchObject({ due: true, ttl: 3600 });
    const m = dueDecision({ hour: 9, tz: "UTC", last_sent: null }, at("2026-11-17T09:00:00Z"));
    expect(m).toMatchObject({ ttl: 4 * 3600 });
  });

  it("rejects invalid timezones and hours", () => {
    expect(isValidTimeZone("Europe/London")).toBe(true);
    expect(isValidTimeZone("Mars/Olympus")).toBe(false);
    expect(isValidTimeZone("'; DROP TABLE")).toBe(false);
    expect(dueDecision({ hour: 10, tz: "Nope/Nope", last_sent: null }, at("2026-11-17T10:00:00Z"))).toEqual({ due: false, reason: "invalid" });
    expect(dueDecision({ hour: 10.5, tz: "UTC", last_sent: null }, at("2026-11-17T10:00:00Z"))).toEqual({ due: false, reason: "invalid" });
  });

  it("selectDue filters a mixed list", () => {
    const subs = [
      { id: "a", hour: 17, tz: "UTC", last_sent: null },
      { id: "b", hour: 17, tz: "UTC", last_sent: "2026-11-17" },
      { id: "c", hour: 9, tz: "America/Los_Angeles", last_sent: null },
      { id: "d", hour: 9, tz: "UTC", last_sent: null },
    ];
    expect(selectDue(subs, at("2026-11-17T17:00:00Z")).map((x) => x.sub.id)).toEqual(["a", "c"]);
  });
});

describe("reminder copy", () => {
  it("is addressed gently, varies by day, and personalises only on the device", () => {
    expect(reminderBody(0, "Ziggy")).toBe("Ziggy has a new adventure ready today 🌟");
    expect(reminderBody(0)).toContain(DEFAULT_MONSTER);
    for (const l of REMINDER_LINES) expect(l).not.toMatch(/miss|streak|lose|hurry|last chance|don't forget|sad/i);
    const variants = new Set(Array.from({ length: 14 }, (_, i) => reminderVariant(`2026-11-${String(i + 1).padStart(2, "0")}`)));
    expect(variants.size).toBeGreaterThan(1);
  });
});

// ---------- routes + cron job against an in-memory D1 ----------
interface Row { id: string; endpoint: string; p256dh: string; auth: string; hour: number; tz: string; last_sent: string | null; created_at: number; updated_at: number }

function fakeDb() {
  const rows = new Map<string, Row>();
  const stmt = (sql: string) => {
    let a: unknown[] = [];
    const s = {
      bind: (...args: unknown[]) => ((a = args), s),
      async run() {
        if (sql.startsWith("DELETE FROM push_subscriptions WHERE endpoint")) {
          for (const [k, r] of rows) if (r.endpoint === a[0] && r.id !== a[1]) rows.delete(k);
        } else if (sql.startsWith("DELETE FROM push_subscriptions WHERE updated_at")) {
          for (const [k, r] of rows) if (r.updated_at < (a[0] as number)) rows.delete(k);
        } else if (sql.startsWith("DELETE FROM push_subscriptions WHERE id")) rows.delete(a[0] as string);
        else if (sql.trim().startsWith("INSERT")) {
          const [id, endpoint, p256dh, auth, hour, tz, created_at, updated_at] = a as [string, string, string, string, number, string, number, number];
          const prev = rows.get(id);
          rows.set(id, { id, endpoint, p256dh, auth, hour, tz, last_sent: prev?.last_sent ?? null, created_at: prev?.created_at ?? created_at, updated_at });
        } else if (sql.startsWith("UPDATE push_subscriptions SET last_sent")) {
          const r = rows.get(a[1] as string);
          if (r) r.last_sent = a[0] as string;
        }
        return { meta: { changes: 1 } };
      },
      async all() {
        return { results: [...rows.values()] };
      },
    };
    return s;
  };
  const DB = {
    prepare: stmt,
    async batch(list: { run(): Promise<unknown> }[]) {
      for (const x of list) await x.run();
      return [];
    },
  };
  return { DB: DB as unknown as D1Database, rows };
}

async function vapidEnv(DB: D1Database): Promise<PushEnv> {
  const pair = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"])) as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  return { DB, VAPID_PUBLIC_KEY: b64urlEncode(pub), VAPID_PRIVATE_KEY: jwk.d!, VAPID_SUBJECT: "mailto:test@example.com" };
}

async function browserKeys() {
  const pair = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  return { p256dh: b64urlEncode(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))), auth: b64urlEncode(crypto.getRandomValues(new Uint8Array(16))) };
}

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://brainzippy.test${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

describe("push API", () => {
  it("only accepts real push-service endpoints over https", () => {
    expect(isAllowedEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedEndpoint("https://web.push.apple.com/QK1")).toBe(true);
    expect(isAllowedEndpoint("https://wns2-par02p.notify.windows.com/w/?token=x")).toBe(true);
    expect(isAllowedEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedEndpoint("https://evil.example/fcm.googleapis.com")).toBe(false);
    expect(isAllowedEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedEndpoint("https://user:pw@fcm.googleapis.com/x")).toBe(false);
  });

  it("subscribe validates strictly and rejects extra fields (no names can ride along)", async () => {
    const keys = await browserKeys();
    const good = { id: crypto.randomUUID(), endpoint: "https://fcm.googleapis.com/fcm/send/x", keys, hour: 17, tz: "Europe/London" };
    expect(parseSubscribe(good)).not.toBeNull();
    expect(parseSubscribe({ ...good, childName: "Sam" })).toBeNull();
    expect(parseSubscribe({ ...good, hour: 21 })).toBeNull();
    expect(parseSubscribe({ ...good, hour: 7 })).toBeNull();
    expect(parseSubscribe({ ...good, tz: "Bad/Zone" })).toBeNull();
    expect(parseSubscribe({ ...good, id: "1234" })).toBeNull();
    expect(parseSubscribe({ ...good, keys: { ...keys, auth: "AAAA" } })).toBeNull();
  });

  it("subscribe → stored; re-subscribe updates; unsubscribe deletes; cross-site write refused", async () => {
    const { DB, rows } = fakeDb();
    const env = await vapidEnv(DB);
    const keys = await browserKeys();
    const id = crypto.randomUUID();
    const body = { id, endpoint: "https://fcm.googleapis.com/fcm/send/x", keys, hour: 17, tz: "Europe/London" };
    expect((await handlePush(post("/api/push/subscribe", body), env)).status).toBe(200);
    expect(rows.get(id)).toMatchObject({ hour: 17, tz: "Europe/London" });
    expect((await handlePush(post("/api/push/subscribe", { ...body, hour: 9 }), env)).status).toBe(200);
    expect(rows.size).toBe(1);
    expect(rows.get(id)?.hour).toBe(9);
    expect((await handlePush(post("/api/push/subscribe", body, { origin: "https://evil.example" }), env)).status).toBe(403);
    expect((await handlePush(post("/api/push/unsubscribe", { id }), env)).status).toBe(200);
    expect(rows.size).toBe(0);
  });

  it("key endpoint reports when VAPID is not configured", async () => {
    const { DB } = fakeDb();
    const res = await handlePush(new Request("https://brainzippy.test/api/push/key"), { DB });
    expect(res.status).toBe(503);
    const env = await vapidEnv(DB);
    expect(await (await handlePush(new Request("https://brainzippy.test/api/push/key"), env)).json()).toEqual({ publicKey: env.VAPID_PUBLIC_KEY });
  });

  it("cron job: sends once per day, encrypted with VAPID; deletes 404/410 subscriptions", async () => {
    const { DB, rows } = fakeDb();
    const env = await vapidEnv(DB);
    const now = at("2026-11-17T17:00:00Z");
    const add = async (id: string, endpoint: string, hour: number, tz = "UTC") => {
      const k = await browserKeys();
      rows.set(id, { id, endpoint, p256dh: k.p256dh, auth: k.auth, hour, tz, last_sent: null, created_at: now.getTime(), updated_at: now.getTime() });
    };
    await add("ok", "https://fcm.googleapis.com/fcm/send/ok", 17);
    await add("gone", "https://fcm.googleapis.com/fcm/send/gone", 17);
    await add("later", "https://fcm.googleapis.com/fcm/send/later", 18);
    await add("old", "https://fcm.googleapis.com/fcm/send/old", 17);
    rows.get("old")!.updated_at = now.getTime() - 200 * 24 * 3600 * 1000;

    const calls: { url: string; headers: Headers; body: Uint8Array }[] = [];
    const fakeFetch = (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: new Headers(init.headers), body: new Uint8Array(init.body as ArrayBuffer) });
      return new Response(null, { status: url.endsWith("/gone") ? 410 : 201 });
    }) as unknown as typeof fetch;

    const r1 = await sendDueReminders(env, now, fakeFetch);
    expect(r1).toEqual({ due: 2, sent: 1, removed: 1, failed: 0 });
    expect(rows.has("gone")).toBe(false);
    expect(rows.has("old")).toBe(false); // retention purge
    expect(rows.get("ok")?.last_sent).toBe("2026-11-17");
    const h = calls[0]!.headers;
    expect(h.get("content-encoding")).toBe("aes128gcm");
    expect(h.get("authorization")).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
    expect(Number(h.get("ttl"))).toBe(3 * 3600);
    expect(h.get("topic")).toBe("bz-daily");
    expect(calls[0]!.body.length).toBeGreaterThan(86 + 16);

    // same hour again (cron retry / overlap): nothing new
    calls.length = 0;
    expect(await sendDueReminders(env, now, fakeFetch)).toEqual({ due: 0, sent: 0, removed: 0, failed: 0 });
    expect(calls).toHaveLength(0);
  });

  it("cron job does nothing without VAPID config and caps sends per run", async () => {
    const { DB, rows } = fakeDb();
    expect(await sendDueReminders({ DB }, at("2026-11-17T17:00:00Z"))).toMatchObject({ skipped: "not_configured" });
    const env = await vapidEnv(DB);
    const k = await browserKeys();
    for (let i = 0; i < MAX_SENDS_PER_RUN + 5; i++) rows.set(`s${i}`, { id: `s${i}`, endpoint: `https://fcm.googleapis.com/fcm/send/${i}`, ...k, hour: 17, tz: "UTC", last_sent: null, created_at: Date.now(), updated_at: Date.now() });
    const fakeFetch = (async () => new Response(null, { status: 201 })) as unknown as typeof fetch;
    const r = await sendDueReminders(env, at("2026-11-17T17:00:00Z"), fakeFetch);
    expect(r.sent).toBe(MAX_SENDS_PER_RUN);
  });
});

describe("cron selection order (real SQLite)", () => {
  it("sends to never-sent and oldest last_sent first, so a capped run never starves the same devices", async () => {
    const { fakeEnv } = await import("./helpers/d1");
    const t = fakeEnv();
    const env = await vapidEnv(t.env.DB);
    const k = await browserKeys();
    const now = at("2026-11-17T17:00:00Z");
    const ins = t.raw.prepare("INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, hour, tz, last_sent, created_at, updated_at) VALUES (?, ?, ?, ?, 17, 'UTC', ?, ?, ?)");
    // inserted first: MAX_SENDS_PER_RUN + 4 rows sent yesterday; inserted last: one never sent, one sent a week ago
    for (let i = 0; i < MAX_SENDS_PER_RUN + 4; i++) ins.run(`recent-${i}`, `https://fcm.googleapis.com/fcm/send/r${i}`, k.p256dh, k.auth, "2026-11-16", now.getTime(), now.getTime());
    ins.run("week-old", "https://fcm.googleapis.com/fcm/send/w", k.p256dh, k.auth, "2026-11-10", now.getTime(), now.getTime());
    ins.run("never", "https://fcm.googleapis.com/fcm/send/n", k.p256dh, k.auth, null, now.getTime(), now.getTime());
    const hit: string[] = [];
    const fakeFetch = (async (url: string) => (hit.push(url.split("/").pop()!), new Response(null, { status: 201 }))) as unknown as typeof fetch;
    const r = await sendDueReminders(env, now, fakeFetch);
    expect(r.sent).toBe(MAX_SENDS_PER_RUN);
    expect(hit.slice(0, 2)).toEqual(["n", "w"]);
    const skipped = (t.raw.prepare("SELECT id FROM push_subscriptions WHERE last_sent = '2026-11-16'").all() as { id: string }[]).map((x) => x.id).sort();
    expect(skipped).toHaveLength(6);
    const tomorrow = await sendDueReminders(env, at("2026-11-18T17:00:00Z"), (async (url: string) => (hit.push(`t:${url.split("/").pop()}`), new Response(null, { status: 201 }))) as unknown as typeof fetch);
    expect(tomorrow.sent).toBe(MAX_SENDS_PER_RUN);
    // yesterday's skipped rows (oldest last_sent) go first today
    const firstTomorrow = hit.filter((h) => h.startsWith("t:")).slice(0, 6).map((h) => `recent-${h.slice(3)}`).sort();
    expect(firstTomorrow).toEqual(skipped);
  });
});
