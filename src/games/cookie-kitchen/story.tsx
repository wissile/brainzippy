import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Hoot, Puff, Zuzu } from "../../characters/Crew";
import { CREW, INK } from "../../characters/palette";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { ChefRumble, CookieArt, KitchenBackground, PlateArt } from "./art";

/** "Rumble's Cookie Party" — the story wrapper for Cookie Kitchen. */

/** Party table scene (front view): guests peek over the table, a plate in front of each. Positions are % of the box. */
function PartyScene({ guests, cookies, talking }: { guests: ("bobbo" | "gloop" | "zuzu" | "puff")[]; cookies: number; talking?: boolean }) {
  const state = cookies > 0 ? "celebrating" : "thinking";
  return (
    <div className="ck-party">
      {guests.map((g, i) => {
        const x = ((i + 0.5) / guests.length) * 100;
        return (
          <div key={g} className="ck-party-guest" style={{ left: `${x}%` }}>
            {g === "bobbo" ? <Bobbo state={state} talking={talking} size="100%" /> : g === "gloop" ? <Gloop state={state} size="100%" /> : g === "zuzu" ? <Zuzu state={state} size="100%" /> : <Puff state={state} size="100%" />}
          </div>
        );
      })}
      <svg className="ck-party-table" viewBox="0 0 1000 220" aria-hidden="true" preserveAspectRatio="none">
        <rect x="10" y="10" width="980" height="120" rx="22" fill="#FFF6DA" stroke={INK} strokeWidth="7" />
        <path d={`M10 110 ${Array.from({ length: 14 }, (_, i) => `Q${10 + i * 70 + 35} 160 ${10 + (i + 1) * 70} 110`).join(" ")} L990 110`} fill="#FFB3C9" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <rect x="80" y="150" width="26" height="70" fill="#8E4E24" stroke={INK} strokeWidth="6" />
        <rect x="894" y="150" width="26" height="70" fill="#8E4E24" stroke={INK} strokeWidth="6" />
      </svg>
      {guests.map((g, i) => (
        <div key={`p${g}`} className="ck-party-plate" style={{ left: `${((i + 0.5) / guests.length) * 100}%` }}>
          <PlateWith n={cookies} />
        </div>
      ))}
    </div>
  );
}

/** A big platter piled with cookies (Rumble carries it). */
function Platter({ n = 12 }: { n?: number }) {
  return (
    <div className="ck-story-platter">
      <PlateArt tint={CREW.sparkle} />
      <div className="ck-story-pile">
        {Array.from({ length: n }, (_, i) => <span key={i}><CookieArt kind="cookie" /></span>)}
      </div>
    </div>
  );
}

function PlateWith({ n }: { n: number }) {
  return (
    <div className="ck-story-plate">
      <div className="ck-story-pile small">{Array.from({ length: n }, (_, i) => <span key={i}><CookieArt kind="cookie" /></span>)}</div>
      <PlateArt tint={CREW.rumble} />
    </div>
  );
}

const Door = () => (
  <svg viewBox="0 0 200 360" aria-hidden="true">
    <rect x="10" y="10" width="180" height="340" rx="20" fill="#9A5A2A" stroke={INK} strokeWidth="7" />
    <rect x="34" y="36" width="132" height="120" rx="12" fill="#B26C36" stroke={INK} strokeWidth="5" />
    <rect x="34" y="184" width="132" height="140" rx="12" fill="#B26C36" stroke={INK} strokeWidth="5" />
    <circle cx="160" cy="180" r="12" fill={CREW.sparkle} stroke={INK} strokeWidth="4" />
  </svg>
);

export const kitchenIntro: StoryBeat[] = [
  {
    line: "ck.story.1",
    camera: "rise",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={50} y={86} w={30}><ChefRumble state="greeting" talking={speaking} size="100%" /></Actor>
        <Actor x={50} y={82} w={28} enter="drop"><Platter n={12} /></Actor>
      </div>
    ),
  },
  {
    line: "ck.story.2",
    camera: "pan-right",
    sfx: "star",
    scene: () => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={90} y={92} w={18}><Door /></Actor>
        <Actor x={30} y={88} w={22}><ChefRumble state="encouraging" size="100%" /></Actor>
        <Actor x={52} y={90} w={15} enter="right"><Bobbo state="greeting" /></Actor>
        <Actor x={66} y={90} w={14} enter="right"><Gloop state="greeting" size="100%" /></Actor>
        <Actor x={80} y={90} w={14} enter="right"><Zuzu state="greeting" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ck.story.3",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={50} y={100} w={92}><PartyScene guests={["bobbo", "gloop", "zuzu"]} cookies={0} talking={speaking} /></Actor>
        <span className="ck-story-q" style={{ left: "50%", top: "24%" }} aria-hidden="true">?</span>
      </div>
    ),
  },
  {
    line: "ck.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={34} y={88} w={22}><ChefRumble state="idle" size="100%" /></Actor>
        <Actor x={34} y={84} w={20}><Platter n={12} /></Actor>
        <Actor x={64} y={84} w={18} enter="right"><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const kitchenOutro: StoryBeat[] = [
  {
    line: "ck.story.end1",
    camera: "close",
    sfx: "complete",
    scene: ({ speaking }) => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={50} y={100} w={104}><PartyScene guests={["bobbo", "gloop", "zuzu", "puff"]} cookies={3} talking={speaking} /></Actor>
      </div>
    ),
  },
  {
    line: "ck.story.end2",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={34} y={88} w={22}><ChefRumble state="celebrating" size="100%" /></Actor>
        <Actor x={64} y={84} w={18}><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ck.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <KitchenBackground />
        <Actor x={50} y={90} w={24}><ChefRumble state="celebrating" size="100%" /></Actor>
        <Spark x={50} y={28} size={14} />
      </div>
    ),
  },
];

export const kitchenBetween: Record<number, { line: string }> = {
  2: { line: "ck.story.mid1" },
  4: { line: "ck.story.mid2" },
  6: { line: "ck.story.mid3" },
};
