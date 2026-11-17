import { defineConfig, devices } from "@playwright/test";

/**
 * E2E runs against the production build served by `vite preview` (Worker + static assets in workerd,
 * local D1). Run `npm run db:migrate:local` once before the first run.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: { command: "npm run build && npx vite preview --port 4173 --strictPort", url: "http://localhost:4173/api/health", reuseExistingServer: true, timeout: 180_000 },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: false } },
    { name: "phone-landscape", use: { ...devices["Pixel 7 landscape"] } },
  ],
});
