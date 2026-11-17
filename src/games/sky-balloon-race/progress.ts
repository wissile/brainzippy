import { useEffect, useState } from "react";

/**
 * Round progress for in-world race visuals (track, tied balloons, parallax).
 * GameRunner does not pass round progress to skins, so we read the runner's star counter
 * (`[data-testid="stars"][data-done]`) — the same value the child sees in the top bar.
 * TODO(framework): replace with a `progress` field on BoardProps / skin component props.
 */
const read = () => Number(document.querySelector('[data-testid="stars"]')?.getAttribute("data-done") ?? 0) || 0;

export function useRaceProgress(): number {
  const [done, setDone] = useState(() => (typeof document === "undefined" ? 0 : read()));
  useEffect(() => {
    setDone(read());
    if (typeof MutationObserver === "undefined") return;
    const mo = new MutationObserver(() => setDone(read()));
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-done"] });
    return () => mo.disconnect();
  }, []);
  return done;
}
