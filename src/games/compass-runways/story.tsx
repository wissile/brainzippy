import { Gloop } from "../../characters/Crew";
import { Ziggy } from "../../characters/library";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { AirportStory, CompassRosePin, StormCloud, TowerArt } from "./art";

/**
 * "Signs in the storm" — a storm blew Sky School Airport's runway signs and numbers away; planes are arriving and
 * Ziggy, in the tower, needs runway numbers and headings before the first one lands. Gloop helps with the angles.
 */
const scene = (children: React.ReactNode, cls = "") => <div className={`scene cr-scene-story ${cls}`}>{children}</div>;
const airport = (painted: boolean, planes: number) => (
  <div className="cr-story-ground" aria-hidden="true"><AirportStory painted={painted} planes={planes} /></div>
);

export const crIntro: StoryBeat[] = [
  {
    line: "cr.story.intro1",
    camera: "wide",
    sfx: "whoosh",
    scene: () => scene(<>
      {airport(false, 0)}
      <Actor x={24} y={22} w={30} float><StormCloud /></Actor>
      <Actor x={70} y={16} w={26} float><StormCloud /></Actor>
    </>, "is-stormy"),
  },
  {
    line: "cr.story.intro2",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      {airport(false, 0)}
      <Actor x={30} y={92} w={30}><TowerArt /></Actor>
      <Actor x={66} y={90} w={34}><Ziggy state="retry" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "cr.story.intro3",
    camera: "pan-right",
    scene: () => scene(airport(false, 3)),
  },
  {
    line: "cr.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(<>
      {airport(false, 1)}
      <Actor x={34} y={90} w={32}><Ziggy state="encouraging" talking={speaking} size="100%" /></Actor>
      <Actor x={72} y={90} w={24}><Gloop state="greeting" size="100%" /></Actor>
    </>),
  },
];

export const crOutro: StoryBeat[] = [
  {
    line: "cr.story.outro1",
    camera: "wide",
    scene: () => scene(airport(true, 2), "is-sunny"),
  },
  {
    line: "cr.story.outro2",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      {airport(true, 0)}
      <Actor x={36} y={90} w={32}><Ziggy state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={90} w={24}><Gloop state="celebrating" size="100%" /></Actor>
    </>, "is-sunny"),
  },
  {
    line: "cr.story.outro3",
    camera: "zoom-in",
    scene: () => scene(<Actor x={50} y={78} w={34} enter="drop"><CompassRosePin /></Actor>, "is-sunny"),
  },
];

export const crBetween = {
  2: { line: "cr.story.between2" },
  4: { line: "cr.story.between4" },
  6: { line: "cr.story.between6" },
};
