import { useEffect, useState } from "react";
import { TOAST_ROUTES, applyUpdate, onUpdateReady } from "./register";
import "./pwa.css";

/**
 * "New version ready" — a small, quiet toast for grown-ups. Shown only on home, the map and the grown-ups page
 * (never during a game). Rendered in its own React root (src/main.tsx), so it needs no app wiring; it follows
 * the SPA route by listening to history changes.
 */
export function UpdateToast() {
  const [ready, setReady] = useState(false);
  const [path, setPath] = useState(() => window.location.pathname);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onUpdateReady(setReady), []);
  useEffect(() => {
    if (!ready) return;
    // the app routes with history.pushState (no event), so poll the path cheaply while an update waits
    const t = window.setInterval(() => setPath(window.location.pathname), 800);
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("popstate", onPop);
    };
  }, [ready]);

  if (!ready || dismissed || !TOAST_ROUTES.includes(path)) return null;
  return (
    <div className="bz-toast" role="status" data-testid="update-toast">
      <span>New version ready</span>
      <button type="button" className="bz-toast-btn" data-testid="update-apply" aria-label="Update BrainZippy now" onClick={() => applyUpdate()}>
        Update
      </button>
      <button type="button" className="bz-toast-x" aria-label="Later" onClick={() => setDismissed(true)}>
        ×
      </button>
    </div>
  );
}
