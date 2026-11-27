import { Bobbo } from "../../characters/Bobbo";
import { Puff } from "../../characters/Crew";
import { Actor } from "../../game/scenes";
import type { StoryBeat } from "../../game/story";
import { BakeryBackground, FestivalCart, HatProp, HatSticker, OrderScroll, ShopFront } from "./art";

/**
 * "The festival order" — the island festival has ordered more treats than one baker can make. Bobbo asks the child to
 * be head baker; Puff knows the baker's tricks (rows, fair slices, drawing the order). Outro: the cart rolls out.
 */
const kitchen = (children: React.ReactNode, cls = "") => <div className={`scene bk-scene-story ${cls}`}><BakeryBackground />{children}</div>;
const street = (children: React.ReactNode) => <div className="scene bk-scene-story is-street">{children}</div>;

export const bkIntro: StoryBeat[] = [
  {
    line: "bk.story.intro1",
    camera: "wide",
    sfx: "whoosh",
    scene: () => street(<>
      <Actor x={50} y={86} w={64}><ShopFront /></Actor>
    </>),
  },
  {
    line: "bk.story.intro2",
    camera: "close",
    scene: ({ speaking }) => kitchen(<>
      <Actor x={64} y={90} w={30} enter="drop"><OrderScroll /></Actor>
      <Actor x={32} y={92} w={30}><Bobbo state="retry" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "bk.story.intro3",
    camera: "pan-right",
    scene: () => kitchen(<>
      <Actor x={36} y={92} w={26}><Bobbo state="thinking" size="100%" /></Actor>
      <Actor x={68} y={90} w={24} enter="right"><Puff state="greeting" size="100%" /></Actor>
    </>),
  },
  {
    line: "bk.story.intro4",
    camera: "zoom-in",
    scene: ({ speaking }) => kitchen(<>
      <Actor x={38} y={92} w={30}><Bobbo state="encouraging" talking={speaking} size="100%" /></Actor>
      <Actor x={70} y={62} w={20} enter="drop"><HatProp /></Actor>
    </>),
  },
];

export const bkOutro: StoryBeat[] = [
  {
    line: "bk.story.outro1",
    camera: "wide",
    scene: () => kitchen(<>
      <Actor x={34} y={92} w={26}><Bobbo state="celebrating" size="100%" /></Actor>
      <Actor x={68} y={90} w={24}><Puff state="celebrating" size="100%" /></Actor>
    </>),
  },
  {
    line: "bk.story.outro2",
    camera: "close",
    scene: ({ speaking }) => kitchen(<>
      <Actor x={50} y={92} w={32}><Bobbo state="celebrating" talking={speaking} size="100%" /></Actor>
    </>),
  },
  {
    line: "bk.story.outro3",
    camera: "pan-right",
    scene: () => street(<>
      <div className="bk-cart-roll"><Actor x={50} y={88} w={50}><FestivalCart /></Actor></div>
      <Actor x={80} y={40} w={22} enter="drop"><HatSticker /></Actor>
    </>),
  },
];

export const bkBetween = {
  2: { line: "bk.story.between2" },
  4: { line: "bk.story.between4" },
  6: { line: "bk.story.between6" },
};
