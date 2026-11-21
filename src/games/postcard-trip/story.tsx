import { Yonder, Zephy } from "../../characters/library";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { CompassRose, ExplorerSticker, PortBackground, Postcard, WorldMap } from "./art";

/** "The bag of postcards" — the story wrapper for Yonder's Postcard Trip (docs/curriculum/geography.md §4.2). */

const scene = (children: React.ReactNode) => <div className="scene pc-scene"><PortBackground />{children}</div>;
const CARDS = ["egypt", "japan", "peru", "france", "sydney"];

function CardFan() {
  return (
    <div className="pc-story-fan" aria-hidden="true">
      {CARDS.map((id, i) => <span key={id} style={{ "--i": i } as React.CSSProperties}><Postcard placeId={id} /></span>)}
    </div>
  );
}

export const tripIntro: StoryBeat[] = [
  {
    line: "pc.story.intro1",
    camera: "close",
    scene: ({ speaking }) => scene(<Actor x={50} y={90} w={36}><Yonder state="greeting" talking={speaking} size="100%" /></Actor>),
  },
  {
    line: "pc.story.intro2",
    camera: "pan-right",
    sfx: "whoosh",
    scene: ({ speaking }) => scene(<>
      <Actor x={22} y={90} w={24}><Yonder state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={64} y={60} w={44} enter="right"><CardFan /></Actor>
    </>),
  },
  {
    line: "pc.story.intro3",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(<>
      <Actor x={56} y={62} w={62}><div className="pc-story-map"><WorldMap active="none" /></div></Actor>
      <Actor x={14} y={92} w={22}><Yonder state="thinking" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "pc.story.intro4",
    camera: "wide",
    scene: ({ speaking }) => scene(<>
      <Actor x={30} y={90} w={24}><Yonder state="encouraging" size="100%" /></Actor>
      <Actor x={68} y={70} w={24} enter="right" float><Zephy state="greeting" talking={speaking} size="100%" /></Actor>
      <Actor x={50} y={30} w={14} float><CompassRose /></Actor>
    </>),
  },
];

export const tripOutro: StoryBeat[] = [
  {
    line: "pc.story.outro1",
    camera: "wide",
    scene: ({ speaking }) => scene(<>
      <Actor x={50} y={56} w={44}><CardFan /></Actor>
      <Actor x={50} y={94} w={26}><Yonder state="celebrating" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "pc.story.outro2",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={36} y={90} w={26}><Yonder state="celebrating" size="100%" /></Actor>
      <Actor x={66} y={74} w={22} float><Zephy state="celebrating" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "pc.story.outro3",
    camera: "zoom-in",
    scene: () => scene(<Actor x={50} y={78} w={34} enter="drop"><ExplorerSticker /></Actor>),
  },
];

export const tripBetween = {
  2: { line: "pc.story.between2" },
  4: { line: "pc.story.between4" },
  6: { line: "pc.story.between6" },
};
