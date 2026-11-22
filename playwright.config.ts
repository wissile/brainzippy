import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production build served by `vite preview` (Worker + static assets in workerd,
 * local D1). Run `npm run db:migrate:local` once before the first run.
 */
/** PW_PORT lets several checkouts run their e2e suites at once. */
const PORT = Number(process.env.PW_PORT ?? 4173);
/**
 * BZ_E2E_FLAGS=launch serves production's guest-only feature flags (D-030: accounts, billing and friends off) instead
 * of .dev.vars' development flags, by overriding them in the preview build only (scripts/preview-vars.mjs).
 * `npm run e2e:launch` runs the launch checks this way. Specs check GET /api/config and skip when the flags differ.
 */
const LAUNCH_FLAGS = process.env.BZ_E2E_FLAGS === "launch" ? " && node scripts/preview-vars.mjs ACCOUNTS_ENABLED=false BILLING_ENABLED=false FRIENDS_ENABLED=false" : "";

export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  // 2 locally (shared 2-core box); CI runners have 4 cores. CI retries absorb timing flakes and report them as "flaky".
  workers: process.env.CI ? 4 : 2,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: "block", trace: "retain-on-failure", screenshot: "only-on-failure" },
  // Development behaviour comes only from .dev.vars (wrangler.jsonc's top level is APP_ENV=production); create it from the example if missing.
  webServer: { command: `(test -f .dev.vars || cp .dev.vars.example .dev.vars) && npm run build${LAUNCH_FLAGS} && npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}/api/health`, reuseExistingServer: false, timeout: 180_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: false } },
    { name: "phone-landscape", use: { ...devices["Pixel 7 landscape"] } },
  ],
});
