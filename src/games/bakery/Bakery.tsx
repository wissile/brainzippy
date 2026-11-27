import { Bobbo } from "../../characters/Bobbo";
import { Puff } from "../../characters/Crew";
import type { Exercise } from "../../engine/types";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BakeryBackground, BkObject, HatSticker, NoBasket } from "./art";
import { BakeryBoard, BakeryTray } from "./Board";
import { bakery } from "./definition";
import { explainFor, hintFor, modelSteps, praiseFor } from "./hints";
import { bkBetween, bkIntro, bkOutro } from "./story";

/** Bobbo's Bakery — trays, tray-building, fractions, bar models and the festival order sheet. Ages 9–11 (Maths journey). */
const skin: GameSkin = {
  intro: { line: "bk.ready", text: "Hi, head baker! The festival order is waiting. Ready to bake?", backLine: "bk.back", backText: "Welcome back, head baker. More orders came in!" },
  Background: BakeryBackground,
  ObjectArt: BkObject,
  Basket: NoBasket,
  Sticker: HatSticker,
  Mascot: Bobbo,
  Board: BakeryBoard,
  Tray: BakeryTray,
  music: "kitchen",
  story: { intro: bkIntro, outro: bkOutro, between: bkBetween },
  helper: { Character: Puff, name: "Puff", explainLine: "bk.help.count", hintLine: "bk.help.count", explainFor, hintFor },
  praise: ["bk.praise.rows"],
  praiseFor,
  hintVoice: { "retry.1": "bk.retry", "hint.countAlong": "bk.retry", "hint.model": "bk.model", "hint.show": "bk.model", "hint.modelTap": "bk.model" },
  // second miss: one runner step per worked line; the board reveals each one
  alongSteps: (ex: Exercise) => modelSteps(ex).length,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="bk-rows-up"]',
  idle: { line: "bk.idle", target: "[data-bk-idle]" },
};

export default function Bakery() {
  return <GameRunner game={bakery} skin={skin} />;
}
