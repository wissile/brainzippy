import { useEffect, useState } from "react";
import { localDate, msUntilNextDay } from "./date";

/**
 * Today's local date, updated live: a timer fires just after local midnight, and the date is re-checked
 * every minute and whenever the page becomes visible again (sleeping tablets skip timers).
 */
export function useToday(): string {
  const [day, setDay] = useState(() => localDate(new Date()));
  useEffect(() => {
    const check = () => setDay((d) => {
      const now = localDate(new Date());
      return now === d ? d : now;
    });
    let t = 0;
    const arm = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        check();
        arm();
      }, msUntilNextDay(new Date()) + 500);
    };
    arm();
    const iv = window.setInterval(check, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") {
        check();
        arm();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);
  return day;
}
