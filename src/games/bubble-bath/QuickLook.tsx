import { useEffect, useRef, useState } from "react";
import { audio } from "../../audio/AudioEngine";
import type { BoardProps } from "../../game/boards";
import { BUBBLE_R, spotsOf, type Spot } from "./generator";
import { seenStore, useCommon } from "./shared";

/**
 * Quick Look — a few bubbles bob up on the bath water for a moment, then the foam covers them: how many? (number +
 * three choices in the tray, each a numeral with its dot picture). The look starts only once the prompt (and the
 * round-start helper) has finished, so nothing is missed while listening; Peek shows them again, as often as the child
 * likes. Answers are never timed. First miss: the bubbles stay visible with a ring round each little group (2 and 1,
 * 2 and 2, 3 and 2…). Second miss: Gloop counts them one by one and the right answer glows.
 */
const QUIET_MS = 400;
const WAIT_CAP_MS = 8000;

/** One ring per little group: centred on the group, wide enough for its bubbles. */
export function groupRings(spots: readonly Spot[]): { cx: number; cy: number; r: number }[] {
  const groups = [...new Set(spots.map((s) => s.g))];
  return groups.map((g) => {
    const mine = spots.filter((s) => s.g === g);
    const cx = mine.reduce((t, s) => t + s.x, 0) / mine.length;
    const cy = mine.reduce((t, s) => t + s.y, 0) / mine.length;
    const r = Math.max(...mine.map((s) => Math.hypot(s.x - cx, s.y - cy))) + BUBBLE_R + 4;
    return { cx, cy, r };
  });
}

export function QuickLookBoard({ st, alongIndex, busy }: BoardProps) {
  const ex = st.exercise;
  const p = ex.params ?? {};
  const n = ex.answer.kind === "number" ? ex.answer.value : 0;
  const spots = spotsOf(ex);
  const showMs = p.show ?? 2500;
  const { reducedMotion, speaking, canAct, celebrate } = useCommon(st);
  const [show, setShow] = useState<"wait" | "on" | "off">("wait");
  const [peeks, setPeeks] = useState(0);
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;
  const hideTimer = useRef(0);

  const reveal = () => {
    window.clearTimeout(hideTimer.current);
    setShow("on");
    seenStore.set({ exId: ex.id, seen: true });
    audio.play("pickup", { gain: 0.35, rate: 1.4 });
    hideTimer.current = window.setTimeout(() => setShow("off"), showMs);
  };
  // wait for a quiet moment (prompt spoken, helper gone), then show the bubbles
  useEffect(() => {
    if (show !== "wait") return;
    const t0 = Date.now();
    let quietSince = 0;
    const id = window.setInterval(() => {
      const now = Date.now();
      const quiet = !speakingRef.current && !document.querySelector('[data-testid="helper"]');
      quietSince = quiet ? quietSince || now : 0;
      if ((quietSince && now - quietSince >= QUIET_MS) || now - t0 > WAIT_CAP_MS) {
        window.clearInterval(id);
        reveal();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    window.clearTimeout(hideTimer.current);
    seenStore.set({ exId: "", seen: false });
  }, []);

  const helped = st.hintStage >= 1;
  const visible = show === "on" || st.phase !== "answering" || helped;
  const modelOn = st.model !== null;
  const alongNow = st.phase === "feedback" && alongIndex >= 0 ? alongIndex : modelOn ? n - 1 : -1;
  const canPeek = canAct && show === "off" && !visible;
  const rings = helped && !celebrate ? groupRings(spots) : [];
  const w = p.w ?? 100;
  const h = p.h ?? 60;
  return (
    <div className={`gb-board mode-look ${celebrate ? "is-celebrating" : ""} ${reducedMotion ? "still" : ""}`} data-testid="gb-board" data-mode="look" data-n={n} data-seen={show !== "wait"} data-visible={visible}>
      <div className="gb-pool">
        <svg className={`gb-look-svg ${visible ? "is-on" : "is-off"}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={visible ? `${n} ${n === 1 ? "bubble" : "bubbles"}` : "The foam is covering the bubbles"} data-testid="look-bubbles">
          {rings.map((r, i) => <circle key={`r${i}`} cx={r.cx} cy={r.cy} r={r.r} className="gb-ring" data-testid="group-ring" />)}
          {spots.map((s, i) => (
            <g key={`${i}-${peeks}`} className="gb-lb" style={{ "--i": i } as React.CSSProperties}>
              <circle cx={s.x} cy={s.y} r={BUBBLE_R} className={`gb-lb-ball ${i <= alongNow ? "is-along" : ""} ${i === alongNow && st.phase === "feedback" ? "along-now" : ""}`} />
              <path d={`M${s.x - 5} ${s.y - 2} Q${s.x - 4} ${s.y - 6} ${s.x} ${s.y - 6.5}`} className="gb-lb-shine" />
              {i <= alongNow && <text x={s.x} y={s.y + 3.4} textAnchor="middle" className="gb-lb-num">{i + 1}</text>}
            </g>
          ))}
        </svg>
        {!visible && (
          <div className="gb-foam" aria-hidden="true" data-testid="foam">
            <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
              {[[40, 60, 30], [80, 46, 36], [124, 56, 32], [160, 64, 26], [100, 72, 30], [60, 78, 22], [146, 40, 20]].map(([x, y, r], i) => (
                <circle key={i} cx={x} cy={y} r={r} fill="#fff" stroke="#9BD6E3" strokeWidth="3" />
              ))}
            </svg>
          </div>
        )}
      </div>
      <div className="gb-side">
        <button
          type="button"
          className={`gb-tool gb-peek ${canPeek ? "is-awake" : ""}`}
          data-testid="peek"
          data-gb-idle=""
          aria-disabled={!canPeek}
          aria-label="Peek: see the bubbles again"
          onClick={() => {
            if (!canPeek) return;
            busy?.();
            setPeeks((k) => k + 1);
            reveal();
          }}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="M4 24 Q24 6 44 24 Q24 42 4 24 Z" fill="#fff" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
            <circle cx="24" cy="24" r="8" fill="#1F6F8B" stroke="currentColor" strokeWidth="3" />
            <circle cx="26" cy="21" r="2.5" fill="#fff" />
          </svg>
        </button>
      </div>
      <p className="sr-only">{ex.a11yDescription}</p>
    </div>
  );
}
