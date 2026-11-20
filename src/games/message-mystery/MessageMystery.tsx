import { Hoot } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { DetectiveBadgeSticker, MessageBackground, MessageFenn, MessageObject, NoBasket } from "./art";
import { MessageBoard, MessageTray } from "./Board";
import { messageMystery } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { mmBetween, mmIntro, mmOutro } from "./story";

/** Fenn's Message Mystery — spot trick messages and choose safe actions. Digital safety library, ages 7–11. */
const skin: GameSkin = {
  intro: { line: "mm.ready", text: "Hi, I'm Fenn! Will you help me sort Byteberry's mail?", backLine: "mm.back", backText: "Welcome back, detective! The mail is waiting." },
  Background: MessageBackground,
  ObjectArt: MessageObject,
  Basket: NoBasket,
  Sticker: DetectiveBadgeSticker,
  Mascot: MessageFenn,
  Board: MessageBoard,
  Tray: MessageTray,
  music: "meadow",
  story: { intro: mmIntro, outro: mmOutro, between: mmBetween },
  helper: {
    Character: Hoot,
    name: "Hoot",
    explainLine: "mm.help.start",
    explainFor,
    hintLine: "mm.help.start",
    hintFor,
  },
  praiseFor,
  praise: ["mm.praise.asks"],
  hintVoice: { "retry.1": "mm.retry", "hint.show": "mm.hint.model" },
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="ask"]',
  idle: { line: "mm.idle", target: '[data-mm-idle="true"]' },
};

export default function MessageMystery() {
  return <GameRunner game={messageMystery} skin={skin} />;
}
