import { Bobbo } from "../../characters/Bobbo";
import { Gloop } from "../../characters/Crew";
import { INK } from "../../characters/palette";
import { Actor, Spark, Zzz } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BathBackground, BubbleBuddySticker, Duck, FoamToy, GB, ParadeBubble, SizePiece } from "./art";

/**
 * "Gloop's Bubble Bath" — it is nearly bedtime and Gloop's bath is overflowing with toys. The child helps Gloop and
 * Bobbo tidy, count and compare; the outro is a calm, clean bath, a snug towel and the Bubble Buddy sticker.
 */
const scene = (children: React.ReactNode, extra = "") => (
  <div className={`scene gb-story ${extra}`}>
    <BathBackground tub={false} />
    {children}
  </div>
);

/** Gloop (or anyone) sitting in the tub: the tub front with its foam rim is drawn over the lower part of the body. */
function InTub({ children, foam = 1, rim }: { children?: React.ReactNode; foam?: number; rim?: [React.ReactNode, React.ReactNode] }) {
  return (
    <span className="gb-intub">
      {children && <span className="gb-intub-who">{children}</span>}
      <TubFront foam={foam} />
      {rim && <span className="gb-intub-rim"><span>{rim[0]}</span><span>{rim[1]}</span></span>}
    </span>
  );
}

/** The front of the tub with a foam rim, drawn over Gloop so he sits in the water. */
function TubFront({ foam = 1 }: { foam?: number }) {
  return (
    <svg viewBox="0 0 400 150" className="gb-tubfront" aria-hidden="true">
      <path d="M10 30 H390 Q384 130 300 140 H100 Q16 130 10 30 Z" fill={GB.tub} stroke={INK} strokeWidth="6" strokeLinejoin="round" />
      <rect x="0" y="18" width="400" height="22" rx="11" fill={GB.tub} stroke={INK} strokeWidth="6" />
      {Array.from({ length: Math.round(9 * foam) }, (_, i) => (
        <circle key={i} cx={30 + i * (340 / Math.max(1, Math.round(9 * foam) - 1))} cy={14 - (i % 2) * 8} r={18 + (i % 3) * 5} fill="#fff" stroke={INK} strokeWidth="4" />
      ))}
    </svg>
  );
}

const SPILL: [number, number, string, number][] = [
  [16, 74, "duck", -18], [30, 64, "toy~circle~blue~0~90~0", 12], [70, 66, "boat", -10], [84, 76, "toy~triangle~green~0~90~0", 24], [58, 54, "duck", 16], [42, 56, "toy~square~red~0~90~0", -20],
];
const Spilled = ({ k }: { k: string }) => (k === "duck" ? <Duck /> : k === "boat" ? <SizePiece art="size~boat~100" /> : <FoamToy art={k} />);

export const bathIntro: StoryBeat[] = [
  {
    line: "gb.story.1",
    camera: "rise",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={50} y={100} w={76}><InTub><Gloop state="greeting" talking={speaking} size="100%" /></InTub></Actor>
        <Actor x={24} y={40} w={7} float><ParadeBubble k={1} dots={false} /></Actor>
        <Actor x={78} y={34} w={6} float><ParadeBubble k={2} dots={false} /></Actor>
      </>),
  },
  {
    line: "gb.story.2",
    camera: "shake",
    sfx: "whoosh",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={50} y={100} w={76}><InTub foam={1.4}><Gloop state="thinking" talking={speaking} size="100%" /></InTub></Actor>
        {SPILL.map(([x, y, k, r], i) => (
          <Actor key={i} x={x} y={y} w={10} enter={i % 2 ? "right" : "left"} z={3}>
            <span className="gb-tumble" style={{ "--r": `${r}deg`, "--i": i } as React.CSSProperties}><Spilled k={k} /></span>
          </Actor>
        ))}
      </>),
  },
  {
    line: "gb.story.3",
    camera: "pan-right",
    scene: () =>
      scene(<>
        <Actor x={50} y={100} w={76}><InTub foam={1.2} /></Actor>
        {[[20, 60, 6], [34, 48, 4], [62, 44, 5], [80, 58, 3]].map(([x, y, k], i) => (
          <Actor key={i} x={x!} y={y!} w={9} float><ParadeBubble k={k!} dots /></Actor>
        ))}
        {[[28, 92], [44, 90], [58, 93], [72, 91]].map(([x, y], i) => <Actor key={`d${i}`} x={x!} y={y!} w={8} z={3}><Duck flip={i % 2 === 1} /></Actor>)}
      </>),
  },
  {
    line: "gb.story.4",
    camera: "zoom-in",
    sfx: "star",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={40} y={100} w={64}><InTub><Gloop state="encouraging" talking={speaking} size="100%" /></InTub></Actor>
        <Actor x={80} y={92} w={22} enter="right" z={3}><Bobbo state="greeting" size="100%" /></Actor>
      </>),
  },
];

export const bathOutro: StoryBeat[] = [
  {
    line: "gb.story.end1",
    camera: "wide",
    sfx: "complete",
    scene: () =>
      scene(<>
        <Actor x={50} y={100} w={76}>
          <InTub foam={0.5} rim={[
            [46, 72, 100].map((s) => <SizePiece key={s} art={`size~boat~${s}`} />),
            [0, 1, 2].map((i) => <Duck key={i} />),
          ]}><Gloop state="celebrating" size="100%" /></InTub>
        </Actor>
      </>),
  },
  {
    line: "gb.story.end2",
    camera: "close",
    scene: () =>
      scene(<>
        <Actor x={50} y={92} w={30}><span className="gb-towelled"><Gloop state="sleeping" size="100%" /><span className="gb-towel" /></span></Actor>
        <Zzz x={60} y={40} />
      </>, "is-night"),
  },
  {
    line: "gb.story.end3",
    camera: "zoom-in",
    sfx: "achievement",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={22} y={90} w={22}><Gloop state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={50} y={74} w={32} enter="drop"><BubbleBuddySticker /></Actor>
        <Actor x={80} y={90} w={18}><Bobbo state="celebrating" size="100%" /></Actor>
        <Spark x={34} y={24} size={6} />
        <Spark x={70} y={20} size={5} />
      </>),
  },
];

export const bathBetween: Record<number, { line: string }> = {
  2: { line: "gb.story.mid1" },
  4: { line: "gb.story.mid2" },
  6: { line: "gb.story.mid3" },
};
