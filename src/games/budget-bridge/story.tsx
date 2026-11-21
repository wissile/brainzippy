import { Brix, Budge } from "../../characters/library";
import { Actor, StormClouds } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BridgeBackground, BridgeBuilderSticker, BudgetTagArt, StoryRiver } from "./art";

/** "The bridge that washed away" — the story wrapper for Brix's Budget Bridge (docs/curriculum/engineering.md §4.2). */

const scene = (children: React.ReactNode) => <div className="scene bb-scene"><BridgeBackground />{children}</div>;

export const bridgeIntro: StoryBeat[] = [
  {
    line: "bb.story.intro1",
    camera: "wide",
    sfx: "whoosh",
    scene: ({ speaking }) => scene(<>
      <StormClouds />
      <Actor x={50} y={92} w={70}><StoryRiver broken /></Actor>
      <Actor x={16} y={70} w={18}><Brix state="retry" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "bb.story.intro2",
    camera: "pan-right",
    scene: ({ speaking }) => scene(<>
      <Actor x={50} y={92} w={70}><StoryRiver broken vehicle="bus" at={0.05} /></Actor>
      <Actor x={84} y={70} w={16}><Brix state="thinking" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "bb.story.intro3",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={34} y={88} w={30}><Brix state="greeting" talking={speaking} size="100%" /></Actor>
      <Actor x={66} y={88} w={24} enter="right"><Budge state="encouraging" size="100%" /></Actor>
      <Actor x={80} y={46} w={14} float><BudgetTagArt /></Actor>
    </>),
  },
  {
    line: "bb.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(<>
      <Actor x={56} y={92} w={62}><StoryRiver /></Actor>
      <Actor x={14} y={74} w={20}><Brix state="celebrating" talking={speaking} size="100%" /></Actor>
    </>),
  },
];

export const bridgeOutro: StoryBeat[] = [
  {
    line: "bb.story.outro1",
    camera: "wide",
    holdMs: 2600,
    scene: () => scene(<Actor x={50} y={92} w={72}><div className="bb-story-drive"><StoryRiver vehicle="bus" at={0.5} /></div></Actor>),
  },
  {
    line: "bb.story.outro2",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={36} y={88} w={28}><Brix state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={66} y={88} w={22}><Budge state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "bb.story.outro3",
    camera: "zoom-in",
    scene: () => scene(<Actor x={50} y={78} w={34} enter="drop"><BridgeBuilderSticker /></Actor>),
  },
];

export const bridgeBetween = {
  2: { line: "bb.story.between2" },
  4: { line: "bb.story.between4" },
  6: { line: "bb.story.between6" },
};
