/**
 * BrainZippy service worker (compiled to /sw.js by scripts/pwa-plugin.ts with the build data inlined).
 *
 * Strategies
 *  - App shell (entry JS/CSS, fonts, SFX, icons, "/", offline page): precached at install, cache-first.
 *  - Navigations: network-first (4 s cap for app routes) → cached shell → offline.html for anything else.
 *  - /assets/* not precached (game chunks): cache-first, filled at runtime. Opening a world caches its whole
 *    bundle: chunk + deps + CSS, its music, its voice clips, plus the shared clips/music.
 *  - Voice + music: cache-first with a content revision, so re-rendered clips replace stale copies.
 *  - /api/*: never touched (the browser goes straight to the network; nothing is cached).
 *  - Updates: a new worker waits; the page tells it to activate only on a safe screen (see register.ts).
 *  - Push: shows the daily reminder (monster name comes from this device only); click opens "/".
 */
import BUILD from "virtual:bz-sw-data";
import { REMINDER_TITLE, reminderBody } from "./reminderCopy";


// --- minimal service-worker typings (the app tsconfig uses the DOM lib, not WebWorker) ---
interface BzExtendableEvent extends Event {
  waitUntil(p: Promise<unknown>): void;
}
interface BzFetchEvent extends BzExtendableEvent {
  request: Request;
  respondWith(r: Response | Promise<Response>): void;
}
interface BzMessageEvent extends BzExtendableEvent {
  data: unknown;
}
interface BzPushEvent extends BzExtendableEvent {
  data: { json(): unknown; text(): string } | null;
}
interface BzNotificationEvent extends BzExtendableEvent {
  notification: Notification;
}
interface BzWindowClient {
  url: string;
  focus(): Promise<unknown>;
}
interface BzEvents {
  install: BzExtendableEvent;
  activate: BzExtendableEvent;
  fetch: BzFetchEvent;
  message: BzMessageEvent;
  push: BzPushEvent;
  notificationclick: BzNotificationEvent;
}
interface BzScope {
  registration: ServiceWorkerRegistration;
  location: Location;
  clients: { claim(): Promise<void>; matchAll(o: { type: "window"; includeUncontrolled: boolean }): Promise<BzWindowClient[]>; openWindow(url: string): Promise<unknown> };
  skipWaiting(): Promise<void>;
  addEventListener<K extends keyof BzEvents>(type: K, fn: (e: BzEvents[K]) => void): void;
}
const sw = self as unknown as BzScope;

const B = BUILD;
const PRE = `bz-pre-${B.version}`;
const ASSETS = "bz-assets";
const MEDIA = "bz-media";
const WORLDS = "bz-worlds";
const LOCAL = "bz-local";
const PREFS_URL = "/__bz/prefs";
const worldMarker = (id: string) => `/__bz/world/${id}`;

const precacheSet = new Set(B.precache);
const assetSet = new Set(B.assets);
const worldByEntry = new Map(Object.entries(B.worlds).map(([id, w]) => [w.entry, id]));
/** Client-side routes rendered by the SPA shell. Anything else offline gets offline.html. */
const APP_ROUTE = /^\/(?:play(?:\/[a-z0-9-]+)?|map|hello|grown-ups)?\/?$/;

/** Store a response without redirect flags (a redirected response can't answer a navigation). */
async function clean(res: Response, extraHeaders: Record<string, string> = {}): Promise<Response> {
  if (!res.redirected && !Object.keys(extraHeaders).length) return res;
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers });
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) await fn(items[i++] as T);
    }),
  );
}

// ---------------------------------------------------------------- install / activate
sw.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(PRE);
      await pool(B.precache, 6, async (u) => {
        const res = await fetch(u, { cache: "reload" });
        if (!res.ok) throw new Error(`precache ${u}: ${res.status}`);
        await cache.put(u, await clean(res));
      });
    })(),
  );
});

sw.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith("bz-pre-") && k !== PRE) await caches.delete(k);
      // drop hashed assets from older builds
      const assets = await caches.open(ASSETS);
      for (const req of await assets.keys()) if (!assetSet.has(new URL(req.url).pathname)) await assets.delete(req);
      // drop voice/music whose content changed (or that no longer exist)
      const media = await caches.open(MEDIA);
      for (const req of await media.keys()) {
        const p = new URL(req.url).pathname;
        const res = await media.match(req);
        if (!B.revs[p] || res?.headers.get("x-bz-rev") !== B.revs[p]) await media.delete(req);
      }
      await sw.clients.claim();
    })().then(() => {
      // best effort, not blocking activation: refresh worlds the child already opened
      void refreshVisitedWorlds();
    }),
  );
});

// ---------------------------------------------------------------- world caching
const inflight = new Map<string, Promise<boolean>>();

async function worldReady(id: string): Promise<boolean> {
  const m = await (await caches.open(WORLDS)).match(worldMarker(id));
  if (!m) return false;
  const v = ((await m.json().catch(() => ({}))) as { version?: string }).version;
  return v === B.version;
}

async function fill(cacheName: string, urls: string[], media: boolean): Promise<number> {
  const cache = await caches.open(cacheName);
  let failed = 0;
  await pool(urls, 6, async (u) => {
    try {
      if (await cache.match(u)) return;
      const res = await fetch(u);
      if (!res.ok || res.status !== 200) throw new Error(String(res.status));
      await cache.put(u, await clean(res, media ? { "x-bz-rev": B.revs[u] ?? "" } : {}));
    } catch {
      failed++;
    }
  });
  return failed;
}

