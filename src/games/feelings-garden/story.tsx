import { Rumble } from "../../characters/Crew";
import { Snug } from "../../characters/library";
import { CREW } from "../../characters/palette";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { FlowerBed, GardenBg } from "./art";
import { FeelingCritter } from "./critters";

/**
 * "Snug's Feelings Garden" — the story. Problem (kid-sized, concrete): friends keep visiting Snug's garden with big
 * feelings, and each friend's flower bed only blooms when someone understands how they feel. Spec §4.2.
 */
const Bed = ({ x, bloom, colour, w = 22 }: { x: number; bloom: boolean; colour: string; w?: number }) => (
  <Actor x={x} y={96} w={w}><FlowerBed bloom={bloom} colour={colour} /></Actor>
);
const BEDS = [CREW.bobbo, CREW.zuzu, CREW.gloop, CREW.hoot];

export const gardenIntro: StoryBeat[] = [
  {
    line: "fg.story.intro1",
    camera: "rise",
    scene: ({ speaking }) => (
      <div className="scene">
        <GardenBg />
        {BEDS.map((c, i) => <Bed key={c} x={14 + i * 24} bloom={false} colour={c} />)}
        <Actor x={50} y={78} w={26}><Snug state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "fg.story.intro2",
    camera: "close",
    sfx: "star",
    scene: ({ speaking }) => (
      <div className="scene">
        <GardenBg />
        <Actor x={34} y={70} w={22}><FeelingCritter friend="hoot" face="content" pose="relaxed" label="" /></Actor>
        <Bed x={34} bloom colour={CREW.hoot} w={30} />
        <Spark x={34} y={30} size={7} />
        <Actor x={74} y={78} w={24}><Snug state="encouraging" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "fg.story.intro3",
    camera: "wide",
    sfx: "whoosh",
    scene: () => (
      <div className="scene">
        <GardenBg />
        <Actor x={16} y={86} w={16} enter="left"><FeelingCritter friend="bobbo" face="sad" pose="droop" label="" /></Actor>
        <Actor x={38} y={86} w={16} enter="left"><FeelingCritter friend="zuzu" face="surprised" pose="up" label="" /></Actor>
        <Actor x={62} y={86} w={16} enter="right"><FeelingCritter friend="gloop" face="angry" pose="fists" label="" /></Actor>
        <Actor x={84} y={86} w={16} enter="right"><FeelingCritter friend="puff" face="happy" pose="up" label="" /></Actor>
      </div>
    ),
  },
  {
    line: "fg.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <div className="scene">
        <GardenBg />
        <Actor x={30} y={84} w={22}><Rumble state="greeting" size="100%" /></Actor>
        <Actor x={64} y={82} w={28}><Snug state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const gardenOutro: StoryBeat[] = [
  {
    line: "fg.story.outro1",
    camera: "wide",
    sfx: "complete",
    scene: () => (
      <div className="scene">
        <GardenBg />
        {[CREW.bobbo, CREW.zuzu, CREW.gloop, CREW.hoot, CREW.rumble].map((c, i) => <Bed key={c} x={10 + i * 20} bloom colour={c} w={19} />)}
        <Spark x={20} y={30} size={6} /><Spark x={80} y={24} size={7} />
      </div>
    ),
  },
  {
    line: "fg.story.outro2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene">
        <GardenBg />
        <Actor x={22} y={84} w={16}><FeelingCritter friend="bobbo" face="content" pose="relaxed" label="" /></Actor>
        <Actor x={50} y={82} w={26}><Snug state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={78} y={84} w={16}><FeelingCritter friend="gloop" face="happy" pose="up" label="" /></Actor>
      </div>
    ),
  },
  {
    line: "fg.story.outro3",
    camera: "zoom-in",
    sfx: "star",
    scene: ({ speaking }) => (
      <div className="scene">
        <GardenBg />
        <Actor x={50} y={82} w={30}><Snug state="celebrating" talking={speaking} size="100%" /></Actor>
        <Spark x={30} y={34} size={8} /><Spark x={70} y={30} size={6} />
      </div>
    ),
  },
];

export const gardenBetween: Record<number, { line: string }> = {
  2: { line: "fg.story.between2" },
  4: { line: "fg.story.between4" },
  6: { line: "fg.story.between6" },
};
