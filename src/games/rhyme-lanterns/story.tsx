import { Bobbo } from "../../characters/Bobbo";
import { Hoot, Zuzu } from "../../characters/Crew";
import { Actor, Sky, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { Lantern, LanternString, NightForest } from "./art";

/**
 * "Hoot's Lantern Party" — the story around Hoot's Rhyme Lanterns.
 * Problem (kid-sized, concrete): the party starts at dark, but Hoot's lanterns only glow when rhyming words meet.
 */
const PARTY = ["moon", "cake", "bell", "star", "boat"];

export const lanternIntro: StoryBeat[] = [
  {
    line: "rl.story.1",
    camera: "rise",
    scene: () => (
      <div className="scene">
        <Sky time="dusk" />
        <Actor x={50} y={44} w={86}><LanternString count={5} lit={0} /></Actor>
        <Actor x={50} y={88} w={22}><Hoot state="idle" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.story.2",
    camera: "close",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene">
        <NightForest />
        <Actor x={50} y={44} w={86}><LanternString count={5} lit={0} words={PARTY} /></Actor>
        <Actor x={22} y={90} w={18}><Bobbo state="thinking" /></Actor>
        <Actor x={50} y={90} w={22}><Hoot state="thinking" talking={speaking} size="100%" /></Actor>
        <Actor x={78} y={90} w={17}><Zuzu state="retry" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.story.3",
    camera: "zoom-in",
    sfx: "star",
    scene: ({ speaking }) => (
      <div className="scene">
        <NightForest />
        <Actor x={38} y={66} w={22}><div className="rl-story-lantern is-lit"><Lantern word="cat" paper="#FF9F43" lit /></div></Actor>
        <Actor x={62} y={66} w={22}><div className="rl-story-lantern is-lit"><Lantern word="hat" paper="#FF8FB1" lit /></div></Actor>
        <Spark x={50} y={34} size={8} />
        <Actor x={84} y={92} w={18} enter="right"><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.story.4",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene">
        <NightForest />
        <Actor x={50} y={44} w={86}><LanternString count={5} lit={1} words={PARTY} /></Actor>
        <Actor x={50} y={92} w={24}><Hoot state="encouraging" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const lanternOutro: StoryBeat[] = [
  {
    line: "rl.story.end1",
    camera: "close",
    sfx: "complete",
    scene: () => (
      <div className="scene">
        <NightForest />
        <Actor x={50} y={44} w={86}><LanternString count={5} lit={5} words={PARTY} /></Actor>
        <Actor x={22} y={92} w={18}><Bobbo state="celebrating" /></Actor>
        <Actor x={50} y={92} w={22}><Hoot state="celebrating" size="100%" /></Actor>
        <Actor x={78} y={92} w={17}><Zuzu state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.story.end2",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene">
        <NightForest />
        <Actor x={50} y={44} w={86}><LanternString count={5} lit={5} words={PARTY} /></Actor>
        <Actor x={50} y={92} w={24}><Hoot state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <NightForest />
        <Actor x={50} y={90} w={22}><Hoot state="celebrating" size="100%" /></Actor>
        <Spark x={50} y={28} size={14} />
      </div>
    ),
  },
];

export const lanternBetween: Record<number, { line: string }> = {
  2: { line: "rl.mid.1" },
  4: { line: "rl.mid.2" },
  6: { line: "rl.mid.3" },
};
