import type { Route } from "../router";
import { json } from "../lib/http";

export const routes: Route[] = [{ method: "GET", path: "/api/health", handler: ({ env }) => json({ ok: true, env: env.APP_ENV }) }];
