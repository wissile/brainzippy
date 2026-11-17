import { Puff } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BalloonRide, BasketStub, SkyBackground, SkyChampionSticker, SkyObject } from "./art";
import { SkyBoard, SkyTray } from "./Board";
import { skyBalloonRace } from "./definition";
import { countOnSay, countOnSteps } from "./logic";
import { skyBetween, skyIntro, skyOutro } from "./story";
import "./sky-balloon-race.css";

/** Sky Balloon Race — addition within 20 (counting on, making ten). Ages 6–8. */
const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  Background: SkyBackground,
  ObjectArt: SkyObject,
  Basket: BasketStub,
  Sticker: SkyChampionSticker,
  Mascot: BalloonRide,
  Board: SkyBoard,
  Tray: SkyTray,
  music: "sky",
  story: { intro: skyIntro, outro: skyOutro, between: skyBetween },
  helper: { Character: Puff, name: "Puff", explainLine: "sb.help.explain", hintLine: "sb.help.hint" },
  praise: ["sb.praise.1", "sb.praise.2", "sb.praise.3", "sb.praise.4"],
  hintVoice: {
    "hint.countAlong": "sb.hint.countOn",
    "hint.model": "sb.hint.model",
    "hint.modelTap": "sb.hint.modelTap",
    "retry.1": "sb.retry",
  },
  alongSteps: countOnSteps,
  alongSay: countOnSay,
  idle: { line: "sb.idle", target: ".sb-balloons" },
};

export default function SkyBalloonRace() {
  return <GameRunner game={skyBalloonRace} skin={skin} />;
}
