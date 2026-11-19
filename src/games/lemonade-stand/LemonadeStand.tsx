import { Puff } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BeachBackground, BudgeMascot, NoBasket, StandObject, StandStarSticker } from "./art";
import { StandBoard, StandTray, lemonadeSteps } from "./Board";
import { diagnose, explainFor, praiseFor } from "./coach";
import { lemonadeStand } from "./definition";
import { lemonadeBetween, lemonadeIntro, lemonadeOutro } from "./story";
import "./lemonade-stand.css";

/** Budge's Lemonade Stand — US coins, change, cost, revenue and profit. Ages 7–10. Host Budge, helper Puff. */
const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  Background: BeachBackground,
  ObjectArt: StandObject,
  Basket: NoBasket,
  Sticker: StandStarSticker,
  Mascot: BudgeMascot,
  Board: StandBoard,
  Tray: StandTray,
  music: "island",
  story: { intro: lemonadeIntro, outro: lemonadeOutro, between: lemonadeBetween },
  helper: {
    Character: Puff,
    name: "Puff",
    explainLine: "ls.help.value",
    hintLine: "ls.help.value",
    explainFor,
    hintFor: (s) => diagnose(s.exercise, s.lastAnswer),
  },
  praise: ["ls.praise.1"],
  praiseFor,
  hintVoice: { "hint.countAlong": "ls.retry.1", "retry.1": "ls.retry.1", "hint.model": "ls.hint.model", "hint.show": "ls.hint.model", "hint.modelTap": "ls.hint.modelTap" },
  alongSteps: lemonadeSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="coin"][data-value="1"]',
  idle: { line: "ls.idle", target: '[data-idle="true"]' },
};

export default function LemonadeStand() {
  return <GameRunner game={lemonadeStand} skin={skin} />;
}
