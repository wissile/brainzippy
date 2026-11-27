import { Gloop } from "../../characters/Crew";
import { Ziggy } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { AirfieldBackground, CompassObject, CompassRosePin, NoBasket } from "./art";
import { CompassBoard, CompassTray } from "./Board";
import { compassRunways } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { crBetween, crIntro, crOutro } from "./story";

/** Compass Rose Runways — windsocks, runway numbers, heading turns, landing into the wind and tower calls. Ages 10–12. */
const skin: GameSkin = {
  intro: { line: "cr.ready", text: "Hi, I'm Ziggy, up in the tower. Ready to help me run the runways?", backLine: "cr.back", backText: "Welcome back to the tower. More planes are on the way." },
  Background: AirfieldBackground,
  ObjectArt: CompassObject,
  Basket: NoBasket,
  Sticker: CompassRosePin,
  Mascot: Ziggy,
  Board: CompassBoard,
  Tray: CompassTray,
  music: "sky",
  story: { intro: crIntro, outro: crOutro, between: crBetween },
  helper: { Character: Gloop, name: "Gloop", explainLine: "cr.help.from", explainFor, hintLine: "cr.help.from", hintFor },
  praiseFor,
  praise: ["cr.praise.from"],
  hintVoice: {
    "retry.1": "cr.retry",
    "hint.countAlong": "cr.retry",
    "hint.model": "cr.hint.model",
    "hint.show": "cr.hint.show",
    "hint.modelTap": "cr.hint.yourTurn",
  },
  alongSteps: () => 0,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="e"]',
  idle: { line: "cr.idle", target: '[data-cr-idle="true"]' },
};

export default function CompassRunways() {
  return <GameRunner game={compassRunways} skin={skin} />;
}
