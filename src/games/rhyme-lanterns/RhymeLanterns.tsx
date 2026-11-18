import { Hoot, Zuzu } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BasketArt, LanternKeeperSticker, NightForest, RhymeObject } from "./art";
import { RhymeBoard, RhymeTray } from "./Board";
import { rhymeLanterns } from "./definition";
import { modelSteps } from "./logic";
import { lanternBetween, lanternIntro, lanternOutro } from "./story";
import "./rhyme-lanterns.css";

/** Hoot's Rhyme Lanterns — rhyme recognition, ages 3–5 (English library, first world). */
const skin: GameSkin = {
  intro: { line: "rl.intro", text: "Hoo-hoo! Will you help me light my rhyme lanterns?", backLine: "rl.back", backText: "Welcome back! More lanterns are waiting for rhymes." },
  Background: NightForest,
  ObjectArt: RhymeObject,
  Basket: BasketArt,
  Sticker: LanternKeeperSticker,
  Mascot: Hoot,
  Board: RhymeBoard,
  Tray: RhymeTray,
  music: "sky",
  story: { intro: lanternIntro, outro: lanternOutro, between: lanternBetween },
  helper: { Character: Zuzu, name: "Zuzu", explainLine: "rl.help.explain", hintLine: "rl.help.hint" },
  praise: ["rl.praise.1", "rl.praise.2", "rl.praise.3", "rl.praise.4"],
  hintVoice: { "hint.show": "rl.hint.model", "hint.modelTap": "rl.hint.try", "retry.1": "rl.retry" },
  // the modelled answer: two beats per slowly spoken word; the board speaks the words (no numbers)
  alongSteps: modelSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="yes"]',
  idle: { line: "rl.idle", target: "[data-rl-idle]" },
};

export default function RhymeLanterns() {
  return <GameRunner game={rhymeLanterns} skin={skin} />;
}
