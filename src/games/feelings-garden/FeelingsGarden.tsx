import { Rumble } from "../../characters/Crew";
import { Snug } from "../../characters/library";
import { GameRunner, type GameSkin } from "../../game/GameRunner";
import { BloomBadge, FgObject, GardenBg, NoBasket } from "./art";
import { FgBoard, FgTray } from "./Board";
import { feelingsGarden } from "./definition";
import { explainFor, hintFor, praiseFor } from "./logic";
import { gardenBetween, gardenIntro, gardenOutro } from "./story";
import "./feelings-garden.css";

/** Snug's Feelings Garden — naming feelings and choosing kind, calm actions (Social and emotional skills, first world). */
const skin: GameSkin = {
  intro: { line: "fg.intro", text: "Hi, I'm Snug! Will you help my friends' flowers bloom?", backLine: "fg.back", backText: "Welcome back! More friends are visiting the garden." },
  Background: GardenBg,
  ObjectArt: FgObject,
  Basket: NoBasket,
  Sticker: BloomBadge,
  Mascot: Snug,
  Board: FgBoard,
  Tray: FgTray,
  music: "meadow",
  story: { intro: gardenIntro, outro: gardenOutro, between: gardenBetween },
  helper: { Character: Rumble, name: "Rumble", explainLine: "fg.help.start", hintLine: "fg.help.face", explainFor, hintFor },
  praise: ["fg.praise.clues"],
  praiseFor,
  // second "not yet": a short lead-in; the board then speaks the scenario's modelled answer (logic.modelLine)
  hintVoice: { "hint.show": "fg.hint.model", "retry.1": "fg.gentle" },
  alongSteps: () => 0,
  alongSay: () => null,
  numberKeys: false,
  tutorialTarget: '[data-testid="choice"][data-value="happy"]',
  idle: { line: "fg.idle", target: "[data-fg-idle]" },
  // spec §4.3: no "wrong" sound — a single soft, neutral marimba note ("hmm") instead of the descending retry sound
  missSfx: { id: "count", rate: 0.89, gain: 0.4 },
};

export default function FeelingsGarden() {
  return <GameRunner game={feelingsGarden} skin={skin} />;
}
