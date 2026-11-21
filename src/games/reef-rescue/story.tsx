import { Dabble } from "../../characters/library/Dabble";
import { Ripple } from "../../characters/library/Ripple";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { CoralPatch, Damselfish, Parrotfish, Polyp, ReefBackground, ReefGuardianSticker, Surgeonfish, type PatchState } from "./art";

/** "Bring the Reef Back" — the story wrapper for Ripple's Reef Rescue (docs/curriculum/nature.md §4.2, lines verbatim). */

function Reef({ states }: { states: PatchState[] }) {
  return (
    <div className="rr-story-reef" aria-hidden="true">
      {states.map((s, i) => (
        <span key={i} className="rr-story-patch"><CoralPatch state={s} variant={i} /></span>
      ))}
    </div>
  );
}
const HEALTHY: PatchState[] = ["healthy", "healthy", "healthy", "healthy", "healthy", "healthy"];
const HURT: PatchState[] = ["healthy", "white", "pale", "white", "pale", "healthy"];
const Fish = ({ x, y, w, kind = 0, flip = false }: { x: number; y: number; w: number; kind?: number; flip?: boolean }) => (
  <Actor x={x} y={y} w={w} float>
    <span className={`rr-story-fish ${flip ? "flip" : ""}`}>{kind === 0 ? <Parrotfish /> : kind === 1 ? <Surgeonfish /> : <Damselfish />}</span>
  </Actor>
);

export const reefIntro: StoryBeat[] = [
  {
    line: "rr.intro1",
    camera: "wide",
    scene: ({ speaking }) => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HEALTHY} />
        <Fish x={64} y={40} w={10} kind={0} />
        <Fish x={78} y={30} w={8} kind={1} flip />
        <Actor x={30} y={78} w={26}><Ripple state="greeting" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rr.intro2",
    camera: "pan-right",
    scene: ({ speaking }) => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HURT} />
        <Actor x={24} y={78} w={22}><Ripple state="thinking" talking={speaking} size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rr.intro3",
    camera: "close",
    scene: () => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HURT} />
        <Actor x={70} y={78} w={20} enter="right"><Dabble state="encouraging" size="100%" /></Actor>
        <Actor x={40} y={46} w={16}><span className="rr-story-lens"><Polyp algae={false} /></span></Actor>
      </div>
    ),
  },
  {
    line: "rr.intro4",
    camera: "zoom-in",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HURT} />
        <Actor x={30} y={78} w={24}><Ripple state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={70} y={78} w={18}><Dabble state="greeting" size="100%" /></Actor>
      </div>
    ),
  },
];

export const reefOutro: StoryBeat[] = [
  {
    line: "rr.outro1",
    camera: "rise",
    sfx: "complete",
    scene: () => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HEALTHY} />
        <Fish x={30} y={36} w={10} kind={0} />
        <Fish x={52} y={26} w={8} kind={1} flip />
        <Fish x={72} y={40} w={7} kind={2} />
        <Fish x={84} y={22} w={7} kind={2} flip />
      </div>
    ),
  },
  {
    line: "rr.outro2",
    camera: "close",
    scene: ({ speaking }) => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HEALTHY} />
        <Actor x={34} y={78} w={24}><Ripple state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={68} y={78} w={18}><Dabble state="celebrating" size="100%" /></Actor>
      </div>
    ),
  },
  {
    line: "rr.outro3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <div className="scene rr-scene-story">
        <ReefBackground />
        <Reef states={HEALTHY} />
        <Actor x={50} y={70} w={30}><ReefGuardianSticker /></Actor>
        <Spark x={50} y={18} size={12} />
      </div>
    ),
  },
];

export const reefBetween: Record<number, { line: string }> = {
  2: { line: "rr.between2" },
  4: { line: "rr.between4" },
  6: { line: "rr.between6" },
};
