import { Bobbo } from "../../characters/Bobbo";
import { Dabble, Ziggy } from "../../characters/library";
import type { MascotState } from "../../engine/types";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { AirfieldScene, ClipboardSticker, FestivalScene, PlanningRoom } from "./art";
import type { Outcome } from "./logic";
import { outcomeStore } from "./store";

/**
 * "Tomorrow's flight" — Ziggy is flying Bobbo to the island festival and asks the child to co-pilot the planning:
 * the wing, the route, the weather, the checklist and the final call. Older register: calm states only (no bouncy
 * celebrations). The outro follows the round's briefing: fly now, a wise "wait an hour", or sort it out first.
 * The first beat carries the library's educational-only notice (docs/curriculum/pilot.md, band T rule).
 */
const calm = (s: MascotState): MascotState => (s === "celebrating" ? "encouraging" : s);
const room = (children: React.ReactNode) => <div className="scene fp-scene-story"><PlanningRoom />{children}</div>;
const field = (children: React.ReactNode, o: { clouds?: boolean; flying?: boolean } = {}) => <div className="scene fp-scene-story"><AirfieldScene {...o} />{children}</div>;

export function Notice() {
  return (
    <p className="fp-notice" data-testid="fp-notice">
      <strong>Educational only.</strong> Not flight training. The chart, weather and minimums in this game are made up and never for navigation.
    </p>
  );
}

export const fpIntro: StoryBeat[] = [
  {
    line: "fp.story.intro1",
    camera: "wide",
    holdMs: 2600,
    scene: ({ speaking }) => room(<>
      <Actor x={50} y={86} w={32}><Ziggy state="greeting" talking={speaking} size="100%" /></Actor>
      <Notice />
    </>),
  },
  {
    line: "fp.story.intro2",
    camera: "pan-right",
    scene: () => field(<>
      <Actor x={34} y={88} w={26}><Ziggy state={calm("encouraging")} size="100%" /></Actor>
      <Actor x={66} y={90} w={22}><Bobbo state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "fp.story.intro3",
    camera: "close",
    scene: () => room(<>
      <Actor x={28} y={88} w={26}><Ziggy state="thinking" size="100%" /></Actor>
      <Actor x={72} y={88} w={22}><Dabble state="encouraging" size="100%" /></Actor>
    </>),
  },
  {
    line: "fp.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => room(<Actor x={50} y={86} w={34}><Ziggy state="encouraging" talking={speaking} size="100%" /></Actor>),
  },
];

const FIRST: Record<Outcome, StoryBeat> = {
  go: {
    line: "fp.story.outro.go",
    camera: "rise",
    scene: () => field(null, { flying: true }),
  },
  wait: {
    line: "fp.story.outro.wait",
    camera: "wide",
    holdMs: 2400,
    scene: () => field(<>
      <Actor x={34} y={88} w={24}><Ziggy state="thinking" size="100%" /></Actor>
      <Actor x={64} y={90} w={20}><Bobbo state="idle" size="100%" /></Actor>
    </>, { clouds: true }),
  },
  fix: {
    line: "fp.story.outro.fix",
    camera: "wide",
    holdMs: 2400,
    scene: () => field(<>
      <Actor x={34} y={88} w={24}><Ziggy state="encouraging" size="100%" /></Actor>
      <Actor x={64} y={90} w={20}><Bobbo state="encouraging" size="100%" /></Actor>
    </>),
  },
};

/** The outro for a briefing outcome (tested). */
export function outroFor(o: Outcome): StoryBeat[] {
  return [
    FIRST[o],
    {
      line: "fp.story.outro2",
      camera: "close",
      scene: ({ speaking }) => (
        <div className="scene fp-scene-story">
          <FestivalScene />
          <Actor x={36} y={90} w={26}><Ziggy state="greeting" talking={speaking} size="100%" /></Actor>
          <Actor x={66} y={92} w={22}><Bobbo state="celebrating" size="100%" /></Actor>
        </div>
      ),
    },
    {
      line: "fp.story.outro3",
      camera: "zoom-in",
      scene: () => room(<Actor x={50} y={78} w={34} enter="drop"><ClipboardSticker /></Actor>),
    },
  ];
}

export const fpBetween = {
  2: { line: "fp.story.between2" },
  4: { line: "fp.story.between4" },
  6: { line: "fp.story.between6" },
};

/** Story for the skin: `outro` is read when the outro starts, after the briefing set the outcome. */
export const fpStory = {
  intro: fpIntro,
  get outro(): StoryBeat[] {
    return outroFor(outcomeStore.get());
  },
  between: fpBetween,
};
