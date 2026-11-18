/**
 * Service-worker registration and safe updates.
 *
 * A new worker installs in the background and WAITS. It is activated only at a safe moment:
 *  - a grown-up taps "Update" in the small toast (shown on home / map / grown-ups only), or
 *  - the page is hidden while on home or the map (the child has switched away; nothing is interrupted).
 * Never mid-game. After activation the page reloads once so code and cache match.
 */
export const SAFE_ROUTES = ["/", "/map"];
export const TOAST_ROUTES = ["/", "/map", "/grown-ups"];

type UpdateListener = (ready: boolean) => void;
const listeners = new Set<UpdateListener>();
let waiting: ServiceWorker | null = null;
let reloading = false;

export function onUpdateReady(fn: UpdateListener): () => void {
  listeners.add(fn);
  fn(Boolean(waiting));
  return () => listeners.delete(fn);
}

function setWaiting(w: ServiceWorker | null) {
  waiting = w;
  listeners.forEach((l) => l(Boolean(w)));
}

export const isSafeRoute = (path = window.location.pathname) => SAFE_ROUTES.includes(path);

/** Activate the waiting worker. Callers must only do this on a safe screen. */
export function applyUpdate(): boolean {
  if (!waiting || !TOAST_ROUTES.includes(window.location.pathname)) return false;
  waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

/** Tell the worker which scripts already loaded before it took control (first visit), so it can cache that world. */
function reportSeen(sw: ServiceWorker) {
  const urls = performance.getEntriesByType("resource").map((e) => e.name).filter((u) => u.includes("/assets/") && u.endsWith(".js"));
  if (urls.length) sw.postMessage({ type: "SEEN", urls });
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // first install claims the page: no reload needed. Updates: reload once so code + cache match.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        const track = (w: ServiceWorker | null) => {
          if (!w) return;
          w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        track(reg.installing);
        reg.addEventListener("updatefound", () => track(reg.installing));
        void navigator.serviceWorker.ready.then((r) => r.active && reportSeen(r.active));
        // check for a new version when the app comes back to the foreground (at most hourly)
        let last = Date.now();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible" && Date.now() - last > 3_600_000) {
            last = Date.now();
            void reg.update().catch(() => undefined);
          }
          // child switched away while on a safe screen: activate silently
          if (document.visibilityState === "hidden" && waiting && isSafeRoute()) waiting.postMessage({ type: "SKIP_WAITING" });
        });
      })
      .catch(() => {
        /* no offline support in this browser/session; the app still works online */
      });
  });
}

/** Ask the worker to cache a world now (e.g. "download for offline" in a future grown-ups screen). */
export async function cacheWorldForOffline(id: string): Promise<void> {
  const reg = await navigator.serviceWorker?.ready;
  reg?.active?.postMessage({ type: "CACHE_WORLD", id });
}

/** True once every file a world needs is cached for this app version. */
export async function isWorldCached(id: string): Promise<boolean> {
  try {
    return Boolean(await (await caches.open("bz-worlds")).match(`/__bz/world/${id}`));
  } catch {
    return false;
  }
}
