import { Bobbo } from "../../characters/Bobbo";
import { Zephy } from "../../characters/library";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { PlaneArt, SkyBackground, SkyWingsSticker } from "./art";
import { REST } from "./flight";

/** "The Sky Hoop Show" — Zephy's first show; Bobbo (who can't fly, but loves planes) rides along and peeks. */

function Hoops({ lit = false }: { lit?: boolean }) {
  const spots: [number, number, number][] = [[18, 30, 9], [42, 20, 7], [64, 32, 8], [84, 22, 6]];
  return (
    <>
      {spots.map(([x, y, w], i) => (
        <span key={i} className={`sh-story-hoop ${lit ? "is-lit" : ""}`} style={{ left: `${x}%`, top: `${y}%`, width: `${w}vmin`, "--i": i } as React.CSSProperties} aria-hidden="true" />
      ))}
    </>
  );
}
const scene = (children: React.ReactNode) => <div className="scene sh-scene-story"><SkyBackground />{children}</div>;
const plane34 = { ...REST, roll: -0.18, pitch: 0.08 };

export const shIntro: StoryBeat[] = [
  {
    line: "sh.story.intro1",
    camera: "wide",
    scene: ({ speaking }) => scene(<>
      <Hoops />
      <Actor x={50} y={86} w={34}><Zephy state="greeting" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "sh.story.intro2",
    camera: "pan-right",
    scene: () => scene(<>
      <Hoops />
      <Actor x={50} y={58} w={54} float><PlaneArt pose={plane34} cam="side34" label="Zephy's little red plane" /></Actor>
    </>),
  },
  {
    line: "sh.story.intro3",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={34} y={88} w={28}><Zephy state="thinking" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={88} w={24}><Bobbo state="retry" size="100%" /></Actor>
    </>),
  },
  {
    line: "sh.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => scene(<>
      <Hoops lit />
      <Actor x={36} y={66} w={40} float><PlaneArt pose={plane34} cam="side34" /></Actor>
      <Actor x={76} y={88} w={26}><Zephy state="encouraging" talking={speaking} size="100%" /></Actor>
    </>),
  },
];

export const shOutro: StoryBeat[] = [
  {
    line: "sh.story.outro1",
    camera: "wide",
    scene: () => scene(<>
      <Hoops lit />
      <Actor x={50} y={56} w={50} float><PlaneArt pose={{ ...REST, roll: 0.2, pitch: 0.12 }} cam="side34" /></Actor>
    </>),
  },
  {
    line: "sh.story.outro2",
    camera: "close",
    scene: ({ speaking }) => scene(<>
      <Actor x={36} y={88} w={28}><Zephy state="celebrating" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={88} w={24}><Bobbo state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "sh.story.outro3",
    camera: "zoom-in",
    scene: () => scene(<Actor x={50} y={78} w={34} enter="drop"><SkyWingsSticker /></Actor>),
  },
];

export const shBetween = {
  2: { line: "sh.story.between2" },
  4: { line: "sh.story.between4" },
  6: { line: "sh.story.between6" },
};
