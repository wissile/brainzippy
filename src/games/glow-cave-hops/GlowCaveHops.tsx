import { useEffect, useState } from "react";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BasketStub, CaveBackground, CaveExplorerSticker, CrystalArt, ZuzuLantern } from "./art";
import { HopBoard, HopTray, paramsOf } from "./Board";
import { cartStore } from "./cart";
import { glowCaveHops } from "./definition";
import { caveBetween, caveIntro, caveOutro } from "./story";

/** Glow Cave Hops — count on along a number line (each hop is +1) to relight Gloop's crystal cave. */
const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  numberKeys: false,
  Background: CaveBackground,
  ObjectArt: CrystalArt,
  Basket: BasketStub,
  Sticker: CaveExplorerSticker,
  Mascot: ZuzuLantern,
  Board: HopBoard,
  Tray: HopTray,
  music: "cave",
  story: { intro: caveIntro, outro: caveOutro, between: caveBetween },
  helper: { Character: ZuzuLantern, name: "Zuzu", explainLine: "gc.help.explain", hintLine: "gc.help.hint" },
  praise: ["gc.praise.1", "gc.praise.2", "gc.praise.3"],
  hintVoice: {
    "hint.countAlong": "gc.hint.countAlong",
    "hint.model": "gc.hint.model",
    "hint.modelTap": "gc.hint.modelTap",
  },
  // worked example: one hop arc per step from the start; step i lands on start + i + 1
  alongSteps: (ex) => paramsOf(ex).hops,
  alongSay: (ex, i) => paramsOf(ex).start + i + 1,
  idle: { line: "gc.idle", target: '[data-testid="cart"]' },
};

export default function GlowCaveHops() {
  // a fresh visit starts with a dark cave (reset before any child effect reads the store)
  useState(() => cartStore.reset());
  useEffect(() => () => cartStore.reset(), []);
  return <GameRunner game={glowCaveHops} skin={skin} />;
}
