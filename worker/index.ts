import { runScheduled } from "./jobs";
import { err } from "./lib/http";
import { createRouter } from "./router";
import * as modules from "./routes";

/**
 * BrainZippy API Worker. Static assets (the SPA) are served by Workers Static Assets; only /api/* runs here
 * (`assets.run_worker_first: ["/api/*"]`). Routes live in worker/routes/*, shared helpers in worker/lib/*,
 * scheduled jobs in worker/jobs/*.
 */
const route = createRouter(Object.values(modules).flat());

export async function handleApi(req: Request, env: Env, exec?: ExecutionContext): Promise<Response> {
  return route(req, env, exec);
}

export default {
  async fetch(req, env, exec): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(req, env, exec);
      } catch (e) {
        console.error(`[api] ${req.method} ${url.pathname.replace(/\/[0-9a-f-]{16,}|\/[2-9A-Z]{5}-[2-9A-Z]{5}/g, "/:id")} failed: ${e instanceof Error ? e.name : "error"}`);
        return err("server_error", 500);
      }
    }
    return env.ASSETS.fetch(req);
  },

  /** Cron Triggers (UTC) dispatch named jobs; see worker/jobs/index.ts. */
  async scheduled(controller, env): Promise<void> {
    const failed = await runScheduled(controller.cron, env, controller.scheduledTime);
    if (failed.length) throw new Error(`jobs failed: ${failed.join(",")}`); // marks the invocation failed in Cron Events
  },
} satisfies ExportedHandler<Env>;
