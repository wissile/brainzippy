/**
 * Daily reminders — client side. Everything here runs only after a grown-up passes the parent gate and taps.
 * Notification permission is requested ONLY inside enableReminders(), which must be called from a tap
 * (Safari requires the request to come straight from the user gesture, so it is the very first await).
 *
 * Sent to our server: a random device id, the browser's push endpoint + keys, the hour and the IANA timezone.
 * Never sent: the child's name, the monster name (it is handed to the service worker on this device only).
 */
import { loadState } from "../services/storage";

const KEY = "bz.push.v1";
export const DEFAULT_HOUR = 17;
export const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 08:00 … 19:00 (quiet hours 20:00–08:00)

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  tz: string;
  deviceId: string | null;
}

export const deviceTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export function loadReminderSettings(): ReminderSettings {
  try {
    const o = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<ReminderSettings>;
    return {
      enabled: o.enabled === true,
      hour: typeof o.hour === "number" && HOURS.includes(o.hour) ? o.hour : DEFAULT_HOUR,
      tz: deviceTimeZone(),
      deviceId: typeof o.deviceId === "string" ? o.deviceId : null,
    };
  } catch {
    return { enabled: false, hour: DEFAULT_HOUR, tz: deviceTimeZone(), deviceId: null };
  }
}

function saveReminderSettings(s: ReminderSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export type PushSupport = "supported" | "ios-install" | "unsupported";

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iOS/iPadOS only offers Web Push to Home Screen web apps (16.4+). */
export function pushSupport(): PushSupport {
  const apis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isStandalone()) return "ios-install";
  return apis ? "supported" : "unsupported";
}

export const notificationPermission = (): NotificationPermission | "unsupported" => ("Notification" in window ? Notification.permission : "unsupported");

function keyBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function swRegistration(timeoutMs = 8000): Promise<ServiceWorkerRegistration> {
  const ready = navigator.serviceWorker.ready;
  const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("no-sw")), timeoutMs));
  return Promise.race([ready, timeout]);
}

/** Hand the monster name to the service worker for notification text. It stays on this device. */
async function shareLocalPrefs(reg: ServiceWorkerRegistration) {
  const monsterName = loadState().profile.monsterName;
  (reg.active ?? navigator.serviceWorker.controller)?.postMessage({ type: "PREFS", monsterName });
}

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

export type EnableResult = "on" | "denied" | "unsupported" | "server" | "failed";

/** MUST be called directly from a grown-up's tap. */
export async function enableReminders(hour: number): Promise<EnableResult> {
  if (pushSupport() !== "supported") return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const reg = await swRegistration();
    const keyRes = await fetch("/api/push/key");
    if (!keyRes.ok) return "server";
    const { publicKey } = (await keyRes.json()) as { publicKey?: string };
    if (!publicKey) return "server";
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
    const s = loadReminderSettings();
    const deviceId = s.deviceId ?? crypto.randomUUID();
    const res = await sendSubscription(sub, deviceId, hour);
    if (!res.ok) return "server";
    saveReminderSettings({ enabled: true, hour, tz: deviceTimeZone(), deviceId });
    await shareLocalPrefs(reg);
    return "on";
  } catch {
    return "failed";
  }
}

function sendSubscription(sub: PushSubscription, deviceId: string, hour: number) {
  const j = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  return postJson("/api/push/subscribe", { id: deviceId, endpoint: j.endpoint, keys: { p256dh: j.keys?.p256dh, auth: j.keys?.auth }, hour, tz: deviceTimeZone() });
}

export async function disableReminders(): Promise<void> {
  const s = loadReminderSettings();
  saveReminderSettings({ ...s, enabled: false });
  try {
    const reg = await swRegistration(3000);
    await (await reg.pushManager.getSubscription())?.unsubscribe();
  } catch {
    /* nothing to unsubscribe */
  }
  if (s.deviceId) await postJson("/api/push/unsubscribe", { id: s.deviceId }).catch(() => undefined);
}

/**
 * On app start: if reminders are on, re-send the subscription (keeps the timezone current after travel or
 * DST changes, recovers rotated endpoints, and refreshes the 180-day retention clock). Silent; never prompts.
 */
export async function refreshReminders(): Promise<void> {
  const s = loadReminderSettings();
  if (!s.enabled || !s.deviceId || notificationPermission() !== "granted" || pushSupport() !== "supported") return;
  try {
    const reg = await swRegistration();
    const sub = await reg.pushManager.getSubscription();
    if (!sub) {
      saveReminderSettings({ ...s, enabled: false });
      return;
    }
    await sendSubscription(sub, s.deviceId, s.hour);
    await shareLocalPrefs(reg);
  } catch {
    /* offline: try next time */
  }
}
