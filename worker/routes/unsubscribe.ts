import type { Route } from "../router";
import { appOrigin, signingSecret } from "../lib/config";
import { hmacHex, verifyHmac } from "../lib/crypto";
import { esc, html } from "../lib/http";
import { isUuid } from "../lib/validation";

/**
 * One-click unsubscribe from the daily digest. Authenticated by an HMAC signature over the parent id (no sign-in).
 * - GET shows a page with a single "Unsubscribe" button (so link prefetchers never change anything).
 * - POST unsubscribes. Mail providers send RFC 8058 one-click POSTs (body `List-Unsubscribe=One-Click`) cross-origin,
 *   so this route is exempt from the same-origin check; the signature is the authorisation.
 */
const PURPOSE = "digest-unsubscribe";

export async function unsubscribeUrl(env: Env, url: URL, parentId: string): Promise<string | null> {
  const secret = signingSecret(env, url);
  if (!secret) return null;
  const sig = await hmacHex(secret, `${PURPOSE}:${parentId}`);
  return `${appOrigin(env, url)}/api/unsubscribe?p=${parentId}&s=${sig}`;
}

async function verified(env: Env, url: URL): Promise<string | null> {
  const p = url.searchParams.get("p") ?? "";
  const sig = url.searchParams.get("s") ?? "";
  const secret = signingSecret(env, url);
  if (!secret || !isUuid(p)) return null;
  return (await verifyHmac(secret, `${PURPOSE}:${p}`, sig)) ? p : null;
}

const invalid = () => html("<h1>Link not valid</h1><p>You can turn daily summaries off in the parent area instead.</p><p><a class=\"btn\" href=\"/parents\">Open the parent area</a></p>", 400);

export const routes: Route[] = [
  {
    method: "GET",
    path: "/api/unsubscribe",
    async handler({ env, url }) {
      if (!(await verified(env, url))) return invalid();
      return html(
        `<h1>Stop daily summaries?</h1><p>You will no longer get the daily BrainZippy progress email. Your account is not affected.</p>
<form method="post" action="/api/unsubscribe?p=${esc(url.searchParams.get("p")!)}&amp;s=${esc(url.searchParams.get("s")!)}"><button type="submit" data-testid="unsubscribe-confirm">Unsubscribe</button></form>`,
      );
    },
  },
  {
    method: "POST",
    path: "/api/unsubscribe",
    crossOrigin: true,
    async handler({ env, url }) {
      const parentId = await verified(env, url);
      if (!parentId) return invalid();
      await env.DB.prepare("UPDATE parents SET digest_opt_in = 0 WHERE id = ?").bind(parentId).run();
      return html("<h1>You're unsubscribed</h1><p>We won't send daily summaries any more. You can turn them back on in the parent area.</p>");
    },
  },
];
