import { Toggle } from "../../characters/library";
import { Puff } from "../../characters/Crew";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { ArrowCard, BerryBushArt, FootprintArt, GardenBackground, PathFinderSticker, RockArt } from "./art";
import type { Dir } from "./logic";

/** "Toggle's rumbling tummy" — the berries are across the garden and Toggle only moves by arrow cards. */

function Cards({ dirs }: { dirs: Dir[] }) {
  return (
    <div className="gp-story-cards">
      {dirs.map((d, i) => <span key={i} className="gp-story-card" style={{ "--i": i } as React.CSSProperties}><ArrowCard d={d} /></span>)}
    </div>
  );
}
function Steps() {
  return (
    <div className="gp-story-steps">
      {[1, 2, 3].map((n) => <span key={n} style={{ "--i": n } as React.CSSProperties}><FootprintArt n={n} /></span>)}
    </div>
  );
}

const scene = (children: React.ReactNode) => <div className="scene gp-scene"><GardenBackground />{children}</div>;

export const gardenIntro: StoryBeat[] = [
  {
    line: "gp.story.intro1",
    camera: "close",
    scene: ({ speaking }) => scene(<Actor x={50} y={90} w={34}><Toggle state="greeting" talking={speaking} size="100%" /></Actor>),
  },
  {
    line: "gp.story.intro2",
    camera: "pan-right",
    scene: ({ speaking }) => scene(<>
      <Actor x={18} y={90} w={22}><Toggle state="thinking" talking={speaking} size="100%" /></Actor>
      <Actor x={50} y={88} w={12}><RockArt /></Actor>
      <Actor x={80} y={88} w={20} enter="right"><BerryBushArt /></Actor>
    </>),
  },
  {
    line: "gp.story.intro3",
    camera: "wide",
    scene: ({ speaking }) => scene(<>
      <Actor x={50} y={46} w={56}><Cards dirs={["right", "right", "up"]} /></Actor>
      <Actor x={50} y={92} w={40}><Steps /></Actor>
      <Actor x={14} y={92} w={18}><Toggle state="encouraging" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "gp.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(<>
      <Actor x={36} y={90} w={26}><Toggle state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={84} w={18} float><Puff state="greeting" size="100%" /></Actor>
    </>),
  },
];

export const gardenOutro: StoryBeat[] = [
  {
    line: "gp.story.outro1",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={44} y={90} w={30}><Toggle state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={74} y={88} w={16}><BerryBushArt eaten /></Actor>
    </>),
  },
  {
    line: "gp.story.outro2",
    camera: "wide",
    scene: ({ speaking }) => scene(<>
      <Actor x={50} y={44} w={56}><Cards dirs={["right", "up", "right", "up"]} /></Actor>
      <Actor x={30} y={92} w={22}><Toggle state="greeting" talking={speaking} size="100%" /></Actor>
      <Actor x={72} y={86} w={18} float><Puff state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "gp.story.outro3",
    camera: "zoom-in",
    scene: () => scene(<Actor x={50} y={78} w={34} enter="drop"><PathFinderSticker /></Actor>),
  },
];

export const gardenBetween = {
  2: { line: "gp.story.between2" },
  4: { line: "gp.story.between4" },
  6: { line: "gp.story.between6" },
};
