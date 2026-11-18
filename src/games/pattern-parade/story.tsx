import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Puff, Zuzu } from "../../characters/Crew";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { MarcherArt, ParadeBackground, ParadeStarSticker } from "./art";

/** "Puff's Big Parade" — story wrapper: a gust of wind knocks the marchers out of their pattern. */

function MarchRow({ kinds, tumble = false, gaps = [] }: { kinds: string[]; tumble?: boolean; gaps?: number[] }) {
  return (
    <div className={`pp-story-row ${tumble ? "is-tumbled" : ""}`}>
      {kinds.map((k, i) => (
        <span key={i} className="pp-story-marcher" style={{ "--i": i } as React.CSSProperties}>
          {gaps.includes(i) ? <span className="pp-story-gap">?</span> : <MarcherArt kind={k} />}
        </span>
      ))}
    </div>
  );
}

function Stage() {
  return (
    <svg viewBox="0 0 300 140" aria-hidden="true">
      <path d="M10 60 L290 60 L280 132 L20 132 Z" fill="#8E6CEF" stroke="#2B2140" strokeWidth="6" strokeLinejoin="round" />
      <path d="M10 60 L290 60 L290 44 L10 44 Z" fill="#FFD43B" stroke="#2B2140" strokeWidth="6" strokeLinejoin="round" />
      {[40, 90, 140, 190, 240].map((x) => <circle key={x} cx={x + 10} cy={52} r="5" fill="#fff" />)}
      <path d="M30 44 L30 4 M270 44 L270 4" stroke="#2B2140" strokeWidth="6" />
      <path d="M30 6 Q150 40 270 6" fill="none" stroke="#2B2140" strokeWidth="4" />
    </svg>
  );
}

const pattern = ["duck", "frog", "duck", "frog", "duck", "frog"];

export const paradeIntro: StoryBeat[] = [
  {
    line: "pp.story.1",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={50} y={92} w={70}><MarchRow kinds={pattern} /></Actor>
        <Actor x={50} y={60} w={24} float><Puff state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "pp.story.2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={58} y={88} w={66}><MarchRow kinds={pattern.slice(0, 4)} /></Actor>
        <Actor x={16} y={88} w={24}><Puff state="talking" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "pp.story.3",
    camera: "shake",
    sfx: "whoosh",
    scene: () => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <div className="pp-gust" aria-hidden="true"><i /><i /><i /></div>
        <Actor x={52} y={90} w={70}><MarchRow kinds={pattern} tumble /></Actor>
        <Actor x={16} y={70} w={20} float><Puff state="retry" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "pp.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={58} y={88} w={66}><MarchRow kinds={pattern} gaps={[3, 5]} /></Actor>
        <Actor x={16} y={86} w={24}><Puff state="encouraging" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const paradeOutro: StoryBeat[] = [
  {
    line: "pp.story.end1",
    camera: "rise",
    sfx: "complete",
    scene: ({ speaking }) => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={70} y={78} w={46}><Stage /></Actor>
        <Actor x={70} y={58} w={20}><Puff state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={34} y={94} w={60} enter="left"><MarchRow kinds={["drum", "bell", "drum", "bell", "drum"]} /></Actor>
      </div>
    ),
  },
  {
    line: "pp.story.end2",
    camera: "wide",
    scene: () => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={50} y={78} w={52}><Stage /></Actor>
        <Actor x={50} y={60} w={18}><Puff state="celebrating" size="100%" /></Actor>
        <Actor x={16} y={94} w={16}><Bobbo state="celebrating" size="100%" /></Actor>
        <Actor x={84} y={94} w={15}><Gloop state="celebrating" size="100%" /></Actor>
        <Actor x={30} y={96} w={13}><Zuzu state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "pp.story.end3",
    camera: "zoom-in",
    sfx: "achievement",
    scene: ({ speaking }) => (
      <div className="scene pp-scene">
        <ParadeBackground />
        <Actor x={62} y={74} w={34}><ParadeStarSticker /></Actor>
        <Actor x={26} y={90} w={24}><Puff state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const paradeBetween: Record<number, { line: string }> = {
  2: { line: "pp.story.mid1" },
  4: { line: "pp.story.mid2" },
  6: { line: "pp.story.mid3" },
};
