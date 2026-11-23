import { useId } from "react";
import { Bobbo } from "../../characters/Bobbo";
import { Zuzu } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import { PICTURES as RL_PICTURES } from "../rhyme-lanterns/pictures";
import { parseScene } from "./content";
import { N, PICTURES_A, S, T, eye } from "./pictures-a";
import { PICTURES_B } from "./pictures-b";

/**
 * Paper Boat Post — original SVG art: the river scene, the paper boat, pictures, scenes, the critter and the
 * River Reader sticker. Pictures shared with Hoot's Rhyme Lanterns are imported from that world (same style,
 * spelled rimes on purpose; docs/worlds/paper-boat-post.md §3.1).
 */
export const PICTURES: Readonly<Record<string, React.JSX.Element>> = { ...RL_PICTURES, ...PICTURES_A, ...PICTURES_B };
export const hasPicture = (w: string) => w in PICTURES;

const at = (el: React.ReactNode, s: number, x: number, y: number) => <g transform={`translate(${x} ${y}) scale(${s})`}>{el}</g>;
const CREW: Record<string, (p: { size: number }) => React.JSX.Element> = {
  bobbo: ({ size }) => <Bobbo size={size} state="idle" />,
  zuzu: ({ size }) => <Zuzu size={size} state="idle" />,
};
/** Something that can stand in a scene: a picture, or a Critter Crew member (100-unit box). */
function Figure({ who }: { who: string }) {
  const C = CREW[who];
  if (C) return <g transform="translate(6 0) scale(0.88)"><C size={100} /></g>;
  return PICTURES[who] ?? <g />;
}

/** Measured bounds [left, top, right, bottom] of scene pictures in their 100-unit box (Crew: as drawn by Figure). */
const BOX: Record<string, readonly [number, number, number, number]> = {
  hen: [24, 15, 88, 94], cat: [20, 16, 89, 93], rat: [8, 34, 95, 88], dog: [11, 22, 89, 75], frog: [13, 24, 87, 86], fox: [14, 12, 86, 86],
  goat: [8, 11, 92, 86], coat: [6, 12, 94, 92], duck: [21, 22, 90, 86], bug: [8, 10, 92, 90], pig: [16, 12, 84, 86], wig: [13, 9, 87, 94],
  slug: [10, 17, 92, 82], snake: [16, 13, 90, 84], box: [4, 12, 96, 92], bed: [10, 18, 90, 88], rug: [6, 34, 94, 86], van: [8, 30, 94, 86],
  bus: [8, 24, 92, 89], tub: [8, 11, 92, 90], cup: [18, 23, 88, 86], mug: [20, 6, 88, 90], jug: [25, 14, 87, 90], log: [4, 15, 86, 74],
  boat: [4, 10, 100, 93], sled: [6, 34, 94, 88], hat: [8, 30, 92, 83], cap: [18, 19, 96, 75], bag: [14, 14, 86, 88], bone: [8, 12, 92, 88],
  bun: [10, 24, 90, 80], drum: [16, 1, 84, 84], plum: [18, 8, 82, 88], kite: [20, 8, 80, 98], bike: [6, 24, 94, 84], cake: [10, 4, 90, 84],
  rock: [6, 28, 94, 82], bobbo: [10, 6, 90, 99], zuzu: [24, 5, 93, 99],
};
/** Where a figure stands ON a thing (its top surface) and where the front RIM of a container is (in 100-unit picture y). */
const SURFACE: Record<string, { on?: number; rim?: number }> = {
  box: { on: 30, rim: 36 }, bed: { on: 52, rim: 56 }, rug: { on: 60 }, van: { on: 32 }, bus: { on: 26 }, tub: { on: 42, rim: 46 },
  cup: { rim: 32 }, jug: { rim: 40 }, log: { on: 26 }, boat: { rim: 64 }, sled: { on: 40 }, hat: { on: 32 }, bag: { on: 32, rim: 40 },
  rock: { on: 34 }, cake: { on: 30 },
};
const bx = (w: string) => BOX[w] ?? ([10, 10, 90, 90] as const);

/**
 * A note's scene: who is IN / ON / HAS what, composed from the same pictures. ON: the figure's feet rest on the
 * thing's top surface. IN: the figure sits behind the container and the container's front (clipped below its rim)
 * is drawn again over it, so it is visibly inside. HAS: the thing stands next to the figure.
 */
