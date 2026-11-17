import { Hoot } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { ChefRumble, CookieArt, FairSharerSticker, KitchenBackground, NoBasket } from "./art";
import { CookieBoard, ShareTray } from "./Board";
import { cookieKitchen } from "./definition";
import { alongSayFor } from "./sharing";
import { kitchenBetween, kitchenIntro, kitchenOutro } from "./story";

const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  Background: KitchenBackground,
  ObjectArt: CookieArt,
  Basket: NoBasket,
  Sticker: FairSharerSticker,
  Mascot: ChefRumble,
  Board: CookieBoard,
  Tray: ShareTray,
  music: "kitchen",
  story: { intro: kitchenIntro, outro: kitchenOutro, between: kitchenBetween },
  helper: { Character: Hoot, name: "Hoot", explainLine: "ck.help.explain", hintLine: "ck.help.hint" },
  praise: ["ck.praise.1", "ck.praise.2", "ck.praise.3", "ck.praise.4"],
  hintVoice: { "hint.countAlong": "ck.hint.deal", "hint.model": "ck.hint.model", "hint.modelTap": "ck.hint.modelTap", "retry.1": "ck.hint.deal" },
  alongSteps: (ex) => ex.params?.total ?? ex.target,
  alongSay: (ex, i) => alongSayFor(ex.params?.groups ?? 1, i),
  idle: { line: "ck.idle", target: '[data-testid="cookie-tray"]' },
};

export default function CookieKitchen() {
  return <GameRunner game={cookieKitchen} skin={skin} />;
}
