import { Rumble } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BalanceKeeperSticker, BalanceObject, HarbourBackground, NoBasket, StallBobbo } from "./art";
import { BalanceBoard, BalanceTray, modelSteps } from "./Board";
import { balanceIsland } from "./definition";
import { balanceBetween, balanceIntro, balanceOutro } from "./story";
import "./balance-island.css";

/** Balance Scale Island — solving equations by keeping both sides balanced. Ages 11–13. */
const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  Background: HarbourBackground,
  ObjectArt: BalanceObject,
  Basket: NoBasket,
  Sticker: BalanceKeeperSticker,
  Mascot: StallBobbo,
  Board: BalanceBoard,
  Tray: BalanceTray,
  music: "island",
  story: { intro: balanceIntro, outro: balanceOutro, between: balanceBetween },
  helper: { Character: Rumble, name: "Rumble", explainLine: "bi.help.explain", hintLine: "bi.help.hint" },
  praise: ["bi.praise.1", "bi.praise.2", "bi.praise.3", "bi.praise.4"],
  hintVoice: { "hint.countAlong": "bi.retry", "hint.model": "bi.hint.model", "hint.modelTap": "bi.hint.modelTap", "retry.1": "bi.retry" },
  alongSteps: modelSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="both-unit"]',
  idle: { line: "bi.idle", target: '[data-testid="scale"]' },
};

export default function BalanceIsland() {
  return <GameRunner game={balanceIsland} skin={skin} />;
}
