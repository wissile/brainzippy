import { Zephy } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { ExplorerSticker, NoBasket, PortBackground, PostcardObject, YonderMascot } from "./art";
import { PostcardBoard, PostcardTray } from "./Board";
import { explainFor, hintLineFor, modelSteps, praiseFor } from "./coach";
import { postcardTrip } from "./definition";
import { decodeMission } from "./generator";
import { pcStore } from "./store";
import { tripBetween, tripIntro, tripOutro } from "./story";

/**
 * Yonder's Postcard Trip — map skills on Monster Island, then continents, oceans, directions and the equator on
 * a world map. Ages 5–9. Host Yonder (mascot, and she walks the island / rides the balloon); helper Zephy, the
 * postcard pilot, pops in to explain.
 */
const skin: GameSkin = {
  intro: { line: "pc.ready", text: "Hi, I'm Yonder! Will you help me read maps and visit my pen pals?", backLine: "pc.back", backText: "Welcome back, explorer! More postcards arrived." },
  Background: PortBackground,
  ObjectArt: PostcardObject,
  Basket: NoBasket,
  Sticker: ExplorerSticker,
  Mascot: YonderMascot,
  Board: PostcardBoard,
  Tray: PostcardTray,
  music: "sky",
  story: { intro: tripIntro, outro: tripOutro, between: tripBetween },
  helper: {
    Character: Zephy,
    name: "Zephy",
    explainLine: "pc.help.compass",
    explainFor,
    hintLine: "pc.help.compass",
    hintFor: (s) => {
      const shared = pcStore.get();
      return hintLineFor(decodeMission(s.exercise), s, shared.exId === s.exercise.id ? shared.diagnosis : null);
    },
  },
  praise: ["pc.praise.compass"],
  praiseFor,
  hintVoice: { "retry.1": "pc.retry", "hint.show": "pc.hint.model", "hint.modelTap": "pc.hint.modelTap" },
  alongSteps: modelSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="n"]',
  idle: { line: "pc.idle", target: '[data-pc-next="true"]' },
};

export default function PostcardTrip() {
  return <GameRunner game={postcardTrip} skin={skin} />;
}
