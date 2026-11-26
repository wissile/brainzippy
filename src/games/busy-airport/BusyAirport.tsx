import { useState } from "react";
import { Hoot } from "../../characters/Crew";
import { Ziggy } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { AirportBackground, AirportIcon, GroundCrewSticker, NoBasket } from "./art";
import { AirportBoard, AirportTray } from "./Board";
import { busyAirport } from "./definition";
import { alongSayFor, alongStepsFor, explainFor, hintFor, praiseFor } from "./hints";
import { boardedStore, readyStore } from "./shared";
import { airportBetween, airportIntro, airportOutro } from "./story";

/** Ziggy's Busy Airport — four inner games at Ziggy's airport: Bag Drop, All Aboard, Runway Lights, Marshaller. Ages 3–5. */
const skin: GameSkin = {
  intro: { line: "ba.ready", text: "Hi, I'm Ziggy! Can you help at my busy airport today?", backLine: "ba.back", backText: "Welcome back, ground crew! The planes are waiting." },
  numberKeys: false, // counting needs every passenger aboard first; the board's choices handle keys
  Background: AirportBackground,
  ObjectArt: AirportIcon,
  Basket: NoBasket,
  Sticker: GroundCrewSticker,
  Mascot: Ziggy,
  Board: AirportBoard,
  Tray: AirportTray,
  music: "sky",
  story: { intro: airportIntro, outro: airportOutro, between: airportBetween },
  helper: { Character: Hoot, name: "Hoot", explainLine: "ba.help.bags.colour", explainFor, hintLine: "ba.hint.count", hintFor },
  praise: ["ba.praise.bags.1"],
  praiseFor,
  hintVoice: { "retry.1": "ba.retry", "hint.countAlong": "ba.retry", "hint.model": "ba.hint.countAlong", "hint.show": "ba.hint.show", "hint.modelTap": "ba.hint.yourTurn" },
  alongSteps: alongStepsFor,
  alongSay: alongSayFor,
  idle: { line: "ba.idle", target: "[data-ba-idle]" },
};

export default function BusyAirport() {
  useState(() => {
    readyStore.set({ exId: "", value: null });
    boardedStore.set({ exId: "", all: false });
  });
  return <GameRunner game={busyAirport} skin={skin} />;
}
