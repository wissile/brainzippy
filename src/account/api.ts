/**
 * Typed client for the parent-account API. Every call is same-origin (cookies are HttpOnly; the browser adds them).
 * Errors resolve to `{ ok: false, error }` so screens can show calm messages instead of throwing.
 */
import type { ChildProgress, ChildSettings, MonsterSpec } from "./schema";
import type { Entitlement } from "./useEntitlement";

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; status: number };

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) return { ok: false, error: typeof data.error === "string" ? data.error : "server_error", status: res.status };
    return { ok: true, ...(data as T) };
  } catch {
    return { ok: false, error: "offline", status: 0 };
  }
}

export interface ChildOut {
  id: string;
  /** The only name other families see: a pick-list combination (src/account/publicName.ts). The child-typed
   * monster name never leaves the device. */
  publicName: string;
  monster: MonsterSpec;
  ageBand: string;
  nickname: string | null;
  settings: ChildSettings;
  progress: ChildProgress;
  createdAt: number;
}
export interface Me {
  parent: { email: string; digestOptIn: boolean; createdAt: number };
  children: ChildOut[];
  entitlement: Entitlement;
  /** Server feature flags. `friends` covers friends, leaderboard and challenges (FRIENDS_ENABLED). */
  features?: { friends: boolean };
}
export interface Friend {
  id: string;
  status: "active" | "waiting-for-them" | "needs-your-approval";
  publicName: string;
  monster: MonsterSpec;
}
export interface LeaderboardEntry {
  key: string;
  me: boolean;
  publicName: string;
  monster: MonsterSpec;
  points: number;
}
export interface ChallengeView {
  worldId: string;
  level: number;
  seed: number;
  score: number;
  expiresAt: number;
  mine: boolean;
  from: { publicName: string; monster: MonsterSpec };
  players: { id: string; publicName: string }[];
  results: { childId?: string; publicName: string; score: number; beat: boolean }[];
}
export interface ChildChallenges {
  sent: { id: string; worldId: string; score: number; createdAt: number; results: { publicName: string; score: number; beat: boolean }[] }[];
  played: { id: string; worldId: string; from: string; target: number; score: number; beat: boolean }[];
}

export const api = {
  magicLink: (email: string, mode: "signup" | "signin", consent: boolean) => call<{ devLink?: string; devNote?: string }>("POST", "/api/auth/magic-link", { email, mode, ...(mode === "signup" ? { consent } : {}) }),
  logout: () => call<object>("POST", "/api/auth/logout"),
  me: () => call<Me>("GET", "/api/me"),
  setDigest: (digestOptIn: boolean) => call<{ digestOptIn: boolean }>("PUT", "/api/me", { digestOptIn }),
  deleteAccount: () => call<object>("DELETE", "/api/me", { confirm: "delete" }),
  addChild: (c: { publicName?: string; monster: MonsterSpec; ageBand: string; progress?: ChildProgress }) => call<{ child: ChildOut }>("POST", "/api/children", c),
  updateChild: (id: string, patch: { publicName?: string; nickname?: string | null; ageBand?: string }) => call<{ child: ChildOut }>("PUT", `/api/children/${id}`, patch),
  deleteChild: (id: string) => call<object>("DELETE", `/api/children/${id}`),
  getSettings: (id: string) => call<{ settings: ChildSettings }>("GET", `/api/children/${id}/settings`),
  putSettings: (id: string, s: Partial<ChildSettings>) => call<{ settings: ChildSettings }>("PUT", `/api/children/${id}/settings`, s),
  sync: (id: string, progress: ChildProgress) => call<{ progress: ChildProgress; settings: ChildSettings }>("POST", `/api/children/${id}/sync`, { progress }),
  createInvite: (id: string) => call<{ code: string; link: string; expiresAt: number }>("POST", `/api/children/${id}/invites`),
  peekInvite: (code: string) => call<{ from: { publicName: string; monster: MonsterSpec }; ownChild: boolean }>("GET", `/api/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string, childId: string) => call<{ friendshipId: string }>("POST", `/api/invites/${encodeURIComponent(code)}/accept`, { childId }),
  friends: (id: string) => call<{ friends: Friend[] }>("GET", `/api/children/${id}/friends`),
  approveFriend: (fid: string) => call<object>("POST", `/api/friendships/${fid}/approve`),
  removeFriend: (fid: string) => call<object>("DELETE", `/api/friendships/${fid}`),
  leaderboard: (id: string, today: string) => call<{ week: string; entries: LeaderboardEntry[] }>("GET", `/api/children/${id}/leaderboard?today=${today}`),
  createChallenge: (c: { childId: string; worldId: string; level: number; seed: number; score: number }) => call<{ token: string; link: string }>("POST", "/api/challenges", c),
  challenge: (token: string) => call<ChallengeView>("GET", `/api/challenges/${encodeURIComponent(token)}`),
  challengeResult: (token: string, childId: string, score: number) => call<{ score: number; target: number; beat: boolean }>("POST", `/api/challenges/${encodeURIComponent(token)}/result`, { childId, score }),
  childChallenges: (id: string) => call<ChildChallenges>("GET", `/api/children/${id}/challenges`),
};
