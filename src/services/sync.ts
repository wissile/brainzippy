import type { GuestProgress } from "../engine/progressSchema";
import { loadState, saveState } from "./storage";

/**
 * Optional, fire-and-forget backup of anonymous progress to D1. The game never waits on it and
 * works fully offline. The server id is a random UUID minted by the Worker; nothing identifies the child.
 */
export async function syncProgress(progress: GuestProgress): Promise<boolean> {
  try {
    let id = loadState().serverId;
    if (!id) {
      const res = await fetch("/api/guest", { method: "POST" });
      if (!res.ok) return false;
      const body = (await res.json()) as { id?: unknown };
      if (typeof body.id !== "string") return false;
      id = body.id;
      saveState({ serverId: id });
    }
    const res = await fetch(`/api/guest/${encodeURIComponent(id)}/progress`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(progress),
    });
    if (res.status === 404) saveState({ serverId: null });
    return res.ok;
  } catch {
    return false;
  }
}
