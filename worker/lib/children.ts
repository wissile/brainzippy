import { emptyChildProgress, DEFAULT_SETTINGS, parseChildProgress, type ChildProgress, type ChildSettings, type MonsterSpec } from "../../src/account/schema";
import { publicNameFor } from "../../src/account/publicName";
import type { ChildRow } from "./auth";

export interface ChildOut {
  id: string;
  /** The only name other families ever see (src/account/publicName.ts). */
  publicName: string;
  monster: MonsterSpec;
  ageBand: string;
  nickname: string | null;
  settings: ChildSettings;
  progress: ChildProgress;
  createdAt: number;
}

const safeParse = (s: string): unknown => {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
};

export const rowProgress = (row: Pick<ChildRow, "progress_json">) => parseChildProgress(safeParse(row.progress_json)) ?? emptyChildProgress();
export const rowSettings = (row: Pick<ChildRow, "settings_json">): ChildSettings => ({ ...DEFAULT_SETTINGS, ...(safeParse(row.settings_json) as Partial<ChildSettings> | null) });
export const rowPublicName = (row: { id: string; public_name: string | null }) => publicNameFor(row.id, row.public_name);
export const rowMonster = (row: Pick<ChildRow, "monster_json">) => safeParse(row.monster_json) as MonsterSpec;

export function childOut(row: ChildRow): ChildOut {
  return {
    id: row.id,
    publicName: publicNameFor(row.id, row.public_name),
    monster: rowMonster(row),
    ageBand: row.age_band,
    nickname: row.nickname,
    settings: rowSettings(row),
    progress: rowProgress(row),
    createdAt: row.created_at,
  };
}

/** Statements that hard-delete children and everything that references them (explicit, not relying on cascades). */
export function deleteChildrenStatements(db: D1Database, childIds: string[]): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = [];
  for (const id of childIds) {
    out.push(
      db.prepare("DELETE FROM challenge_results WHERE child_id = ? OR challenge_id IN (SELECT id FROM challenges WHERE from_child = ?)").bind(id, id),
      db.prepare("DELETE FROM challenges WHERE from_child = ?").bind(id),
      db.prepare("DELETE FROM friendships WHERE child_a = ? OR child_b = ?").bind(id, id),
      db.prepare("DELETE FROM friend_invites WHERE child_id = ?").bind(id),
      db.prepare("DELETE FROM children WHERE id = ?").bind(id),
    );
  }
  return out;
}
