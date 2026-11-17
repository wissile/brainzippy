import { Gloop } from "../../characters/Crew";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { CaveScene, StoryRide, ZuzuLantern } from "./art";

/** "Glow Cave Hops" — Gloop's crystal cave has gone dark; hopping the right number of spaces relights it. */

const Cave = ({ lit }: { lit: number }) => <CaveScene lit={lit} className="bg" id="gcst-story" />;

export const caveIntro: StoryBeat[] = [
  {
    line: "gc.story.1",
    camera: "rise",
    scene: () => (
      <div className="scene">
        <Cave lit={0} />
        <Actor x={46} y={84} w={74}><StoryRide cart={{ state: "retry" }} /></Actor>
      </div>
    ),
  },
  {
    line: "gc.story.2",
    camera: "close",
    sfx: "star",
    scene: () => (
      <div className="scene">
        <Cave lit={1} />
        <Actor x={50} y={86} w={80}><StoryRide hops={3} glow /></Actor>
        <Spark x={67} y={36} size={9} />
      </div>
    ),
  },
  {
    line: "gc.story.3",
    camera: "pan-right",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene">
        <Cave lit={1} />
        <Actor x={44} y={84} w={70}><StoryRide cart={{ state: "greeting" }} zuzu={{ state: "greeting", talking: speaking, enter: true }} /></Actor>
      </div>
    ),
  },
  {
    line: "gc.story.4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene">
        <Cave lit={2} />
        <Actor x={44} y={84} w={70}><StoryRide cart={{ state: "encouraging" }} zuzu={{ state: "encouraging", talking: speaking }} /></Actor>
      </div>
    ),
  },
];

export const caveOutro: StoryBeat[] = [
  {
    line: "gc.story.end1",
    camera: "wide",
    sfx: "complete",
    scene: () => (
      <div className="scene">
        <Cave lit={8} />
        <Spark x={18} y={30} size={6} />
        <Spark x={82} y={26} size={7} />
        <Spark x={52} y={18} size={5} />
        <Actor x={50} y={86} w={80}><StoryRide hops={5} glow cart={{ state: "celebrating", at: 6 }} /></Actor>
      </div>
    ),
  },
  {
    line: "gc.story.end2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene">
        <Cave lit={8} />
        <Actor x={40} y={86} w={22}><Gloop state="celebrating" size="100%" /></Actor>
        <Actor x={66} y={84} w={22}><ZuzuLantern state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "gc.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <Cave lit={8} />
        <Actor x={50} y={88} w={20}><Gloop state="celebrating" size="100%" /></Actor>
        <Spark x={50} y={30} size={16} />
      </div>
    ),
  },
];

export const caveBetween: Record<number, { line: string }> = {
  2: { line: "gc.story.mid1" },
  4: { line: "gc.story.mid2" },
  6: { line: "gc.story.mid3" },
};
