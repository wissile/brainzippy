import { DEFAULT_MONSTER, Monster, type MonsterConfig } from "../../characters/Monster";

/** The child's monster in a little sailing boat (original art). Decorative: callers describe the trip in words. */
export function Boat({ monster = DEFAULT_MONSTER }: { monster?: MonsterConfig }) {
  return (
    <span className="boat-art" aria-hidden="true">
      <svg className="boat-sail" viewBox="0 0 120 100">
        <path d="M80 8 V66" stroke="#2B2140" strokeWidth="4" strokeLinecap="round" />
        <path d="M84 12 L84 60 L114 58 Z" fill="#fff" stroke="#2B2140" strokeWidth="3" strokeLinejoin="round" />
        <path d="M80 8 L96 13 L80 18 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="boat-monster"><Monster config={monster} size={64} label="" /></span>
      <svg className="boat-hull" viewBox="0 0 120 100">
        <path d="M8 62 L112 62 L100 86 Q60 96 20 86 Z" fill="#FF9F43" stroke="#2B2140" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M16 72 L104 72" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
        <path className="boat-splash" d="M2 92 q8 -6 16 0 M104 94 q8 -6 16 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
