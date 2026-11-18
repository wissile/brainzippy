/**
 * Tiny generic offline queue for API writes (e.g. progress sync). Failed requests are stored in
 * localStorage and replayed in order when the browser comes back online (or when flush() is called).
 *
 *   import { syncQueue } from "../pwa/syncQueue";
 *   syncQueue.enqueue({ url: "/api/guest/<id>/progress", method: "PUT", body: progress, key: "progress" });
 *
 * - `key` coalesces: a newer item with the same key replaces the queued one (only the latest progress matters).
 * - 2xx and 4xx responses drop the item (4xx = the server rejected it; retrying won't help). Network errors
 *   and 5xx/429 keep it for the next flush.
 * - Only same-origin /api/ URLs are accepted. Keep personal data out of queued bodies (no child names).
 */
export interface QueueItem {
  url: string;
  method: "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  key?: string;
  queuedAt: number;
}

const STORAGE_KEY = "bz.syncq.v1";
const MAX_ITEMS = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export function createSyncQueue(opts: { storage?: Storage | null; fetchImpl?: Fetch; now?: () => number } = {}) {
  let memory: QueueItem[] = [];
  const storage = () => {
    if (opts.storage !== undefined) return opts.storage;
    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null;
    }
  };
  const now = () => (opts.now ?? Date.now)();
  const doFetch: Fetch = (u, i) => (opts.fetchImpl ?? fetch)(u, i);

  const read = (): QueueItem[] => {
    try {
      const raw = storage()?.getItem(STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as unknown;
        if (Array.isArray(list)) memory = list.filter((x): x is QueueItem => !!x && typeof (x as QueueItem).url === "string" && typeof (x as QueueItem).method === "string");
      }
    } catch {
      /* corrupted: keep memory copy */
    }
    return memory.filter((x) => now() - x.queuedAt < MAX_AGE_MS);
  };
  const write = (list: QueueItem[]) => {
    memory = list.slice(-MAX_ITEMS);
    try {
      storage()?.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      /* in-memory only */
    }
  };

  let flushing: Promise<number> | null = null;

  const api = {
    enqueue(item: Omit<QueueItem, "queuedAt">): void {
      if (!item.url.startsWith("/api/")) throw new Error("syncQueue: only same-origin /api/ URLs");
      const list = read().filter((x) => !(item.key && x.key === item.key));
      list.push({ ...item, queuedAt: now() });
      write(list);
    },
    size: (): number => read().length,
    items: (): QueueItem[] => read(),
    clear: (): void => write([]),
    /** Send queued items in order; stops at the first network failure. Returns how many were removed. */
    flush(): Promise<number> {
      if (flushing) return flushing;
      flushing = (async () => {
        let removed = 0;
        for (const item of read()) {
          let res: Response;
          try {
            res = await doFetch(item.url, {
              method: item.method,
              headers: item.body === undefined ? {} : { "content-type": "application/json" },
              body: item.body === undefined ? undefined : JSON.stringify(item.body),
            });
          } catch {
            break; // still offline
          }
          if (res.status >= 500 || res.status === 429) break;
          write(read().filter((x) => x.queuedAt !== item.queuedAt || x.url !== item.url));
          removed++;
        }
        return removed;
      })().finally(() => {
        flushing = null;
      });
      return flushing;
    },
    /** Flush automatically whenever the browser reports it is back online. Returns an unsubscribe. */
    autoFlush(target: Pick<Window, "addEventListener" | "removeEventListener"> = window): () => void {
      const on = () => void api.flush();
      target.addEventListener("online", on);
      return () => target.removeEventListener("online", on);
    },
  };
  return api;
}

export const syncQueue = createSyncQueue();
