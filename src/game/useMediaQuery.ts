import { useEffect, useState } from "react";

/** True while the media query matches (re-evaluated on resize/rotation). */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [match, setMatch] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/**
 * Where captions go during play. On portrait and short-landscape screens there is no free space beside the board,
 * so the caption is shown inside the prompt pill (it *is* the prompt being read, or a short reply to the child) and
 * never covers the prompt or anything the child can touch. Wide landscape keeps the bubble beside the mascot.
 */
export const CAPTION_IN_PROMPT_QUERY = "(orientation: portrait), (max-height: 520px)";
export const captionLength = (text: string): "s" | "m" | "l" => (text.length <= 32 ? "s" : text.length <= 60 ? "m" : "l");