/** Cache everything a world needs to play offline. Resolves true when the world is complete. */
function cacheWorld(id: string): Promise<boolean> {
  const w = B.worlds[id];
  if (!w) return Promise.resolve(false);
  let p = inflight.get(id);
  if (p) return p;
  p = (async () => {
    if (await worldReady(id)) return true;
    const failed = (await fill(ASSETS, [w.entry, ...w.assets], false)) + (await fill(MEDIA, [...w.music, ...w.voice, ...B.shared.music, ...B.shared.voice], true));
    if (failed) return false;
    await (await caches.open(WORLDS)).put(worldMarker(id), new Response(JSON.stringify({ version: B.version, at: Date.now() }), { headers: { "content-type": "application/json" } }));
    return true;
  })().finally(() => inflight.delete(id));
  inflight.set(id, p);
  return p;
}

async function refreshVisitedWorlds() {
  const worlds = await caches.open(WORLDS);
  for (const req of await worlds.keys()) {
    const id = new URL(req.url).pathname.split("/").pop() ?? "";
    if (B.worlds[id]) await cacheWorld(id);
    else await worlds.delete(req);
  }
}

// ---------------------------------------------------------------- fetch
async function cacheFirst(req: Request, cacheName: string, media: boolean): Promise<Response> {
  const path = new URL(req.url).pathname;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(path);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200 && !req.headers.has("range")) {
    const copy = res.clone();
    void clean(copy, media ? { "x-bz-rev": B.revs[path] ?? "" } : {}).then((r) => cache.put(path, r)).catch(() => undefined);
  }
  return res;
}

async function precached(path: string): Promise<Response | undefined> {
  return (await caches.open(PRE)).match(path);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e: unknown) => (clearTimeout(t), reject(e instanceof Error ? e : new Error(String(e)))),
    );
  });
}

async function navigate(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  const app = APP_ROUTE.test(path);
  try {
    const net = fetch(req);
    return await (app ? withTimeout(net, 4000) : net);
  } catch {
    if (app) {
      const shell = await precached("/");
      if (shell) return shell;
    }
    return (await precached("/offline.html")) ?? new Response("You're offline.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
  }
}

sw.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== sw.location.origin) return;
  const path = url.pathname;
  if (path.startsWith("/api/")) return; // network only, never cached

  if (req.mode === "navigate") return e.respondWith(navigate(req));
  if (precacheSet.has(path) && path !== "/") return e.respondWith(precached(path).then((r) => r ?? fetch(req)));
  if (path.startsWith("/assets/")) {
    const world = worldByEntry.get(path);
    if (world) e.waitUntil(cacheWorld(world));
    return e.respondWith(cacheFirst(req, ASSETS, false));
  }
  if (/^\/audio\/(voice|music)\/[^/]+\.mp3$/.test(path)) return e.respondWith(cacheFirst(req, MEDIA, true));
});

// ---------------------------------------------------------------- messages from the page
sw.addEventListener("message", (e) => {
  const d = e.data as { type?: string; urls?: unknown; id?: unknown; monsterName?: unknown } | null;
  if (!d || typeof d !== "object") return;
  if (d.type === "SKIP_WAITING") void sw.skipWaiting();
  if (d.type === "SEEN" && Array.isArray(d.urls)) {
    for (const u of d.urls) {
      if (typeof u !== "string") continue;
      const id = worldByEntry.get(new URL(u, sw.location.origin).pathname);
      if (id) e.waitUntil(cacheWorld(id));
    }
  }
  if (d.type === "CACHE_WORLD" && typeof d.id === "string") e.waitUntil(cacheWorld(d.id));
  if (d.type === "PREFS") {
    const name = typeof d.monsterName === "string" ? d.monsterName.replace(/[^\p{L}\p{M} '\-]/gu, "").slice(0, 16) : "";
    e.waitUntil(caches.open(LOCAL).then((c) => c.put(PREFS_URL, new Response(JSON.stringify({ monsterName: name }), { headers: { "content-type": "application/json" } }))));
  }
});

// ---------------------------------------------------------------- push
async function localMonsterName(): Promise<string> {
  try {
    const r = await (await caches.open(LOCAL)).match(PREFS_URL);
    const o = r ? ((await r.json()) as { monsterName?: unknown }) : {};
    return typeof o.monsterName === "string" ? o.monsterName : "";
  } catch {
    return "";
  }
}

sw.addEventListener("push", (e) => {
  e.waitUntil(
    (async () => {
      let data: { variant?: unknown; title?: unknown; body?: unknown } = {};
      try {
        data = (e.data?.json() ?? {}) as typeof data;
      } catch {
        /* non-JSON payload: use defaults */
      }
      const name = await localMonsterName();
      const body = typeof data.variant === "number" ? reminderBody(data.variant, name) : typeof data.body === "string" ? data.body : reminderBody(0, name);
      await sw.registration.showNotification(typeof data.title === "string" ? data.title : REMINDER_TITLE, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: "bz-daily",
        lang: "en",
        data: { url: "/" },
      });
    })(),
  );
});

sw.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    (async () => {
      const wins = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
      // focus an open BrainZippy window (never navigate it: a child may be mid-game); otherwise open "/"
      const open = wins.find((w) => new URL(w.url).origin === sw.location.origin);
      if (open) await open.focus();
      else await sw.clients.openWindow("/");
    })(),
  );
});
