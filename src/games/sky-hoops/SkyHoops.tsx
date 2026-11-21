import { Bobbo } from "../../characters/Bobbo";
import { Zephy } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { NoBasket, SkyBackground, SkyHoopsObject, SkyWingsSticker } from "./art";
import { SkyBoard, SkyTray } from "./Board";
import { skyHoops } from "./definition";
import { explainFor, hintFor, praiseFor } from "./hints";
import { shBetween, shIntro, shOutro } from "./story";

/** Zephy's Sky Hoops — fly through hoops with the stick and pedals; pitch, roll, yaw, turning and the four forces. Ages 6–9. */
const skin: GameSkin = {
  intro: { line: "sh.ready", text: "Hi, I'm Zephy! Will you help me fly through the sky hoops?", backLine: "sh.back", backText: "Welcome back, co-pilot! The hoops are waiting." },
  Background: SkyBackground,
  ObjectArt: SkyHoopsObject,
  Basket: NoBasket,
  Sticker: SkyWingsSticker,
  Mascot: Zephy,
  Board: SkyBoard,
  Tray: SkyTray,
  music: "sky",
  story: { intro: shIntro, outro: shOutro, between: shBetween },
  helper: { Character: Bobbo, name: "Bobbo", explainLine: "sh.help.pitch", explainFor, hintLine: "sh.help.pitch", hintFor },
  praiseFor,
  praise: ["sh.praise.up"],
  hintVoice: { "retry.1": "sh.retry.1", "hint.countAlong": "sh.retry.1", "hint.model": "sh.hint.model", "hint.show": "sh.hint.model", "hint.modelTap": "sh.hint.model" },
  alongSteps: () => 0,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="back"]',
  idle: { line: "sh.idle", target: '[data-sh-idle="true"]' },
};

export default function SkyHoops() {
  return <GameRunner game={skyHoops} skin={skin} />;
}
