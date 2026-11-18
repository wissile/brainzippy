import { useEffect, useState } from "react";
import { Zuzu } from "../../characters/Crew";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { GloopHost, NoBasket, PondBackground, ShapeSquisherSticker, SquishIcon } from "./art";
import { SquishBoard, SquishTray, alongSayFor, alongStepsFor } from "./Board";
import { shapeSquish } from "./definition";
import { hostStore, squishStore } from "./store";
import { squishBetween, squishIntro, squishOutro } from "./story";

/** Gloop's Shape Squish — Gloop squishes into shapes to get through the garden gates (2D shapes, ages 4–6). */
const skin: GameSkin = {
  intro: { line: "game.ready", text: "Ready? Let's play!", backLine: "game.back", backText: "Welcome back! Let's keep going!" },
  numberKeys: false,
  Background: PondBackground,
  ObjectArt: SquishIcon,
  Basket: NoBasket,
  Sticker: ShapeSquisherSticker,
  Mascot: GloopHost,
  Board: SquishBoard,
  Tray: SquishTray,
  music: "meadow",
  story: { intro: squishIntro, outro: squishOutro, between: squishBetween },
  helper: { Character: Zuzu, name: "Zuzu", explainLine: "ss.help.explain", hintLine: "ss.help.hint" },
  praise: ["ss.praise.1", "ss.praise.2", "ss.praise.3", "ss.praise.4"],
  hintVoice: { "hint.show": "ss.hint.show", "hint.modelTap": "ss.hint.yourTurn", "retry.1": "ss.help.hint" },
  alongSteps: alongStepsFor,
  alongSay: alongSayFor,
  idle: { line: "ss.idle", target: "[data-ss-idle]" },
};

export default function ShapeSquish() {
  useState(() => {
    hostStore.set(false);
    squishStore.set({ exId: "", value: null });
  });
  useEffect(() => () => hostStore.set(false), []);
  return <GameRunner game={shapeSquish} skin={skin} />;
}
