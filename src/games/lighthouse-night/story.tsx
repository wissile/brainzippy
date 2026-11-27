import { Bobbo } from "../../characters/Bobbo";
import { Hoot } from "../../characters/Crew";
import { Ripple } from "../../characters/library";
import type { MascotState } from "../../engine/types";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { DawnHarbour, KeepersLampSticker, LampRoom, NightHarbour } from "./art";

/**
 * "Lighthouse Night" — a storm rolls over Number Hill harbour; Hoot the lighthouse keeper (with Ripple, the sea otter
 * who swims the harbour and notices tiny things) guides the last ships home, the very last being Bobbo's little boat
 * (Bobbo hosts the Maths journey). Older register: calm states only (no bouncy celebrations).
 */
const calm = (s: MascotState): MascotState => (s === "celebrating" ? "encouraging" : s);
const storm = (children: React.ReactNode) => <div className="scene ln-scene-story"><NightHarbour />{children}</div>;
const room = (children: React.ReactNode) => <div className="scene ln-scene-story"><LampRoom />{children}</div>;

export const lnIntro: StoryBeat[] = [
  { line: "ln.story.intro1", camera: "wide", holdMs: 2600, scene: () => storm(null) },
  {
    line: "ln.story.intro2",
    camera: "pan-right",
    scene: () => storm(<Actor x={70} y={88} w={24}><Hoot state="thinking" size="100%" /></Actor>),
  },
  {
    line: "ln.story.intro3",
    camera: "close",
    scene: () => room(<>
      <Actor x={30} y={88} w={26}><Hoot state="encouraging" size="100%" /></Actor>
      <Actor x={72} y={90} w={24}><Ripple state="greeting" size="100%" /></Actor>
    </>),
  },
  {
    line: "ln.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => room(<Actor x={50} y={86} w={32}><Hoot state="greeting" talking={speaking} size="100%" /></Actor>),
  },
];

export const lnOutro: StoryBeat[] = [
  { line: "ln.story.outro1", camera: "rise", holdMs: 2400, scene: () => storm(null) },
  {
    line: "ln.story.outro2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene ln-scene-story">
        <DawnHarbour />
        <Actor x={34} y={90} w={24}><Hoot state={calm("celebrating")} talking={speaking} size="100%" /></Actor>
        <Actor x={64} y={92} w={20}><Bobbo state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "ln.story.outro3",
    camera: "zoom-in",
    scene: () => <div className="scene ln-scene-story"><DawnHarbour /><Actor x={50} y={78} w={34} enter="drop"><KeepersLampSticker /></Actor></div>,
  },
];

export const lnBetween = {
  2: { line: "ln.story.between2" },
  4: { line: "ln.story.between4" },
  6: { line: "ln.story.between6" },
};

export const lnStory = { intro: lnIntro, outro: lnOutro, between: lnBetween };
