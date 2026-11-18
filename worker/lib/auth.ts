import type { Ctx } from "../router";
import { err } from "./http";
import type { Session } from "./session";
import { isUuid } from "./validation";

/** Returns the session or a 401 response. */
export async function requireParent(c: Ctx): Promise<Session | Response> {
  return (await c.session()) ?? err("unauthorized", 401);
}

export interface ChildRow {
  id: string;
  parent_id: string;
  monster_json: string;
  /** Parent-chosen public name (validated against the pick lists); NULL = deterministic default. */
  public_name: string | null;
  age_band: string;
  nickname: string | null;
  settings_json: string;
  progress_json: string;
  created_at: number;
  updated_at: number;
}

/** Loads a child only if it belongs to the signed-in parent (404 otherwise, so ids can't be probed). */
export async function ownChild(c: Ctx, s: Session, id: string | undefined): Promise<ChildRow | Response> {
  if (!isUuid(id)) return err("not_found", 404);
  const row = await c.env.DB.prepare("SELECT * FROM children WHERE id = ? AND parent_id = ?").bind(id, s.parentId).first<ChildRow>();
  return row ?? err("not_found", 404);
}
