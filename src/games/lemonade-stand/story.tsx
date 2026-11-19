import { Bobbo } from "../../characters/Bobbo";
import { Puff } from "../../characters/Crew";
import { Actor, Spark } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { AwningArt, BeachBackground, BudgeMascot, CupArt, JarArt, LemonArt, MoneyArt, PitcherArt, StandSignArt, StandStarSticker, TelescopeArt } from "./art";

/** "Budge's Big Dream" — the story wrapper for Budge's Lemonade Stand (docs/curriculum/money.md §4.2). */

/** A small static stand for story scenes. */
function StoryStand({ children }: { children?: React.ReactNode }) {
  return (
    <div className="ls-story-stand">
      <div className="ls-awning"><AwningArt /></div>
      <span className="ls-post l" />
      <span className="ls-post r" />
      <div className="ls-story-top">{children}</div>
      <div className="ls-front"><span className="ls-front-sign"><StandSignArt /></span></div>
    </div>
  );
}

const Scene = ({ children }: { children: React.ReactNode }) => (
  <div className="scene ls-scene-story">
    <BeachBackground />
    {children}
  </div>
);

export const lemonadeIntro: StoryBeat[] = [
  {
    line: "ls.story.intro1",
    camera: "wide",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={36} y={90} w={22}><BudgeMascot state="greeting" talking={speaking} size="100%" /></Actor>
        <Actor x={66} y={70} w={22} float><TelescopeArt /></Actor>
        <Spark x={74} y={22} size={7} />
        <Spark x={58} y={30} size={5} />
      </Scene>
    ),
  },
  {
    line: "ls.story.intro2",
    camera: "pan-right",
    sfx: "whoosh",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={58} y={92} w={38}><StoryStand><span className="ls-story-pitcher"><PitcherArt /></span></StoryStand></Actor>
        <Actor x={26} y={92} w={18}><BudgeMascot state="celebrating" talking={speaking} size="100%" /></Actor>
      </Scene>
    ),
  },
  {
    line: "ls.story.intro3",
    camera: "close",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={30} y={92} w={18}><BudgeMascot state="thinking" talking={speaking} size="100%" /></Actor>
        <Actor x={56} y={80} w={12} enter="drop"><LemonArt /></Actor>
        <Actor x={70} y={82} w={10} enter="drop"><CupArt /></Actor>
        <Actor x={82} y={80} w={10} enter="drop"><LemonArt /></Actor>
      </Scene>
    ),
  },
  {
    line: "ls.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={34} y={92} w={18}><BudgeMascot state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={62} y={88} w={18} enter="right"><Puff state="greeting" size="100%" /></Actor>
        <Actor x={50} y={52} w={9} enter="drop"><MoneyArt d={25} /></Actor>
        <Actor x={60} y={46} w={7} enter="drop"><MoneyArt d={10} /></Actor>
        <Actor x={42} y={46} w={8} enter="drop"><MoneyArt d={5} /></Actor>
      </Scene>
    ),
  },
];

export const lemonadeOutro: StoryBeat[] = [
  {
    line: "ls.story.outro1",
    camera: "wide",
    sfx: "complete",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={58} y={92} w={38}><StoryStand><span className="ls-story-pitcher"><PitcherArt /></span></StoryStand></Actor>
        <Actor x={24} y={92} w={18}><BudgeMascot state="celebrating" talking={speaking} size="100%" /></Actor>
        <Actor x={86} y={92} w={14}><Bobbo state="celebrating" size="100%" /></Actor>
      </Scene>
    ),
  },
  {
    line: "ls.story.outro2",
    camera: "close",
    scene: ({ speaking }) => (
      <Scene>
        <Actor x={34} y={92} w={20}><BudgeMascot state="encouraging" talking={speaking} size="100%" /></Actor>
        <Actor x={66} y={86} w={18}><JarArt fill={0.85} /></Actor>
      </Scene>
    ),
  },
  {
    line: "ls.story.outro3",
    camera: "rise",
    sfx: "achievement",
    scene: () => (
      <Scene>
        <Actor x={50} y={78} w={30}><StandStarSticker /></Actor>
        <Spark x={50} y={20} size={12} />
      </Scene>
    ),
  },
];

export const lemonadeBetween: Record<number, { line: string }> = {
  2: { line: "ls.story.between2" },
  4: { line: "ls.story.between4" },
  6: { line: "ls.story.between6" },
};
