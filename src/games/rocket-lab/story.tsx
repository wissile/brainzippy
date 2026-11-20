import { Rumble } from "../../characters/Crew";
import { Dabble } from "../../characters/library/Dabble";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { EngineArt, FlameArt, LabBackground, LaunchPatchSticker, MoonGarden, PadArt, RocketArt, SeedArt } from "./art";

/** "The Moon-Flower Seed" — the story wrapper for Dabble's Rocket Lab (docs/curriculum/science.md §4.2). */

function StoryRocket({ flying = false, flame = false, color }: { flying?: boolean; flame?: boolean; color?: string }) {
  return (
    <div className={`rl-story-rocket ${flying ? "is-flying" : ""}`}>
      <RocketArt color={color} />
      <span className="rl-story-engine"><EngineArt size={1} /></span>
      {flame && <span className="rl-story-flame"><FlameArt /></span>}
    </div>
  );
}
const Pad = () => <div className="rl-story-pad"><PadArt /></div>;

/** Push-up and pull-down arrows for the story (not to a scale: a picture of the idea). */
function StoryForces() {
  return (
    <div className="rl-story-forces" aria-hidden="true">
      <span className="up">push up</span>
      <span className="down">pull down</span>
    </div>
  );
}

export const rocketIntro: StoryBeat[] = [
  {
    line: "rl.intro1",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={40} y={92} w={24}><Dabble state="greeting" talking={speaking} size="100%" /></Actor>
        <Actor x={64} y={60} w={9} float><SeedArt /></Actor>
      </div>
    ),
  },
  {
    line: "rl.intro2",
    camera: "pan-right",
    scene: ({ speaking }) => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={26} y={92} w={20}><Dabble state="thinking" talking={speaking} size="100%" /></Actor>
        <Actor x={52} y={92} w={12}><Pad /><StoryRocket /></Actor>
        <Actor x={68} y={92} w={9}><StoryRocket color="#8E6CEF" /></Actor>
        <Actor x={82} y={92} w={9}><StoryRocket color="#2EC4B6" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.intro3",
    camera: "close",
    scene: () => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={50} y={90} w={16}><Pad /><StoryRocket flame /><StoryForces /></Actor>
        <Actor x={22} y={92} w={18}><Rumble state="thinking" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.intro4",
    camera: "zoom-in",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={30} y={92} w={22}><Dabble state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={70} y={92} w={18} enter="right"><Rumble state="greeting" size="100%" /></Actor>
        <Actor x={50} y={86} w={10}><Pad /><StoryRocket /></Actor>
      </div>
    ),
  },
];

export const rocketOutro: StoryBeat[] = [
  {
    line: "rl.outro1",
    camera: "rise",
    sfx: "complete",
    scene: () => (
      <div className="scene rl-scene-story">
        <MoonGarden />
        <Actor x={50} y={40} w={10} float><SeedArt /></Actor>
      </div>
    ),
  },
  {
    line: "rl.outro2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={36} y={92} w={22}><Dabble state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={66} y={92} w={18}><Rumble state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rl.outro3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene rl-scene-story">
        <LabBackground />
        <Actor x={50} y={78} w={30}><LaunchPatchSticker /></Actor>
        <Spark x={50} y={20} size={12} />
      </div>
    ),
  },
];

export const rocketBetween: Record<number, { line: string }> = {
  2: { line: "rl.between2" },
  4: { line: "rl.between4" },
  6: { line: "rl.between6" },
};