export function ScenePicture({ id }: { id: string }) {
  const s = parseScene(id);
  const clip = `pb-clip-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [wl, , wr, wb] = bx(s.what);
  const [hl, ht, hr, hb] = bx(s.who);
  const sW = s.rel === "has" ? 0.5 : 0.74;
  const sH = s.rel === "has" ? 0.8 : CREW[s.who] ? 0.56 : 0.54;
  let body: React.ReactNode;
  if (s.rel === "has") {
    body = (<>{at(<Figure who={s.who} />, sH, 4 - sH * hl, 98 - sH * hb)}{at(<Figure who={s.what} />, sW, 116 - sW * wr, 98 - sW * wb)}</>);
  } else {
    const x0 = 60 - (sW * (wl + wr)) / 2;
    const y0 = 98 - sW * wb;
    const hx = 60 - (sH * (hl + hr)) / 2;
    const surf = SURFACE[s.what] ?? {};
    if (s.rel === "on") {
      const feet = y0 + sW * (surf.on ?? bx(s.what)[1]) + 2;
      body = (<>{at(<Figure who={s.what} />, sW, x0, y0)}{at(<Figure who={s.who} />, sH, hx, feet - sH * hb)}</>);
    } else {
      const rim = y0 + sW * (surf.rim ?? (bx(s.what)[1] + bx(s.what)[3]) / 2);
      const top = rim - 0.5 * sH * (hb - ht);
      body = (
        <>
          <defs><clipPath id={clip}><rect x="0" y={rim} width="120" height={100 - rim + 4} /></clipPath></defs>
          {at(<Figure who={s.what} />, sW, x0, y0)}
          {at(<Figure who={s.who} />, sH, hx, top - sH * ht)}
          <g clipPath={`url(#${clip})`}>{at(<Figure who={s.what} />, sW, x0, y0)}</g>
        </>
      );
    }
  }
  return (
    <svg className="pb-pic pb-scene-pic" viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="60" cy="97" rx="50" ry="3" fill={INK} opacity="0.12" />
      {body}
    </svg>
  );
}

/** One picture, or three of it for plurals ("fox:3"). */
export function Picture({ art, className = "" }: { art: string; className?: string }) {
  if (art.startsWith("scene:")) return <ScenePicture id={art.slice(6)} />;
  const [w, n] = art.split(":") as [string, string | undefined];
  if (n === "3") {
    return (
      <svg className={`pb-pic ${className}`} viewBox="0 0 120 100" aria-hidden="true">
        {at(PICTURES[w], 0.5, 6, 8)}{at(PICTURES[w], 0.5, 64, 8)}{at(PICTURES[w], 0.5, 35, 50)}
      </svg>
    );
  }
  if (w === "critter") return <Critter />;
  return (
    <svg className={`pb-pic ${className}`} viewBox={n === "1" ? "-10 0 120 100" : "0 0 100 100"} aria-hidden="true">
      {PICTURES[w] ?? <PaperBoat />}
    </svg>
  );
}

// ---------------------------------------------------------------- the paper boat
/** A folded paper boat hull (the sail is HTML on the board so letters stay crisp and can light up). */
export function BoatHull({ color = "#FFFDF6" }: { color?: string }) {
  return (
    <svg className="pb-hull" viewBox="0 0 200 70" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <path d="M8 14 L192 14 L160 62 L40 62 Z" fill={color} stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M8 14 L56 40 L100 14 L144 40 L192 14" fill="none" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" opacity="0.5" />
      <path d="M40 62 L56 40 M160 62 L144 40" stroke={INK} strokeWidth="3" opacity="0.35" />
    </svg>
  );
}
export function PaperBoat({ star = false }: { star?: boolean }) {
  return (
    <g>
      <path d="M50 8 L50 60" {...N} />
      <path d="M53 12 L82 54 L53 54 Z" fill="#FFFDF6" {...S} />
      {star && <path d="M66 30 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 Z" fill="#FFD43B" {...T} strokeWidth={2} />}
      <path d="M6 60 L94 60 L78 84 L22 84 Z" fill="#FFFDF6" {...S} />
      <path d="M6 60 L28 72 L50 60 L72 72 L94 60" {...N} strokeWidth={3} opacity={0.5} />
    </g>
  );
}

/** The made-up critter waiting for its name tag (pseudo-word items). Not any real animal. */
export function Critter({ hue = "#7EDFC3" }: { hue?: string }) {
  return (
    <svg className="pb-pic pb-critter" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M34 26 Q28 10 20 12 M66 26 Q72 10 80 12" {...N} strokeWidth={3} />
      <circle cx="20" cy="12" r="5" fill="#FFD43B" {...T} /><circle cx="80" cy="12" r="5" fill="#FFD43B" {...T} />
      <path d="M18 70 Q10 36 50 24 Q90 36 82 70 Q80 90 50 90 Q20 90 18 70 Z" fill={hue} {...S} />
      <path d="M26 82 L22 94 M40 88 L38 96 M60 88 L62 96 M74 82 L78 94" {...N} strokeWidth={4} />
      <circle cx="38" cy="50" r="9" fill="#fff" {...T} /><circle cx="62" cy="50" r="9" fill="#fff" {...T} />
      {eye(39, 51, 4)}{eye(63, 51, 4)}
      <path d="M40 68 Q50 76 60 68" {...N} strokeWidth={3} />
      <path d="M28 36 Q34 32 38 38 M62 38 Q66 32 72 36" {...N} strokeWidth={2.5} opacity={0.6} />
    </svg>
  );
}

