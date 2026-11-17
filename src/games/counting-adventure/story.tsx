import { Bobbo } from "../../characters/Bobbo";
import { Hoot } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import { Actor, Sky, Spark, Zzz } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BasketArt, MeadowBackground, SnackArt } from "./art";

/** "Bobbo's Breakfast" — the story wrapper for Counting Adventure. */

function House() {
  return (
    <svg viewBox="0 0 300 260" aria-hidden="true">
      <path d="M30 120 L150 30 L270 120 Z" fill="#E86F5C" stroke={INK} strokeWidth="7" strokeLinejoin="round" />
      <rect x="55" y="115" width="190" height="135" rx="14" fill="#FFE9C7" stroke={INK} strokeWidth="7" />
      <rect x="120" y="165" width="60" height="85" rx="10" fill="#9A6234" stroke={INK} strokeWidth="6" />
      <circle cx="90" cy="160" r="20" fill="#FFF3A6" stroke={INK} strokeWidth="6" />
      <circle cx="210" cy="160" r="20" fill="#FFF3A6" stroke={INK} strokeWidth="6" />
    </svg>
  );
}

function Bed() {
  return (
    <svg viewBox="0 0 300 120" aria-hidden="true">
      <rect x="10" y="40" width="280" height="50" rx="16" fill="#8E6CEF" stroke={INK} strokeWidth="6" />
      <rect x="20" y="20" width="70" height="40" rx="14" fill="#fff" stroke={INK} strokeWidth="5" />
      <rect x="10" y="85" width="22" height="30" rx="6" fill="#9A6234" stroke={INK} strokeWidth="5" />
      <rect x="268" y="85" width="22" height="30" rx="6" fill="#9A6234" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

const Snack = ({ kind, x, y, w = 7, r = 0 }: { kind: string; x: number; y: number; w?: number; r?: number }) => (
  <Actor x={x} y={y} w={w} enter="drop">
    <div style={{ transform: `rotate(${r}deg)` }}><SnackArt kind={kind} /></div>
  </Actor>
);

export const breakfastIntro: StoryBeat[] = [
  {
    line: "ca.story.1",
    camera: "rise",
    scene: () => (
      <div className="scene">
        <Sky time="night" />
        <Actor x={28} y={72} w={34}><House /></Actor>
        <Actor x={62} y={80} w={34}><Bed /></Actor>
        <Actor x={58} y={73} w={16}><Bobbo state="sleeping" /></Actor>
        <Zzz x={66} y={44} />
      </div>
    ),
  },
  {
    line: "ca.story.2",
    camera: "close",
    sfx: "star",
    scene: ({ speaking }) => (
      <div className="scene">
        <Sky time="dawn" />
        <Actor x={28} y={72} w={34}><House /></Actor>
        <Actor x={62} y={80} w={34}><Bed /></Actor>
        <Actor x={60} y={70} w={19}><Bobbo state="greeting" talking={speaking} /></Actor>
      </div>
    ),
  },
  {
    line: "ca.story.3",
    camera: "pan-right",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene">
        <MeadowBackground />
        <Actor x={20} y={82} w={19}><Bobbo state="thinking" talking={speaking} /></Actor>
        <Actor x={34} y={86} w={14}><BasketArt /></Actor>
        <Snack kind="apple" x={55} y={70} r={-12} />
        <Snack kind="carrot" x={70} y={78} r={20} />
        <Snack kind="cookie" x={84} y={68} />
        <Snack kind="berry" x={63} y={88} />
        <Snack kind="apple" x={90} y={84} r={14} />
      </div>
    ),
  },
  {
    line: "ca.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene">
        <MeadowBackground />
        <Actor x={36} y={84} w={20}><Bobbo state="encouraging" /></Actor>
        <Actor x={62} y={78} w={18} enter="right"><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const breakfastOutro: StoryBeat[] = [
  {
    line: "ca.story.end1",
    camera: "close",
    sfx: "complete",
    scene: ({ speaking }) => (
      <div className="scene">
        <MeadowBackground />
        <Actor x={38} y={84} w={22}><Bobbo state="celebrating" talking={speaking} /></Actor>
        <Actor x={60} y={88} w={18}><BasketArt /></Actor>
        <Snack kind="apple" x={56} y={78} w={5} />
        <Snack kind="cookie" x={61} y={76} w={5} />
        <Snack kind="carrot" x={66} y={78} w={5} />
      </div>
    ),
  },
  {
    line: "ca.story.end2",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene">
        <MeadowBackground />
        <Actor x={34} y={84} w={20}><Bobbo state="celebrating" /></Actor>
        <Actor x={64} y={80} w={17}><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ca.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <Sky time="day" />
        <Actor x={50} y={86} w={22}><Bobbo state="celebrating" /></Actor>
        <Spark x={50} y={30} size={14} />
      </div>
    ),
  },
];

export const breakfastBetween: Record<number, { line: string }> = {
  2: { line: "ca.story.mid1" },
  4: { line: "ca.story.mid2" },
  6: { line: "ca.story.mid3" },
};
