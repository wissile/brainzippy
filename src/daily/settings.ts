import { DAILY_LIMIT, clampDailyLimit, loadState, saveState } from "../services/storage";

/**
 * Daily-learning settings behind one small adapter, so the storage can move to the parent account
 * (GET/PUT /api/children/:id/settings) without touching the UI. Today: this device only.
 * Changing the limit is a grown-up action: the UI shows it only behind the parent gate.
 */
export interface DailySettings {
  /** Completed rounds per local day before play pauses until tomorrow (3–10, default 5). */
  limit: number;
}
export interface DailySettingsAdapter {
  read(): DailySettings;
  write(next: DailySettings): void | Promise<void>;
}

export { DAILY_LIMIT };
export const clampLimit = clampDailyLimit;

/** Local adapter: the setting lives in the device's guest state (cleared by "Delete all progress"). */
export const localSettingsAdapter: DailySettingsAdapter = {
  read: () => ({ limit: clampDailyLimit(loadState().dailyLimit) }),
  write: (next) => {
    saveState({ dailyLimit: clampDailyLimit(next.limit) });
  },
};

let adapter: DailySettingsAdapter = localSettingsAdapter;

/** Swap the storage (e.g. an account-backed adapter that caches locally and PUTs to the Worker). */
export function setDailySettingsAdapter(next: DailySettingsAdapter): void {
  adapter = next;
}

export const getDailySettings = (): DailySettings => {
  try {
    return { limit: clampDailyLimit(adapter.read().limit) };
  } catch {
    return { limit: DAILY_LIMIT.default }; // settings must never block play
  }
};

export async function setDailyLimit(limit: number): Promise<number> {
  const clamped = clampDailyLimit(limit);
  await adapter.write({ ...getDailySettings(), limit: clamped });
  return clamped;
}
