import { describe, expect, it } from "vitest";
import { createSyncQueue } from "../../src/pwa/syncQueue";

function memStorage(): Storage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: () => null, get length() { return m.size; } } as Storage;
}

describe("syncQueue", () => {
  it("queues, coalesces by key, persists, and flushes in order once online", async () => {
    const storage = memStorage();
    let online = false;
    const sent: string[] = [];
    let t = 1000;
    const fetchImpl = async (url: string, init: RequestInit) => {
      if (!online) throw new TypeError("Failed to fetch");
      sent.push(`${init.method} ${url} ${String(init.body ?? "")}`);
      return new Response(null, { status: 200 });
    };
    const q = createSyncQueue({ storage, fetchImpl, now: () => t++ });
    q.enqueue({ url: "/api/guest/a/progress", method: "PUT", body: { n: 1 }, key: "progress" });
    q.enqueue({ url: "/api/other", method: "POST" });
    q.enqueue({ url: "/api/guest/a/progress", method: "PUT", body: { n: 2 }, key: "progress" });
    expect(q.size()).toBe(2);
    expect(await q.flush()).toBe(0); // offline: nothing lost
    expect(q.size()).toBe(2);

    // survives a reload
    const q2 = createSyncQueue({ storage, fetchImpl, now: () => t++ });
    expect(q2.size()).toBe(2);
    online = true;
    expect(await q2.flush()).toBe(2);
    expect(sent).toEqual(["POST /api/other ", 'PUT /api/guest/a/progress {"n":2}']);
    expect(q2.size()).toBe(0);
  });

  it("keeps items on 5xx/429, drops them on 4xx, refuses non-API URLs", async () => {
    let status = 503;
    const q = createSyncQueue({ storage: memStorage(), fetchImpl: async () => new Response(null, { status }) });
    q.enqueue({ url: "/api/x", method: "POST" });
    expect(await q.flush()).toBe(0);
    expect(q.size()).toBe(1);
    status = 400;
    expect(await q.flush()).toBe(1);
    expect(q.size()).toBe(0);
    expect(() => q.enqueue({ url: "https://evil.example/api", method: "POST" })).toThrow();
  });

  it("flushes on the online event", async () => {
    let calls = 0;
    const q = createSyncQueue({ storage: memStorage(), fetchImpl: async () => (calls++, new Response(null, { status: 204 })) });
    q.enqueue({ url: "/api/x", method: "POST" });
    const target = new EventTarget();
    const off = q.autoFlush(target as unknown as Window);
    target.dispatchEvent(new Event("online"));
    await new Promise((r) => setTimeout(r, 0));
    expect(calls).toBe(1);
    off();
  });
});
