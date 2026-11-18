import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production build served by `vite preview` (Worker + static assets in workerd,
 * local D1). Run `npm run db:migrate:local` once before the first run.
 */
/** PW_PORT lets several checkouts run their e2e suites at once. */
const PORT = Number(process.env.PW_PORT ?? 4173);

export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, serviceWorkers: "block", trace: "retain-on-failure", screenshot: "only-on-failure" },
  // Development behaviour comes only from .dev.vars (wrangler.jsonc's top level is APP_ENV=production); create it from the example if missing.
  webServer: { command: `(test -f .dev.vars || cp .dev.vars.example .dev.vars) && npm run build && npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}/api/health`, reuseExistingServer: false, timeout: 180_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: false } },
    { name: "phone-landscape", use: { ...devices["Pixel 7 landscape"] } },
  ],
});
