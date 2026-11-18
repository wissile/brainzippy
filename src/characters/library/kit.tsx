import { useEffect, useState, type ReactNode } from "react";
import type { MascotState } from "../../engine/types";
import { INK } from "../palette";

/**
 * Shared construction kit for the library hosts. It follows Bobbo's build exactly: 200×230 viewBox, ground
 * shadow at y 218, 5–5.5 ink outline, white eyes with an ink pupil and a white shine, pink cheeks, and a mouth
 * that maps to the MascotState (laugh when greeting or celebrating, little "o" when thinking, wobble on retry,
 * flapping while talking). State motion lives in characters.css (shared) + library-characters.css (signatures).
 */
export interface HostProps {
  state?: MascotState;
  talking?: boolean;
  size?: number | string;
  className?: string;
}

export type Mouth = "smile" | "laugh" | "o" | "wobble" | "sleep";

/** Random blink (2.4–5 s, like Bobbo) and a 150 ms mouth flap while talking. */
export function useFace(state: MascotState, talking: boolean) {
  const [blink, setBlink] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let t: number | undefined;
    const loop = () => {
      t = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 140);
        loop();
      }, 2400 + Math.random() * 2600);
    };
    loop();
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!talking) {
      setOpen(false);
      return;
    }
    const id = window.setInterval(() => setOpen((o) => !o), 150);
    return () => window.clearInterval(id);
  }, [talking]);

  const asleep = state === "sleeping";
  let mouth: Mouth = "smile";
  if (state === "celebrating" || state === "greeting") mouth = "laugh";
  else if (state === "thinking") mouth = "o";
  else if (state === "retry") mouth = "wobble";
  else if (asleep) mouth = "sleep";
  if (talking && !asleep) mouth = open ? "o" : state === "retry" ? "wobble" : "smile";
  return { blink: blink && !asleep, mouth, asleep, talking: talking && !asleep };
}

/** The outer <svg>: same footprint and class contract as the Crew (`critter <id> state-<state>`). */
export function Frame(p: {
  id: string;
  label: string;
  state: MascotState;
  size: number | string;
  className: string;
  blink: boolean;
  talking: boolean;
  shadowRx?: number;
  /** Drawn after (in front of) the moving body and not animated with it, e.g. Ripple's water. */
  fore?: ReactNode;
  children: ReactNode;
}) {
  return (
    <svg
      className={`critter host ${p.id} state-${p.state} ${p.blink ? "is-blinking" : ""} ${p.talking ? "host-talking" : ""} ${p.className}`.trim()}
      viewBox="0 0 200 230"
      width={p.size}
      height={typeof p.size === "number" ? p.size * 1.15 : undefined}
      role="img"
      aria-label={p.label}
      data-character={p.id}
    >
      <ellipse className="critter-shadow" cx="100" cy="218" rx={p.shadowRx ?? 60} ry="8" fill={INK} opacity="0.12" />
      <g className="critter-body">{p.children}</g>
      {p.fore}
    </svg>
  );
}

/** Bobbo's eye: white ball + ink pupil + shine. Asleep → a closed, smiling lid line. */
export function Eye({ cx, cy, r = 16, asleep = false, iris }: { cx: number; cy: number; r?: number; asleep?: boolean; iris?: string }) {
  if (asleep)
    return <path d={`M${cx - r * 0.75} ${cy + 1} Q${cx} ${cy + r * 0.6} ${cx + r * 0.75} ${cy + 1}`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
  const pr = r * 0.45;
  return (
    <g className="eye">
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="5" />
      <g className="pupil">
        {iris && <circle cx={cx + r * 0.18} cy={cy + r * 0.12} r={pr * 1.35} fill={iris} />}
        <circle cx={cx + r * 0.18} cy={cy + r * 0.12} r={pr} fill={INK} />
        <circle cx={cx + r * 0.33} cy={cy - r * 0.1} r={r * 0.16} fill="#fff" />
      </g>
    </g>
  );
}

export const Cheeks = ({ y, l, r, color = "#FF7A6B", rx = 9 }: { y: number; l: number; r: number; color?: string; rx?: number }) => (
  <g className="cheeks">
    <ellipse cx={l} cy={y} rx={rx} ry={rx * 0.6} fill={color} opacity="0.7" />
    <ellipse cx={r} cy={y} rx={rx} ry={rx * 0.6} fill={color} opacity="0.7" />
  </g>
);

/** Bobbo's mouth set, centred on (cx, cy) = middle of the smile line, scaled by s. */
export function MouthShape({ mouth, cx, cy, s = 1, teeth }: { mouth: Mouth; cx: number; cy: number; s?: number; teeth?: "buck" | "fang" }) {
  const t = `translate(${cx} ${cy}) scale(${s})`;
  return (
    <g transform={t} className="mouth">
      {mouth === "smile" && (
        <>
          <path d="M-13 -4 Q0 9 13 -4" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          {teeth === "fang" && <path d="M-3.5 1.5 L0 8 L3.5 1.5" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />}
          {teeth === "buck" && <path d="M-6 2.5 L-6 12 Q0 14 6 12 L6 2.5 Z M0 3.5 L0 13" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />}
        </>
      )}
      {mouth === "laugh" && (
        <>
          <path d="M-15 -6 Q0 -4 15 -6 Q12 15 0 15 Q-12 15 -15 -6 Z" fill="#4A2545" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <ellipse cx="0" cy="9" rx="8" ry="4.5" fill="#FF8FB1" />
          {teeth === "buck" && <path d="M-6 -5 L-6 4 L6 4 L6 -5 Z M0 -5 L0 4" fill="#fff" stroke={INK} strokeWidth="2.6" strokeLinejoin="round" />}
        </>
      )}
      {mouth === "o" && (
        <>
          <ellipse cx="0" cy="2" rx="6.5" ry="7.5" fill="#4A2545" stroke={INK} strokeWidth="3.5" />
          {teeth === "buck" && <path d="M-4.5 -4 L-4.5 2 L4.5 2 L4.5 -4 Z" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />}
        </>
      )}
      {mouth === "wobble" && (
        <>
          <path d="M-11 3 Q-5.5 -3 0 2 Q5.5 7 11 1" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          {teeth === "buck" && <path d="M-5 5 L-5 12 L5 12 L5 6 Z" fill="#fff" stroke={INK} strokeWidth="2.4" strokeLinejoin="round" />}
        </>
      )}
      {mouth === "sleep" && <path d="M-6 0 Q0 4 6 0" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />}
    </g>
  );
}

/** Soft white highlight stroke on the upper left (part of the shape kit). */
export const Shine = ({ d, w = 6, o = 0.45 }: { d: string; w?: number; o?: number }) => (
  <path d={d} fill="none" stroke="#fff" strokeOpacity={o} strokeWidth={w} strokeLinecap="round" />
);

/** Little "z" for the sleeping pose (static; reduced-motion safe). */
export const Zz = ({ x, y }: { x: number; y: number }) => (
  <g className="host-zz" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={`M${x} ${y} h10 l-10 11 h10`} />
    <path d={`M${x + 15} ${y - 14} h7 l-7 8 h7`} strokeWidth="3" />
  </g>
);

export { INK };
