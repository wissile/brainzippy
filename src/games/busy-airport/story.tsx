import { Bobbo } from "../../characters/Bobbo";
import { Hoot, Puff, Zuzu } from "../../characters/Crew";
import { Ziggy } from "../../characters/library";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { AirportBackground, Bag, GroundCrewSticker, Lamp, Marshaller, Plane } from "./art";
import type { Colour } from "./generator";

/**
 * "Ziggy's Busy Airport" — the airport opens for the first holiday flights, but bags, passengers, runway lights and a
 * little lost plane are all in a muddle. The child is Ziggy's ground crew; the outro is the first take-off.
 */
const scene = (children: React.ReactNode, extra = "") => (
  <div className={`scene ba-story ${extra}`}>
    <AirportBackground />
    {children}
  </div>
);

const TUMBLE: [number, number, Colour, number][] = [[18, 70, "red", -24], [34, 78, "blue", 18], [62, 74, "yellow", -10], [80, 80, "green", 30]];
const LIGHTS: Colour[] = ["red", "blue", "red", "blue", "red", "blue"];

export const airportIntro: StoryBeat[] = [
  {
    line: "ba.story.1",
    camera: "rise",
    scene: ({ speaking }) => scene(<Actor x={50} y={90} w={30}><Ziggy state="greeting" talking={speaking} size="100%" /></Actor>),
  },
  {
    line: "ba.story.2",
    camera: "shake",
    sfx: "whoosh",
    scene: ({ speaking }) =>
      scene(<>
        {TUMBLE.map(([x, y, c, r], i) => (
          <Actor key={i} x={x} y={y} w={13} enter={i % 2 ? "right" : "left"}>
            <span className="ba-tumble" style={{ "--r": `${r}deg`, "--i": i } as React.CSSProperties}><Bag colour={c} tag="none" /></span>
          </Actor>
        ))}
        <Actor x={50} y={92} w={22}><Ziggy state="thinking" talking={speaking} size="100%" /></Actor>
      </>),
  },
  {
    line: "ba.story.3",
    camera: "pan-right",
    scene: () =>
      scene(<>
        <div className="ba-story-lights" aria-hidden="true">
          {LIGHTS.map((c, i) => <span key={i} className="ba-story-lamp is-dark"><Lamp colour={c} lit={false} /></span>)}
        </div>
        <Actor x={70} y={58} w={30} float>
          <span className="ba-lost"><Plane colour="red" tag="none" /><span className="ba-lost-q" aria-hidden="true">?</span></span>
        </Actor>
        <Actor x={24} y={64} w={10}><Bobbo state="retry" size="100%" /></Actor>
      </>),
  },
  {
    line: "ba.story.4",
    camera: "zoom-in",
    sfx: "star",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={24} y={90} w={24}><Marshaller signal="ahead" /></Actor>
        <Actor x={52} y={92} w={26}><Ziggy state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={78} y={78} w={15}><Hoot state="greeting" size="100%" /></Actor>
      </>),
  },
];

export const airportOutro: StoryBeat[] = [
  {
    line: "ba.story.end1",
    camera: "wide",
    sfx: "complete",
    scene: () =>
      scene(<>
        <div className="ba-story-lights is-lit" aria-hidden="true">
          {LIGHTS.map((c, i) => <span key={i} className="ba-story-lamp" style={{ "--i": i } as React.CSSProperties}><Lamp colour={c} /></span>)}
        </div>
        <Actor x={50} y={80} w={46} enter="left"><span className="ba-roll"><Plane colour="yellow" tag="star" /></span></Actor>
      </>),
  },
  {
    line: "ba.story.end2",
    camera: "rise",
    sfx: "whoosh",
    scene: () =>
      scene(<>
        <Actor x={50} y={62} w={46}><span className="ba-takeoff"><Plane colour="yellow" tag="star" /></span></Actor>
        <Spark x={20} y={30} size={7} />
        <Spark x={82} y={22} size={6} />
      </>, "is-takeoff"),
  },
  {
    line: "ba.story.end3",
    camera: "zoom-in",
    sfx: "achievement",
    scene: ({ speaking }) =>
      scene(<>
        <Actor x={22} y={86} w={20}><Ziggy state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={50} y={72} w={30} enter="drop"><GroundCrewSticker /></Actor>
        <Actor x={76} y={84} w={12}><Zuzu state="celebrating" size="100%" /></Actor>
        <Actor x={90} y={86} w={10}><Puff state="celebrating" size="100%" /></Actor>
      </>),
  },
];

export const airportBetween: Record<number, { line: string }> = {
  2: { line: "ba.story.mid1" },
  4: { line: "ba.story.mid2" },
  6: { line: "ba.story.mid3" },
};
