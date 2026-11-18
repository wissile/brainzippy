import { expect, test } from "@playwright/test";

/** Static responses carry the hardened headers from public/_headers (served by Workers Static Assets in vite preview). */
test("static pages send HSTS, COOP and a CSP that allows only same-origin workers", async ({ request }, info) => {
  test.skip(info.project.name !== "desktop", "headers are device-independent");
  for (const path of ["/", "/sw.js"]) {
    const res = await request.get(path);
    expect(res.ok()).toBe(true);
    const h = res.headers();
    expect(h["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
    expect(h["cross-origin-opener-policy"]).toBe("same-origin");
    expect(h["content-security-policy"]).toContain("worker-src 'self'");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  }
  const api = await request.get("/api/health");
  expect(api.headers()["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
});
