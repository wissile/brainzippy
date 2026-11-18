import { Gloop, Rumble } from "../../characters/Crew";
import { Actor, Spark, Zzz } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { Landmark, StoryTrail, TrailMarkerSticker, TrailScene } from "./art";

/** "Rumble's Sleepy Trail" — Rumble's nap map marks spots as fractions of the trail; help him put a pillow on each. */

const Meadow = ({ dusk }: { dusk: number }) => <TrailScene dusk={dusk} className="bg" id="stst" />;

export const trailIntro: StoryBeat[] = [
  {
    line: "st.story.1",
    camera: "close",
    scene: () => (
      <div className="scene">
        <Meadow dusk={0.15} />
        <Actor x={50} y={86} w={34}><Rumble state="sleeping" size="100%" /></Actor>
        <Zzz x={60} y={42} />
      </div>
    ),
  },
  {
    line: "st.story.2",
    camera: "pan-right",
    scene: ({ speaking }) => (
      <div className="scene">
        <Meadow dusk={0.2} />
        <Actor x={50} y={70} w={80}><StoryTrail parts={1} labels /></Actor>
        <Actor x={16} y={66} w={12}><Landmark m={0} /></Actor>
        <Actor x={84} y={64} w={14}><Landmark m={1} /></Actor>
        <Actor x={22} y={92} w={22}><Rumble state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "st.story.3",
    camera: "zoom-in",
    sfx: "star",
    scene: () => (
      <div className="scene">
        <Meadow dusk={0.25} />
        <Actor x={50} y={56} w={80}><StoryTrail parts={2} labels /></Actor>
        <Actor x={50} y={90} w={80}><StoryTrail parts={3} labels /></Actor>
        <Spark x={50} y={30} size={7} />
      </div>
    ),
  },
  {
    line: "st.story.4",
    camera: "rise",
    scene: ({ speaking }) => (
      <div className="scene">
        <Meadow dusk={0.3} />
        <Actor x={50} y={68} w={80}><StoryTrail parts={4} pillows={[3]} labels /></Actor>
        <Actor x={30} y={92} w={22}><Rumble state="encouraging" size="100%" /></Actor>
        <Actor x={70} y={92} w={20} enter="right"><Gloop state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
];

export const trailOutro: StoryBeat[] = [
  {
    line: "st.story.end1",
    camera: "wide",
    sfx: "complete",
    scene: () => (
      <div className="scene">
        <Meadow dusk={0.9} />
        <Actor x={50} y={70} w={80}><StoryTrail parts={4} pillows={[1, 2, 3]} labels /></Actor>
        <Spark x={20} y={26} size={5} /><Spark x={80} y={22} size={6} />
      </div>
    ),
  },
  {
    line: "st.story.end2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene">
        <Meadow dusk={0.95} />
        <Actor x={36} y={88} w={24}><Rumble state="celebrating" size="100%" /></Actor>
        <Actor x={66} y={88} w={20}><Gloop state="celebrating" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "st.story.end3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene">
        <Meadow dusk={1} />
        <Actor x={40} y={90} w={30}><Rumble state="sleeping" size="100%" /></Actor>
        <Zzz x={48} y={48} />
        <Actor x={72} y={74} w={22}><TrailMarkerSticker /></Actor>
      </div>
    ),
  },
];

export const trailBetween: Record<number, { line: string }> = {
  2: { line: "st.story.mid1" },
  4: { line: "st.story.mid2" },
  6: { line: "st.story.mid3" },
};
