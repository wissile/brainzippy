import { createRoot } from "react-dom/client";
import { refreshReminders } from "./push";
import { registerServiceWorker } from "./register";
import { syncQueue } from "./syncQueue";
import { UpdateToast } from "./UpdateToast";

/**
 * PWA bootstrap, called once from src/main.tsx. Production builds only: in dev the Vite server owns caching.
 * Network work waits for `load` so it never competes with the first screen.
 */
export function initPwa(): void {
  syncQueue.autoFlush();
  if (!import.meta.env.PROD) return;
  registerServiceWorker();
  const host = document.createElement("div");
  host.id = "bz-pwa";
  document.body.appendChild(host);
  createRoot(host).render(<UpdateToast />);
  window.addEventListener("load", () => {
    void syncQueue.flush();
    window.setTimeout(() => void refreshReminders(), 3000);
  });
}
