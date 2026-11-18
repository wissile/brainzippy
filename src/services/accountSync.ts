import { api } from "../account/api";
import { applyToGuest, guestToChildProgress, mergeHistory } from "../account/merge";
import { roundPoints } from "../account/points";
import type { ChildSettings } from "../account/schema";
import { loadState, onRoundRecorded, saveState, type ActiveChallenge } from "./storage";

/**
 * Local-first account sync. The device is the source of play; when a signed-in parent has linked this device to a
 * child profile, each finished round is pushed (fire-and-forget) and the merged result folded back in.
 * Gameplay never waits on the network; failures are silent and retried after the next round.
 * Only ChildProgress (levels, stars, stickers, tallies, round history) is sent: never the child's name.
 */
let started = false;

/** Apply the parent's per-child settings on this device (sound, music) and cache them (daily limit). */
function applySettings(settings: ChildSettings) {
  const st = loadState();
  if (!st.account) return;
  const prev = st.account.settings;
  if (prev && prev.sound === settings.sound && prev.music === settings.music && prev.dailyLimit === settings.dailyLimit) return;
  // Only when the parent's choice changed, so the child's own mute toggle isn't overridden after every round.
  const audio = !prev || prev.sound !== settings.sound || prev.music !== settings.music ? { muted: !settings.sound, music: settings.music } : {};
  saveState({ account: { ...st.account, settings }, ...audio });
}

/** Push this device's progress to the linked child and fold the merged result back. Resolves false on any failure. */
export async function syncNow(): Promise<boolean> {
  const st = loadState();
  if (!st.account) return false;
  const res = await api.sync(st.account.childId, guestToChildProgress(st.progress, st.history));
  if (!res.ok) {
    if (res.status === 404) saveState({ account: null }); // child deleted elsewhere: unlink quietly
    return false;
  }
  const now = loadState();
  saveState({ progress: applyToGuest(now.progress, res.progress), history: mergeHistory(now.history, res.progress.history) });
  applySettings(res.settings);
  return true;
}

/** Link this device to a child profile, merging the device's guest progress into it. */
export async function linkDevice(childId: string): Promise<boolean> {
  saveState({ account: { childId, linkedAt: Date.now(), settings: null } });
  return syncNow();
}

export function unlinkDevice() {
  saveState({ account: null });
}

export function startChallenge(c: Omit<ActiveChallenge, "startedAt" | "result">) {
  saveState({ challenge: { ...c, startedAt: Date.now(), result: null } });
}

/** Post a finished challenge round (retried on the next round or visit if offline). */
export async function postChallengeResult(): Promise<void> {
  const c = loadState().challenge;
  if (!c?.result || c.result.posted) return;
  const res = await api.challengeResult(c.token, c.childId, c.result.score);
  const latest = loadState().challenge;
  if (res.ok && latest?.token === c.token) saveState({ challenge: { ...latest, result: { score: res.score, beat: res.beat, posted: true } } });
}

export function startAccountSync() {
  if (started) return;
  started = true;
  onRoundRecorded((record, state) => {
    const c = state.challenge;
    if (c && !c.result && c.gameId === record.gameId && record.ts - c.startedAt < 2 * 3600_000) {
      const score = roundPoints(record);
      saveState({ challenge: { ...c, result: { score, beat: score > c.target, posted: false } } });
      void postChallengeResult();
    }
    if (state.account) void syncNow();
  });
}
