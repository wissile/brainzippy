import { Bobbo } from "../../characters/Bobbo";
import { Gloop, Hoot, Puff, Zuzu } from "../../characters/Crew";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { GloopShape, PondBackground, StoryGate } from "./art";
import { parseShape } from "./shapes";

/** "Gloop's Shape Squish" — every garden gate has a shaped hole; Gloop squishes into the right shape to reach the Jelly Party. */

const Bg = () => <PondBackground className="bg" />;
const SQ = parseShape("square~0~100~74~0")!;
const TRI = parseShape("tri-eq~0~100~80~0")!;
const CIRCLE = parseShape("circle~0~100~80~0")!;

export const squishIntro: StoryBeat[] = [
  {
    line: "ss.story.1",
    camera: "rise",
    scene: ({ speaking }) => (
      <div className="scene">
        <Bg />
        <Actor x={50} y={90} w={26}><Gloop state="idle" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ss.story.2",
    camera: "pan-right",
    sfx: "whoosh",
    scene: () => (
      <div className="scene">
        <Bg />
        <Actor x={30} y={66} w={14} enter="left"><Bobbo state="celebrating" size="100%" /></Actor>
        <Actor x={50} y={64} w={13} enter="left"><Zuzu state="greeting" size="100%" /></Actor>
        <Actor x={70} y={66} w={13} enter="right"><Hoot state="celebrating" size="100%" /></Actor>
        <Actor x={86} y={66} w={12} enter="right"><Puff state="greeting" size="100%" /></Actor>
        <Spark x={50} y={22} size={8} />
      </div>
    ),
  },
  {
    line: "ss.story.3",
    camera: "shake",
    scene: () => (
      <div className="scene">
        <Bg />
        <Actor x={50} y={88} w={56}><StoryGate hole={SQ} gloop="blob" bonk /></Actor>
      </div>
    ),
  },
  {
    line: "ss.story.4",
    camera: "zoom-in",
    sfx: "star",
    scene: () => (
      <div className="scene">
        <Bg />
        <Actor x={30} y={84} w={18}><GloopShape spec={CIRCLE} state="greeting" /></Actor>
        <Actor x={52} y={84} w={18}><GloopShape spec={SQ} state="greeting" /></Actor>
        <Actor x={74} y={84} w={18}><GloopShape spec={TRI} state="celebrating" /></Actor>
      </div>
    ),
  },
];

export const squishOutro: StoryBeat[] = [
  {
    line: "ss.story.end1",
    camera: "wide",
    sfx: "complete",
    scene: () => (
      <div className="scene">
        <Bg />
        <Actor x={50} y={88} w={56}><StoryGate hole={SQ} gloop={SQ} through /></Actor>
        <Spark x={24} y={30} size={7} />
        <Spark x={78} y={26} size={6} />
      </div>
    ),
  },
  {
    line: "ss.story.end2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene">
        <Bg />
        <Actor x={36} y={88} w={24}><Gloop state="celebrating" size="100%" /></Actor>
        <Actor x={64} y={86} w={22}><Zuzu state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ss.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <Bg />
        <Actor x={28} y={70} w={12}><Bobbo state="celebrating" size="100%" /></Actor>
        <Actor x={50} y={90} w={22}><Gloop state="celebrating" size="100%" /></Actor>
        <Actor x={72} y={70} w={12}><Puff state="celebrating" size="100%" /></Actor>
        <Spark x={50} y={26} size={14} />
      </div>
    ),
  },
];

export const squishBetween: Record<number, { line: string }> = {
  2: { line: "ss.story.mid1" },
  4: { line: "ss.story.mid2" },
  6: { line: "ss.story.mid3" },
};
