import { Hoot } from "../../characters/Crew";
import { Fenn } from "../../characters/library";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { AskDeskArt, DetectiveBadgeSticker, EnvelopeIcon, MagnifierIcon, SafeBagArt, TownBackground } from "./art";

/** "The fog of trick messages" — a gentle mystery: the town's mail is mixed up and Fenn needs a partner. */

function Letters({ grey = false }: { grey?: boolean }) {
  return (
    <div className={`mm-story-letters ${grey ? "is-grey" : ""}`}>
      {[0, 1, 2, 3].map((i) => <span key={i} style={{ "--i": i } as React.CSSProperties}><EnvelopeIcon /></span>)}
    </div>
  );
}

const scene = (fog: number, children: React.ReactNode) => <div className="scene mm-scene"><TownBackground fog={fog} />{children}</div>;

export const mmIntro: StoryBeat[] = [
  {
    line: "mm.story.intro1",
    camera: "wide",
    scene: () => scene(0, <Actor x={50} y={40} w={60}><Letters /></Actor>),
  },
  {
    line: "mm.story.intro2",
    camera: "pan-right",
    scene: () => scene(1, <Actor x={50} y={44} w={60}><Letters grey /></Actor>),
  },
  {
    line: "mm.story.intro3",
    camera: "close",
    scene: ({ speaking }) => scene(0.8, <>
      <Actor x={44} y={90} w={34}><Fenn state="greeting" talking={speaking} size="100%" /></Actor>
      <Actor x={72} y={56} w={14} float><MagnifierIcon /></Actor>
    </>),
  },
  {
    line: "mm.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(0.6, <>
      <Actor x={22} y={90} w={20}><SafeBagArt full /></Actor>
      <Actor x={50} y={90} w={26}><Fenn state="encouraging" talking={speaking} size="100%" /></Actor>
      <Actor x={78} y={90} w={20}><AskDeskArt full /></Actor>
    </>),
  },
];

export const mmOutro: StoryBeat[] = [
  {
    line: "mm.story.outro1",
    camera: "wide",
    scene: ({ speaking }) => scene(0, <>
      <Actor x={50} y={90} w={30}><Fenn state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={50} y={30} w={50}><Letters /></Actor>
    </>),
  },
  {
    line: "mm.story.outro2",
    camera: "close",
    scene: ({ speaking }) => scene(0, <>
      <Actor x={36} y={90} w={26}><Fenn state="greeting" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={88} w={20} float><Hoot state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "mm.story.outro3",
    camera: "zoom-in",
    scene: () => scene(0, <Actor x={50} y={78} w={34} enter="drop"><DetectiveBadgeSticker /></Actor>),
  },
];

export const mmBetween = {
  2: { line: "mm.story.between2" },
  4: { line: "mm.story.between4" },
  6: { line: "mm.story.between6" },
};