// ---------------------------------------------------------------- scene
/** Sarah's river post office: sky, far hills, the river, reeds and the little docks along the bank. */
export function RiverPost() {
  return (
    <svg className="scene-bg pb-bg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="pb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9ED8FF" /><stop offset="1" stopColor="#E8F7FF" /></linearGradient>
        <linearGradient id="pb-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5CB8F2" /><stop offset="1" stopColor="#3B8FD6" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#pb-sky)" />
      <g className="pb-cloud" fill="#fff" opacity="0.9"><ellipse cx="260" cy="140" rx="110" ry="34" /><ellipse cx="330" cy="118" rx="70" ry="34" /><ellipse cx="1240" cy="190" rx="130" ry="36" /><ellipse cx="1320" cy="164" rx="76" ry="34" /></g>
      <path d="M0 470 Q300 380 620 440 T1240 420 T1600 440 L1600 900 L0 900 Z" fill="#A6E39A" />
      <path d="M0 520 Q400 470 800 510 T1600 500 L1600 900 L0 900 Z" fill="#7FD27A" />
      {/* the post office: a little round-roofed hut with a mailbox flag */}
      <g transform="translate(1270 380)">
        <rect x="0" y="40" width="190" height="130" rx="14" fill="#FFF1C7" stroke={INK} strokeWidth="6" />
        <path d="M-16 50 Q95 -40 206 50 Z" fill="#D6336C" stroke={INK} strokeWidth="6" strokeLinejoin="round" />
        <rect x="70" y="96" width="50" height="74" rx="8" fill="#C98E5A" stroke={INK} strokeWidth="5" />
        <rect x="18" y="80" width="36" height="30" rx="5" fill="#BDE7FF" stroke={INK} strokeWidth="4" />
        <path d="M150 40 L150 -10 L190 0 L150 12" fill="#FFD43B" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      </g>
      <path d="M0 600 Q400 570 800 600 T1600 590 L1600 900 L0 900 Z" fill="url(#pb-river)" />
      <g className="pb-ripples" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.55">
        <path d="M120 680 q40 -14 80 0" /><path d="M520 740 q50 -16 100 0" /><path d="M980 670 q40 -14 80 0" /><path d="M1320 760 q50 -16 100 0" /><path d="M760 820 q40 -14 80 0" />
      </g>
      <g stroke={INK} strokeWidth="5" strokeLinecap="round">
        <path d="M60 620 Q56 560 70 520" fill="none" /><path d="M84 624 Q86 570 100 540" fill="none" /><path d="M1540 610 Q1536 560 1550 520" fill="none" />
      </g>
      <g fill="#8B5E3C" stroke={INK} strokeWidth="5"><ellipse cx="70" cy="516" rx="9" ry="20" /><ellipse cx="100" cy="536" rx="9" ry="20" /><ellipse cx="1550" cy="516" rx="9" ry="20" /></g>
    </svg>
  );
}

/** Prompt icon / option art for the shared GameRunner slots. Reading items show the boat, never the answer. */
export function PaperBoatObject({ kind }: { kind: string }) {
  if (kind === "boat" || kind === "note") {
    return <svg className="pb-pic" viewBox="0 0 100 100" aria-hidden="true"><PaperBoat star={kind === "note"} /></svg>;
  }
  if (kind === "critter") return <Critter />;
  return <Picture art={kind} />;
}
export const NoBasket = () => <svg viewBox="0 0 10 10" aria-hidden="true" />;

/** River Reader sticker: a folded paper boat with a star on its sail, on a round river badge. */
export function RiverReaderSticker() {
  return (
    <svg className="sticker-svg" viewBox="0 0 200 200" role="img" aria-label="River Reader sticker: a paper boat with a star on its sail">
      <circle cx="100" cy="100" r="92" fill="#FFF7E6" stroke={INK} strokeWidth="7" />
      <circle cx="100" cy="100" r="76" fill="#BDE7FF" stroke={INK} strokeWidth="4" />
      <path d="M26 122 Q60 108 100 122 T174 122 L170 140 Q100 176 30 140 Z" fill="#4D96FF" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
      <g transform="translate(46 34) scale(1.08)"><PaperBoat star /></g>
      <path d="M40 146 q14 -8 28 0 M120 150 q14 -8 28 0" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
