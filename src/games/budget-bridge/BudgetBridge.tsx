import { Budge } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BridgeBackground, BridgeBuilderSticker, BridgeObject, BrixMascot, NoBasket } from "./art";
import { BridgeBoard, BridgeTray, modelSteps } from "./Board";
import { explainFor, hintLineFor, praiseForExercise } from "./coach";
import { budgetBridge } from "./definition";
import { bbStore } from "./store";
import { bridgeBetween, bridgeIntro, bridgeOutro } from "./story";

/**
 * Brix's Budget Bridge — design, load-test and improve a bridge within a budget. Ages 8–12. Host Brix (on screen
 * as the mascot), helper Budge (pops in to explain; she keeps the budget). Every helper line is Budge's, so two
 * Brixes never share the screen.
 */
const skin: GameSkin = {
  intro: { line: "bb.ready", text: "Hi, I'm Brix! Let's build a bridge, test it, and make it better!", backLine: "bb.back", backText: "Welcome back, engineer! The river is waiting." },
  Background: BridgeBackground,
  ObjectArt: BridgeObject,
  Basket: NoBasket,
  Sticker: BridgeBuilderSticker,
  Mascot: BrixMascot,
  Board: BridgeBoard,
  Tray: BridgeTray,
  music: "meadow",
  story: { intro: bridgeIntro, outro: bridgeOutro, between: bridgeBetween },
  helper: {
    Character: Budge,
    name: "Budge",
    explainLine: "bb.help.start",
    explainFor,
    hintLine: "bb.help.test",
    hintFor: (s) => {
      const shared = bbStore.get();
      return hintLineFor(shared.exId === s.exercise.id ? shared.diagnosis : null);
    },
  },
  praise: ["bb.praise.2"],
  praiseFor: (ex) => {
    const shared = bbStore.get();
    return praiseForExercise(ex, shared.exId === ex.id ? shared.tested : null);
  },
  hintVoice: { "retry.1": "bb.retry.1", "hint.show": "bb.hint.model", "hint.modelTap": "bb.hint.modelTap" },
  alongSteps: modelSteps,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="wood"]',
  idle: { line: "bb.idle", target: '[data-bb-next="true"]' },
};

export default function BudgetBridge() {
  return <GameRunner game={budgetBridge} skin={skin} />;
}
