import { useEffect, useState } from "react";
import type { MascotState } from "../engine/types";
import { INK } from "./palette";

/**
 * Bobbo — No. 01, Counting buddy. A pear-shaped worrier who counts everything twice;
 * flaps his tiny wings very hard when excited (has never left the ground).
 * Pure SVG + CSS animation; states map to classes defined in characters.css.
 */
interface Props {
  state: MascotState;
  talking?: boolean;
  size?: number | string;
  className?: string;
}

type Mouth = "smile" | "laugh" | "o" | "wobble";

const ORANGE = "#FF9F43";
const BELLY = "#FFD199";
const CREAM = "#FFE6BA";
const FOOT = "#F2852B";

export function Bobbo({ state, talking = false, size = 220, className = "" }: Props) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    let t: number;
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
      setMouthOpen(false);
      return;
    }
    const id = window.setInterval(() => setMouthOpen((o) => !o), 150);
    return () => window.clearInterval(id);
  }, [talking]);

  let mouth: Mouth = "smile";
  if (state === "celebrating" || state === "greeting") mouth = "laugh";
  else if (state === "thinking") mouth = "o";
  else if (state === "retry") mouth = "wobble";
  if (talking) mouth = mouthOpen ? "o" : state === "retry" ? "wobble" : "smile";

  return (
    <svg
      className={`critter bobbo state-${state} ${blink ? "is-blinking" : ""} ${className}`}
      viewBox="0 0 200 230"
      width={size}
      height={typeof size === "number" ? size * 1.15 : undefined}
      role="img"
      aria-label="Bobbo, an orange monster with tiny wings"
    >
      <ellipse className="critter-shadow" cx="100" cy="218" rx="62" ry="8" fill={INK} opacity="0.12" />
      <g className="critter-body">
        {/* Wings (behind body) */}
        <g className="wing wing-l">
          <path d="M46 108 C30 98 14 100 8 110 C15 113 17 121 14 131 C22 125 31 127 36 135 C38 128 42 120 50 116 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </g>
        <g className="wing wing-r">
          <path d="M154 108 C170 98 186 100 192 110 C185 113 183 121 186 131 C178 125 169 127 164 135 C162 128 158 120 150 116 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </g>
        {/* Horns */}
        <path d="M70 76 Q60 46 58 36 Q72 46 88 62 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M89 58 Q97 24 100 14 Q104 24 111 58 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M130 76 Q140 46 142 36 Q128 46 112 62 Z" fill={CREAM} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        {/* Feet */}
        <ellipse cx="76" cy="204" rx="22" ry="11" fill={FOOT} stroke={INK} strokeWidth="5" />
        <ellipse cx="124" cy="204" rx="22" ry="11" fill={FOOT} stroke={INK} strokeWidth="5" />
        {/* Arms */}
        <path className="arm arm-l" d="M44 140 Q28 150 33 167" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        <path className="arm arm-r" d="M156 140 Q172 150 167 167" fill="none" stroke={INK} strokeWidth="5.5" strokeLinecap="round" />
        {/* Body */}
        <path d="M100 50 C141 50 166 112 166 150 C166 185 137 202 100 202 C63 202 34 185 34 150 C34 112 59 50 100 50 Z" fill={ORANGE} stroke={INK} strokeWidth="5.5" />
        <path d="M70 84 C76 70 86 62 96 60" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="100" cy="162" rx="40" ry="31" fill={BELLY} />
        {/* Face */}
        <g className="face">
          <g className="eye eye-l">
            <circle cx="80" cy="112" r="17" fill="#fff" stroke={INK} strokeWidth="5" />
            <g className="pupil">
              <circle cx="83" cy="114" r="7.5" fill={INK} />
              <circle cx="85.5" cy="110.5" r="2.6" fill="#fff" />
            </g>
          </g>
          <g className="eye eye-r">
            <circle cx="120" cy="112" r="17" fill="#fff" stroke={INK} strokeWidth="5" />
            <g className="pupil">
              <circle cx="123" cy="114" r="7.5" fill={INK} />
              <circle cx="125.5" cy="110.5" r="2.6" fill="#fff" />
            </g>
          </g>
          <ellipse cx="66" cy="136" rx="9" ry="5.5" fill="#FF7A6B" opacity="0.75" />
          <ellipse cx="134" cy="136" rx="9" ry="5.5" fill="#FF7A6B" opacity="0.75" />
          <g fill="#C45E1A">
            <circle cx="62" cy="128" r="1.8" /><circle cx="68" cy="126" r="1.8" /><circle cx="66" cy="131" r="1.6" />
            <circle cx="138" cy="128" r="1.8" /><circle cx="132" cy="126" r="1.8" /><circle cx="134" cy="131" r="1.6" />
          </g>
          {mouth === "smile" && (
            <g>
              <path d="M87 139 Q100 152 113 139" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
              <path d="M96.5 144.5 L100 151 L103.5 144.5" fill="#fff" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            </g>
          )}
          {mouth === "laugh" && (
            <g>
              <path d="M85 137 Q100 139 115 137 Q112 158 100 158 Q88 158 85 137 Z" fill="#4A2545" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
              <ellipse cx="100" cy="152" rx="8" ry="4.5" fill="#FF8FB1" />
            </g>
          )}
          {mouth === "o" && <ellipse cx="100" cy="145" rx="6.5" ry="7.5" fill="#4A2545" stroke={INK} strokeWidth="3.5" />}
          {mouth === "wobble" && (
            <path d="M89 146 Q94.5 140 100 145 Q105.5 150 111 144" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          )}
        </g>
      </g>
    </svg>
  );
}
