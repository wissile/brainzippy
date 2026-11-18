import { Gloop } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { MarcherArt, NoBasket, ParadeBackground, ParadePuff, ParadeStarSticker } from "./art";
import { ParadeBoard, ParadeTray } from "./Board";
import { patternParade } from "./definition";
import { alongSay, alongSteps } from "./logic";
import { paradeBetween, paradeIntro, paradeOutro } from "./story";

/** Puff's Pattern Parade — repeating, translated and growing patterns. Ages 4–6. */
const skin: GameSkin = {
  intro: { line: "pp.ready", text: "Hi! I'm Puff! Will you help me line up my parade?", backLine: "pp.back", backText: "Welcome back! The parade is waiting for you!" },
  Background: ParadeBackground,
  ObjectArt: MarcherArt,
  Basket: NoBasket,
  Sticker: ParadeStarSticker,
  Mascot: ParadePuff,
  Board: ParadeBoard,
  Tray: ParadeTray,
  music: "parade",
  story: { intro: paradeIntro, outro: paradeOutro, between: paradeBetween },
  helper: { Character: Gloop, name: "Gloop", explainLine: "pp.help.explain", hintLine: "pp.help.hint" },
  praise: ["pp.praise.1", "pp.praise.2", "pp.praise.3", "pp.praise.4"],
  hintVoice: { "retry.1": "pp.retry", "hint.show": "pp.hint.model", "hint.modelTap": "pp.hint.modelTap" },
  alongSteps,
  alongSay,
  tutorialTarget: '[data-testid="pp-gap"]',
  idle: { line: "pp.idle", target: '[data-testid="pp-gap"]' },
};

export default function PatternParade() {
  return <GameRunner game={patternParade} skin={skin} />;
}
