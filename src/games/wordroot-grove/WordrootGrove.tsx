import { useMemo } from "react";
import { Gloop } from "../../characters/Crew";
import { Sarah } from "../../characters/library/Sarah";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { loadState } from "../../services/storage";
import { GroveObject, GroveScene, NoBasket, RootReaderBadge } from "./art";
import { GroveBoard, GroveTray } from "./Board";
import { wordrootGrove } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { modelSteps } from "./logic";
import { storyFor } from "./story";

function makeSkin(firstVisit: boolean): GameSkin {
  return {
    intro: {
      line: "wg.intro",
      text: "Welcome to the Leaf Library. Will you help me relabel the leaves?",
      backLine: "wg.back",
      backText: "Welcome back. More smudged leaves are waiting for a word detective.",
    },
    Background: GroveScene,
    ObjectArt: GroveObject,
    Basket: NoBasket,
    Sticker: RootReaderBadge,
    Mascot: Sarah,
    Board: GroveBoard,
    Tray: GroveTray,
    music: "meadow",
    story: storyFor(firstVisit),
    helper: { Character: Gloop, name: "Gloop", explainLine: "wg.help.prefix", hintLine: "wg.hint.test", explainFor, hintFor },
    praise: ["wg.praise.1"],
    praiseFor,
    hintVoice: { "hint.show": "wg.hint.show", "hint.modelTap": "wg.hint.model", "retry.1": "wg.retry.1" },
    // second miss: one step per line of the worked chain (sorting: one per card); the board shows each step
    alongSteps: modelSteps,
    alongSay: () => null,
    numberKeys: false,
    tutorialTarget: '[data-testid="choice"][data-value="open-the-lock"]',
    idle: { line: "wg.idle", target: "[data-wg-idle]" },
  };
}

/** Wordroot Grove — word parts, word class, context clues, apostrophes and confused words; ages 9–11 (English path, band C). */
export default function WordrootGrove() {
  const skin = useMemo(() => {
    const p = loadState().progress;
    const firstVisit = p.levels?.[wordrootGrove.id] === undefined && !p.stickers.includes(wordrootGrove.achievement.id);
    return makeSkin(firstVisit);
  }, []);
  return <GameRunner game={wordrootGrove} skin={skin} />;
}
