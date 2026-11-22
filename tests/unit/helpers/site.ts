import { vi } from "vitest";
import type { SiteFlags } from "../../../src/site/flags";

/**
 * Imports the public site as scripts/prerender.mjs would for an environment with the given flags. The site reads its
 * flags once at import time (src/site/flags.ts), so modules are reset first. A plain static import is the production
 * default (billing off).
 */
export async function importSite(flags: SiteFlags) {
  // unspecified flags default to off (production)
  vi.resetModules();
  (globalThis as Record<string, unknown>).__BZ_SITE_FLAGS__ = flags;
  try {
    const [build, entity, routes, llms, faq] = await Promise.all([
      import("../../../src/site/build"),
      import("../../../src/site/entity"),
      import("../../../src/site/routes"),
      import("../../../src/site/llms"),
      import("../../../src/site/content/faq"),
    ]);
    return { ...build, ...entity, ...routes, ...llms, ...faq };
  } finally {
    delete (globalThis as Record<string, unknown>).__BZ_SITE_FLAGS__;
  }
}
